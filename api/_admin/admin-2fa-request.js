// api/_admin/admin-2fa-request.js
//
// Запросить код подтверждения — реально уходит в личку админу через бота.
// Дергается при открытии TwoFactorSheet и по кнопке "Отправить ещё раз".
//
// POST { initData }
// → 200 { ok: true }

import { requireAdmin } from "../_lib/adminAuth.js";
import { requestTwoFactorCode } from "../_lib/admin2fa.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return res.status(500).json({ error: "TELEGRAM_BOT_TOKEN не настроен на сервере" });

  try {
    await requestTwoFactorCode(auth.admin, botToken);
  } catch (e) {
    return res.status(502).json({ error: "Не удалось отправить код в Telegram" });
  }

  return res.status(200).json({ ok: true });
}
