// api/telegram-webhook.js
//
// Принимает апдейты от Telegram Bot API (нужен ТОЛЬКО ради оплаты звёздами).
// Два события, которые нас интересуют:
//
// 1. pre_checkout_query — Telegram присылает его сразу после того, как
//    пользователь нажал "Оплатить" в счёте, и ждёт ответа не дольше 10
//    секунд. Если не ответить (или ответить ok:false) — платёж отменяется.
//    Здесь всегда отвечаем ok:true: у нас нет складского учёта или чего-то,
//    что могло бы сделать оплату невозможной на этом этапе.
//
// 2. message.successful_payment — приходит, когда звёзды реально списаны.
//    Здесь только логируем: реальный статус подписки обновляет сам клиент
//    (см. Profile.jsx → onActivateProViaStars) сразу после того, как
//    tg.openInvoice() вернул статус "paid" — в этом приложении нет
//    серверной базы пользователей, вся "подписка" живёт в том же
//    клиентском storage, что контакты/задачи/цели.
//
// НАСТРОЙКА (один раз, руками — из кода это не делается):
//   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://твой-домен.vercel.app/api/telegram-webhook
// Проверить, что применилось:
//   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) {
    // Отвечаем 200 в любом случае — Telegram ретраит вебхук при ошибках,
    // а без токена мы всё равно ничего сделать не можем.
    res.status(200).json({ ok: true });
    return;
  }

  const update = req.body || {};

  try {
    if (update.pre_checkout_query) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pre_checkout_query_id: update.pre_checkout_query.id, ok: true }),
      });
    } else if (update.message?.successful_payment) {
      const sp = update.message.successful_payment;
      console.log("Stars payment successful", {
        chatId: update.message.chat?.id,
        totalAmount: sp.total_amount,
        currency: sp.currency,
        payload: sp.invoice_payload,
      });
    }
  } catch (err) {
    console.error("telegram-webhook error", err);
  }

  // Telegram ждёт быстрый 200 независимо от результата обработки выше —
  // иначе он посчитает вебхук недоступным и начнёт ретраить апдейты.
  res.status(200).json({ ok: true });
}
