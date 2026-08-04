// api/admin-bugs-list.js
//
// Список реальных баг-репортов (та же таблица, что наполняет бот в
// Telegram через /endpoint — см. api/telegram-webhook.js). Статусы в базе
// всего два: "pending" (ещё не собран в промпт) и "sent" (уже забрали).

import { requireAdmin, hasPermission } from "./_lib/adminAuth.js";
import { selectRows } from "./_lib/supabaseRest.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "bugs")) return res.status(403).json({ error: "нет прав смотреть баг-репорты" });

  const rows = await selectRows("bug_reports", "order=created_at.desc&limit=300");
  return res.status(200).json({
    bugs: (rows || []).map((b) => ({
      id: b.id,
      message: b.message,
      senderName: b.sender_name,
      status: b.status,
      createdAt: b.created_at,
    })),
  });
}
