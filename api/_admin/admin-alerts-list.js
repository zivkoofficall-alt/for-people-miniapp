// api/_admin/admin-alerts-list.js
//
// Текущее состояние тумблеров экрана "Алерты" — то, что реально сохранено
// в Supabase, а не дефолт из фронтенда.
//
// POST { initData }
// → 200 { settings: { "1": true, "2": true, ... } }

import { requireAdmin, hasPermission } from "../_lib/adminAuth.js";
import { getAlertSettings } from "../_lib/alertSettings.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "alerts")) return res.status(403).json({ error: "нет прав смотреть алерты" });

  const settings = await getAlertSettings();
  return res.status(200).json({ settings });
}
