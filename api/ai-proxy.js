// api/ai-proxy.js
//
// Пример backend-прокси для Vercel (Serverless Function).
// Кладёшь этот файл в папку /api при деплое на Vercel — и он автоматически
// становится доступен по адресу https://твой-домен.vercel.app/api/ai-proxy
//
// Он держит ANTHROPIC_API_KEY у себя на сервере (Vercel Environment Variables),
// а не в коде фронтенда, куда может залезть кто угодно.
//
// Прокси НЕ привязан к конкретной фиче — он просто пересылает prompt в Claude
// и возвращает распарсенный JSON-ответ как есть. Что именно просить в JSON —
// решает вызывающий код (AiAssistantModal просит {message, matchIds},
// QuickAddAI просит {firstName, lastName, category, tags, ...}, и т.д.)
//
// С Фазы C эндпоинт требует валидный Telegram initData в теле запроса —
// без этого AI-запросы мог слать кто угодно с чужим (или произвольным)
// tgUserId, а мы платим за каждый вызов Anthropic API из своего кармана.
//
// Настройка:
// 1. Зарегистрируйся на console.anthropic.com, получи API-ключ.
// 2. В настройках проекта на Vercel: Settings → Environment Variables →
//    добавь ANTHROPIC_API_KEY = твой ключ, и BOT_TOKEN = токен бота от @BotFather.
// 3. VITE_AI_PROXY_URL в .env фронтенда укажи как
//    https://твой-домен.vercel.app/api/ai-proxy

import { validateInitData } from "./_lib/telegramAuth.js";

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

  const auth = validateInitData(initData, process.env.BOT_TOKEN);
  if (!auth.valid) {
    res.status(401).json({ error: `Unauthorized: ${auth.reason}` });
    return;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const text = (data.content || []).map((b) => b.text || "").join("\n");
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    // Возвращаем ровно то, что попросили в prompt — без предположений о форме.
    res.status(200).json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Не получилось обработать запрос." });
  }
}
