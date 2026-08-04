// api/admin-promo-list.js
import { requireAdmin, hasPermission } from "../_lib/adminAuth.js";
import { selectRows } from "../_lib/supabaseRest.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "promo")) return res.status(403).json({ error: "нет прав смотреть промокоды" });

  const rows = await selectRows("promo_codes", "order=created_at.desc");
  return res.status(200).json({
    promos: (rows || []).map((p) => ({
      id: p.id,
      code: p.code,
      discount: p.discount_percent,
      usesCount: p.uses_count,
      usesLimit: p.uses_limit,
      boundChatId: p.bound_chat_id,
      expiresAt: p.expires_at,
      active: p.active,
    })),
  });
}
