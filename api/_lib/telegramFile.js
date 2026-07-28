// api/_lib/telegramFile.js
//
// Скачивает файл, присланный в Telegram (фото/голосовое), и возвращает
// его как base64 — готовый формат для отправки в Gemini (inline_data).

function guessMimeType(filePath) {
  const lower = (filePath || "").toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".oga") || lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  return "application/octet-stream";
}

/** @returns {{ base64: string, mimeType: string }} */
export async function downloadTelegramFile(botToken, fileId) {
  const infoRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`);
  const info = await infoRes.json();
  if (!info.ok) throw new Error(`getFile failed: ${info.description || "unknown"}`);

  const filePath = info.result.file_path;
  const fileRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${filePath}`);
  const arrayBuffer = await fileRes.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  return { base64, mimeType: guessMimeType(filePath) };
}
