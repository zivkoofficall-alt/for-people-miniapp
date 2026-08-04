// api/_lib/auditLog.js
//
// Пишет запись в admin_audit_log прямо на сервере, внутри самих действий
// (отозвали доступ, изменили права, создали промокод и т.д.) — так журнал
// нельзя случайно "не отправить" с фронта, и его нельзя подделать.

import { insertRows } from "./supabaseRest.js";

export async function logAdminAction(admin, action, details) {
  try {
    await insertRows("admin_audit_log", [
      {
        actor_chat_id: admin.chatId,
        actor_name: admin.name || admin.tgUsername || admin.chatId,
        action,
        details: details || null,
      },
    ]);
  } catch (e) {
    // Журнал не должен ронять само действие, если запись лога не удалась.
    console.error("audit log write failed", e);
  }
}
