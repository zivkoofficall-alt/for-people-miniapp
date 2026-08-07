// api/_admin/admin-login-history-delete.js
//
// Удаляет одну запись из истории входов. Важно понимать границы: это НЕ
// "выход с того устройства" — в модели авторизации через initData нет
// сессионных токенов, которые можно было бы инвалидировать (каждый запрос
// подписан заново самим Telegram-клиентом). Это просто чистка журнала.
// Если реально нужно лишить кого-то доступа — для этого есть отдельная,
// по-настоящему действующая кнопка "Отозвать доступ" в разделе "Админы"
// (см. api/_admin/admin-revoke.js).
//
// POST { initData, id }
// → 200 { ok: true }

import { requireAdmin } from "../_lib/adminAuth.js";
import { deleteLoginLogEntry } from "../_lib/adminLoginLog.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData, id } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!id) return res.status(400).json({ error: "Нужен id записи" });

  await deleteLoginLogEntry(auth.admin.chatId, id);
  return res.status(200).json({ ok: true });
}
