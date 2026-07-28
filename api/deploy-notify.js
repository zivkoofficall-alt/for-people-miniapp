// api/deploy-notify.js
//
// Уведомление в Telegram-бот при каждом успешном деплое проекта.
//
// Как это работает: Vercel умеет сам стучаться в произвольный URL при
// событиях аккаунта/команды (Settings → Webhooks на vercel.com — это
// НЕ то же самое, что api/telegram-webhook.js, который слушает события
// от Telegram). Настраиваешь там один раз:
//   1. Event: "Deployment Succeeded"
//   2. URL: https://твой-проект.vercel.app/api/deploy-notify?token=<DEPLOY_NOTIFY_SECRET>
//   3. Project: этот проект
// После этого при каждом успешном деплое Vercel сам пришлёт сюда payload,
// а этот файл разошлёт короткое сообщение всем ADMIN_CHAT_IDS через уже
// готовые хелперы из api/_lib/telegramNotify.js (тот же TELEGRAM_BOT_TOKEN,
// что и everywhere else — отдельный секрет для бота заводить не нужно).
//
// DEPLOY_NOTIFY_SECRET — свой собственный секрет (просто случайная строка),
// задаётся в Vercel Environment Variables. Проверяем его как query-параметр
// ?token=, а не подпись x-vercel-signature: Vercel подписывает HMAC'ом
// сырого тела запроса, а serverless-функции здесь получают уже распарсенный
// JSON (req.body) без доступа к исходным байтам — сверить подпись байт-в-байт
// поэтому нельзя. Секрет в URL, который знает только Vercel (URL вебхука
// нигде публично не светится), даёт то же самое на практике — защиту от
// того, что кто-то посторонний дёрнет этот эндпоинт вручную.
import { notifyAllAdmins } from "./_lib/telegramNotify.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const expectedSecret = process.env.DEPLOY_NOTIFY_SECRET;
  if (!expectedSecret) {
    // Секрет не настроен на Vercel — не глушим тихо, а явно говорим, в
    // чём дело (сообщение попадёт в логи функции на Vercel).
    res.status(500).json({ error: "DEPLOY_NOTIFY_SECRET не настроен на сервере" });
    return;
  }
  if (req.query?.token !== expectedSecret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) {
    res.status(500).json({ error: "TELEGRAM_BOT_TOKEN не настроен на сервере" });
    return;
  }

  // Тело запроса от Vercel — не гадаем на 100% совпадение со схемой (Vercel
  // может её менять), поэтому читаем защищённо, с фоллбэками на случай,
  // если какого-то поля не будет.
  const body = req.body || {};
  const type = body.type || body.event || "";

  // Реагируем только на успешный деплой — на остальные события (created,
  // error, canceled) молчим, чтобы не спамить бота на каждый пуш.
  if (type && type !== "deployment.succeeded" && type !== "deployment.ready") {
    res.status(200).json({ ok: true, skipped: type });
    return;
  }

  const deployment = body.payload?.deployment || body.payload || {};
  const project = body.payload?.project || {};
  const target = deployment.target || body.payload?.target || "production";
  const url = deployment.url ? `https://${deployment.url}` : "";
  const projectName = project.name || deployment.name || "for-people-miniapp";
  const meta = deployment.meta || {};
  const branch = meta.githubCommitRef || meta.gitCommitRef || "";
  const commitMsg = meta.githubCommitMessage || meta.gitCommitMessage || "";

  const lines = [
    `✅ Деплой «${projectName}» прошёл успешно`,
    `Окружение: ${target}`,
  ];
  if (branch) lines.push(`Ветка: ${branch}`);
  if (commitMsg) lines.push(`Коммит: ${commitMsg.split("\n")[0]}`);
  if (url) lines.push(url);

  try {
    await notifyAllAdmins(BOT_TOKEN, lines.join("\n"));
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    // Всё равно отвечаем 200 — Vercel не должен ретраить/помечать вебхук
    // как сбойный из-за проблем с нашей стороной уведомления.
    res.status(200).json({ ok: false, error: "notify failed" });
  }
}
