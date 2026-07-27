// api/create-invoice.js
//
// Создаёт ссылку на оплату подписки Pro через Telegram Stars (валюта "XTR").
// Это официальный встроенный способ принимать оплату в Mini App / боте —
// без ИП, самозанятости и банковского эквайринга: звёзды покупаются внутри
// Telegram, а зачисление подтверждает сам Telegram (см. api/telegram-webhook.js).
//
// Настройка (аналогично api/send-csv.js):
// 1. Токен бота у @BotFather уже должен быть в TELEGRAM_BOT_TOKEN (используется
//    и в api/send-csv.js, и в api/ai-proxy.js — если уже настроено, тут ничего
//    менять не нужно).
// 2. VITE_CREATE_INVOICE_URL во фронтенде укажи как
//    https://твой-домен.vercel.app/api/create-invoice

import { validateInitData } from "./_lib/telegramAuth.js";

// Цена подписки в Stars. 1 Star ≈ 1.6-2 руб (курс определяет сама Telegram,
// периодически меняется) — подставь своё число, ориентируясь на актуальный
// курс и PRO_PRICE_LABEL в src/constants.js.
const PRO_PRICE_STARS = 150;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { initData } = req.body || {};
  if (!initData) {
    res.status(400).json({ error: "initData обязателен" });
    return;
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const auth = validateInitData(initData, BOT_TOKEN);
  if (!auth.valid) {
    res.status(401).json({ error: `Unauthorized: ${auth.reason}` });
    return;
  }
  const userId = auth.user && auth.user.id;
  if (!userId) {
    res.status(400).json({ error: "В initData нет user.id" });
    return;
  }

  if (!BOT_TOKEN) {
    res.status(500).json({ error: "TELEGRAM_BOT_TOKEN не настроен на сервере" });
    return;
  }

  try {
    const tgResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Pro Networker — подписка на 1 месяц",
        description: "Безлимитный AI-поиск, AI-добавление и анализ окружения на 30 дней",
        // payload — то, что вернётся нам в pre_checkout_query и successful_payment.
        // Кладём user_id, чтобы вебхук знал, кому шла оплата (в webhook initData
        // уже не приходит — это единственный способ связать платёж с юзером).
        payload: JSON.stringify({ userId, plan: "pro", ts: Date.now() }),
        currency: "XTR", // Telegram Stars — при этой валюте provider_token не нужен
        prices: [{ label: "Pro Networker, 1 месяц", amount: PRO_PRICE_STARS }],
      }),
    });
    const tgData = await tgResponse.json();

    if (!tgData.ok) {
      console.error("Telegram createInvoiceLink error", tgData);
      res.status(502).json({ error: tgData.description || "Telegram API вернул ошибку" });
      return;
    }
    res.status(200).json({ ok: true, link: tgData.result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Не получилось создать счёт на оплату" });
  }
}
