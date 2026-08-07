// api/_lib/referrals.js
//
// Реферальная программа. У каждого пользователя есть персональная ссылка
// вида:
//   https://t.me/<bot_username>/<app_short_name>?startapp=ref_<chatId>
// Когда по такой ссылке впервые открывает мини-апп новый человек — это
// засчитывается как реферал, и пригласивший получает бонус (доп. AI-запросы,
// см. REFERRAL_BONUS_AI_REQUESTS в src/constants.js — держите значения
// в синхроне вручную, т.к. фронт и бэкенд не шарят общий модуль).
//
// НУЖНА ТАБЛИЦА В SUPABASE (один раз, SQL Editor → New query → Run):
//
//   create table if not exists referrals (
//     id bigserial primary key,
//     referrer_chat_id text not null,
//     referred_chat_id text not null unique,
//     bonus_amount int not null default 5,
//     created_at timestamptz not null default now()
//   );
//
// unique на referred_chat_id — гарантия на уровне базы, что каждого
// пользователя засчитывают рефералом только один раз, даже при гонке
// (два одновременных открытия) или при повторном заходе по чужой ссылке
// позже (первый пригласивший остаётся первым).

import { selectRows, insertRows } from "./supabaseRest.js";

export const REFERRAL_BONUS_AI_REQUESTS = 5;

/**
 * Записать реферальную связь, если она ещё не существует. Вызывать ТОЛЬКО
 * для реально нового пользователя (первый визит) — иначе старые пользователи
 * смогли бы "привязаться" задним числом, просто открыв чужую ссылку.
 * Возвращает true, если связь реально создана.
 */
export async function recordReferralIfEligible(referrerChatId, referredChatId) {
  if (!referrerChatId || !referredChatId || referrerChatId === referredChatId) return false;
  try {
    const existing = await selectRows("referrals", `referred_chat_id=eq.${encodeURIComponent(referredChatId)}&limit=1`);
    if (existing && existing.length > 0) return false;
    await insertRows("referrals", [
      { referrer_chat_id: referrerChatId, referred_chat_id: referredChatId, bonus_amount: REFERRAL_BONUS_AI_REQUESTS },
    ]);
    return true;
  } catch (e) {
    // Либо гонка и unique-констрейнт в базе уже поймал дубль, либо таблицы
    // ещё нет — в обоих случаях просто не начисляем, не роняем сам визит.
    console.error("recordReferralIfEligible failed", e);
    return false;
  }
}

/** Сводка по рефералам конкретного пользователя (как пригласившего) — для экрана профиля. */
export async function getReferralSummary(chatId) {
  try {
    const rows = await selectRows("referrals", `referrer_chat_id=eq.${encodeURIComponent(chatId)}&select=bonus_amount`);
    const referredCount = rows?.length || 0;
    const bonusRequests = (rows || []).reduce((sum, r) => sum + (r.bonus_amount || 0), 0);
    return { referredCount, bonusRequests };
  } catch {
    return { referredCount: 0, bonusRequests: 0 };
  }
}
