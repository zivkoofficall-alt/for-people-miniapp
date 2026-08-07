// api/_lib/pricingSettings.js
//
// Единственный источник правды по цене Pro-подписки. До этого фикса цена
// была захардкожена в ТРЁХ независимых местах (src/constants.js для
// витрины, api/create-stars-invoice.js для реального счёта, и локальный
// useState в AdminApp.jsx для самой панели) — поэтому смена цены в
// админке ничего не меняла ни в отображении, ни тем более в реальной
// сумме списания.
//
// НУЖНА ТАБЛИЦА В SUPABASE:
//   create table if not exists pricing_settings (
//     id smallint primary key default 1,
//     price_stars int not null default 599,
//     price_old int,
//     updated_at timestamptz not null default now(),
//     constraint pricing_settings_single_row check (id = 1)
//   );
//
// Таблица всегда содержит ровно одну строку (id=1) — это не история цен
// (та уже отдельно есть в PRICE_HISTORY на фронте), а текущее значение.

import { selectRows, upsertRow } from "./supabaseRest.js";

const DEFAULT_PRICE = { priceStars: 599, priceOld: 1999 };

export async function getPricing() {
  try {
    const rows = await selectRows("pricing_settings", "id=eq.1&select=price_stars,price_old&limit=1");
    const row = rows?.[0];
    if (!row) return { ...DEFAULT_PRICE };
    return { priceStars: row.price_stars, priceOld: row.price_old ?? null };
  } catch {
    return { ...DEFAULT_PRICE };
  }
}

export async function setPricing(priceStars, priceOld) {
  await upsertRow("pricing_settings", { id: 1, price_stars: priceStars, price_old: priceOld ?? null, updated_at: new Date().toISOString() }, "id");
}
