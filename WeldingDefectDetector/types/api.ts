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

  /* optional metadata added by the backend or frontend */
  scanId?: string;
  timestamp?: string;
  processingTime?: string;
  model_version?: string;

  [key: string]: any;
}

// job/scan related objects returned by new API
export interface Job {
  job_id: string;
  created_at: string;
  scans: string[];
  report_path: string | null;
}

export interface Scan {
  scan_id: string;
  job_id: string;
  timestamp: string;
  image_path: string;
  annotated_image: string;
  detections: Detection[];
  defect_summary: { [defect: string]: any };
  [key: string]: any;
}

export interface JobScansResponse {
  job_id: string;
  num_scans: number;
  scans: Scan[];
}

export interface ReportResponse {
  message: string;
  download_url: string;
  note?: string;
}
