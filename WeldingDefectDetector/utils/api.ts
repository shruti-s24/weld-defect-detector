// utils/api.ts
import { InspectResponse } from "../types/api";

const API_BASE_URL = "http://192.168.0.100:8000"; 
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
    // be defensive about bbox field name/shape coming from the backend
    bbox: Array.isArray(d.box)
      ? d.box.slice(0, 4).map((v: any) => Number(v))
      : Array.isArray(d.bbox)
      ? d.bbox.slice(0, 4).map((v: any) => Number(v))
      : d.box && typeof d.box === "object" && d.box.x !== undefined
      ? [Number(d.box.x), Number(d.box.y), Number(d.box.x + d.box.w), Number(d.box.y + d.box.h)]
      : [],
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
