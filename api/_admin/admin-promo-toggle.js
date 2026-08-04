// api/admin-promo-toggle.js
//
// action: "toggle" — включить/выключить (active = !active)
// action: "delete" — удалить код совсем
import { requireAdmin, hasPermission } from "../_lib/adminAuth.js";
import { selectRows, updateRows, deleteRows } from "../_lib/supabaseRest.js";
import { logAdminAction } from "../_lib/auditLog.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData, id, action } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "promo")) return res.status(403).json({ error: "нет прав управлять промокодами" });
  if (!id) return res.status(400).json({ error: "id обязателен" });

  if (action === "delete") {
    const rows = await selectRows("promo_codes", `id=eq.${id}&limit=1`);
    await deleteRows("promo_codes", `id=eq.${id}`);
    await logAdminAction(auth.admin, "Удалён промокод", rows?.[0]?.code || String(id));
    return res.status(200).json({ ok: true });
  }

  const rows = await selectRows("promo_codes", `id=eq.${id}&limit=1`);
  const promo = rows?.[0];
  if (!promo) return res.status(404).json({ error: "промокод не найден" });
  await updateRows("promo_codes", `id=eq.${id}`, { active: !promo.active });
  await logAdminAction(auth.admin, !promo.active ? "Включён промокод" : "Выключен промокод", promo.code);
  return res.status(200).json({ ok: true });
}
