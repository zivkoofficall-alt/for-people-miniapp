// api/admin-list.js
//
// Список реальных админов + ещё не принятых приглашений — для экрана
// "Роли и доступы". Доступен только тем, у кого есть право "roles"
// (обычно супер-админ).
//
// POST { initData }
// → 200 { admins: [...], pendingInvites: [...] }

import { requireAdmin, hasPermission } from "./_lib/adminAuth.js";
import { selectRows } from "./_lib/supabaseRest.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { initData } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "roles")) {
    return res.status(403).json({ error: "нет прав смотреть список администраторов" });
  }

  const admins = await selectRows("admin_users", "status=eq.active&order=created_at.asc");
  const pendingInvites = await selectRows(
    "admin_invites",
    `status=eq.pending&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&order=created_at.desc`
  );

  return res.status(200).json({
    admins: (admins || []).map((a) => ({
      chatId: a.chat_id,
      name: a.name,
      tgUsername: a.tg_username,
      role: a.role,
      permissions: a.permissions,
      isYou: a.chat_id === auth.admin.chatId,
    })),
    pendingInvites: (pendingInvites || []).map((i) => ({
      token: i.token,
      role: i.role,
      permissions: i.permissions,
      createdAt: i.created_at,
      expiresAt: i.expires_at,
    })),
  });
}
