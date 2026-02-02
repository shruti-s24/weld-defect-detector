import io
import numpy as np
from PIL import Image
import pillow_heif
from torchvision import transforms
import cv2


def draw_boxes(image: Image.Image, detections):
    img = np.array(image).copy()

    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        label = f'{det["stage2_class"]} ({det["stage2_confidence"]:.2f})'

        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(
            img,
            label,
            (x1, max(y1 - 5, 10)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.4,
            (0, 255, 0),
            1,
        )

    return Image.fromarray(img)


pillow_heif.register_heif_opener()

SUPPORTED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".heic"}


def load_image_from_upload(upload_file):
    filename = upload_file.filename.lower()

    if not any(filename.endswith(ext) for ext in SUPPORTED_EXTENSIONS):
        raise ValueError("Unsupported image format")

    image_bytes = upload_file.file.read()
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    return np.array(image)


def stage2_transform():
    return transforms.Compose(
        [
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )


def crop_image(image: Image.Image, bbox):
    x1, y1, x2, y2 = bbox
    return image.crop((x1, y1, x2, y2))
