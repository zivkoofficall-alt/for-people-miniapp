// api/admin-heatmap.js
//
// Строит тепловую карту активности админов (день недели × часть суток)
// на основе реального журнала действий (admin_audit_log) за последние
// 28 дней. Отдельной таблицы для этого не нужно — используем то, что
// уже пишется при каждом действии (см. api/_lib/auditLog.js).

import { requireAdmin, hasPermission } from "../_lib/adminAuth.js";
import { selectRows } from "../_lib/supabaseRest.js";

// 0=Пн ... 6=Вс, чтобы совпадало с HEATMAP_DAYS во фронте.
function isoWeekday(date) {
  const jsDay = date.getDay(); // 0=Вс..6=Сб
  return jsDay === 0 ? 6 : jsDay - 1;
}
// 0=утро(6-12) 1=день(12-18) 2=вечер(18-24) 3=ночь(0-6)
function slotOf(date) {
  const h = date.getHours();
  if (h >= 6 && h < 12) return 0;
  if (h >= 12 && h < 18) return 1;
  if (h >= 18 && h < 24) return 2;
  return 3;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (auth.admin.role !== "super" && !hasPermission(auth.admin, "roles")) {
    return res.status(403).json({ error: "нет прав смотреть активность команды" });
  }

  const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
  const rows = await selectRows("admin_audit_log", `created_at=gt.${encodeURIComponent(since)}&select=created_at`);

  const grid = Array.from({ length: 7 }, () => [0, 0, 0, 0]);
  (rows || []).forEach((r) => {
    const d = new Date(r.created_at);
    grid[isoWeekday(d)][slotOf(d)] += 1;
  });

  return res.status(200).json({ grid });
}
