// api/deploy-notify.js
//
// Уведомление в Telegram-бот при каждом успешном деплое проекта.
//
// ВАЖНО: account-level "Settings → Webhooks" на vercel.com доступны только
// на платных планах. На Free-тарифе используется обходной путь —
// GitHub Actions слушает событие deployment_status (его шлёт сам GitHub,
// когда GitHub-интеграция Vercel обновляет статус деплоя) и дёргает этот
// эндпоинт напрямую. Файл workflow'а: .github/workflows/notify-deploy.yml —
// см. инструкцию по настройке в README.md.
//
// Если план когда-нибудь станет платным — можно вместо этого настроить
// "родной" вебхук Vercel:
//   Team Settings → Webhooks → Add Webhook
//   Event: "Deployment Succeeded"
//   URL: https://твой-проект.vercel.app/api/deploy-notify?token=<DEPLOY_NOTIFY_SECRET>
// Оба варианта шлют сюда POST, этот файл разбирает оба формата тела и
// рассылает сообщение всем ADMIN_CHAT_IDS через уже готовые хелперы из
// api/_lib/telegramNotify.js (тот же TELEGRAM_BOT_TOKEN, что и everywhere
// else — отдельный секрет для бота заводить не нужно).
//
// DEPLOY_NOTIFY_SECRET — свой собственный секрет (просто случайная строка),
// задаётся в Vercel Environment Variables И как секрет репозитория в
// GitHub (Settings → Secrets and variables → Actions) — значение должно
// совпадать в обоих местах. Проверяем его как query-параметр ?token=, а не
// подпись x-vercel-signature/HMAC: у GitHub Actions такой подписи и вовсе
// нет, а serverless-функции здесь получают уже распарсенный JSON (req.body)
// без доступа к исходным байтам запроса — сверить HMAC байт-в-байт для
// вебхука Vercel тоже было бы нельзя. Секрет в URL, который никому не
// показываем, даёт то же самое на практике — защиту от того, что кто-то
// посторонний дёрнет этот эндпоинт вручную.
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

  // Тело запроса. Поддерживаем два формата:
  // 1) "родной" вебхук Vercel (Settings → Webhooks, только на платных
  //    планах) — вложенный { type, payload: { deployment, project } };
  // 2) плоское тело от GitHub Actions (см. .github/workflows/notify-deploy.yml)
  //    для Vercel Free, где вебхуков аккаунта нет — { type, target, url,
  //    project, branch, commit }. Не гадаем на 100% совпадение со схемой,
  //    поэтому читаем защищённо, с фоллбэками на случай отсутствия поля.
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
  const target = deployment.target || body.target || "production";
  const rawUrl = deployment.url || body.url || "";
  const url = rawUrl ? (rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`) : "";
  const projectName = project.name || deployment.name || body.project || "for-people-miniapp";
  const meta = deployment.meta || {};
  const branch = meta.githubCommitRef || meta.gitCommitRef || body.branch || "";
  const commitMsg = meta.githubCommitMessage || meta.gitCommitMessage || body.commit || "";

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
