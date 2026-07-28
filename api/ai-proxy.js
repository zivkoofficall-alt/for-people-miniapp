// api/ai-proxy.js
//
// Пример backend-прокси для Vercel (Serverless Function).
// Кладёшь этот файл в папку /api при деплое на Vercel — и он автоматически
// становится доступен по адресу https://твой-домен.vercel.app/api/ai-proxy
//
// Он держит GEMINI_API_KEY у себя на сервере (Vercel Environment Variables),
// а не в коде фронтенда, куда может залезть кто угодно.
//
// Прокси НЕ привязан к конкретной фиче — он просто пересылает prompt в Gemini
// и возвращает распарсенный JSON-ответ как есть. Что именно просить в JSON —
// решает вызывающий код (AiAssistantModal просит {message, matchIds},
// QuickAddAI просит {firstName, lastName, category, tags, ...}, и т.д.)
//
// С Фазы C эндпоинт требует валидный Telegram initData в теле запроса —
// без этого AI-запросы мог слать кто угодно с чужим (или произвольным)
// tgUserId, а мы платим за каждый вызов Gemini API из своего кармана.
//
// Настройка:
// 1. Получи API-ключ в Google AI Studio (aistudio.google.com).
// 2. В настройках проекта на Vercel: Settings → Environment Variables →
//    добавь GEMINI_API_KEY = твой ключ, и TELEGRAM_BOT_TOKEN = токен бота от @BotFather.
// 3. VITE_AI_PROXY_URL в .env фронтенда укажи как
//    https://твой-домен.vercel.app/api/ai-proxy

import { validateInitData } from "./_lib/telegramAuth.js";

// gemini-flash-latest — это alias на "последний" релиз конкретной линейки,
// который может в любой момент указывать на экспериментальную модель
// (см. https://ai.google.dev/gemini-api/docs/models — раздел "Latest").
// Экспериментальные модели чаще "плывут" по формату ответа, из-за чего
// JSON.parse ниже падал на части естественных запросов, поэтому здесь
// зафиксирован конкретный стабильный (GA) релиз, а не alias.
//
// 28.07.2026: gemini-2.5-flash перестал быть доступен части ключей
// (Google отключил его досрочно, раньше объявленной даты в deprecations)
// — заменено на gemini-3.5-flash-lite, актуальный на этот момент
// GA-релиз, подходящий по цене/скорости именно для таких задач
// (сопоставление контактов по смыслу запроса, разбор в JSON).
// Если начнёт снова падать 404 "no longer available" — смотри
// https://ai.google.dev/gemini-api/docs/models на актуальный список.
const GEMINI_MODEL = "gemini-3.5-flash-lite";

// Достаёт JSON из ответа модели, даже если она (вопреки инструкции) обернула
// его в ```json ... ``` или добавила пояснение до/после объекта. Раньше был
// только грубый regex по тройным бэктикам — если модель добавляла хоть
// слово текста снаружи, JSON.parse падал и пользователь получал generic
// "Не получилось обработать запрос" без возможности понять, в чём дело.
function extractJson(text) {
  const stripped = text.replace(/```json|```/gi, "").trim();
  try {
    return JSON.parse(stripped);
  } catch (e) {
    // Второй шанс: вырезаем самый внешний {...} блок — так переживаем
    // случаи вида "Вот ответ:\n{...}" или "{...}\nНадеюсь, это поможет!".
    const start = stripped.indexOf("{");
    const end = stripped.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(stripped.slice(start, end + 1));
    }
    throw e;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { prompt, initData } = req.body || {};
  if (!prompt) {
    res.status(400).json({ error: "Пустой запрос" });
    return;
  }

  const auth = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!auth.valid) {
    res.status(401).json({ error: `Unauthorized: ${auth.reason}` });
    return;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          // responseMimeType: "application/json" заставляет Gemini вернуть
          // ЧИСТЫЙ JSON без markdown-обёртки и пояснений — раньше модель
          // иногда добавляла текст вокруг JSON, из-за чего парсинг падал
          // на естественных запросах ("Кто разбирается в праве" и т.п.).
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      res.status(502).json({ error: "AI-провайдер вернул ошибку." });
      return;
    }

    const text = (data.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("\n");

    let parsed;
    try {
      parsed = extractJson(text);
    } catch (parseErr) {
      console.error("AI JSON parse failed. Raw text:", text);
      res.status(502).json({ error: "AI вернул ответ в неожиданном формате. Попробуйте ещё раз." });
      return;
    }

    // Возвращаем ровно то, что попросили в prompt — без предположений о форме.
    res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Не получилось обработать запрос." });
  }
}
