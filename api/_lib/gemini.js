// api/_lib/gemini.js
//
// Вспомогательные AI-задачи вокруг буфера баг-репортов — намеренно на
// Gemini, а не на Claude: бесплатный тариф Google AI Studio щедрее для
// частых мелких вызовов (скриншот/голосовое), а основной "тяжёлый" промпт
// со списком задач всё равно уходит тебе в Claude вручную через /endpoint.
//
// Нужна переменная окружения GEMINI_API_KEY (ключ из aistudio.google.com,
// бесплатный) — та же самая, что уже используется в api/ai-proxy.js.
// Модель совпадает с ai-proxy.js для консистентности — это стабильный
// зафиксированный релиз, а не "плывущий" alias вида gemini-flash-latest.
// Опционально переопределяется GEMINI_MODEL.
//
// 28.07.2026: gemini-2.5-flash перестал быть доступен части ключей
// досрочно — заменено на gemini-3.5-flash-lite (актуальный GA-релиз).

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

async function callGemini(parts) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY не настроен на сервере");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Gemini ${res.status}: ${data?.error?.message || "unknown error"}`);
  }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  return text.trim();
}

/** Скриншот бага → короткое текстовое описание проблемы на русском. */
export async function describeScreenshotBug(base64, mimeType) {
  return callGemini([
    {
      text: "Опиши коротко на русском, какая проблема/баг виден на этом скриншоте интерфейса приложения. 1-3 предложения по делу, без вступлений и без markdown-разметки.",
    },
    { inline_data: { mime_type: mimeType, data: base64 } },
  ]);
}

/** Голосовое сообщение → текстовая транскрипция на русском. */
export async function transcribeVoice(base64, mimeType) {
  return callGemini([
    {
      text: "Транскрибируй это голосовое сообщение в текст на русском языке. Верни только транскрипцию, без комментариев и без markdown-разметки.",
    },
    { inline_data: { mime_type: mimeType, data: base64 } },
  ]);
}
