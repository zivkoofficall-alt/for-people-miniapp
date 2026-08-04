// src/adminLaunch.js
//
// Определяет, зачем открыт мини-апп: обычный пользователь, обычный
// администратор, или человек, перешедший по ссылке-приглашению.
//
// Telegram сам подставляет start_param, когда ссылка выглядит так:
//   https://t.me/<bot_username>/<app_short_name>?startapp=admin
//   https://t.me/<bot_username>/<app_short_name>?startapp=inv_XXXXXXXX
// (см. admin-invite-create.js — он и генерирует startParam: "inv_"+token)

export function getAdminLaunchMode() {
  const startParam =
    (typeof window !== "undefined" && window.Telegram?.WebApp?.initDataUnsafe?.start_param) || "";

  if (startParam.startsWith("inv_")) {
    return { mode: "invite", token: startParam.slice(4) };
  }
  if (startParam === "admin") {
    return { mode: "admin", token: null };
  }
  // Резервный вариант для тестирования в обычном браузере (вне Telegram),
  // где initDataUnsafe пустой: ?admin=1 в адресной строке.
  if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("admin") === "1") {
    return { mode: "admin", token: null };
  }
  return { mode: null, token: null };
}
