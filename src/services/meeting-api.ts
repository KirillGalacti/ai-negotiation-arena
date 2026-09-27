import type { ChatMessage } from "@/types/meeting";

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `Ошибка ${response.status}`);
  }
  return payload;
}

export async function transcribeAudio(blob: Blob, signal: AbortSignal) {
  const extension = blob.type.includes("ogg") ? "ogg" : "webm";
  const formData = new FormData();
  formData.append("audio", blob, `negotiation.${extension}`);

  const response = await fetch("/api/transcribe", {
    method: "POST",
    body: formData,
    signal,
  });
  return readJson<{ text: string }>(response);
}

export async function requestAssistantReply(
  messages: ChatMessage[],
  signal: AbortSignal,
) {
  const response = await fetch("/api/chat", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
  });
  return readJson<{ reply: string }>(response);
}
