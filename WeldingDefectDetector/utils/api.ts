// utils/api.ts
import { InspectResponse, Job, Scan, JobScansResponse, ReportResponse } from "../types/api";

const API_BASE_URL = "http://192.168.0.102:8000"; 
import { AnalysisResult } from '../types/analysis';

export function mapApiResponse(apiResponse: any): AnalysisResult {
  const isGoodWeldClass = (s: any) =>
    typeof s === 'string' && s.toLowerCase().replace(/[^a-z]/g, '') === 'goodwelding';

  const rawDetections = Array.isArray(apiResponse?.detections) ? apiResponse.detections : [];
  // filter out any "Good Welding" detections so they are not considered defects
  const detections = rawDetections.filter((d: any) => !isGoodWeldClass(d?.stage2_class));

  const meta = {
    scanId: apiResponse?.scanId || `WI-${Date.now().toString(36).toUpperCase()}`,
    timestamp: apiResponse?.timestamp || new Date().toISOString(),
    processingTime: apiResponse?.processingTime || undefined,
    modelVersion: apiResponse?.model_version,
  };

  if (!apiResponse?.weld_detected || detections.length === 0) {
    return {
      status: 'PASS',
      confidence: 100,
      defects: [],
      ...meta,
      raw: apiResponse,
    };
  }

  const defects = detections.map((d: any) => {
    const type = d.stage2_class;
    // try to pull explanation/recommendation out of the job-style response
    let description: string | undefined;
    let recommendation: string | undefined;
    if (apiResponse?.defect_summary && apiResponse.defect_summary[type]) {
      description = apiResponse.defect_summary[type].explanation;
      recommendation = apiResponse.defect_summary[type].recommendation;
    }

    return {
      type,
      confidence: Math.round((d.stage2_confidence ?? 0) * 100),
      description,
      recommendation,
      // be defensive about bbox field name/shape coming from the backend
      bbox: Array.isArray(d.box)
        ? d.box.slice(0, 4).map((v: any) => Number(v))
        : Array.isArray(d.bbox)
        ? d.bbox.slice(0, 4).map((v: any) => Number(v))
        : d.box && typeof d.box === 'object' && d.box.x !== undefined
        ? [Number(d.box.x), Number(d.box.y), Number(d.box.x + d.box.w), Number(d.box.y + d.box.h)]
        : [],
    };
  });

  const maxConfidence = defects.length > 0 ? Math.max(...defects.map((d) => d.confidence)) : 0;

  return {
    status: 'FAIL',
    confidence: maxConfidence,
    defects,
    ...meta,
    raw: apiResponse,
  };
}

export async function inspectImage(imageUri: string): Promise<InspectResponse> {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    name: 'weld.jpg',
    type: 'image/jpeg',
  } as any);

  const start = Date.now();
  const response = await fetch(`${API_BASE_URL}/inspect/image`, {
    method: 'POST',
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    body: formData,
  });

  const durationMs = Date.now() - start;
  const processingTime = `${(durationMs / 1000).toFixed(2)}s`;

  if (!response.ok) {
    throw new Error('Inspection failed');
  }

  const json = await response.json();
  // synthesize metadata if backend doesn't provide it
  const meta = {
    scanId: json.scanId || `WI-${Date.now().toString(36).toUpperCase()}`,
    timestamp: json.timestamp || new Date().toISOString(),
    processingTime: json.processingTime || processingTime,
  };

  return {
    ...json,
    ...meta,
  };
}

// job-based API helpers
export async function createJob(): Promise<Job> {
  const res = await fetch(`${API_BASE_URL}/job/create`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to create job');
  return res.json();
}

export async function scanWeld(jobId: string, imageUri: string): Promise<Scan> {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    name: 'weld.jpg',
    type: 'image/jpeg',
  } as any);

  const res = await fetch(`${API_BASE_URL}/job/${jobId}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    body: formData,
  });
  if (!res.ok) throw new Error('Scan failed');
  return res.json();
}

export async function getJobScans(jobId: string): Promise<JobScansResponse> {
  const res = await fetch(`${API_BASE_URL}/job/${jobId}/scans`);
  if (!res.ok) throw new Error('Failed to fetch scans');
  return res.json();
}

export async function getScan(scanId: string): Promise<Scan> {
  const res = await fetch(`${API_BASE_URL}/scan/${scanId}`);
  if (!res.ok) throw new Error('Failed to fetch scan');
  return res.json();
}

export async function generateJobReport(
  jobId: string,
  regenerate = false,
): Promise<ReportResponse> {
  const url = `${API_BASE_URL}/job/${jobId}/report${
    regenerate ? '?regenerate=true' : ''
  }`;
  const res = await fetch(url, { method: 'POST' });
  if (!res.ok) throw new Error('Report generation failed');
  return res.json();
}

export function downloadReportUrl(jobId: string): string {
  return `${API_BASE_URL}/job/${jobId}/report/download`;
}
