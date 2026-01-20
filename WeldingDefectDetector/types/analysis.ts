export interface Defect {
  type: string;
  confidence: number; // 0–100
  bbox : number[],
}

export interface AnalysisResult {
  status: 'PASSED CHECK' | 'FAILED CHECK';
  confidence: number;
  defects: Defect[];
}
