// api/user-ping.js
//
// Вызывается один раз при каждом открытии обычного (не-админского) аппа.
// Ничего не решает и ни на что не влияет для самого пользователя — только
// регистрирует/обновляет запись в app_users, чтобы админка знала, кто
// вообще пользуется приложением. Если запрос не дойдёт или упадёт — апп
// продолжает работать как обычно, ничего не сломается.
//
// POST { initData, plan? }  — plan необязателен, просто для отображения
//                              в админке "какой тариф видит у себя клиент"
// → 200 { ok: true }

import { validateInitData } from "./_lib/telegramAuth.js";
import { upsertRow } from "./_lib/supabaseRest.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { initData, plan } = req.body || {};
  const check = validateInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!check.valid || !check.user?.id) {
    // Не мешаем пользователю работать даже если это не удалось проверить —
    // просто не регистрируем визит.
    return res.status(200).json({ ok: false });
  }

  await upsertRow(
    "app_users",
    {
      chat_id: String(check.user.id),
      tg_username: check.user.username || null,
      first_name: check.user.first_name || null,
      last_name: check.user.last_name || null,
      ...(plan === "pro" || plan === "free" ? { plan } : {}),
      last_seen_at: new Date().toISOString(),
    },
    "chat_id"
  );

  return res.status(200).json({ ok: true });
}
