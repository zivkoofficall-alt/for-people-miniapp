// api/_lib/telegramNotify.js
//
// Общие хелперы для отправки сообщений админам в Telegram. Раньше жили
// только внутри api/telegram-webhook.js — вынесены сюда, чтобы их мог
// переиспользовать и api/deploy-notify.js (уведомления об успешном
// деплое), не дублируя код отправки сообщений и разбора ADMIN_CHAT_IDS.

import { splitForTelegram } from "./endpointPrompt.js";

/** Отправить текст в один чат, при необходимости разбив на несколько сообщений (лимит Telegram — 4096 символов). */
export async function sendMessage(botToken, chatId, text) {
  for (const chunk of splitForTelegram(text)) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: chunk }),
    });
  }
}

/** ADMIN_CHAT_IDS (один id или несколько через запятую), с фоллбэком на устаревшее имя ADMIN_CHAT_ID. */
export function getAllowedChatIds() {
  return (process.env.ADMIN_CHAT_IDS || process.env.ADMIN_CHAT_ID || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Разослать текст во все разрешённые чаты. Ошибка отправки в один чат не должна ронять рассылку в остальные. */
export async function notifyAllAdmins(botToken, text) {
  const chatIds = getAllowedChatIds();
  for (const id of chatIds) {
    await sendMessage(botToken, id, text).catch(() => {});
  }
}
