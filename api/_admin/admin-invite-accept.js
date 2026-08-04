// api/admin-invite-accept.js
//
// Открывается автоматически, когда человек первый раз заходит в мини-апп
// по ссылке-приглашению (?startapp=inv_XXXX). Проверяет, что приглашение
// существует, не просрочено и ещё не использовано — и добавляет ЕГО
// настоящий Telegram chat_id (взятый из проверенной подписи initData,
// а не из того, что прислал фронт) в admin_users с правами из приглашения.
//
// POST { initData, token }
// → 200 { admin: {...} }             — доступ выдан
// → 400/401/404/409 { error: string } — приглашение недействительно

import { validateInitData } from "../_lib/telegramAuth.js";
import { selectRows, updateRows, upsertRow } from "../_lib/supabaseRest.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { initData, token } = req.body || {};
  if (!token || typeof token !== "string") {
    return res.status(400).json({ error: "token обязателен" });
  }

  const check = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!check.valid || !check.user?.id) {
    return res.status(401).json({ error: check.reason || "не удалось подтвердить личность Telegram" });
  }
  const chatId = String(check.user.id);

  const invites = await selectRows("admin_invites", `token=eq.${encodeURIComponent(token)}&limit=1`);
  const invite = invites?.[0];
  if (!invite) return res.status(404).json({ error: "приглашение не найдено" });
  if (invite.status !== "pending") return res.status(409).json({ error: "приглашение уже использовано или отозвано" });
  if (new Date(invite.expires_at) < new Date()) return res.status(409).json({ error: "приглашение просрочено" });

  await upsertRow(
    "admin_users",
    {
      chat_id: chatId,
      tg_username: check.user.username || null,
      name: [check.user.first_name, check.user.last_name].filter(Boolean).join(" ") || null,
      role: invite.role,
      permissions: invite.permissions,
      status: "active",
      invited_by: invite.created_by,
    },
    "chat_id"
  );

  await updateRows("admin_invites", `token=eq.${encodeURIComponent(token)}`, {
    status: "accepted",
    accepted_chat_id: chatId,
    accepted_at: new Date().toISOString(),
  });

  return res.status(200).json({
    admin: {
      chatId,
      name: [check.user.first_name, check.user.last_name].filter(Boolean).join(" ") || "Админ",
      tgUsername: check.user.username || null,
      role: invite.role,
      permissions: invite.permissions,
      status: "active",
    },
  });
}
