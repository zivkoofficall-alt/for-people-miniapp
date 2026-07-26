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

const GEMINI_MODEL = "gemini-2.5-flash";

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
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Возвращаем ровно то, что попросили в prompt — без предположений о форме.
    res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Не получилось обработать запрос." });
  }
}
