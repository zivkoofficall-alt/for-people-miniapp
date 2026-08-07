// api/_admin/admin-user-activity.js
//
// Реальные данные для вкладок детальной страницы пользователя. Честная
// оговорка: контакты/задачи/цели пользователя живут ТОЛЬКО в localStorage +
// Telegram.WebApp.CloudStorage на его устройстве (см. src/storage.js) —
// сервер их принципиально не видит, поэтому показывать их здесь нечестно
// и невозможно. Реально на сервере есть только: баг-репорты, которые
// пользователь присылал боту, и реферальные связи.
//
// POST { initData, chatId }
// → 200 { bugs: [...], referredBy: string|null, referred: [{ name, time }] }

import { requireAdmin, hasPermission } from "../_lib/adminAuth.js";
import { selectRows } from "../_lib/supabaseRest.js";

function displayName(u) {
  if (!u) return null;
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.tg_username || u.chat_id;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData, chatId } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "users")) return res.status(403).json({ error: "нет прав смотреть пользователей" });
  if (!chatId) return res.status(400).json({ error: "chatId обязателен" });

  const bugs = await selectRows(
    "bug_reports",
    `chat_id=eq.${encodeURIComponent(chatId)}&order=created_at.desc&select=id,message,status,created_at`
  );

  const referredByRows = await selectRows("referrals", `referred_chat_id=eq.${encodeURIComponent(chatId)}&select=referrer_chat_id&limit=1`);
  const referredRows = await selectRows("referrals", `referrer_chat_id=eq.${encodeURIComponent(chatId)}&select=referred_chat_id,created_at`);

  const otherIds = [...new Set([referredByRows?.[0]?.referrer_chat_id, ...(referredRows || []).map((r) => r.referred_chat_id)].filter(Boolean))];
  let byId = new Map();
  if (otherIds.length > 0) {
    const others = await selectRows("app_users", `chat_id=in.(${otherIds.map(encodeURIComponent).join(",")})&select=chat_id,first_name,last_name,tg_username`);
    byId = new Map((others || []).map((u) => [u.chat_id, u]));
  }

  const referredBy = referredByRows?.[0]
    ? displayName(byId.get(referredByRows[0].referrer_chat_id)) || referredByRows[0].referrer_chat_id
    : null;
  const referred = (referredRows || []).map((r) => ({
    name: displayName(byId.get(r.referred_chat_id)) || r.referred_chat_id,
    time: r.created_at,
  }));

  return res.status(200).json({ bugs: bugs || [], referredBy, referred });
}
