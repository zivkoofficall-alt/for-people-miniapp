// api/admin-users-list.js
//
// Список реальных пользователей аппа для экрана "Пользователи".
// Простая пагинация + поиск по имени/username.
//
// POST { initData, search?, cursor? }
// → 200 { users: [...] }

import { requireAdmin, hasPermission } from "./_lib/adminAuth.js";
import { selectRows } from "./_lib/supabaseRest.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { initData, search } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "users")) {
    return res.status(403).json({ error: "нет прав смотреть пользователей" });
  }

  let query = "order=last_seen_at.desc&limit=200";
  if (search && search.trim()) {
    const term = encodeURIComponent(`%${search.trim()}%`);
    query += `&or=(tg_username.ilike.${term},first_name.ilike.${term},last_name.ilike.${term},chat_id.ilike.${term})`;
  }

  const rows = await selectRows("app_users", query);

  return res.status(200).json({
    users: (rows || []).map((u) => ({
      chatId: u.chat_id,
      tgUsername: u.tg_username,
      name: [u.first_name, u.last_name].filter(Boolean).join(" "),
      plan: u.plan,
      planSource: u.plan_source,
      blocked: u.blocked,
      firstSeenAt: u.first_seen_at,
      lastSeenAt: u.last_seen_at,
    })),
  });
}
