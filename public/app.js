const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const form = document.querySelector("#chat-form");
const promptInput = document.querySelector("#prompt");
const micButton = document.querySelector("#mic-btn");
const messagesElement = document.querySelector("#messages");
const sendButton = document.querySelector("#send-button");

const history = [];

if (!Recognition) {
  micButton.disabled = true;
  micButton.textContent = "Голос не поддерживается";
} else {

  const recognition = new Recognition();

  recognition.lang = "ru-RU";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let recognitionActive = false;
  let textBeforeVoice = "";
  let maxRecordingTimer = null;

  function resetRecognition() {
    clearTimeout(maxRecordingTimer);
    recognitionActive = false;
    micButton.disabled = false;
    micButton.textContent = "Голосовой ввод";
  }

  function stopRecognition() {
    if (recognitionActive) {
      recognition.stop();
    }
  }

  micButton.addEventListener("click", () => {
    // Повторное нажатие останавливает микрофон
    if (recognitionActive) {
      stopRecognition();
      return;
    }

    recognitionActive = true;
    textBeforeVoice = promptInput.value.trim();
    micButton.textContent = "Остановить запись";

    try {
      recognition.start();

      // Страховка, если браузер не определит окончание речи
      maxRecordingTimer = setTimeout(() => {
        stopRecognition();
      }, 15000);
    } catch (error) {
      console.error("Не удалось запустить распознавание:", error);
      resetRecognition();
    }
  });

  recognition.onaudiostart = () => {
    console.log("Микрофон подключён");
  };

  recognition.onspeechstart = () => {
    console.log("Речь обнаружена");
    micButton.textContent = "Слушаю...";
  };

  recognition.onresult = (event) => {
    const voiceText = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join(" ")
      .trim();

    promptInput.value = [
      textBeforeVoice,
      voiceText
    ].filter(Boolean).join(" ");
  };

  recognition.onspeechend = () => {
    console.log("Речь закончилась");
    stopRecognition();
  };

  recognition.onerror = (event) => {
    console.error("Ошибка распознавания:", event.error);
    resetRecognition();
  };

  recognition.onend = () => {
    console.log("Распознавание завершено");
    resetRecognition();
    promptInput.focus();
  };
}

function showMessage(text, type) {
  const element = document.createElement("div");
  element.className = `message ${type}`;
  element.textContent = text;

  messagesElement.appendChild(element);
  messagesElement.scrollTop = messagesElement.scrollHeight;
}

showMessage(
  "Здравствуйте! Задайте мне вопрос.",
  "assistant"
);

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = promptInput.value.trim();

  if (!text) {
    return;
  }

  showMessage(text, "user");
  history.push({
    role: "user",
    content: text,
  });

  promptInput.value = "";
  sendButton.disabled = true;
  sendButton.textContent = "Ждём...";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: history,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Ошибка сервера");
    }

    showMessage(data.reply, "assistant");

    history.push({
      role: "assistant",
      content: data.reply,
    });
  } catch (error) {
    showMessage(`Ошибка: ${error.message}`, "error");
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "Отправить";
    promptInput.focus();
  }
});

promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});