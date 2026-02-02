import torch
from ultralytics import YOLO
import numpy as np


class Stage1Detector:
    def __init__(self, model_path, conf_thresh=0.25):
        self.model = YOLO(model_path)
        self.conf_thresh = conf_thresh

    def detect(self, pil_image):
        results = self.model(pil_image, verbose=False)[0]

        detections = []

        if results.boxes is None:
            return detections

        for box in results.boxes:
            conf = float(box.conf[0])
            if conf < self.conf_thresh:
                continue

            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

            detections.append({"bbox": [x1, y1, x2, y2], "confidence": conf})

        return detections
