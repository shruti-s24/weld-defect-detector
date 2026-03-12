export type DefectSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Defect {
  type: string;
  confidence: number; // 0–100
  bbox?: number[];
  description?: string;      // explanation text
  recommendation?: string;   // what to do about it
  severity?: DefectSeverity;
  location?: string;
}

export interface AnalysisResult {
  status: 'PASS' | 'FAIL';
  confidence: number;
  defects: Defect[];

  /* metadata (optional) */
  scanId?: string;
  timestamp?: string; // ISO or locale string
  processingTime?: string; // e.g. "1.23s"
  modelVersion?: string;

  /* raw backend response for debugging */
  raw?: any;
}
