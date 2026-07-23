import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Инициализация Telegram Web App (если открыто внутри Telegram)
const tg = window.Telegram && window.Telegram.WebApp;
if (tg) {
  tg.ready();
  tg.expand(); // раскрыть на весь экран
  // Подхватываем системную тему Telegram, чтобы фон совпадал с фоном чата
  document.body.style.backgroundColor = tg.themeParams?.bg_color || "#FBFAFC";
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
