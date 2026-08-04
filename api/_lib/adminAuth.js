// api/_lib/adminAuth.js
//
// Общая проверка "это точно вошедший в систему админ" для всех
// /api/admin/* эндпоинтов.
//
// Два уровня доступа:
//   1) ADMIN_CHAT_IDS (env, тот же список, что уже используется для
//      бот-уведомлений) — это "бутстрап"-супер-админы. Нужны, чтобы
//      было кому создать самое первое приглашение — иначе таблица
//      admin_users пустая и никто не может туда никого добавить.
//   2) Таблица admin_users в Supabase — все, кто зашёл по приглашению.
//
// В обоих случаях личность подтверждается ТОЛЬКО через подпись Telegram
// initData (validateInitData) — никаких паролей, chat_id подделать нельзя.

import { validateInitData } from "./telegramAuth.js";
import { selectRows } from "./supabaseRest.js";

function bootstrapChatIds() {
  return (process.env.ADMIN_CHAT_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {string} initData — сырой window.Telegram.WebApp.initData с фронта
 * @returns {Promise<{ok:true, admin:object} | {ok:false, status:number, reason:string}>}
 */
export async function requireAdmin(initData) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const check = validateInitData(initData, botToken);
  if (!check.valid || !check.user?.id) {
    return { ok: false, status: 401, reason: check.reason || "не удалось подтвердить личность Telegram" };
  }
  const chatId = String(check.user.id);

  // Бутстрап-супер-админ из env — не обязан быть в таблице.
  if (bootstrapChatIds().includes(chatId)) {
    return {
      ok: true,
      admin: {
        chatId,
        name: check.user.first_name || "Супер-админ",
        tgUsername: check.user.username || null,
        role: "super",
        permissions: ["*"], // '*' = все разделы, проверяется отдельно
        status: "active",
        isBootstrap: true,
      },
    };
  }

  // Иначе ищем в базе.
  const rows = await selectRows("admin_users", `chat_id=eq.${encodeURIComponent(chatId)}&limit=1`);
  const row = rows?.[0];
  if (!row || row.status !== "active") {
    return { ok: false, status: 403, reason: "доступ не выдан или отозван" };
  }
  return {
    ok: true,
    admin: {
      chatId,
      name: row.name || check.user.first_name || "Админ",
      tgUsername: row.tg_username || check.user.username || null,
      role: row.role,
      permissions: row.permissions || [],
      status: row.status,
      isBootstrap: false,
    },
  };
}

/** Есть ли у админа доступ к разделу панели (или он супер-админ / бутстрап). */
export function hasPermission(admin, key) {
  if (!admin) return false;
  if (admin.role === "super") return true;
  if (Array.isArray(admin.permissions) && admin.permissions.includes("*")) return true;
  return Array.isArray(admin.permissions) && admin.permissions.includes(key);
}
