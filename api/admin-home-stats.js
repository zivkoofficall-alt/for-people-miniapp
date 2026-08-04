// api/admin-home-stats.js
//
// Одним запросом отдаёт всё, что нужно главному экрану админки: сводные
// цифры + 3 последних записи журнала. Раньше эти цифры считались на
// фронте из тестовых данных — теперь берутся из реальных таблиц.

import { requireAdmin } from "./_lib/adminAuth.js";
import { selectRows } from "./_lib/supabaseRest.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });

  const readRows = await selectRows("admin_chat_reads", `admin_chat_id=eq.${encodeURIComponent(auth.admin.chatId)}&limit=1`);
  const lastReadAt = readRows?.[0]?.last_read_at || "1970-01-01T00:00:00Z";

  const [users, transactions, openBugs, pendingInvites, recentLog, unreadChat] = await Promise.all([
    selectRows("app_users", "select=chat_id,plan,blocked&limit=5000"),
    selectRows("transactions", "select=amount_stars&limit=5000"),
    selectRows("bug_reports", "select=id&status=eq.pending&limit=1000"),
    selectRows("admin_invites", `select=id&status=eq.pending&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&limit=1000`),
    selectRows("admin_audit_log", "order=created_at.desc&limit=3"),
    selectRows("admin_chat_messages", `select=id&created_at=gt.${encodeURIComponent(lastReadAt)}&sender_chat_id=neq.${encodeURIComponent(auth.admin.chatId)}&limit=999`),
  ]);

  const totalUsers = (users || []).length;
  const proUsers = (users || []).filter((u) => u.plan === "pro").length;
  const revenueStars = (transactions || []).reduce((sum, t) => sum + (t.amount_stars || 0), 0);

  return res.status(200).json({
    totalUsers,
    proUsers,
    revenueStars,
    openBugs: (openBugs || []).length,
    pendingInvites: (pendingInvites || []).length,
    recentLog: (recentLog || []).map((r) => ({ id: r.id, actorName: r.actor_name, action: r.action, createdAt: r.created_at })),
    unreadChat: (unreadChat || []).length,
  });
}
