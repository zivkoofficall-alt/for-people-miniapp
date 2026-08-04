// api/admin-revoke.js
//
// Отзывает доступ администратора (мягко — status='blocked', запись не
// удаляется, остаётся история). Нельзя отозвать последнего активного
// супер-админа в базе — иначе некому будет управлять ролями.
//
// POST { initData, chatId, reason }
// → 200 { ok: true }

import { requireAdmin, hasPermission } from "../_lib/adminAuth.js";
import { selectRows, updateRows } from "../_lib/supabaseRest.js";
import { logAdminAction } from "../_lib/auditLog.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { initData, chatId, reason } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "roles")) {
    return res.status(403).json({ error: "нет прав отзывать администраторов" });
  }
  if (!chatId) return res.status(400).json({ error: "chatId обязателен" });

  const target = await selectRows("admin_users", `chat_id=eq.${encodeURIComponent(chatId)}&limit=1`);
  if (!target?.[0]) return res.status(404).json({ error: "администратор не найден" });

  if (target[0].role === "super") {
    const activeSupers = await selectRows("admin_users", "role=eq.super&status=eq.active");
    if ((activeSupers || []).length <= 1) {
      return res.status(409).json({ error: "нельзя отозвать последнего супер-админа в базе" });
    }
  }

  await updateRows("admin_users", `chat_id=eq.${encodeURIComponent(chatId)}`, { status: "blocked" });
  await logAdminAction(auth.admin, "Отозван доступ администратора", `${target[0].name || chatId}${reason ? ` — ${reason}` : ""}`);

  return res.status(200).json({ ok: true });
}
