// types/api.ts

export interface Detection {
  bbox: [number, number, number, number];
  stage1_confidence: number;
  stage2_class: string;
  stage2_confidence: number;
}

export interface InspectResponse {
  weld_detected: boolean;
  num_detections: number;
  detections: Detection[];
}
