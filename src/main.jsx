import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import AdminApp from "./AdminApp.jsx";
import { getAdminLaunchMode } from "./adminLaunch.js";

// Инициализация Telegram Web App (если открыто внутри Telegram)
const tg = window.Telegram && window.Telegram.WebApp;
let forcingReload = false;

if (tg) {
  tg.ready();
  tg.expand(); // раскрыть на весь экран
  // Подхватываем системную тему Telegram, чтобы фон совпадал с фоном чата
  document.body.style.backgroundColor = tg.themeParams?.bg_color || "#FBFAFC";

  // --- Защита от переиспользованного WebView при смене Telegram-аккаунта ---
  // На одном устройстве Telegram иногда переиспользует уже открытый WebView
  // мини-аппа вместо того, чтобы поднять его с нуля — особенно если мини-апп
  // недавно открывался и клиент держит его "тёплым" для скорости. Если между
  // этими открытиями пользователь переключил Telegram-аккаунт, JS-рантайм
  // может продолжить жить в памяти со СТАРЫМ initData: снаружи выглядит так,
  // будто зашли под новым аккаунтом, а App.jsx на самом деле продолжает
  // читать tgUserId старой сессии — из-за этого storageKey() берёт чужой
  // ключ хранилища и человек видит контакты другого аккаунта.
  //
  // Лечится жёстко, но надёжно: сравниваем id текущего пользователя с тем,
  // что видели в прошлый раз (обычный, ни к чему не привязанный ключ —
  // хранит только число, не привязан к storageKey() и ничего чувствительного
  // в себе не несёт). Если id изменился — значит это точно новый аккаунт на
  // старом WebView — принудительно перезагружаем страницу. Полная
  // перезагрузка (не просто сброс React-состояния) нужна потому, что и сам
  // объект window.Telegram.WebApp, и его внутренний мост к нативному клиенту
  // могут быть частью той же унаследованной памяти — сбросить надо всё, не
  // только наше приложение поверх него.
  const currentUserId = tg.initDataUnsafe?.user?.id ? String(tg.initDataUnsafe.user.id) : null;
  const lastSeenUserId = localStorage.getItem("fp_last_tg_user_id");
  if (currentUserId && lastSeenUserId && lastSeenUserId !== currentUserId) {
    localStorage.setItem("fp_last_tg_user_id", currentUserId);
    forcingReload = true;
    window.location.reload();
  } else if (currentUserId && !lastSeenUserId) {
    localStorage.setItem("fp_last_tg_user_id", currentUserId);
  }
}

// Пока не запущена принудительная перезагрузка (см. блок выше) — обычный
// старт приложения. Если reload уже вызван, рендерить нечего: страница
// сейчас перезагрузится и main.jsx выполнится заново с нуля.
if (!forcingReload) {
  const isAdminLaunch = getAdminLaunchMode().mode !== null;

  ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      {isAdminLaunch ? <AdminApp /> : <App />}
    </React.StrictMode>
  );
}
