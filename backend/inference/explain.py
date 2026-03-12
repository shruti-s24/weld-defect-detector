from inference.defect_knowledge import DEFECT_INFO


def generate_explanation(defect_label, confidence):

    info = DEFECT_INFO.get(defect_label)

    if not info:
        return {
            "meaning": "Unknown defect",
            "cause": "Unknown",
            "acceptability": "Unknown",
            "explanation": "No explanation available for this defect.",
            "recommendation": "Consult welding expert.",
        }

    return {
        "meaning": info["meaning"],
        "cause": info["cause"],
        "acceptability": info["acceptability"],
        "explanation": info["explanation"],
        "recommendation": info["recommendation"],
    }
