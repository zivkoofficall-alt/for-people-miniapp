// api/admin-update.js
//
// Меняет набор прав (и, при необходимости, роль) у уже активного
// администратора. Такая же защита от "остаться без супер-админа", как
// в admin-revoke.js.
//
// POST { initData, chatId, permissions: string[], role?, reason }
// → 200 { ok: true }

import { requireAdmin, hasPermission } from "../_lib/adminAuth.js";
import { selectRows, updateRows } from "../_lib/supabaseRest.js";
import { logAdminAction } from "../_lib/auditLog.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { initData, chatId, permissions, role } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "roles")) {
    return res.status(403).json({ error: "нет прав менять доступы администраторов" });
  }
  if (!chatId) return res.status(400).json({ error: "chatId обязателен" });
  if (!Array.isArray(permissions)) return res.status(400).json({ error: "permissions должен быть массивом" });
  if (role && role !== "super" && role !== "moderator") {
    return res.status(400).json({ error: "role должен быть 'super' или 'moderator'" });
  }

  const target = await selectRows("admin_users", `chat_id=eq.${encodeURIComponent(chatId)}&limit=1`);
  if (!target?.[0]) return res.status(404).json({ error: "администратор не найден" });

  const demotingFromSuper = target[0].role === "super" && role && role !== "super";
  if (demotingFromSuper) {
    const activeSupers = await selectRows("admin_users", "role=eq.super&status=eq.active");
    if ((activeSupers || []).length <= 1) {
      return res.status(409).json({ error: "нельзя понизить последнего супер-админа в базе" });
    }
  }

  const patch = { permissions };
  if (role) patch.role = role;
  await updateRows("admin_users", `chat_id=eq.${encodeURIComponent(chatId)}`, patch);
  await logAdminAction(auth.admin, "Изменены права администратора", `${target[0].name || chatId} → ${role || target[0].role}`);

  return res.status(200).json({ ok: true });
}
