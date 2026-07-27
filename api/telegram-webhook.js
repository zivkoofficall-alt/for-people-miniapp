// api/telegram-webhook.js
//
// Сюда Telegram присылает апдейты о боте — нас интересуют ровно два типа,
// оба обязательны, чтобы оплата Stars вообще прошла:
//
// 1. pre_checkout_query — Telegram спрашивает "точно списывать звёзды?"
//    прямо перед оплатой. Нужно ответить ok:true в течение 10 секунд,
//    иначе Telegram сам отменит платёж и покажет пользователю ошибку.
//    Здесь можно (и в проде — нужно) проверить, что товар всё ещё
//    актуален; в нашем случае товар один и всегда доступен, поэтому
//    просто подтверждаем.
//
// 2. message.successful_payment — деньги реально списаны. Тут можно
//    что-то сделать на сервере (записать оплату в лог/БД, отправить
//    сообщение пользователю). Включение Pro-тарифа в этом проекте
//    происходит на клиенте сразу после Telegram.WebApp.openInvoice()
//    вернёт статус "paid" (см. handlePayWithStars в src/App.jsx) —
//    это надёжно, потому что статус приходит от самого Telegram, а не
//    придумывается на клиенте. Вебхук здесь — подстраховка и место,
//    куда позже можно добавить свою БД, если понадобится.
//
// Настройка (один раз, после деплоя):
// curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://твой-домен.vercel.app/api/telegram-webhook"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(200).json({ ok: true }); // Telegram иногда шлёт GET при проверке — не 405, просто ok
    return;
  }

  const update = req.body || {};
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  try {
    if (update.pre_checkout_query) {
      const q = update.pre_checkout_query;
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pre_checkout_query_id: q.id, ok: true }),
      });
    }

    if (update.message && update.message.successful_payment) {
      const payment = update.message.successful_payment;
      const chatId = update.message.chat.id;
      console.log("Оплата Stars прошла:", {
        chatId,
        amount: payment.total_amount,
        currency: payment.currency,
        payload: payment.invoice_payload,
      });

      // Необязательное подтверждение пользователю прямо в чат с ботом.
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "Оплата получена, спасибо! Pro Networker активирован — откройте приложение снова, если статус ещё не обновился.",
        }),
      });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("telegram-webhook error", err);
    // Telegram ретраит вебхук при не-200 — отвечаем 200 всегда, чтобы не зациклиться,
    // ошибку просто логируем.
    res.status(200).json({ ok: true });
  }
}
