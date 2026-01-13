export type DefectSeverity = 'Low' | 'Medium' | 'High' | 'Critical';

export interface Defect {
  type: string;
  description: string;
  severity: DefectSeverity;
  confidence: number;
  location?: string;
}

export interface AnalysisResult {
  status: 'PASS' | 'FAIL';
  confidence: number;
  defects: Defect[];
  scanId: string;
  timestamp: string;
  processingTime: string;
}