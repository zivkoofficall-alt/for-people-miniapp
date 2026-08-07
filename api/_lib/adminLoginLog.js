// api/_lib/adminLoginLog.js
//
// Реальная история входов в админку — раньше в LoginHistoryScreen был
// захардкожен список из 4 придуманных сессий (macOS/Windows/Safari...).
//
// Важная честная оговорка: Telegram Mini App НЕ отдаёт браузеру/бэкенду
// модель устройства или точный город — это не обычная веб-сессия с cookie,
// а WebView внутри Telegram-клиента. Поэтому "устройство" здесь — лучшее,
// что можно честно извлечь из HTTP-заголовка User-Agent (Telegram
// подставляет в него реальные маркеры платформы — Android/iPhone/десктоп),
// а вместо города показываем IP-адрес запроса. Это настоящие данные,
// просто более скромные, чем красивый мок с городами.
//
// НУЖНА ТАБЛИЦА В SUPABASE (уже создана при разработке этой фичи — но
// если переносите код в другой проект Supabase, выполните разово):
//
//   create table if not exists admin_login_log (
//     id bigserial primary key,
//     chat_id text not null,
//     name text,
//     tg_username text,
//     ip text,
//     user_agent text,
//     created_at timestamptz not null default now()
//   );
//   create index if not exists admin_login_log_chat_id_idx
//     on admin_login_log (chat_id, created_at desc);

import { selectRows, insertRows, deleteRows } from "./supabaseRest.js";

// Не пишем новую строку чаще, чем раз в 30 минут с одного и того же
// устройства (chat_id + user_agent) — иначе при активной работе в
// админке (fetchAdminSession дергается при каждом запуске панели) лог
// быстро превратился бы в мусор из десятков одинаковых записей за час.
const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

function parseDeviceLabel(userAgent) {
  const ua = userAgent || "";
  if (/Telegram-Android|Android.*Telegram/i.test(ua)) return "Android · Telegram";
  if (/Android/i.test(ua)) return "Android";
  if (/iPhone|iPod/i.test(ua)) return "iPhone · Telegram";
  if (/iPad/i.test(ua)) return "iPad · Telegram";
  if (/TelegramDesktop|Macintosh.*Telegram/i.test(ua)) return "Telegram Desktop · macOS";
  if (/Macintosh/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return ua ? "Неизвестное устройство" : "Устройство не определено";
}

/** Вызывать сразу после успешной проверки initData в admin-session.js. */
export async function logAdminLogin(admin, req) {
  try {
    const ipHeader = req.headers["x-forwarded-for"];
    const ip = (Array.isArray(ipHeader) ? ipHeader[0] : ipHeader || "").split(",")[0].trim() || null;
    const userAgent = req.headers["user-agent"] || null;

    const since = new Date(Date.now() - DEDUPE_WINDOW_MS).toISOString();
    const recent = await selectRows(
      "admin_login_log",
      `chat_id=eq.${encodeURIComponent(admin.chatId)}&user_agent=eq.${encodeURIComponent(userAgent || "")}&created_at=gt.${encodeURIComponent(since)}&limit=1`
    );
    if (recent && recent.length > 0) return; // то же устройство недавно уже отметилось

    await insertRows("admin_login_log", [
      { chat_id: admin.chatId, name: admin.name || null, tg_username: admin.tgUsername || null, ip, user_agent: userAgent },
    ]);
  } catch (e) {
    // Логирование не должно ронять сам вход в панель, если сбой в базе.
    console.error("logAdminLogin failed", e);
  }
}

/** Последние входы конкретного админа — для экрана "История входов". */
export async function getLoginHistory(chatId) {
  const rows = await selectRows(
    "admin_login_log",
    `chat_id=eq.${encodeURIComponent(chatId)}&order=created_at.desc&limit=20`
  );
  return (rows || []).map((r) => ({
    id: r.id,
    device: parseDeviceLabel(r.user_agent),
    ip: r.ip || "IP неизвестен",
    time: r.created_at,
  }));
}

export async function deleteLoginLogEntry(chatId, id) {
  await deleteRows("admin_login_log", `id=eq.${encodeURIComponent(id)}&chat_id=eq.${encodeURIComponent(chatId)}`);
}
