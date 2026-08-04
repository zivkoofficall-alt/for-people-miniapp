// api/admin-audit-list.js
import { requireAdmin, hasPermission } from "./_lib/adminAuth.js";
import { selectRows } from "./_lib/supabaseRest.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "audit")) return res.status(403).json({ error: "нет прав смотреть журнал" });

  const rows = await selectRows("admin_audit_log", "order=created_at.desc&limit=300");
  return res.status(200).json({
    log: (rows || []).map((r) => ({
      id: r.id,
      actorName: r.actor_name,
      action: r.action,
      details: r.details,
      createdAt: r.created_at,
    })),
  });
}
