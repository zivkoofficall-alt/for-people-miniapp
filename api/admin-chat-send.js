// api/admin-chat-send.js
import { requireAdmin } from "./_lib/adminAuth.js";
import { insertRows } from "./_lib/supabaseRest.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData, text } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });

  const clean = String(text || "").trim().slice(0, 2000);
  if (!clean) return res.status(400).json({ error: "Пустое сообщение" });

  await insertRows("admin_chat_messages", [{
    sender_chat_id: auth.admin.chatId,
    sender_name: auth.admin.name || auth.admin.tgUsername || auth.admin.chatId,
    text: clean,
  }]);

  return res.status(200).json({ ok: true });
}
