// api/_admin/admin-alerts-save.js
//
// Сохранить вкл/выкл конкретного алерта. Реально пишет в Supabase, поэтому
// значение переживает перезагрузку панели и учитывается в местах, которые
// шлют настоящие уведомления (см. handleGeminiFailure / bug-спайк в
// api/telegram-webhook.js).
//
// POST { initData, id, enabled }
// → 200 { ok: true }

import { requireAdmin, hasPermission } from "../_lib/adminAuth.js";
import { setAlertEnabled } from "../_lib/alertSettings.js";
import { logAdminAction } from "../_lib/auditLog.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData, id, enabled } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "alerts")) return res.status(403).json({ error: "нет прав менять алерты" });
  if (id === undefined || id === null || typeof enabled !== "boolean") {
    return res.status(400).json({ error: "Нужны id и enabled" });
  }

  await setAlertEnabled(id, enabled);
  await logAdminAction(auth.admin, `${enabled ? "Включил" : "Выключил"} алерт #${id}`);

  return res.status(200).json({ ok: true });
}
