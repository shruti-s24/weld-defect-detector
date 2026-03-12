import os
import io
import json
import uuid
from datetime import datetime
from collections import defaultdict

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse

from PIL import Image

from inference.stage1 import Stage1Detector
from inference.stage2 import Stage2Classifier
from inference.utils import crop_image, draw_boxes
from inference.explain import generate_explanation
from inference.report import generate_pdf

# --------------------
# App setup
# --------------------
app = FastAPI(title="Weld Defect Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

os.makedirs("jobs", exist_ok=True)
os.makedirs("scans", exist_ok=True)
os.makedirs("uploads", exist_ok=True)
os.makedirs("reports", exist_ok=True)

# --------------------
# Load models (ONCE)
# --------------------
stage1 = Stage1Detector(model_path=os.path.join(BASE_DIR, "models", "stage1_yolo.pt"))

stage2 = Stage2Classifier(
    model_path=os.path.join(BASE_DIR, "models", "stage2_resnet18.pt")
)


# --------------------
# Create Job
# --------------------
@app.post("/job/create")
def create_job():

    job_id = f"JOB_{str(uuid.uuid4())[:8]}"

    job_data = {
        "job_id": job_id,
        "created_at": datetime.utcnow().isoformat(),
        "scans": [],
        "report_path": None,
    }

    with open(f"jobs/{job_id}.json", "w") as f:
        json.dump(job_data, f, indent=2)

    return job_data


# --------------------
# Scan Weld (Job Based)
# --------------------
@app.post("/job/{job_id}/scan")
async def scan_weld(job_id: str, image: UploadFile = File(...)):

    job_path = f"jobs/{job_id}.json"

    if not os.path.exists(job_path):
        return {"error": "Job not found"}

    scan_id = f"SCAN_{str(uuid.uuid4())[:8]}"

    image_path = f"uploads/{scan_id}.jpg"

    img_bytes = await image.read()

    with open(image_path, "wb") as f:
        f.write(img_bytes)

    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    detections = stage1.detect(pil_img)

    results = []
    defect_summary = {}
    defect_counts = defaultdict(int)

    for det in detections:

        crop = crop_image(pil_img, det["bbox"])
        cls_result = stage2.predict(crop)

        label = cls_result["predicted_class"]
        confidence = cls_result["confidence"]

        results.append(
            {
                "bbox": det["bbox"],
                "stage1_confidence": round(det["confidence"], 3),
                "label": label,
                "confidence": round(confidence, 3),
                # include stage2 fields for drawing and compatibility
                "stage2_class": label,
                "stage2_confidence": confidence,
            }
        )

        defect_counts[label] += 1

        if label not in defect_summary:

            xai = generate_explanation(label, confidence)

            defect_summary[label] = {
                "count": 0,
                "meaning": xai["meaning"],
                "cause": xai["cause"],
                "acceptability": xai["acceptability"],
                "explanation": xai["explanation"],
                "recommendation": xai["recommendation"],
            }

    for defect in defect_counts:
        defect_summary[defect]["count"] = defect_counts[defect]
    # -----------------------------
    # Generate annotated image
    # -----------------------------
    annotated_path = f"uploads/{scan_id}_annotated.jpg"

    annotated_img = draw_boxes(pil_img, results)

    annotated_img.save(annotated_path)
    scan_data = {
        "scan_id": scan_id,
        "job_id": job_id,
        "timestamp": datetime.utcnow().isoformat(),
        "image_path": annotated_path,
        "detections": results,
        "defect_summary": defect_summary,
    }

    with open(f"scans/{scan_id}.json", "w") as f:
        json.dump(scan_data, f, indent=2)

    with open(job_path) as f:
        job = json.load(f)

    job["scans"].append(scan_id)

    with open(job_path, "w") as f:
        json.dump(job, f, indent=2)

    return scan_data


# --------------------
# View Job Scan History
# --------------------
@app.get("/job/{job_id}/scans")
def get_job_scans(job_id: str):

    job_path = f"jobs/{job_id}.json"

    if not os.path.exists(job_path):
        return {"error": "Job not found"}

    with open(job_path) as f:
        job = json.load(f)

    scans = []

    for scan_id in job["scans"]:
        with open(f"scans/{scan_id}.json") as s:
            scans.append(json.load(s))

    return {
        "job_id": job_id,
        "num_scans": len(scans),
        "scans": scans,
    }


# --------------------
# View Single Scan
# --------------------
@app.get("/scan/{scan_id}")
def get_scan(scan_id: str):

    scan_path = f"scans/{scan_id}.json"

    if not os.path.exists(scan_path):
        return {"error": "Scan not found"}

    with open(scan_path) as f:
        return json.load(f)


# --------------------
# Generate Job Report
# --------------------
@app.post("/job/{job_id}/report")
def generate_job_report(job_id: str, regenerate: bool = False):
    scan_entries = []

    job_path = f"jobs/{job_id}.json"

    if not os.path.exists(job_path):
        return {"error": "Job not found"}

    with open(job_path) as f:
        job = json.load(f)

    if len(job["scans"]) == 0:
        return {"error": "No scans available for this job"}

    if job.get("report_path") and os.path.exists(job["report_path"]) and not regenerate:
        return {
            "message": "Report already exists",
            "download_url": f"/job/{job_id}/report/download",
            "note": "Use regenerate=true to rebuild report",
        }

    combined_summary = {}
    report_image = None
    for scan_id in job["scans"]:

        with open(f"scans/{scan_id}.json") as s:
            scan = json.load(s)

        if report_image is None:
            report_image = scan.get("annotated_image")

        scan_entries.append(
            {
                "scan_id": scan_id,
                "image": report_image,
                "defects": list(scan["defect_summary"].keys()),
            }
        )

        for defect, data in scan["defect_summary"].items():

            if defect not in combined_summary:
                combined_summary[defect] = data
            else:
                combined_summary[defect]["count"] += data["count"]

    report_path = f"reports/{job_id}.pdf"

    generate_pdf(
        {
            "job_id": job_id,
            "inspection_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "total_scans": len(job["scans"]),
            # "image": report_image,
            "scans": scan_entries,
            "defect_summary": combined_summary,
        },
        report_path,
    )

    job["report_path"] = report_path

    with open(job_path, "w") as f:
        json.dump(job, f, indent=2)

    return {
        "message": "Report generated",
        "download_url": f"/job/{job_id}/report/download",
    }


# --------------------
# Download Existing Report
# --------------------
@app.get("/job/{job_id}/report/download")
def download_report(job_id: str):

    job_path = f"jobs/{job_id}.json"

    if not os.path.exists(job_path):
        return {"error": "Job not found"}

    with open(job_path) as f:
        job = json.load(f)

    report_path = job.get("report_path")

    if not report_path:
        return {"error": "Report has not been generated yet"}

    if not os.path.exists(report_path):
        return {"error": "Report file missing"}

    return FileResponse(
        report_path,
        media_type="application/pdf",
        filename=f"{job_id}_inspection_report.pdf",
    )


# --------------------
# Stage-2 Debug Endpoint
# --------------------
@app.post("/classify/defect")
async def classify_defect(image: UploadFile = File(...)):

    img_bytes = await image.read()
    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    result = stage2.predict(pil_img)

    return {
        "warning": "Stage-2 expects cropped defect regions. Use /job/{job_id}/scan.",
        "result": result,
    }


# --------------------
# Debug Visualization
# --------------------
@app.post("/inspect/image/debug")
async def inspect_image_debug(image: UploadFile = File(...)):

    img_bytes = await image.read()
    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    detections_stage1 = stage1.detect(pil_img)

    results = []

    for det in detections_stage1:

        crop = crop_image(pil_img, det["bbox"])
        cls_result = stage2.predict(crop)

        results.append(
            {
                "bbox": det["bbox"],
                "stage2_class": cls_result["predicted_class"],
                "stage2_confidence": cls_result["confidence"],
            }
        )

    debug_img = draw_boxes(pil_img, results)

    buf = io.BytesIO()
    debug_img.save(buf, format="JPEG")
    buf.seek(0)

    return StreamingResponse(buf, media_type="image/jpeg")
