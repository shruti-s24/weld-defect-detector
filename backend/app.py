from fastapi.responses import FileResponse


import os
import io
import json
import uuid
from datetime import datetime
from collections import defaultdict

from fastapi import FastAPI, UploadFile, File, Body
from pydantic import BaseModel
# --------------------
# Pydantic models for auth
# --------------------
class AuthRequest(BaseModel):
    email: str
    password: str
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse

from PIL import Image

from inference.stage1 import Stage1Detector
from inference.stage2 import Stage2Classifier
from inference.utils import crop_image, draw_boxes
from inference.explain import generate_explanation
from inference.report import generate_pdf

from auth import verify_password
from database import users_collection, jobs_collection, scans_collection
from auth import hash_password
import uuid

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

# Explicit endpoint to serve images from uploads
@app.get("/get-image/{filename}")
def get_image(filename: str):
    file_path = f"uploads/{filename}"
    return FileResponse(file_path, media_type="image/jpeg")

# Explicit endpoint to serve PDFs from reports
@app.get("/get-pdf/{filename}")
def get_pdf(filename: str):
    file_path = f"reports/{filename}"
    return FileResponse(file_path, media_type="application/pdf")

#register
@app.post("/register")
async def register(auth: AuthRequest):
    email = auth.email
    password = auth.password
    existing = await users_collection.find_one({"email": email})
    if existing:
        return {"error": "User already exists"}
    user_id = f"USER_{str(uuid.uuid4())[:8]}"
    user = {
        "user_id": user_id,
        "email": email,
        "password": password  # Store as plain text (INSECURE)
    }
    await users_collection.insert_one(user)
    return {
        "message": "User created",
        "user_id": user_id
    }


#login
@app.post("/login")
async def login(auth: AuthRequest):
    email = auth.email
    password = auth.password
    user = await users_collection.find_one({"email": email})
    if not user:
        return {"error": "Invalid credentials"}
    if password != user["password"]:
        return {"error": "Invalid credentials"}
    return {
        "message": "Login successful",
        "user_id": user["user_id"]
    }


# --------------------
# Pydantic model for job creation
# --------------------
class JobCreateRequest(BaseModel):
    user_id: str

# --------------------
# Create Job
# --------------------
@app.post("/job/create")
async def create_job(req: JobCreateRequest):
    user_id = req.user_id
    job_id = f"JOB_{str(uuid.uuid4())[:8]}"
    job = {
        "job_id": job_id,
        "user_id": user_id,
        "scans": [],
        "created_at": datetime.utcnow().isoformat()
    }
    await jobs_collection.insert_one(job)
    if '_id' in job:
        del job['_id']
    return job

# --------------------
# Scan Weld (Job Based)
# --------------------
@app.post("/job/{job_id}/scan")
async def scan_weld(job_id: str, image: UploadFile = File(...)):

    job = await jobs_collection.find_one({"job_id": job_id})

    if not job:
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

    await scans_collection.insert_one(scan_data)
    if '_id' in scan_data:
        del scan_data['_id']
    await jobs_collection.update_one(
        {"job_id": job_id},
        {"$push": {"scans": scan_id}}
    )
    return scan_data


# --------------------
# View Job Scan History
# --------------------
@app.get("/job/{job_id}/scans")
async def get_job_scans(job_id: str):

    job = await jobs_collection.find_one({"job_id": job_id})

    if not job:
        return {"error": "Job not found"}

    scans = await scans_collection.find({"job_id": job_id}).to_list(100)
    job_path = f"jobs/{job_id}.json"
    report_path = None
    if os.path.exists(job_path):
        with open(job_path) as f:
            job_json = json.load(f)
            report_path = job_json.get("report_path")
    for scan in scans:
        if "_id" in scan:
            del scan["_id"]
        # Attach report_path to each scan for UI
        scan["report_path"] = report_path
    return {
        "job_id": job_id,
        "num_scans": len(scans),
        "scans": scans,
        "report_path": report_path
    }


# --------------------
# View Single Scan
# --------------------
@app.get("/scan/{scan_id}")
async def get_scan(scan_id: str):

    scan = await scans_collection.find_one({"scan_id": scan_id})

    if not scan:
        return {"error": "Scan not found"}

    if "_id" in scan:
        del scan["_id"]

    # Attach report_path for this scan's job
    job_id = scan.get("job_id")
    report_path = None
    if job_id:
        job_path = f"jobs/{job_id}.json"
        if os.path.exists(job_path):
            with open(job_path) as f:
                job_json = json.load(f)
                report_path = job_json.get("report_path")
    scan["report_path"] = report_path
    return scan


# --------------------
# Generate Job Report
# --------------------
@app.post("/job/{job_id}/report")
async def generate_job_report(job_id: str, regenerate: bool = False):

    scan_entries = []

    job = await jobs_collection.find_one({"job_id": job_id})

    if not job:
        return {"error": "Job not found"}

    scans = await scans_collection.find({"job_id": job_id}).to_list(None)

    print("JOB ID:", job_id)
    print("SCANS FOUND:", len(scans))
    print("SCAN IDS:", [s["scan_id"] for s in scans])

    if len(scans) == 0:
        return {"error": "No scans available for this job"}

    combined_summary = {}

    for scan in scans:

        scan_entries.append(
            {
                "scan_id": scan["scan_id"],
                "image_path": scan.get("image_path"),
                "defect_summary": scan.get("defect_summary", {})
            }
        )

        for defect, data in scan.get("defect_summary", {}).items():

            if defect not in combined_summary:
                combined_summary[defect] = data.copy()

            else:
                combined_summary[defect]["count"] += data.get("count", 0)

    report_path = f"reports/{job_id}.pdf"

    generate_pdf(
        {
            "job_id": job_id,
            "inspection_date": datetime.utcnow().strftime("%Y-%m-%d"),
            "total_scans": len(scans),
            "scans": scan_entries,
            "defect_summary": combined_summary,
        },
        report_path,
    )

    await jobs_collection.update_one(
        {"job_id": job_id},
        {"$set": {"report_path": report_path}}
    )

    return {
        "message": "Report generated",
        "download_url": f"/job/{job_id}/report/download",
    }

# --------------------
# Download Existing Report
# --------------------
@app.get("/job/{job_id}/report/download")
async def download_report(job_id: str):

    job = await jobs_collection.find_one({"job_id": job_id})

    if not job:
        return {"error": "Job not found"}

    report_path = job.get("report_path")

    if not report_path:
        return {"error": "Report not generated"}

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


#Get Jobs for User

@app.get("/jobs/{user_id}")
async def get_jobs(user_id: str):
    jobs = await jobs_collection.find({"user_id": user_id}).to_list(100)
    for job in jobs:
        if "_id" in job:
            del job["_id"]
    return jobs