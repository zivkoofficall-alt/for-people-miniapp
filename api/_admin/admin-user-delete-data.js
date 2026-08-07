// api/_admin/admin-user-delete-data.js
//
// Настоящее удаление "по праву на забвение" — раньше кнопка просто писала
// строку в локальный лог и ничего в базе не трогала (потому что и
// удалять-то было нечего, USER_DATA_BY_ID — выдуманный объект).
//
// Удаляет РЕАЛЬНО то, что реально хранится на сервере: баг-репорты,
// реферальные связи (в обе стороны) и саму запись в app_users. Контакты/
// задачи/цели трогать не нужно — их на сервере никогда и не было (см.
// комментарий в api/_admin/admin-user-activity.js).
//
// POST { initData, chatId, reason? }
// → 200 { ok: true }

import { requireAdmin, hasPermission } from "../_lib/adminAuth.js";
import { deleteRows } from "../_lib/supabaseRest.js";
import { logAdminAction } from "../_lib/auditLog.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData, chatId, reason } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (auth.admin.role !== "super") return res.status(403).json({ error: "удалять данные пользователя может только супер-админ" });
  if (!hasPermission(auth.admin, "users")) return res.status(403).json({ error: "нет прав на пользователей" });
  if (!chatId) return res.status(400).json({ error: "chatId обязателен" });

  await deleteRows("bug_reports", `chat_id=eq.${encodeURIComponent(chatId)}`);
  await deleteRows("referrals", `referrer_chat_id=eq.${encodeURIComponent(chatId)}`);
  await deleteRows("referrals", `referred_chat_id=eq.${encodeURIComponent(chatId)}`);
  await deleteRows("app_users", `chat_id=eq.${encodeURIComponent(chatId)}`);

  await logAdminAction(auth.admin, `Удалил данные пользователя ${chatId} (право на забвение)`, reason || null);

  return res.status(200).json({ ok: true });
}
