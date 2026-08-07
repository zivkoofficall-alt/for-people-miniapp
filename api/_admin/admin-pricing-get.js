// api/_admin/admin-pricing-get.js
//
// Текущая реальная цена (та же, что использует api/create-stars-invoice.js
// при выставлении настоящего счёта) — грузится при открытии экрана
// "Оплата и цены", чтобы панель не показывала устаревшее число из
// локального дефолта.
//
// POST { initData }
// → 200 { priceStars, priceOld }

import { requireAdmin, hasPermission } from "../_lib/adminAuth.js";
import { getPricing } from "../_lib/pricingSettings.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "payment")) return res.status(403).json({ error: "нет прав смотреть оплату" });

  const pricing = await getPricing();
  return res.status(200).json(pricing);
}
