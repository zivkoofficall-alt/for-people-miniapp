// api/admin-chat-list.js
//
// Отдаёт последние сообщения чата команды + отмечает, что этот админ
// прочитал их до текущего момента (для счётчика непрочитанных на главном
// экране). Простой поллинг с фронта — раз в несколько секунд запрашивает
// заново, без сокетов/реалтайма, этого достаточно для внутреннего чата
// команды из нескольких человек.

import { requireAdmin } from "./_lib/adminAuth.js";
import { selectRows, upsertRow } from "./_lib/supabaseRest.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });

  const rows = await selectRows("admin_chat_messages", "order=created_at.asc&limit=200");

  await upsertRow("admin_chat_reads", { admin_chat_id: auth.admin.chatId, last_read_at: new Date().toISOString() }, "admin_chat_id");

  return res.status(200).json({
    messages: (rows || []).map((m) => ({
      id: m.id,
      senderChatId: m.sender_chat_id,
      senderName: m.sender_name,
      text: m.text,
      createdAt: m.created_at,
      mine: m.sender_chat_id === auth.admin.chatId,
    })),
  });
}
