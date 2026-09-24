import "dotenv/config";

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import ffmpegPath from "ffmpeg-static";
import multer from "multer";
import OpenAI from "openai";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface SpeechKitResponse {
  result?: string;
  error_code?: string;
  error_message?: string;
}

const apiKey = process.env.YANDEX_API_KEY;
const folderId = process.env.YANDEX_FOLDER_ID;
const port = Number(process.env.API_PORT || 3001);

if (!apiKey) {
  throw new Error("Нет YANDEX_API_KEY в файле .env");
}

if (!folderId) {
  throw new Error("Нет YANDEX_FOLDER_ID в файле .env");
}

if (typeof ffmpegPath !== "string") {
  throw new Error("FFmpeg не найден");
}

const ffmpegExecutablePath = ffmpegPath;

const ai = new OpenAI({
  apiKey,
  project: folderId,
  baseURL: "https://ai.api.cloud.yandex.net/v1",
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const app = express();
app.use(express.json({ limit: "100kb" }));

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (message): message is ChatMessage =>
        typeof message === "object" &&
        message !== null &&
        (message as ChatMessage).role !== undefined &&
        ["user", "assistant"].includes((message as ChatMessage).role) &&
        typeof (message as ChatMessage).content === "string",
    )
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 6_000),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-20);
}

function convertToOggOpus(input: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const childProcess = spawn(
      ffmpegExecutablePath,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        "pipe:0",
        "-ac",
        "1",
        "-ar",
        "48000",
        "-c:a",
        "libopus",
        "-b:a",
        "48k",
        "-f",
        "ogg",
        "pipe:1",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );

    const output: Buffer[] = [];
    const errors: Buffer[] = [];

    childProcess.stdout.on("data", (chunk: Buffer) => output.push(chunk));
    childProcess.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
    childProcess.on("error", reject);
    childProcess.on("close", (code: number | null) => {
      if (code === 0 && output.length > 0) {
        resolve(Buffer.concat(output));
        return;
      }

      reject(
        new Error(
          Buffer.concat(errors).toString("utf8") ||
            "Не удалось преобразовать аудио",
        ),
      );
    });

    childProcess.stdin.end(input);
  });
}

app.post("/api/chat", async (request, response) => {
  const messages = normalizeMessages(request.body.messages);

  if (messages.length === 0) {
    response.status(400).json({ error: "Сообщение не передано" });
    return;
  }

  try {
    const result = await ai.chat.completions.create({
      model: `gpt://${folderId}/yandexgpt-5-lite`,
      messages: [
        {
          role: "system",
          content:
            "Ты директор завода на учебных переговорах. Отвечай по-русски, кратко и по существу. Защищай интересы предприятия, но допускай разумный компромисс.",
        },
        ...messages,
      ],
      temperature: 0.6,
      max_tokens: 900,
    });

    const reply = result.choices[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error("Модель вернула пустой ответ");
    }

    response.json({ reply });
  } catch (error) {
    console.error("Ошибка YandexGPT:", error);
    response.status(500).json({
      error: error instanceof Error ? error.message : "Ошибка YandexGPT",
    });
  }
});

app.post(
  "/api/transcribe",
  upload.single("audio"),
  async (request, response) => {
    if (!request.file?.buffer.length) {
      response.status(400).json({ error: "Аудиозапись не передана" });
      return;
    }

    try {
      const oggAudio = await convertToOggOpus(request.file.buffer);
      const speechResponse = await fetch(
        "https://stt.api.cloud.yandex.net/speech/v1/stt:recognize?lang=ru-RU&format=oggopus",
        {
          method: "POST",
          headers: {
            Authorization: `Api-Key ${apiKey}`,
            "Content-Type": "audio/ogg",
          },
          body: new Uint8Array(oggAudio),
        },
      );

      const payload = (await speechResponse.json()) as SpeechKitResponse;

      if (!speechResponse.ok) {
        throw new Error(
          payload.error_message || `SpeechKit вернул ${speechResponse.status}`,
        );
      }

      const text = payload.result?.trim();

      if (!text) {
        throw new Error("Речь не распознана. Попробуйте говорить ближе к микрофону.");
      }

      response.json({ text });
    } catch (error) {
      console.error("Ошибка распознавания речи:", error);
      response.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Не удалось распознать речь",
      });
    }
  },
);

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(currentDirectory, "../dist");

if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("/{*path}", (_request, response) => {
    response.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(port, "127.0.0.1", () => {
  console.log(`API запущен: http://127.0.0.1:${port}`);
});
