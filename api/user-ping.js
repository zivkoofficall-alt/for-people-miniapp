// api/user-ping.js
//
// Вызывается один раз при каждом открытии обычного (не-админского) аппа.
// Ничего не решает и ни на что не влияет для самого пользователя — только
// регистрирует/обновляет запись в app_users, чтобы админка знала, кто
// вообще пользуется приложением. Если запрос не дойдёт или упадёт — апп
// продолжает работать как обычно, ничего не сломается.
//
// С реферальной программой (см. api/_lib/referrals.js) этот же эндпоинт
// заодно: 1) засчитывает реферала, если это первый визит человека и он
// пришёл по ссылке вида ?startapp=ref_<chatId>; 2) возвращает пригласившему
// (и вообще любому вызывающему) его текущую сводку — сколько друзей привёл
// и сколько бонусных AI-запросов накопил.
//
// Заодно отдаёт актуальную цену Pro (см. api/_lib/pricingSettings.js) —
// чтобы витрина в Profile.jsx не показывала цену, отличную от той, что
// реально выставляется в api/create-stars-invoice.js.
//
// POST { initData, plan?, startParam? }
// → 200 { ok: true, referral: { referredCount, bonusRequests }, pricing: { priceStars, priceOld } }

import { validateInitData } from "./_lib/telegramAuth.js";
import { selectRows, upsertRow } from "./_lib/supabaseRest.js";
import { recordReferralIfEligible, getReferralSummary } from "./_lib/referrals.js";
import { getPricing } from "./_lib/pricingSettings.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { initData, plan, startParam } = req.body || {};
  const check = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!check.valid || !check.user?.id) {
    // Не мешаем пользователю работать даже если это не удалось проверить —
    // просто не регистрируем визит.
    return res.status(200).json({ ok: false });
  }

  const chatId = String(check.user.id);

  // Проверяем ДО upsert — иначе после апдейта пользователь уже "существует"
  // и мы не отличим первый визит от сотого.
  let isNewUser = false;
  try {
    const existing = await selectRows("app_users", `chat_id=eq.${encodeURIComponent(chatId)}&limit=1`);
    isNewUser = !existing || existing.length === 0;
  } catch {
    // Не смогли проверить — на всякий случай считаем не новым, чтобы не
    // насчитать реферала повторно, если это временный сбой Supabase.
    isNewUser = false;
  }

  await upsertRow(
    "app_users",
    {
      chat_id: chatId,
      tg_username: check.user.username || null,
      first_name: check.user.first_name || null,
      last_name: check.user.last_name || null,
      ...(plan === "pro" || plan === "free" ? { plan } : {}),
      last_seen_at: new Date().toISOString(),
    },
    "chat_id"
  );

  if (isNewUser && typeof startParam === "string" && startParam.startsWith("ref_")) {
    const referrerChatId = startParam.slice(4);
    await recordReferralIfEligible(referrerChatId, chatId);
  }

  const referral = await getReferralSummary(chatId);
  const pricing = await getPricing();

  return res.status(200).json({ ok: true, referral, pricing });
}
