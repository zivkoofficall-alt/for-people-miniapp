// storage.js
// Заменяет window.storage из артефакта Claude на что-то, что реально работает
// в браузере / внутри Telegram.
//
// ВАЖНО: у Telegram.WebApp.CloudStorage есть жёсткие лимиты:
//   - максимум 4096 символов на один ключ
//   - максимум 1024 ключа
// Наши данные (особенно с фото контактов) легко превышают 4096 символов,
// поэтому большие значения режутся на "чанки" (кусочки) и склеиваются обратно.
//
// Если приложение открыто НЕ в Telegram (например, тестируешь в обычном
// браузере), автоматически используется localStorage — тоже с чанкованием,
// просто для единообразия кода (там лимит намного больше).

const CHUNK_SIZE = 3900;

function getTelegramCloudStorage() {
  if (typeof window === "undefined") return null;
  const tg = window.Telegram && window.Telegram.WebApp;
  if (tg && tg.CloudStorage) return tg.CloudStorage;
  return null;
}

function tgSetItem(cs, key, value) {
  return new Promise((resolve, reject) => {
    cs.setItem(key, value, (err, ok) => (err ? reject(err) : resolve(ok)));
  });
}
function tgGetItem(cs, key) {
  return new Promise((resolve, reject) => {
    cs.getItem(key, (err, val) => (err ? reject(err) : resolve(val)));
  });
}
function tgRemoveItem(cs, key) {
  return new Promise((resolve, reject) => {
    cs.removeItem(key, (err, ok) => (err ? reject(err) : resolve(ok)));
  });
}

async function chunkedSet(rawSet, key, valueString) {
  const chunks = [];
  for (let i = 0; i < valueString.length; i += CHUNK_SIZE) {
    chunks.push(valueString.slice(i, i + CHUNK_SIZE));
  }
  if (chunks.length === 0) chunks.push("");
  await rawSet(`${key}__n`, String(chunks.length));
  for (let i = 0; i < chunks.length; i++) {
    await rawSet(`${key}__${i}`, chunks[i]);
  }
}

async function chunkedGet(rawGet, key) {
  const n = await rawGet(`${key}__n`);
  if (!n) return null;
  const count = parseInt(n, 10);
  if (!count || Number.isNaN(count)) return null;
  let result = "";
  for (let i = 0; i < count; i++) {
    const part = await rawGet(`${key}__${i}`);
    result += part || "";
  }
  return result;
}

// Ключи Telegram CloudStorage могут содержать только [A-Za-z0-9_-],
// поэтому переименовываем "fp:contacts" -> "fp_contacts" и т.д. на входе.
function safeKey(key) {
  return key.replace(/[^A-Za-z0-9_-]/g, "_");
}

export const storage = {
  async get(key, _shared) {
    const k = safeKey(key);
    const cs = getTelegramCloudStorage();
    try {
      let raw;
      if (cs) {
        raw = await chunkedGet((kk) => tgGetItem(cs, kk), k);
      } else {
        raw = await chunkedGet((kk) => Promise.resolve(window.localStorage.getItem(kk)), k);
      }
      if (raw === null || raw === undefined || raw === "") return null;
      return { key, value: raw };
    } catch (e) {
      console.error("storage.get error", e);
      return null;
    }
  },

  async set(key, value, _shared) {
    const k = safeKey(key);
    const cs = getTelegramCloudStorage();
    try {
      if (cs) {
        await chunkedSet((kk, v) => tgSetItem(cs, kk, v), k, value);
      } else {
        await chunkedSet((kk, v) => { window.localStorage.setItem(kk, v); return Promise.resolve(true); }, k, value);
      }
      return { key, value };
    } catch (e) {
      console.error("storage.set error", e);
      return null;
    }
  },

  async delete(key, _shared) {
    const k = safeKey(key);
    const cs = getTelegramCloudStorage();
    try {
      const n = cs
        ? await tgGetItem(cs, `${k}__n`)
        : window.localStorage.getItem(`${k}__n`);
      const count = parseInt(n || "0", 10) || 0;
      for (let i = 0; i < count; i++) {
        if (cs) await tgRemoveItem(cs, `${k}__${i}`);
        else window.localStorage.removeItem(`${k}__${i}`);
      }
      if (cs) await tgRemoveItem(cs, `${k}__n`);
      else window.localStorage.removeItem(`${k}__n`);
      return { key, deleted: true };
    } catch (e) {
      console.error("storage.delete error", e);
      return null;
    }
  },
};
