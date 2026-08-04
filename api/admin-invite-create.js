// api/admin-invite-create.js
//
// Только для уже вошедших админов с правом управлять ролями ("roles").
// Создаёт одноразовую ссылку-приглашение с заранее заданным набором прав.
// Тот, кто по ней перейдёт, автоматически станет админом с этими правами —
// см. api/admin-invite-accept.js.
//
// POST { initData, role: "super"|"moderator", permissions: string[] }
// → 200 { token, path }   — path нужно приклеить к вашей t.me-ссылке мини-аппа

import crypto from "crypto";
import { requireAdmin, hasPermission } from "./_lib/adminAuth.js";
import { insertRows } from "./_lib/supabaseRest.js";
import { logAdminAction } from "./_lib/auditLog.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { initData, role, permissions } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "roles")) {
    return res.status(403).json({ error: "нет прав приглашать администраторов" });
  }

  if (role !== "super" && role !== "moderator") {
    return res.status(400).json({ error: "role должен быть 'super' или 'moderator'" });
  }

  const token = crypto.randomBytes(16).toString("hex"); // 32 символа, угадать нельзя

  await insertRows("admin_invites", [
    {
      token,
      role,
      permissions: Array.isArray(permissions) ? permissions : [],
      created_by: auth.admin.chatId,
    },
  ]);
  await logAdminAction(auth.admin, "Создана ссылка-приглашение", `роль: ${role}`);

  // startapp-параметр Telegram Mini App должен состоять только из
  // [A-Za-z0-9_-], поэтому префикс "inv_" + hex-токен подходит без изменений.
  return res.status(200).json({ token, startParam: `inv_${token}` });
}
