// api/_lib/admin2fa.js
//
// Настоящее 2FA-подтверждение критичных действий в админке (смена цены,
// блокировка/удаление пользователя, отзыв доступа админа и т.д.) — раньше
// TwoFactorSheet на фронте сам генерировал 4-значный код и тут же
// показывал его рядом с полем ввода ("демо"), то есть ничего не проверял.
//
// Теперь: код генерируется здесь, хэш кладётся в Supabase с TTL, а сам
// код уходит админу личным сообщением от бота в Telegram. Хэшируем перед
// хранением (а не сравниваем открытый текст), чтобы даже прямой доступ к
// таблице не давал действующий код.
//
// НУЖНА ТАБЛИЦА В SUPABASE:
//   create table if not exists admin_2fa_codes (
//     chat_id text primary key,
//     code_hash text not null,
//     expires_at timestamptz not null,
//     attempts int not null default 0
//   );

import crypto from "crypto";
import { upsertRow, selectRows, deleteRows } from "./supabaseRest.js";
import { sendMessage } from "./telegramNotify.js";

const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

/** Сгенерировать код, сохранить хэш и отправить в личку админу в Telegram. */
export async function requestTwoFactorCode(admin, botToken) {
  const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 цифр
  await upsertRow(
    "admin_2fa_codes",
    { chat_id: admin.chatId, code_hash: hashCode(code), expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(), attempts: 0 },
    "chat_id"
  );
  await sendMessage(
    botToken,
    admin.chatId,
    `🔐 Код подтверждения для действия в админ-панели: ${code}\n\nДействует 5 минут. Если это были не вы — просто проигнорируйте сообщение.`
  );
}

/** Проверить код. Возвращает { ok: true } либо { ok: false, reason }. */
export async function verifyTwoFactorCode(chatId, code) {
  const rows = await selectRows("admin_2fa_codes", `chat_id=eq.${encodeURIComponent(chatId)}&limit=1`);
  const row = rows?.[0];
  if (!row) return { ok: false, reason: "Код не запрошен — нажмите «Отправить код ещё раз»" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: "Код истёк — запросите новый" };
  if ((row.attempts || 0) >= MAX_ATTEMPTS) return { ok: false, reason: "Слишком много неверных попыток — запросите новый код" };

  if (hashCode(code) !== row.code_hash) {
    await upsertRow(
      "admin_2fa_codes",
      { chat_id: chatId, code_hash: row.code_hash, expires_at: row.expires_at, attempts: (row.attempts || 0) + 1 },
      "chat_id"
    );
    return { ok: false, reason: "Код не совпадает — проверьте и попробуйте снова" };
  }

  // Код одноразовый — использованный сразу удаляем, чтобы им нельзя было
  // подтвердить второе действие подряд.
  await deleteRows("admin_2fa_codes", `chat_id=eq.${encodeURIComponent(chatId)}`);
  return { ok: true };
}
