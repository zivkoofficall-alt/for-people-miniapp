// api/telegram-webhook.js
//
// Принимает апдейты от Telegram Bot API (нужен ТОЛЬКО ради оплаты звёздами).
// Два события, которые нас интересуют:
//
// 1. pre_checkout_query — Telegram присылает его сразу после того, как
//    пользователь нажал "Оплатить" в счёте, и ждёт ответа не дольше 10
//    секунд. Если не ответить (или ответить ok:false) — платёж отменяется.
//    Здесь всегда отвечаем ok:true: у нас нет складского учёта или чего-то,
//    что могло бы сделать оплату невозможной на этом этапе.
//
// 2. message.successful_payment — приходит, когда звёзды реально списаны.
//    Здесь только логируем: реальный статус подписки обновляет сам клиент
//    (см. Profile.jsx → onActivateProViaStars) сразу после того, как
//    tg.openInvoice() вернул статус "paid" — в этом приложении нет
//    серверной базы пользователей, вся "подписка" живёт в том же
//    клиентском storage, что контакты/задачи/цели.
//
// НАСТРОЙКА (один раз, руками — из кода это не делается):
//   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://твой-домен.vercel.app/api/telegram-webhook
// Проверить, что применилось:
//   https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo
//
// --- Бот-накопитель баг-репортов (/endpoint) ---
// Дополнительно этот вебхук принимает от разрешённых чатов (личка и/или
// групповой чат команды — ADMIN_CHAT_IDS, через запятую):
//   текст        — сохраняется в буфер (Supabase, таблица bug_reports)
//   фото         — Gemini Vision описывает баг по скриншоту и сохраняет
//   голосовое    — Gemini транскрибирует и сохраняет как текст
//   /status      — показать, что сейчас в буфере, не очищая его
//   /clear       — очистить буфер без генерации промпта
//   /endpoint    — собрать промпт для Claude из буфера, поднять версию,
//                  прислать промпт + блок "Что обновлено"
//   /setversion X.Y.Z — вручную задать текущую версию
// Если бот добавлен в группу — у @BotFather нужно выключить Group Privacy
// (Bot Settings → Group Privacy → Turn off), иначе Bot API не увидит
// обычные сообщения без упоминания бота.
// Нужны переменные окружения: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// ADMIN_CHAT_IDS (один id или несколько через запятую), опционально
// GEMINI_API_KEY (для фото/голосовых — без ключа они просто игнорируются
// с вежливым ответом). Схема таблиц — в supabase/schema.sql.
//
// Опционально (для более подробных промптов в /endpoint, и обязательно
// для обновления файлов через документы — см. ниже): GITHUB_TOKEN
// (Personal Access Token, права Contents: Read and write) и GITHUB_REPO
// ("владелец/репозиторий") — если заданы вместе с GEMINI_API_KEY, /endpoint
// перед сборкой промпта прогоняет сырые заметки через Gemini со списком
// файлов репозитория для контекста (см. api/_lib/github.js,
// api/_lib/gemini.js → expandBugReports). Без них /endpoint работает как
// раньше — просто раскладывает сырой текст по фазам.
//
// --- Обновление файлов в GitHub через документ ---
// Если прислать боту файл документом (не фото) — он закоммитит его прямо
// в GITHUB_BRANCH (по умолчанию main), заменив файл с таким же путём.
// Путь берётся из подписи (caption) под файлом, например "src/App.jsx".
// Если подписи нет — бот ищет единственный файл с таким же именем в
// репозитории и использует его путь; если совпадений 0 или больше 1 —
// попросит прислать файл ещё раз с подписью-путём. Пишет СРАЗУ в main,
// без промежуточной проверки — если прислать не тот файл, придётся
// откатывать коммит вручную на GitHub (история коммитов не теряется).

import { insertRows, selectRows, updateRows, deleteRows, upsertRow } from "./_lib/supabaseRest.js";
import { bumpVersion, buildEndpointPrompt, buildUpdatedBlock, splitForTelegram } from "./_lib/endpointPrompt.js";
import { downloadTelegramFile } from "./_lib/telegramFile.js";
import { describeScreenshotBug, transcribeVoice, expandBugReports } from "./_lib/gemini.js";
import { getRepoFileList, isGithubConfigured, updateRepoFile } from "./_lib/github.js";

async function sendMessage(botToken, chatId, text) {
  for (const chunk of splitForTelegram(text)) {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: chunk }),
    });
  }
}

