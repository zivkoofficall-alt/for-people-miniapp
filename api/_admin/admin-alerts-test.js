// api/_admin/admin-alerts-test.js
//
// Кнопка "Отправить тестовый алерт" — раньше просто показывала тост на
// фронте и ничего никуда не слала. Теперь реально отправляет сообщение
// в Telegram тому админу, который нажал кнопку (не всем сразу — чтобы не
// спамить команду каждый раз, когда кто-то проверяет, как выглядит алерт).
//
// POST { initData, name }
// → 200 { ok: true }

import { requireAdmin, hasPermission } from "../_lib/adminAuth.js";
import { sendMessage } from "../_lib/telegramNotify.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData, name } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "alerts")) return res.status(403).json({ error: "нет прав отправлять тестовые алерты" });

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: "TELEGRAM_BOT_TOKEN не настроен на сервере" });

  try {
    await sendMessage(
      botToken,
      auth.admin.chatId,
      `🔔 Тестовый алерт «${name || "без названия"}»\n\nЭто проверка — реальный алерт выглядит так же, но приходит по факту события.`
    );
  } catch (e) {
    return res.status(502).json({ error: "Не удалось отправить сообщение в Telegram" });
  }

  return res.status(200).json({ ok: true });
}
