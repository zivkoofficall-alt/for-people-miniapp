// api/_lib/geminiStatus.js
//
// Хранит "жив ли сейчас Gemini API" в Supabase — одна-единственная строка
// (id = 1). Это нужно для двух вещей:
//
//  1. Чтобы не слать в Telegram уведомление на КАЖДЫЙ упавший запрос —
//     только один раз, в момент, когда лимит только что кончился.
//  2. Чтобы можно было в любой момент спросить у бота командой /gemini,
//     не исчерпан ли лимит прямо сейчас (без уведомлений — просто узнать).
//
// НУЖНА ТАБЛИЦА В SUPABASE (создать один раз, скопировав в SQL Editor
// на supabase.com → твой проект → SQL Editor → New query → Run):
//
//   create table if not exists gemini_status (
//     id int primary key default 1,
//     quota_exceeded boolean not null default false,
//     last_error text,
//     last_error_at timestamptz,
//     notified boolean not null default false
//   );
//   insert into gemini_status (id) values (1) on conflict (id) do nothing;
//
// Если эту таблицу не создать — уведомления о лимите просто не будут
// работать (ошибка тихо игнорируется), всё остальное в боте продолжит
// работать как раньше.

import { selectRows, upsertRow } from "./supabaseRest.js";

const ROW_ID = 1;

const EMPTY_STATUS = {
  id: ROW_ID,
  quota_exceeded: false,
  last_error: null,
  last_error_at: null,
  notified: false,
};

/** true, если текст ошибки похож на "закончился лимит/квота" у Gemini. */
export function isQuotaError(err) {
  const msg = String(err?.message || err || "");
  return /RESOURCE_EXHAUSTED|429|quota/i.test(msg);
}

/** Текущий сохранённый статус Gemini (для команды /gemini). */
export async function getGeminiStatus() {
  try {
    const rows = await selectRows("gemini_status", `id=eq.${ROW_ID}&select=*`);
    return rows?.[0] || EMPTY_STATUS;
  } catch {
    return EMPTY_STATUS;
  }
}

/** Вызывать при УСПЕШНОМ ответе Gemini — сбрасывает флаг "лимит кончился". */
export async function markGeminiOk() {
  try {
    await upsertRow("gemini_status", { id: ROW_ID, quota_exceeded: false, notified: false }, "id");
  } catch {
    // нет таблицы/Supabase не настроен — просто не отслеживаем статус
  }
}

/**
 * Вызывать при ошибке вызова Gemini. Возвращает true, если это ПЕРВОЕ
 * обнаружение проблемы с лимитом после предыдущего успеха — то есть
 * вызывающему коду (telegram-webhook.js) стоит разослать уведомление.
 * Возвращает false, если уведомление по этой проблеме уже отправлялось,
 * или если ошибка не связана с лимитом.
 */
export async function markGeminiError(err) {
  const quotaExceeded = isQuotaError(err);
  try {
    const current = await getGeminiStatus();
    const alreadyNotified = Boolean(current.quota_exceeded && current.notified);

    await upsertRow(
      "gemini_status",
      {
        id: ROW_ID,
        quota_exceeded: quotaExceeded,
        last_error: String(err?.message || err || "").slice(0, 500),
        last_error_at: new Date().toISOString(),
        notified: quotaExceeded ? true : false,
      },
      "id"
    );

    return quotaExceeded && !alreadyNotified;
  } catch {
    // нет таблицы/Supabase не настроен — не можем понять, уведомляли ли
    // уже, поэтому на всякий случай уведомляем (лучше один раз лишний
    // раз написать, чем молчать про реально кончившийся лимит).
    return quotaExceeded;
  }
}