function todayStr() {
  return new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

function getAllowedChatIds() {
  return (process.env.ADMIN_CHAT_IDS || process.env.ADMIN_CHAT_ID || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function senderName(msg) {
  const from = msg.from || {};
  return [from.first_name, from.last_name].filter(Boolean).join(" ") || from.username || "Аноним";
}

async function getVersion(chatId) {
  const rows = await selectRows("bot_versions", `chat_id=eq.${chatId}&select=version`);
  return rows?.[0]?.version || "1.0.0";
}

async function handleBugBotUpdate(update, botToken) {
  const msg = update.message;
  if (!msg) return false;
  const chatId = msg.chat.id;
  const text = (msg.text || msg.caption || "").trim();

  // /diag работает ВСЕГДА, даже если ADMIN_CHAT_IDS ещё не настроен —
  // иначе непонятно, из-за чего бот молчит. Ничего секретного не палит,
  // только "задано / не задано" по каждой переменной.
  if (text === "/diag") {
    const checks = [
      ["TELEGRAM_BOT_TOKEN", process.env.TELEGRAM_BOT_TOKEN],
      ["SUPABASE_URL", process.env.SUPABASE_URL],
      ["SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY],
      ["ADMIN_CHAT_IDS / ADMIN_CHAT_ID", process.env.ADMIN_CHAT_IDS || process.env.ADMIN_CHAT_ID],
      ["GEMINI_API_KEY", process.env.GEMINI_API_KEY],
      ["GITHUB_TOKEN", process.env.GITHUB_TOKEN],
      ["GITHUB_REPO", process.env.GITHUB_REPO],
    ];
    const lines = checks.map(([name, val]) => `${val ? "✅" : "❌"} ${name}`);
    const allowedNow = getAllowedChatIds();
    const chatStatus = allowedNow.includes(String(chatId))
      ? "✅ этот чат в списке разрешённых"
      : `❌ этот чат НЕ в списке разрешённых (его id: ${chatId})`;
    let supabaseReachable = "не проверялось (нет SUPABASE_URL/KEY)";
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await selectRows("bug_reports", `limit=1`);
        supabaseReachable = "✅ соединение с таблицами ок";
      } catch (err) {
        supabaseReachable = `❌ ошибка соединения: ${String(err.message || err).slice(0, 200)}`;
      }
    }
    let githubReachable = "не проверялось (нет GITHUB_TOKEN/REPO — /endpoint будет работать без контекста файлов)";
    if (isGithubConfigured()) {
      try {
        const files = await getRepoFileList();
        githubReachable = `✅ репозиторий доступен (файлов: ${files?.length ?? 0})`;
      } catch (err) {
        githubReachable = `❌ ошибка доступа к репозиторию: ${String(err.message || err).slice(0, 200)}`;
      }
    }
    await sendMessage(
      botToken,
      chatId,
      ["Переменные окружения:", ...lines, "", chatStatus, supabaseReachable, githubReachable].join("\n")
    );
    return true;
  }

  const allowedChatIds = getAllowedChatIds();
  if (allowedChatIds.length === 0) return false;
  if (!allowedChatIds.includes(String(chatId))) return false; // чужой чат — игнорируем молча
  const from = senderName(msg);

  // --- Скриншот бага ---
  if (msg.photo?.length) {
    if (!process.env.GEMINI_API_KEY) {
      await sendMessage(botToken, chatId, "Скриншот получен, но GEMINI_API_KEY не настроен — опиши баг текстом.");
      return true;
    }
    try {
      const largest = msg.photo[msg.photo.length - 1]; // Telegram отдаёт по возрастанию размера
      const { base64, mimeType } = await downloadTelegramFile(botToken, largest.file_id);
      const description = await describeScreenshotBug(base64, mimeType);
      const finalText = `[Скриншот] ${description}`;
      await insertRows("bug_reports", [{ chat_id: chatId, message: finalText, sender_name: from }]);
      await sendMessage(botToken, chatId, `Добавлено в буфер ✅\n${finalText}`);
    } catch (err) {
      console.error("describeScreenshotBug error", err);
      await sendMessage(botToken, chatId, "Не получилось разобрать скриншот — опиши баг текстом.");
    }
    return true;
  }

  // --- Голосовое сообщение ---
  if (msg.voice) {
    if (!process.env.GEMINI_API_KEY) {
      await sendMessage(botToken, chatId, "Голосовое получено, но GEMINI_API_KEY не настроен — напиши текстом.");
      return true;
    }
    try {
      const { base64, mimeType } = await downloadTelegramFile(botToken, msg.voice.file_id);
      const transcript = await transcribeVoice(base64, mimeType);
      if (!transcript) throw new Error("пустая транскрипция");
      await insertRows("bug_reports", [{ chat_id: chatId, message: transcript, sender_name: from }]);
      await sendMessage(botToken, chatId, `Добавлено в буфер ✅ (по голосовому)\n${transcript}`);
    } catch (err) {
      console.error("transcribeVoice error", err);
      await sendMessage(botToken, chatId, "Не получилось распознать голосовое — напиши текстом.");
    }
    return true;
  }

  // --- Файл для обновления в GitHub ---
  // Админ присылает документ (файл проекта). Подпись (caption) под файлом
  // — это путь внутри репозитория, например "src/App.jsx". Если подписи
  // нет, бот пытается найти единственный файл с таким же именем в
  // репозитории и использует его путь; если совпадений несколько или нет
  // ни одного — просит прислать ещё раз с подписью-путём.
  if (msg.document) {
    if (!isGithubConfigured()) {
      await sendMessage(botToken, chatId, "Файл получен, но GITHUB_TOKEN/GITHUB_REPO не настроены на Vercel — обновить репозиторий не могу.");
      return true;
    }
    const fileName = msg.document.file_name || "";
    const caption = (msg.caption || "").trim();
    let targetPath = caption;

    try {
      if (!targetPath) {
        const allPaths = (await getRepoFileList()) || [];
        const matches = allPaths.filter((p) => p === fileName || p.endsWith("/" + fileName));
        if (matches.length === 1) {
          targetPath = matches[0];
        } else if (matches.length === 0) {
          await sendMessage(
            botToken,
            chatId,
            `Не нашёл в репозитории файл с именем "${fileName}". Пришли файл ещё раз, добавив подписью точный путь, например: src/App.jsx`
          );
          return true;
        } else {
          await sendMessage(
            botToken,
            chatId,
            ["Нашёл несколько файлов с таким именем:", ...matches.map((m) => `— ${m}`), "Пришли файл ещё раз с подписью — точным путём одного из них."].join("\n")
          );
          return true;
        }
      }

      const { base64 } = await downloadTelegramFile(botToken, msg.document.file_id);
      const buffer = Buffer.from(base64, "base64");
      const result = await updateRepoFile(targetPath, buffer, `Обновление ${targetPath} через Telegram (от ${from})`);
      await sendMessage(
        botToken,
        chatId,
        [`Готово ✅ ${targetPath} обновлён в main.`, result.commitUrl ? result.commitUrl : ""].filter(Boolean).join("\n")
      );
    } catch (err) {
      console.error("updateRepoFile error", err);
      await sendMessage(botToken, chatId, `Не получилось обновить файл: ${err.message || "неизвестная ошибка"}`);
    }
    return true;
  }

  if (!text) return false; // другой тип сообщения (стикер и т.п.) — молча пропускаем

  if (text === "/start" || text === "/help") {
    await sendMessage(
      botToken,
      chatId,
      [
        "Бот-накопитель баг-репортов готов.",
        "",
        "Пиши сюда баги/идеи текстом, скриншотом или голосовым — копятся в буфере.",
        "Пришли файл документом (с подписью-путём, например src/App.jsx) — обновлю его в GitHub напрямую.",
        "/status — что сейчас в буфере",
        "/clear — очистить буфер без генерации промпта",
        "/endpoint — собрать промпт для Claude и поднять версию",
        "/setversion 1.3.0 — вручную задать текущую версию",
        "/diag — проверить, какие переменные окружения настроены на Vercel",
      ].join("\n")
    );
    return true;
  }

  if (text === "/status") {
    const rows = await selectRows(
      "bug_reports",
      `chat_id=eq.${chatId}&status=eq.pending&order=created_at.asc&select=message,sender_name`
    );
    if (!rows?.length) {
      await sendMessage(botToken, chatId, "Буфер пуст. Напиши баг/идею, потом /endpoint.");
      return true;
    }
    const list = rows.map((r, i) => `${i + 1}. ${r.message}${r.sender_name ? ` (от ${r.sender_name})` : ""}`).join("\n");
    await sendMessage(botToken, chatId, `В буфере ${rows.length} шт.:\n\n${list}`);
    return true;
  }

  if (text === "/clear") {
    const deleted = await deleteRows("bug_reports", `chat_id=eq.${chatId}&status=eq.pending`);
    await sendMessage(botToken, chatId, `Буфер очищен (удалено: ${deleted?.length || 0}).`);
    return true;
  }

  if (text.startsWith("/setversion")) {
    const newVersion = text.replace("/setversion", "").trim();
    if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
      await sendMessage(botToken, chatId, "Формат: /setversion 1.3.0");
      return true;
    }
    await upsertRow("bot_versions", { chat_id: chatId, version: newVersion, updated_at: new Date().toISOString() }, "chat_id");
    await sendMessage(botToken, chatId, `Версия установлена: v${newVersion}`);
    return true;
  }

  if (text === "/endpoint") {
    const rows = await selectRows(
      "bug_reports",
      `chat_id=eq.${chatId}&status=eq.pending&order=created_at.asc&select=id,message,sender_name`
    );
    if (!rows?.length) {
      await sendMessage(botToken, chatId, "Буфер пуст — нечего собирать. Напиши баги/идеи, потом /endpoint.");
      return true;
    }

    const currentVersion = await getVersion(chatId);
    const newVersion = bumpVersion(currentVersion);
    const dateStr = todayStr();

    // Пытаемся развернуть сырые заметки в более техническую формулировку
    // через Gemini, опционально с контекстом реальной структуры файлов
    // репозитория (см. api/_lib/github.js). Если GEMINI_API_KEY не
    // настроен, GitHub не подключен, или сам вызов упал — тихо
    // откатываемся на исходный сырой текст заметок: /endpoint должен
    // продолжать работать в любом случае, просто без развёртывания.
    let promptRows = rows;
    if (process.env.GEMINI_API_KEY) {
      try {
        const fileList = await getRepoFileList().catch(() => null);
        const expanded = await expandBugReports(rows, fileList);
        promptRows = rows.map((r, i) => ({ ...r, message: expanded[i] || r.message }));
      } catch (err) {
        console.error("expandBugReports error", err);
        // promptRows остаётся исходным rows — /endpoint не падает.
      }
    }

    const prompt = buildEndpointPrompt(promptRows, { version: `v${newVersion}`, dateStr });
    const updatedBlock = buildUpdatedBlock({ version: newVersion, dateStr, count: rows.length });

    await sendMessage(botToken, chatId, prompt);
    await sendMessage(botToken, chatId, updatedBlock);

    const ids = rows.map((r) => r.id).join(",");
    await updateRows("bug_reports", `id=in.(${ids})`, { status: "sent" });
    await upsertRow("bot_versions", { chat_id: chatId, version: newVersion, updated_at: new Date().toISOString() }, "chat_id");
    return true;
  }

  // Обычное текстовое сообщение (не команда) — копим в буфер.
  if (!text.startsWith("/")) {
    await insertRows("bug_reports", [{ chat_id: chatId, message: text, sender_name: from }]);
    await sendMessage(botToken, chatId, "Добавлено в буфер ✅ (/status — посмотреть, /endpoint — собрать промпт)");
    return true;
  }

  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) {
    // Отвечаем 200 в любом случае — Telegram ретраит вебхук при ошибках,
    // а без токена мы всё равно ничего сделать не можем.
    res.status(200).json({ ok: true });
    return;
  }

  const update = req.body || {};

  try {
    const handledByBugBot = await handleBugBotUpdate(update, BOT_TOKEN);
    if (handledByBugBot) {
      res.status(200).json({ ok: true });
      return;
    }

    if (update.pre_checkout_query) {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pre_checkout_query_id: update.pre_checkout_query.id, ok: true }),
      });
    } else if (update.message?.successful_payment) {
      const sp = update.message.successful_payment;
      console.log("Stars payment successful", {
        chatId: update.message.chat?.id,
        totalAmount: sp.total_amount,
        currency: sp.currency,
        payload: sp.invoice_payload,
      });
    }
  } catch (err) {
    console.error("telegram-webhook error", err);
  }

  // Telegram ждёт быстрый 200 независимо от результата обработки выше —
  // иначе он посчитает вебхук недоступным и начнёт ретраить апдейты.
  res.status(200).json({ ok: true });
}
