import os
import io
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from fastapi.responses import StreamingResponse
from inference.utils import draw_boxes
import io
from inference.stage1 import Stage1Detector
from inference.stage2 import Stage2Classifier
from inference.utils import crop_image

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

# --------------------
# Load models (ONCE)
# --------------------
stage1 = Stage1Detector(model_path=os.path.join(BASE_DIR, "models", "stage1_yolo.pt"))

stage2 = Stage2Classifier(
    model_path=os.path.join(BASE_DIR, "models", "stage2_resnet18.pt")
)


# --------------------
# Routes
# --------------------
@app.post("/inspect/image")
async def inspect_image(image: UploadFile = File(...)):
    img_bytes = await image.read()
    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    detections = stage1.detect(pil_img)

    if len(detections) == 0:
        return {"weld_detected": False, "message": "No defect candidates found"}

    results = []

    for det in detections:
        crop = crop_image(pil_img, det["bbox"])
        cls_result = stage2.predict(crop)

        results.append(
            {
                "bbox": det["bbox"],
                "stage1_confidence": round(det["confidence"], 3),
                "stage2_class": cls_result["predicted_class"],
                "stage2_confidence": round(cls_result["confidence"], 3),
            }
        )

    return {
        "weld_detected": True,
        "num_detections": len(results),
        "detections": results,
    }


@app.post("/classify/defect")
async def classify_defect(image: UploadFile = File(...)):
    """
    DEBUG / RESEARCH ONLY.
    Expects CROPPED defect image.
    """
    img_bytes = await image.read()
    pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

    result = stage2.predict(pil_img)

    return {
        "warning": "Stage-2 expects cropped defect regions. "
        "Use /inspect/image for full inspection.",
        "result": result,
    }


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
