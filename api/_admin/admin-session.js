// api/admin-session.js
//
// Вызывается при каждом открытии админ-панели. Фронт присылает
// window.Telegram.WebApp.initData — сервер проверяет подпись и смотрит,
// есть ли этот chat_id в списке админов. Пароля нет и не будет: личность
// подтверждает сам Telegram, подделать initData снаружи нельзя.
//
// Заодно (реально, не мокnote) пишет строку в admin_login_log — см.
// api/_lib/adminLoginLog.js и экран "История входов" в панели.
//
// POST { initData: string }
// → 200 { admin: {...} }         — доступ есть
// → 401/403 { error: string }    — доступа нет

import { requireAdmin } from "../_lib/adminAuth.js";
import { logAdminLogin } from "../_lib/adminLoginLog.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { initData } = req.body || {};
  const result = await requireAdmin(initData);

  if (!result.ok) {
    return res.status(result.status).json({ error: result.reason });
  }
  await logAdminLogin(result.admin, req);
  return res.status(200).json({ admin: result.admin });
}
