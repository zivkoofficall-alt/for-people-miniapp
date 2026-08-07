// api/_admin/admin-user-set-plan.js
//
// Реально меняет тариф пользователя. Раньше кнопка в UserDetailScreen
// дёргала togglePlan(id), который просто мутировал локальный useState с
// захардкоженным INITIAL_USERS — ни один реальный пользователь так и не
// получал/терял Pro.
//
// POST { initData, chatId, plan: "pro"|"free", reason? }
// → 200 { ok: true }

import { requireAdmin } from "../_lib/adminAuth.js";
import { updateRows } from "../_lib/supabaseRest.js";
import { logAdminAction } from "../_lib/auditLog.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData, chatId, plan, reason } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (auth.admin.role !== "super") return res.status(403).json({ error: "менять тариф может только супер-админ" });
  if (!chatId || (plan !== "pro" && plan !== "free")) {
    return res.status(400).json({ error: "нужны chatId и plan ('pro' или 'free')" });
  }

  await updateRows("app_users", `chat_id=eq.${encodeURIComponent(chatId)}`, { plan, plan_source: "admin" });
  await logAdminAction(auth.admin, `Изменил тариф пользователя ${chatId} на ${plan}`, reason || null);

  return res.status(200).json({ ok: true });
}
