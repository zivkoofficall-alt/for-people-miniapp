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

/**
 * Разворачивает сырые короткие заметки из буфера баг-репортов в чуть более
 * техническую формулировку для промпта Claude — по одной строке на каждый
 * исходный репорт, СТРОГО в том же порядке. Если передан fileList (список
 * путей файлов репозитория из api/_lib/github.js), просит Gemini учитывать
 * его как контекст структуры проекта.
 *
 * @param {Array<{message: string, sender_name?: string}>} reports
 * @param {string[]|null} fileList
 * @returns {Promise<Array<string|null>>} массив той же длины, что и reports;
 *   null на позиции означает "не удалось развернуть эту заметку" — вызывающий
 *   код (telegram-webhook.js) в этом случае подставляет исходный текст.
 */
export async function expandBugReports(reports, fileList) {
  if (!reports?.length) return [];

  const notes = reports.map((r, i) => `${i + 1}. ${r.message}`).join("\n");
  const fileContext = fileList?.length
    ? `\n\nСтруктура файлов репозитория (для контекста, если поможет понять, о какой части приложения речь):\n${fileList.join("\n")}`
    : "";

  const prompt = [
    "Ты помогаешь разворачивать сырые короткие заметки о багах/идеях в чуть более техническую формулировку для промпта другой AI-модели (Claude), которая будет чинить код по этому описанию.",
    `Вот ${reports.length} заметок:`,
    notes,
    fileContext,
    "",
    `Верни РОВНО ${reports.length} строк, по одной развёрнутой формулировке на каждую заметку, в ТОМ ЖЕ порядке. Без нумерации, без markdown, без пустых строк между ними — просто текст построчно. Ничего не добавляй до или после списка.`,
  ].join("\n");

  const text = await callGemini([{ text: prompt }]);
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Если модель вернула не то количество строк — не рискуем перепутать
  // порядок между заметками. Возвращаем null'ы: telegram-webhook.js
  // подставит вместо них исходный текст заметки.
  if (lines.length !== reports.length) {
    return reports.map(() => null);
  }
  return lines;
}
