// api/verify-channel-sub.js
//
// Начисляет бонус в +CHANNEL_BONUS_AMOUNT бесплатных AI-запросов (см.
// constants.js) за подписку на Telegram-канал. Проверка — СТРОГО на бэкенде,
// через официальный метод Bot API getChatMember:
// https://core.telegram.org/bots/api#getchatmember
//
// Почему нельзя проверять на фронтенде: у Mini App нет клиентского способа
// узнать, состоит ли пользователь в канале — это возвращает только Bot API,
// а он требует BOT_TOKEN, который не должен попадать в браузер. Если бы
// "проверка" делалась в JS на клиенте (например, просто по факту клика на
// кнопку "Я подписался"), это было бы фикцией — бонус получил бы кто угодно,
// не подписываясь вообще.
//
// ⚠️ ОБЯЗАТЕЛЬНОЕ УСЛОВИЕ: бот должен быть добавлен в канал @people_circle
// как участник (для публичного канала обычно проще сразу сделать его
// администратором канала — иначе Telegram может не отдавать список
// подписчиков через getChatMember для ботов-неадминов приватных каналов).
// Без этого getChatMember будет возвращать ошибку вида
// "Bad Request: member list is inaccessible" и подписка никогда не
// подтвердится, даже у реально подписанных пользователей.
//
// Настройка:
// 1. TELEGRAM_BOT_TOKEN уже должен быть задан на Vercel (тот же, что и для
//    ai-proxy.js / send-csv.js).
// 2. Добавь бота как администратора канала https://t.me/people_circle
//    (Настройки канала → Администраторы → Добавить администратора).
// 3. В .env фронтенда впиши VITE_VERIFY_CHANNEL_SUB_URL (см. .env.example).
// 4. Необязательно, но рекомендуется — задай SUPABASE_URL и
//    SUPABASE_SERVICE_ROLE_KEY (та же база, что и для gemini_status /
//    баг-репортов), чтобы факт начисления бонуса хранился НЕ ТОЛЬКО в
//    CloudStorage/localStorage пользователя (который тот теоретически может
//    у себя сбросить и попытаться получить бонус повторно), а и на сервере.
//    Без Supabase бонус всё равно работает и подписка всё равно проверяется
//    честно — просто повторная попытка claim'а полагается только на
//    клиентский флаг channelBonusClaimed.

import { validateInitData } from "./_lib/telegramAuth.js";
import { selectRows, upsertRow } from "./_lib/supabaseRest.js";

// Username канала без "@" — здесь, а не только в src/constants.js, потому
// что бэкенд не импортирует фронтенд-код (отдельные бандлы). Если меняешь
// канал — поменяй в обоих местах: здесь и в src/constants.js (CHANNEL_URL).
const CHANNEL_USERNAME = "people_circle";

const SUBSCRIBED_STATUSES = new Set(["member", "administrator", "creator"]);

/** Лучшая попытка узнать, начислен ли уже бонус этому tg-юзеру (Supabase). */
async function alreadyClaimedServerSide(tgUserId) {
  try {
    const rows = await selectRows("channel_bonus_claims", `tg_user_id=eq.${tgUserId}&select=tg_user_id`);
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    // Таблицы/Supabase нет — не можем проверить server-side, не блокируем.
    return false;
  }
}

async function recordClaimServerSide(tgUserId) {
  try {
    await upsertRow("channel_bonus_claims", { tg_user_id: tgUserId, claimed_at: new Date().toISOString() }, "tg_user_id");
  } catch {
    // Нет таблицы — просто не сохраняем server-side, бонус всё равно начислен.
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { initData } = req.body || {};
  const auth = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.valid || !auth.user || !auth.user.id) {
    res.status(401).json({ error: `Unauthorized: ${auth.reason || "нет данных пользователя"}` });
    return;
  }

  const tgUserId = auth.user.id;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  try {
    const alreadyClaimed = await alreadyClaimedServerSide(tgUserId);

    const url = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=@${CHANNEL_USERNAME}&user_id=${tgUserId}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data.ok) {
      // Частая причина: бот не состоит в канале (см. комментарий сверху файла).
      console.error("getChatMember failed:", data);
      res.status(502).json({ error: "Не получилось проверить подписку на канал. Попробуйте позже." });
      return;
    }

    const status = data.result?.status;
    const subscribed = SUBSCRIBED_STATUSES.has(status);

    if (subscribed && !alreadyClaimed) {
      await recordClaimServerSide(tgUserId);
    }

    res.status(200).json({ ok: true, subscribed, alreadyClaimed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Не получилось проверить подписку." });
  }
}
