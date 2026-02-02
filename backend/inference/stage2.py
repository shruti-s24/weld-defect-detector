import torch
import torch.nn as nn
import torchvision.transforms as T
from torchvision.models import resnet18
from PIL import Image
import numpy as np
import os

CLASS_NAMES = [
    "Burn-through",
    "Crack",
    "Excess Reinforcement",
    "Good Welding",
    "Overlap",
    "Porosity",
    "Spatters",
    "Undercut",
]


class Stage2Classifier:
    def __init__(self, model_path):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.model = resnet18(weights=None)
        self.model.fc = nn.Linear(self.model.fc.in_features, len(CLASS_NAMES))

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Stage-2 model not found: {model_path}")

        state = torch.load(model_path, map_location=self.device)
        self.model.load_state_dict(state)

        self.model.to(self.device)
        self.model.eval()

        self.transform = T.Compose(
            [
                T.Resize((224, 224)),
                T.ToTensor(),
                T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ]
        )

    @torch.no_grad()
    def predict(self, image):
        if isinstance(image, np.ndarray):
            image = Image.fromarray(image)

        x = self.transform(image).unsqueeze(0).to(self.device)
        logits = self.model(x)
        probs = torch.softmax(logits, dim=1)[0].cpu().numpy()

        idx = probs.argmax()

        return {
            "predicted_class": CLASS_NAMES[idx],
            "confidence": float(probs[idx]),
            "all_probabilities": {
                CLASS_NAMES[i]: float(probs[i]) for i in range(len(CLASS_NAMES))
            },
        }
