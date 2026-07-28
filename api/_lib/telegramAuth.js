// api/_lib/telegramAuth.js
//
// Официальный алгоритм проверки подлинности initData из документации
// Telegram (Validating data received via the Mini App):
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
//
// Идея: Telegram подписывает initData секретом, который сервер бота может
// пересчитать сам (HMAC-SHA256 от BOT_TOKEN), но клиент — нет. Если подпись
// (hash) совпадает с пересчитанной на сервере — данные точно пришли от
// Telegram и не подделаны на клиенте. Без этой проверки любой человек может
// открыть Mini App вне Telegram, руками сочинить initData с произвольным
// user.id и выдать себя за кого угодно — отсюда IDOR-риск, который эта
// функция и закрывает.

import crypto from "crypto";

/**
 * @param {string} initData — сырая строка window.Telegram.WebApp.initData
 * @param {string} botToken — токен бота, только на сервере, никогда не во фронтенде
 * @param {number} maxAgeSeconds — максимальный возраст initData (защита от replay-атак)
 * @returns {{ valid: boolean, reason?: string, user?: object|null }}
 */
export function validateInitData(initData, botToken, maxAgeSeconds = 86400) {
  if (!initData || typeof initData !== "string") {
    return { valid: false, reason: "initData отсутствует" };
  }
  if (!botToken) {
    return { valid: false, reason: "BOT_TOKEN не настроен на сервере" };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    return { valid: false, reason: "в initData нет hash" };
  }
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  // timingSafeEqual требует одинаковой длины буферов
  const hashBuf = Buffer.from(hash, "hex");
  const computedBuf = Buffer.from(computedHash, "hex");
  const hashesMatch = hashBuf.length === computedBuf.length && crypto.timingSafeEqual(hashBuf, computedBuf);

  if (!hashesMatch) {
    return { valid: false, reason: "подпись initData не совпадает" };
  }

  const authDate = parseInt(params.get("auth_date") || "0", 10);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (authDate && nowSeconds - authDate > maxAgeSeconds) {
    return { valid: false, reason: "initData устарела (защита от replay-атак)" };
  }

  let user = null;
  try {
    user = JSON.parse(params.get("user") || "null");
  } catch (e) {
    // user не распарсился — не фатально для валидности подписи, просто отдаём null
  }

  return { valid: true, user };
}
