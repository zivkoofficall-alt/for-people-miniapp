// api/admin-user-block.js
//
// Ставит/снимает пометку "заблокирован" у пользователя. Сама по себе
// пометка ни на что в клиентском аппе пока не влияет (апп её не проверяет) —
// это задел на будущее и просто видимый статус в админке. Если нужно,
// чтобы блокировка реально запрещала пользоваться аппом, это отдельный шаг:
// клиент должен при каждом запуске спрашивать сервер "меня не заблокировали?".
//
// POST { initData, chatId, blocked }
// → 200 { ok: true }

import { requireAdmin, hasPermission } from "../_lib/adminAuth.js";
import { updateRows } from "../_lib/supabaseRest.js";
import { logAdminAction } from "../_lib/auditLog.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { initData, chatId, blocked } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "users")) {
    return res.status(403).json({ error: "нет прав блокировать пользователей" });
  }
  if (!chatId) return res.status(400).json({ error: "chatId обязателен" });

  await updateRows("app_users", `chat_id=eq.${encodeURIComponent(chatId)}`, { blocked: Boolean(blocked) });
  await logAdminAction(auth.admin, blocked ? "Заблокирован пользователь" : "Разблокирован пользователь", chatId);

  return res.status(200).json({ ok: true });
}
