// api/_admin/admin-pricing-save.js
//
// Реально сохраняет новую цену — после этого api/create-stars-invoice.js
// сразу выставляет счета по новой цене (читает ту же таблицу
// pricing_settings при каждом запросе, без кэша и без отдельного деплоя).
//
// POST { initData, priceStars, priceOld }
// → 200 { ok: true }

import { requireAdmin, hasPermission } from "../_lib/adminAuth.js";
import { setPricing } from "../_lib/pricingSettings.js";
import { logAdminAction } from "../_lib/auditLog.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData, priceStars, priceOld } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "payment")) return res.status(403).json({ error: "нет прав менять оплату" });

  const price = Number(priceStars);
  if (!price || price <= 0) return res.status(400).json({ error: "Цена должна быть больше 0" });

  await setPricing(price, priceOld ? Number(priceOld) : null);
  await logAdminAction(auth.admin, `Изменил цену Pro на ${price} Stars`);

  return res.status(200).json({ ok: true });
}
