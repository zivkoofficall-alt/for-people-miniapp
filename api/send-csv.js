// api/send-csv.js
//
// Отправляет CSV-выгрузку контактов пользователю в Telegram документом,
// через Bot API sendDocument. Это обязательно должно быть на backend —
// у Telegram.WebApp нет клиентского JS-метода для отправки файлов в чат,
// а BOT_TOKEN никогда не должен попадать во фронтенд.
//
// Настройка (аналогично api/ai-proxy.js):
// 1. Получи токен бота у @BotFather.
// 2. На Vercel: Settings → Environment Variables → BOT_TOKEN = токен.
// 3. VITE_SEND_CSV_URL во фронтенде укажи как
//    https://твой-домен.vercel.app/api/send-csv

import { validateInitData } from "./_lib/telegramAuth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { initData, csv, filename } = req.body || {};
  if (!initData || !csv) {
    res.status(400).json({ error: "initData и csv обязательны" });
    return;
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
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
    res.status(500).json({ error: "BOT_TOKEN не настроен на сервере" });
    return;
  }

  try {
    // BOM в начале — иначе Excel на Windows открывает кириллицу как "кракозябры".
    // Точно так же уже делает браузерный фолбэк в exportCsv() (App.jsx) — здесь
    // синхронизировано, чтобы оба пути выгрузки давали одинаково читаемый файл.
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv" });
    const form = new FormData();
    form.append("chat_id", String(userId));
    form.append("document", blob, filename || "for-people.csv");

    const tgResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
      method: "POST",
      body: form,
    });
    const tgData = await tgResponse.json();

    if (!tgData.ok) {
      console.error("Telegram sendDocument error", tgData);
      res.status(502).json({ error: tgData.description || "Telegram API вернул ошибку" });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Не получилось отправить файл" });
  }
}
