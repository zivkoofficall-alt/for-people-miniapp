// api/admin-referrals-list.js
//
// Реальные данные для экрана "Рефералы" в админке — раньше там был
// захардкоженный REFERRAL_DATA. Группирует таблицу referrals по
// пригласившему и подтягивает имена из app_users (сам referrals не хранит
// имена, только chat_id — так проще, если человек сменит имя в Telegram).
//
// POST { initData }
// → 200 { referrers: [{ chatId, name, referredCount, bonusEarned, referred: [name, ...] }] }

import { requireAdmin, hasPermission } from "../_lib/adminAuth.js";
import { selectRows } from "../_lib/supabaseRest.js";

function displayName(u) {
  if (!u) return null;
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.tg_username || u.chat_id;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "referrals")) return res.status(403).json({ error: "нет прав смотреть рефералов" });

  const rows = await selectRows("referrals", "select=referrer_chat_id,referred_chat_id,bonus_amount,created_at&order=created_at.desc");
  if (!rows || rows.length === 0) {
    return res.status(200).json({ referrers: [] });
  }

  const chatIds = [...new Set(rows.flatMap((r) => [r.referrer_chat_id, r.referred_chat_id]))];
  const users = await selectRows(
    "app_users",
    `chat_id=in.(${chatIds.map(encodeURIComponent).join(",")})&select=chat_id,first_name,last_name,tg_username`
  );
  const byId = new Map((users || []).map((u) => [u.chat_id, u]));

  const grouped = new Map();
  for (const r of rows) {
    const key = r.referrer_chat_id;
    if (!grouped.has(key)) {
      grouped.set(key, { chatId: key, name: displayName(byId.get(key)) || key, referredCount: 0, bonusEarned: 0, referred: [] });
    }
    const g = grouped.get(key);
    g.referredCount += 1;
    g.bonusEarned += r.bonus_amount || 0;
    g.referred.push(displayName(byId.get(r.referred_chat_id)) || r.referred_chat_id);
  }

  const referrers = [...grouped.values()].sort((a, b) => b.bonusEarned - a.bonusEarned);
  return res.status(200).json({ referrers });
}
