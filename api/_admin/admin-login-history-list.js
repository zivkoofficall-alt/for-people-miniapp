// api/_admin/admin-login-history-list.js
//
// Реальная история входов ТЕКУЩЕГО админа (не всей команды — каждый видит
// только свои устройства, как в обычных настройках безопасности). См.
// api/_lib/adminLoginLog.js про то, что именно значит "реальная" здесь.
//
// POST { initData }
// → 200 { entries: [{ id, device, ip, time, current }] }

import { requireAdmin } from "../_lib/adminAuth.js";
import { getLoginHistory } from "../_lib/adminLoginLog.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });

  const rows = await getLoginHistory(auth.admin.chatId);
  // "Текущее устройство" — просто самая свежая запись (rows уже отсортированы
  // created_at.desc в getLoginHistory). Без выдумывания отдельного понятия
  // "активной сессии", которого в модели авторизации через initData нет —
  // каждый запрос самодостаточен, отдельного сессионного токена не существует.
  const entries = rows.map((r, i) => ({ ...r, current: i === 0 }));

  return res.status(200).json({ entries });
}
