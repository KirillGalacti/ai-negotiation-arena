import "dotenv/config";
import express from "express";
import OpenAI from "openai";

const apiKey = process.env.YANDEX_API_KEY;
const folderId = process.env.YANDEX_FOLDER_ID;
const port = process.env.PORT || 3000;

if (!apiKey) {
  throw new Error("Нет YANDEX_API_KEY в файле .env");
}

if (!folderId) {
  throw new Error("Нет YANDEX_FOLDER_ID в файле .env");
}

const client = new OpenAI({
  apiKey,
  project: folderId,
  baseURL: "https://ai.api.cloud.yandex.net/v1",
});

const app = express();

app.use(express.json());
app.use(express.static("public"));

app.post("/api/chat", async (req, res) => {
  const messages = Array.isArray(req.body.messages)
    ? req.body.messages
        .filter(
          (message) =>
            ["user", "assistant"].includes(message.role) &&
            typeof message.content === "string"
        )
        .slice(-20)
    : [];

  if (messages.length === 0) {
    return res.status(400).json({
      error: "Сообщение не передано",
    });
  }

  try {
    const response = await client.chat.completions.create({
      model: `gpt://${folderId}/yandexgpt-5-lite`,
      messages: [
        {
          role: "system",
          content: "Ты полезный ассистент. Отвечай на русском языке.",
        },
        ...messages,
      ],
      temperature: 0.6,
      max_tokens: 1000,
    });

    const reply = response.choices[0]?.message?.content;

    if (!reply) {
      throw new Error("Модель вернула пустой ответ");
    }

    res.json({ reply });
  } catch (error) {
    console.error("Ошибка YandexGPT:", error);

    res.status(500).json({
      error: error.message || "Не удалось получить ответ от YandexGPT",
    });
  }
});

app.listen(port, () => {
  console.log(`Чат запущен: http://localhost:${port}`);
});