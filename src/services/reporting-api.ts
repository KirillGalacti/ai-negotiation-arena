import type { ReportAnalysis, StoredAttempt } from "@/types/reporting";

export async function analyzeAttempt(attempt: StoredAttempt): Promise<ReportAnalysis> {
  const response = await fetch("/api/analyze-session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attempt }),
  });
  const payload = await response.json() as { analysis?: ReportAnalysis; error?: string };
  if (!response.ok || !payload.analysis) {
    throw new Error(payload.error || `Не удалось подготовить отчёт (${response.status})`);
  }
  return payload.analysis;
}
