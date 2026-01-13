import { AnalysisResult, Defect, DefectSeverity } from '../types/analysis';

interface DefectTemplate {
  type: string;
  description: string;
  severity: DefectSeverity;
  location: string;
}

const DEFECT_TYPES: DefectTemplate[] = [
  {
    type: 'Porosity',
    description: 'Gas pockets trapped in the weld metal causing weak points and potential failure under stress.',
    severity: 'High',
    location: 'Center region, 15mm from start',
  },
  {
    type: 'Cracks',
    description: 'Linear fractures in the weld that can propagate under load, compromising structural integrity.',
    severity: 'Critical',
    location: 'Heat-affected zone, right side',
  },
  {
    type: 'Incomplete Fusion',
    description: 'Lack of proper bonding between weld metal and base material, reducing joint strength.',
    severity: 'High',
    location: 'Root pass, left edge',
  },
  {
    type: 'Undercut',
    description: 'Groove melted into base metal adjacent to weld, creating stress concentration points.',
    severity: 'Medium',
    location: 'Toe of weld, both sides',
  },
  {
    type: 'Spatter',
    description: 'Metal droplets expelled during welding that adhere to the surface, affecting finish quality.',
    severity: 'Low',
    location: 'Surface area, scattered',
  },
];

export function generateMockAnalysis(): AnalysisResult {
  // 70% chance of failure (bad weld)
  const isBadWeld = Math.random() < 0.7;
  
  if (!isBadWeld) {
    // Good weld - no defects
    return {
      status: 'PASS',
      confidence: Math.floor(Math.random() * 8) + 92, // 92-99%
      defects: [],
      scanId: `WI-${Date.now().toString(36).toUpperCase()}`,
      timestamp: new Date().toLocaleString(),
      processingTime: `${(Math.random() * 0.5 + 1.5).toFixed(2)}s`,
    };
  }

  // Bad weld - generate 1-3 defects
  const numDefects = Math.floor(Math.random() * 3) + 1;
  const selectedDefects: Defect[] = [];
  const availableDefects = [...DEFECT_TYPES];

  for (let i = 0; i < numDefects; i++) {
    const randomIndex = Math.floor(Math.random() * availableDefects.length);
    const defect = availableDefects.splice(randomIndex, 1)[0];
    selectedDefects.push({
      ...defect,
      confidence: Math.floor(Math.random() * 20) + 75, // 75-94%
    });
  }

  return {
    status: 'FAIL',
    confidence: Math.floor(Math.random() * 15) + 80, // 80-94%
    defects: selectedDefects,
    scanId: `WI-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toLocaleString(),
    processingTime: `${(Math.random() * 0.5 + 1.5).toFixed(2)}s`,
  };
}
