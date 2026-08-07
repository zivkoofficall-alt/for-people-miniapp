// api/_lib/alertSettings.js
//
// Персистентное хранение вкл/выкл для каждого алерта из экрана "Алерты"
// в админке. Раньше это был просто useState на фронте — при перезагрузке
// страницы всё сбрасывалось на дефолт, а реальные события (кончился
// лимит Gemini, всплеск багов) вообще не проверяли этот тумблер.
//
// НУЖНА ТАБЛИЦА В SUPABASE (один раз, SQL Editor → New query → Run):
//
//   create table if not exists alert_settings (
//     id smallint primary key,
//     enabled boolean not null default true,
//     updated_at timestamptz not null default now()
//   );
//
// Если таблицу не создать — всё продолжит работать на дефолтных
// значениях (см. DEFAULT_ALERTS ниже), просто тумблеры не будут
// сохраняться между открытиями панели.

import { selectRows, upsertRow } from "./supabaseRest.js";

// Должно совпадать по id с INITIAL_ALERTS на фронте (src/AdminApp.jsx).
export const DEFAULT_ALERTS = {
  1: true, // Gemini-квота на исходе
  2: true, // Всплеск багов
  3: true, // Подозрительный пользователь
  4: false, // Платёж не прошёл
};

/** Текущее состояние всех алертов, с фоллбэком на дефолт по каждому id. */
export async function getAlertSettings() {
  try {
    const rows = await selectRows("alert_settings", "select=id,enabled");
    const map = { ...DEFAULT_ALERTS };
    for (const r of rows || []) map[r.id] = Boolean(r.enabled);
    return map;
  } catch {
    return { ...DEFAULT_ALERTS };
  }
}

/** Включён ли конкретный алерт (по умолчанию — да, если строки в базе ещё нет). */
export async function isAlertEnabled(id) {
  const settings = await getAlertSettings();
  return settings[id] !== false;
}

export async function setAlertEnabled(id, enabled) {
  await upsertRow("alert_settings", { id, enabled, updated_at: new Date().toISOString() }, "id");
}
