// api/create-stars-invoice.js
//
// Создаёт ссылку на оплату Pro-подписки звёздами Telegram (валюта "XTR")
// через Bot API createInvoiceLink и отдаёт её фронтенду — тот открывает её
// через window.Telegram.WebApp.openInvoice().
//
// Для звёзд НЕ нужен отдельный платёжный провайдер (в отличие от карт/СБП) —
// используется тот же TELEGRAM_BOT_TOKEN, что уже настроен для
// api/ai-proxy.js и api/send-csv.js. Никакого нового секрета заводить не надо.
//
// Цена и описание — здесь, на сервере, а не на клиенте: если считать цену
// во фронтенде и просто верить ей, человек с devtools мог бы подменить
// сумму перед отправкой. Здесь её невозможно подменить — источник правды
// один, и это сервер.
//
// ВАЖНО (одноразовая настройка, руками, не из кода):
// Чтобы платежи вообще завершались, у бота должен быть настроен webhook —
// Telegram обязан получить ответ на pre_checkout_query в течение 10 секунд,
// иначе платёж зависает и отваливается по таймауту. Этим занимается
// api/telegram-webhook.js — один раз выполни (например, в браузере или curl):
//   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://твой-домен.vercel.app/api/telegram-webhook

import { validateInitData } from "./_lib/telegramAuth.js";

// Цена в звёздах — единственное место в коде, где она задаётся. Меняешь
// здесь — меняется и то, что видит пользователь (Profile.jsx берёт цену
// для отображения из constants.js — если поменяешь цену, поменяй в обоих
// местах, чтобы витрина и реальный счёт не разъехались).
const PRO_PRICE_STARS = 599;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { initData } = req.body || {};
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  const auth = validateInitData(initData, BOT_TOKEN);
  if (!auth.valid) {
    res.status(401).json({ error: `Unauthorized: ${auth.reason}` });
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
        title: "for people — Pro Networker",
        description: "Безлимитный AI-поиск, AI-добавление контактов и анализ окружения на 1 месяц.",
        // payload — произвольная строка, которую Telegram вернёт нам обратно
        // в successful_payment на вебхуке. Кладём user.id, чтобы при желании
        // можно было связать оплату с конкретным пользователем в логах.
        payload: JSON.stringify({ tgUserId: auth.user?.id || null, plan: "pro_month" }),
        currency: "XTR", // XTR = Telegram Stars, единственная валюта без provider_token
        prices: [{ label: "Pro Networker (1 месяц)", amount: PRO_PRICE_STARS }],
      }),
    });
    const tgData = await tgResponse.json();

    if (!tgData.ok) {
      console.error("createInvoiceLink error", tgData);
      res.status(502).json({ error: tgData.description || "Telegram API вернул ошибку" });
      return;
    }
    res.status(200).json({ ok: true, link: tgData.result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Не получилось создать счёт" });
  }
}
