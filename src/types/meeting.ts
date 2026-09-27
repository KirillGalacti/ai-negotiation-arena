export type ChatRole = "user" | "assistant";
export type DialogKind = "intro" | "hint" | "pause" | "finish";
export type SessionState = "active" | "paused" | "finished";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
}

export interface DialogContent {
  title: string;
  description: string;
  secondary: string;
  primary: string;
}
