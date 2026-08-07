// api/_admin/admin-2fa-verify.js
//
// Проверить введённый код. Возвращает ok:false с человекочитаемой причиной
// (не совпал / истёк / не запрошен / слишком много попыток) — фронт просто
// показывает reason под полем ввода.
//
// POST { initData, code }
// → 200 { ok: true } | { ok: false, reason: string }

import { requireAdmin } from "../_lib/adminAuth.js";
import { verifyTwoFactorCode } from "../_lib/admin2fa.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData, code } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!code) return res.status(400).json({ error: "Нужен code" });

  const result = await verifyTwoFactorCode(auth.admin.chatId, code);
  return res.status(200).json(result);
}
