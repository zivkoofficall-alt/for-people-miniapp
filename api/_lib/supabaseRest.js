// api/_lib/supabaseRest.js
//
// Минимальная обёртка над Supabase REST (PostgREST) через обычный fetch —
// без npm-пакета @supabase/supabase-js, чтобы не раздувать бандл serverless
// функции ради нескольких запросов. Работает только с сервера (Vercel
// function), потому что использует SUPABASE_SERVICE_ROLE_KEY — этот ключ
// обходит RLS и НИКОГДА не должен попадать во фронтенд.
//
// Нужны переменные окружения (Vercel → Settings → Environment Variables):
//   SUPABASE_URL              — https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY — Project Settings → API → service_role secret

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY не настроены на сервере");
  }
  return { url: url.replace(/\/$/, ""), key };
}

async function restFetch(path, options = {}) {
  const { url, key } = client();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Supabase REST ${res.status}: ${body}`);
  }
  // 204 No Content (DELETE/PATCH без Prefer: return=representation) — нет тела
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

/** Вставить одну или несколько строк, вернуть вставленные строки. */
export async function insertRows(table, rows) {
  return restFetch(table, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(rows),
  });
}

/** Выбрать строки: select(table, "chat_id=eq.123&status=eq.pending&order=created_at.asc"). */
export async function selectRows(table, query) {
  return restFetch(`${table}?${query}`, { method: "GET" });
}

/** Обновить строки, подходящие под query. */
export async function updateRows(table, query, patch) {
  return restFetch(`${table}?${query}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(patch),
  });
}

/** Удалить строки, подходящие под query. Возвращает удалённые строки. */
export async function deleteRows(table, query) {
  return restFetch(`${table}?${query}`, {
    method: "DELETE",
    headers: { Prefer: "return=representation" },
  });
}

/** upsert по primary key (нужен on_conflict = имя PK-колонки). */
export async function upsertRow(table, row, onConflictColumn) {
  return restFetch(`${table}?on_conflict=${onConflictColumn}`, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row),
  });
}
