// utils/api.ts
import { InspectResponse } from "../types/api";

const API_BASE_URL = "http://172.20.10.4:8000"; 
import { AnalysisResult } from '../types/analysis';

export function mapApiResponse(apiResponse: any): AnalysisResult {
  if (!apiResponse.weld_detected || apiResponse.detections.length === 0) {
    return {
      status: 'PASS',
      confidence: 100,
      defects: [],
    };
  }

  const defects = apiResponse.detections.map((d: any) => ({
    type: d.stage2_class,
    confidence: Math.round(d.stage2_confidence * 100),
    bbox: d.box,
  }));

  const maxConfidence = Math.max(...defects.map(d => d.confidence));

  return {
    status: 'FAIL',
    confidence: maxConfidence,
    defects,
  };
}

export async function inspectImage(imageUri: string): Promise<InspectResponse> {
  const formData = new FormData();

  formData.append("image", {
    uri: imageUri,
    name: "weld.jpg",
    type: "image/jpeg",
  } as any);

  const response = await fetch(`${API_BASE_URL}/inspect/image`, {
    method: "POST",
    headers: {
      "Content-Type": "multipart/form-data",
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Inspection failed");
  }

  return response.json();
}
