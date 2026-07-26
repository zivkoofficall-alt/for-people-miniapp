// storage.js
// Гибридное хранилище: localStorage — синхронный, мгновенный, надёжный слой;
// Telegram.WebApp.CloudStorage — асинхронный слой поверх него для синхронизации
// между устройствами. Раньше это было "либо/либо", и если CloudStorage
// подвисал/отклонял запрос/возвращал пусто на старте — приложение теряло
// контакты, потому что localStorage просто не проверялся как fallback.
//
// Правило: пишем ВСЕГДА в оба места. localStorage — сразу и синхронно
// (ничего не может потеряться, даже если Telegram API недоступен).
// CloudStorage — асинхронно вдогонку, ошибка там не мешает localStorage-копии.
// При чтении: если CloudStorage реально что-то вернул — доверяем ему
// (источник правды между устройствами) и на всякий случай синхронизируем
// localStorage. Если CloudStorage пуст/упал — используем localStorage.
//
// Лимиты Telegram.WebApp.CloudStorage: максимум 4096 символов на ключ,
// максимум 1024 ключа — поэтому для него данные режутся на чанки.
// localStorage лимита в 4096 символов не имеет, поэтому туда пишем одним
// куском, без чанкования.

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
    result += (await rawGet(`${key}__${i}`)) || "";
  }
  return result;
}

// Ключи Telegram CloudStorage могут содержать только [A-Za-z0-9_-].
function safeKey(key) {
  return key.replace(/[^A-Za-z0-9_-]/g, "_");
}

function localSetSync(key, value) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error("localStorage.setItem failed", e);
    return false;
  }
}
function localGetSync(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    console.error("localStorage.getItem failed", e);
    return null;
  }
}
function localRemoveSync(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (e) {
    console.error("localStorage.removeItem failed", e);
  }
}

export const storage = {
  async get(key, _shared) {
    const k = safeKey(key);
    const localRaw = localGetSync(k); // читаем сразу, синхронно — это наша база по умолчанию

    const cs = getTelegramCloudStorage();
    if (!cs) {
      return localRaw ? { key, value: localRaw } : null;
    }

    try {
      const cloudRaw = await chunkedGet((kk) => tgGetItem(cs, kk), k);
      if (cloudRaw) {
        // CloudStorage — источник правды между устройствами; подтягиваем localStorage к нему
        localSetSync(k, cloudRaw);
        return { key, value: cloudRaw };
      }
    } catch (e) {
      console.error("CloudStorage.get failed, использую localStorage как fallback", e);
    }

    // CloudStorage пуст, недоступен или упал с ошибкой — не теряем данные,
    // отдаём то, что реально лежит в localStorage.
    return localRaw ? { key, value: localRaw } : null;
  },

  async set(key, value, _shared) {
    const k = safeKey(key);

    // Шаг 1: синхронная запись в localStorage — происходит немедленно, до и
    // независимо от CloudStorage. Это гарантирует, что данные не потеряются,
    // даже если Telegram API зависнет, отклонит запрос или сеть отвалится.
    const localOk = localSetSync(k, value);

    // Шаг 2: асинхронная запись в CloudStorage — для синхронизации между устройствами.
    // Ошибка здесь не может стереть уже сохранённую localStorage-копию.
    const cs = getTelegramCloudStorage();
    if (cs) {
      chunkedSet((kk, v) => tgSetItem(cs, kk, v), k, value).catch((e) => {
        console.error("CloudStorage.set failed (копия в localStorage в безопасности)", e);
      });
    }

    return localOk || cs ? { key, value } : null;
  },

  async delete(key, _shared) {
    const k = safeKey(key);
    localRemoveSync(k);

    const cs = getTelegramCloudStorage();
    if (cs) {
      try {
        const n = await tgGetItem(cs, `${k}__n`);
        const count = parseInt(n || "0", 10) || 0;
        for (let i = 0; i < count; i++) await tgRemoveItem(cs, `${k}__${i}`);
        await tgRemoveItem(cs, `${k}__n`);
      } catch (e) {
        console.error("CloudStorage.delete failed", e);
      }
    }
    return { key, deleted: true };
  },
};
