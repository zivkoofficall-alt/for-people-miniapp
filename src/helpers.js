// helpers.js — чистые функции без состояния и без JSX.
// Вынесены отдельно, чтобы их можно было импортировать из лениво
// подгружаемых модулей (AiAssistantModal, ImportModal) без App.jsx.

import { MESSENGERS } from "./constants.js";

// Контакт теперь может состоять сразу в нескольких категориях —
// c.categories: string[]. Старое поле c.category (строка) больше нигде не
// пишется, но могло остаться в данных, сохранённых до этого обновления —
// эта функция читает оба варианта, так что старые контакты не "теряют"
// категорию после обновления. Использовать везде вместо прямого c.category.
function contactCategories(c) {
  if (Array.isArray(c.categories)) return c.categories.filter(Boolean);
  return c.category && c.category.trim() ? [c.category.trim()] : [];
}

function emptyMessengers() {
  const m = {};
  MESSENGERS.forEach((x) => { m[x.key] = { enabled: false, nick: "", phone: "" }; });
  return m;
}

function emptyTask(overrides = {}) {
  return {
    id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    contactId: null,
    type: "follow_up",
    title: "",
    dueDate: null,
    status: "todo",
    important: false,
    completedAt: null,
    createdAt: Date.now(),
    subtasks: [], // NEW — чек-лист внутри задачи: [{ id, text, done }]
    reminderTime: null, // NEW — "HH:MM", напоминание в этот момент дня dueDate
    reminderFired: false, // NEW — уже показывали уведомление в этой сессии/дате
    repeat: "none", // NEW — 'none' | 'daily' | 'weekly' | 'monthly'
    ...overrides,
  };
}

function emptySubtask(text = "") {
  return { id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, text, done: false };
}

// Прогресс чек-листа внутри задачи — сколько пунктов отмечено.
function subtaskProgress(task) {
  const list = task.subtasks || [];
  const done = list.filter((s) => s.done).length;
  return { done, total: list.length };
}

// ISO-datetime напоминания, собранный из даты задачи + времени. null, если
// не задана либо дата, либо время.
function buildReminderAt(dueDate, reminderTime) {
  if (!dueDate || !reminderTime) return null;
  return `${dueDate}T${reminderTime}:00`;
}

// Следующая дата повторяющейся задачи — считается от текущего dueDate,
// а не от "сегодня", чтобы серия не съезжала при разовых просрочках.
function nextRepeatDate(dueDate, repeat) {
  if (!dueDate || !repeat || repeat === "none") return null;
  const d = new Date(dueDate + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  if (repeat === "daily") d.setDate(d.getDate() + 1);
  else if (repeat === "weekly") d.setDate(d.getDate() + 7);
  else if (repeat === "monthly") d.setMonth(d.getMonth() + 1);
  else return null;
  return d.toISOString().slice(0, 10);
}

const REPEAT_LABELS = { none: "Не повторять", daily: "Каждый день", weekly: "Каждую неделю", monthly: "Каждый месяц" };

function emptyContact() {
  return {
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    avatar: null,
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    job: "",
    company: "",
    city: "",
    birthday: "",
    interests: "",
    helpWith: "",
    categories: [],
    tags: [],
    messengers: emptyMessengers(),
    preferredContact: "", // NEW — предпочтительный способ связи: 'phone'|'telegram'|'whatsapp'|'vk'|'line'
    comment: "",
    psych: {
      personality: "", values: "", commStyle: "", triggers: "", conflictStyle: "",
      trust: "", energy: "", howMet: "", lastContact: "",
    },
    createdAt: Date.now(),
  };
}

// Склонение "человек/человека/человек" по числу — раньше в счётчике на
// хиро-панели обе ветки тернарника возвращали одно и то же слово
// ("человек" / "человек"), из-за чего "2 человек" и "5 человека" выглядели
// бы неверно, стоило поменять текст местами. Тут — честное согласование.
function pluralPeople(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "человек";
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "человека";
  return "человек";
}

function initials(c) {
  const a = (c.firstName || "").trim()[0] || "";
  const b = (c.lastName || "").trim()[0] || "";
  return (a + b).toUpperCase() || "?";
}
function pad(n) { return String(n).padStart(2, "0"); }

// Маска телефона: набираем цифры — на выходе +7 (XXX) XXX-XX-XX.
// Не мешает вставке уже готового номера (paste) и не блокирует ввод "мусорных"
// символов — просто отфильтровывает их и форматирует то, что осталось.
function formatRuPhone(raw) {
  let digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  // Приводим первую цифру 8 -> 7 (частый случай в РФ)
  if (digits[0] === "8") digits = "7" + digits.slice(1);
  if (digits[0] !== "7") digits = "7" + digits;
  digits = digits.slice(0, 11); // 7 + 10 цифр номера

  const rest = digits.slice(1);
  let out = "+7";
  if (rest.length > 0) out += ` (${rest.slice(0, 3)}`;
  if (rest.length >= 3) out += `)`;
  if (rest.length > 3) out += ` ${rest.slice(3, 6)}`;
  if (rest.length > 6) out += `-${rest.slice(6, 8)}`;
  if (rest.length > 8) out += `-${rest.slice(8, 10)}`;
  return out;
}

// Разрешённые схемы для ссылок "Написать" — что угодно за пределами этого
// списка (в первую очередь javascript:) блокируется на уровне ссылки, а не
// только "на глаз". Используется и в карточке, и в карточке контакта,
// и будет ещё раз проверено на бэкенде в Фазе C.
const SAFE_CONTACT_URL_PREFIXES = ["https://t.me/", "https://wa.me/", "https://vk.com/", "https://line.me/", "tel:"];
function isSafeContactUrl(url) {
  return typeof url === "string" && SAFE_CONTACT_URL_PREFIXES.some((p) => url.startsWith(p));
}

// Санитизация текста, который приходит от AI (сообщения ассистента,
// рекомендации, разобранные поля контакта из QuickAddAI). React по
// умолчанию экранирует текстовые узлы при рендере (мы нигде не используем
// dangerouslySetInnerHTML), так что прямого XSS через {text} в JSX и так
// нет. Это — дополнительный рубеж: убираем HTML-теги и опасные схемы/
// атрибуты на входе, до того как AI-текст попадёт в состояние и, например,
// в поля контакта, которые в будущем могут использоваться где-то ещё
// (экспорт, ссылки, сторонние интеграции).
function sanitizeAiText(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

function sanitizeAiObject(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (typeof v === "string") out[key] = sanitizeAiText(v);
    else if (v && typeof v === "object") out[key] = sanitizeAiObject(v);
    else out[key] = v;
  }
  return out;
}

// Пользователь может вставить в поле "Ник" целую ссылку (скопировал прямо
// из профиля мессенджера) вместо голого юзернейма — buildContactLink() выше
// сам добавляет префикс (t.me/, vk.com/, wa.me/, line.me/ti/p/~), так что
// если оставить вставленную ссылку как есть, получится "битый" двойной URL.
// Автоматически срезаем известные префиксы (с протоколом или без, включая
// вариант line.me/ti/p/~) и ведущий "@", оставляя только сам идентификатор.
const MESSENGER_NICK_PREFIXES = {
  telegram: [/^https?:\/\/(www\.)?t\.me\//i, /^t\.me\//i, /^@/],
  vk: [/^https?:\/\/(www\.)?vk\.com\//i, /^vk\.com\//i, /^@/],
  line: [/^https?:\/\/(www\.)?line\.me\/ti\/p\/~?/i, /^line\.me\/ti\/p\/~?/i, /^@/],
  whatsapp: [/^https?:\/\/(www\.)?wa\.me\//i, /^wa\.me\//i, /^@/],
};
function sanitizeMessengerNick(key, rawValue) {
  let v = (rawValue || "").trim();
  const prefixes = MESSENGER_NICK_PREFIXES[key];
  if (!prefixes) return v;
  // Несколько проходов: у LINE, например, может встретиться и домен, и "@" разом.
  let changed = true;
  while (changed) {
    changed = false;
    for (const re of prefixes) {
      if (re.test(v)) { v = v.replace(re, ""); changed = true; }
    }
  }
  return v.replace(/\/+$/, "").trim();
}


// способа связи контакта, с fallback на первый доступный вариант.
function buildContactLink(contact) {
  const m = contact.messengers || {};
  const pref = contact.preferredContact || "";

  const candidates = {
    telegram: m.telegram?.enabled && m.telegram.nick
      ? { url: `https://t.me/${m.telegram.nick.trim().replace(/^@/, "")}`, label: "Telegram" }
      : null,
    whatsapp: (m.whatsapp?.enabled && (m.whatsapp.phone || contact.phone))
      ? { url: `https://wa.me/${(m.whatsapp.phone || contact.phone).replace(/\D/g, "")}`, label: "WhatsApp" }
      : null,
    vk: m.vk?.enabled && m.vk.nick
      ? { url: `https://vk.com/${m.vk.nick.trim().replace(/^@/, "")}`, label: "VK" }
      : null,
    line: m.line?.enabled && m.line.nick
      ? { url: `https://line.me/ti/p/~${m.line.nick.trim().replace(/^@/, "")}`, label: "LINE" }
      : null,
    phone: contact.phone ? { url: `tel:${contact.phone}`, label: "Позвонить" } : null,
  };

  const preferred = pref && candidates[pref];
  const result = preferred || candidates.telegram || candidates.whatsapp || candidates.vk || candidates.line || candidates.phone || null;
  if (result && !isSafeContactUrl(result.url)) return null; // защитный пояс, не должен срабатывать в норме
  return result;
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
      } else field += c;
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
function findColIndex(headers, matcher) { return headers.findIndex((h) => matcher(h.trim().toLowerCase())); }
function contactsFromGoogleCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = rows[0];
  const firstIdx = findColIndex(headers, (h) => h === "first name" || h === "given name");
  const lastIdx = findColIndex(headers, (h) => h === "last name" || h === "family name");
  const nameIdx = findColIndex(headers, (h) => h === "name");
  const phoneIdx = findColIndex(headers, (h) => h.includes("phone") && h.includes("value"));
  const emailIdx = findColIndex(headers, (h) => h.includes("e-mail") && h.includes("value"));
  const notesIdx = findColIndex(headers, (h) => h === "notes");
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((f) => !f || !f.trim())) continue;
    let first = firstIdx >= 0 ? (r[firstIdx] || "").trim() : "";
    let last = lastIdx >= 0 ? (r[lastIdx] || "").trim() : "";
    if (!first && !last && nameIdx >= 0) {
      const full = (r[nameIdx] || "").trim();
      const parts = full.split(" ");
      first = parts[0] || ""; last = parts.slice(1).join(" ") || "";
    }
    const phone = phoneIdx >= 0 ? (r[phoneIdx] || "").trim() : "";
    const email = emailIdx >= 0 ? (r[emailIdx] || "").trim() : "";
    const notes = notesIdx >= 0 ? (r[notesIdx] || "").trim() : "";
    if (!first && !last && !phone) continue;
    const c = emptyContact();
    c.firstName = first; c.lastName = last; c.phone = phone; c.email = email; c.comment = notes;
    out.push(c);
  }
  return out;
}
function resizeImageFile(file, maxDim = 200, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) { if (width > maxDim) { height = height * (maxDim / width); width = maxDim; } }
        else { if (height > maxDim) { width = width * (maxDim / height); height = maxDim; } }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Считаем оценку окружения детерминированно в коде, а не просим AI посчитать
// проценты "в уме" — числа с плавающей точкой и статистика не то, в чём стоит
// доверять генеративной модели. AI ниже используется только для качественных
// текстовых рекомендаций поверх уже готовых, точных цифр (см. HealthCheck.jsx).
function computeHealthMetrics(contacts, categories) {
  const total = contacts.length;
  if (total === 0) {
    return {
      score: 0, status: "red",
      diversityScore: 0, recencyScore: 0, depthScore: 0,
      categoryDistribution: [], gapCategories: [...categories], staleContacts: [],
    };
  }

  // --- Разнообразие: сколько из заведённых категорий реально используются ---
  const distMap = {};
  contacts.forEach((c) => {
    const cats = contactCategories(c);
    if (cats.length === 0) { distMap["Без категории"] = (distMap["Без категории"] || 0) + 1; return; }
    cats.forEach((cat) => { distMap[cat] = (distMap[cat] || 0) + 1; });
  });
  const categoryDistribution = Object.entries(distMap)
    .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
    .sort((a, b) => b.count - a.count);
  const usedCategories = new Set(Object.keys(distMap).filter((k) => k !== "Без категории"));
  const gapCategories = categories.filter((c) => !usedCategories.has(c));
  const diversityScore = categories.length > 0
    ? Math.round((usedCategories.size / categories.length) * 100)
    : (usedCategories.size > 0 ? 100 : 0);

  // --- Активность: доля контактов с "последним контактом" в пределах 90 дней ---
  const now = Date.now();
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
  let recentCount = 0;
  const staleContacts = [];
  contacts.forEach((c) => {
    const lc = c.psych && c.psych.lastContact;
    const t = lc ? new Date(`${lc}T00:00:00`).getTime() : NaN;
    if (!Number.isNaN(t) && now - t <= NINETY_DAYS_MS) recentCount++;
    else staleContacts.push(c);
  });
  const recencyScore = Math.round((recentCount / total) * 100);

  // --- Глубина: заполненность заметками/хобби/контекстом ---
  let deepCount = 0;
  contacts.forEach((c) => {
    const textFieldsFilled = [c.comment, c.interests, c.helpWith].filter((v) => v && v.trim()).length;
    const psychFilled = c.psych && Object.values(c.psych).some((v) => v && String(v).trim());
    if (textFieldsFilled >= 2 || (textFieldsFilled >= 1 && psychFilled)) deepCount++;
  });
  const depthScore = Math.round((deepCount / total) * 100);

  const score = Math.round((diversityScore + recencyScore + depthScore) / 3);
  const status = score < 40 ? "red" : score < 70 ? "orange" : "green";

  // контакты "с категорией" считаем более приоритетными для follow-up совета
  const staleSorted = [...staleContacts]
    .sort((a, b) => (contactCategories(a).length ? 0 : 1) - (contactCategories(b).length ? 0 : 1))
    .slice(0, 8);

  return { score, status, diversityScore, recencyScore, depthScore, categoryDistribution, gapCategories, staleContacts: staleSorted };
}

// --- Цели (Модуль 3D) ---
function emptyGoal(overrides = {}) {
  return {
    id: `g_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: "quantitative", // 'quantitative' | 'qualitative'
    title: "",
    targetCategory: null, // если задано — прогресс считается автоматически по категории
    targetTag: null,      // если задано (и нет targetCategory) — по тегу
    targetCount: null,    // нужен для quantitative
    manualCount: 0,       // используется, если нет ни категории, ни тега — пользователь считает сам
    status: "in_progress", // 'in_progress' | 'done' — для качественных целей, или когда план выполнен
    createdAt: Date.now(),
    ...overrides,
  };
}

// Прогресс цели — ЧИСТАЯ функция от текущих контактов, ничего не хранится
// в самой цели статично (иначе цифра будет отставать от реальной базы).
function computeGoalProgress(goal, contacts) {
  if (goal.type === "qualitative") {
    const isDone = goal.status === "done";
    return { current: null, target: null, pct: isDone ? 100 : goal.status === "in_progress" ? 40 : 0, isDone, displayText: isDone ? "Готово" : "В процессе" };
  }
  let current;
  if (goal.targetCategory) current = contacts.filter((c) => contactCategories(c).includes(goal.targetCategory)).length;
  else if (goal.targetTag) current = contacts.filter((c) => (c.tags || []).includes(goal.targetTag)).length;
  else current = goal.manualCount || 0;
  const target = goal.targetCount || 1;
  const pct = Math.min(100, Math.round((current / target) * 100));
  return { current, target, pct, isDone: current >= target, displayText: `${current} / ${target}` };
}

// --- Статистика личного кабинета (сколько добавлено за последнее время и т.д.) ---
// Как и computeHealthMetrics/computeGoalProgress — чистая функция, никаких
// сохранённых счётчиков, которые могут отстать от реальной базы, и никакого AI:
// это просто арифметика по датам, ей незачем ходить в языковую модель.
function computeContactStats(contacts, tasks) {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const addedWithin = (days) => contacts.filter((c) => c.createdAt && now - c.createdAt <= days * DAY_MS).length;

  // Динамика по месяцам — последние 6 месяцев для мини-графика
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const y = d.getFullYear();
    const m = d.getMonth();
    const count = contacts.filter((c) => {
      if (!c.createdAt) return false;
      const cd = new Date(c.createdAt);
      return cd.getFullYear() === y && cd.getMonth() === m;
    }).length;
    months.push({ label: d.toLocaleDateString("ru-RU", { month: "short" }), count });
  }
  const maxMonthCount = Math.max(1, ...months.map((m) => m.count));

  // Самая частая категория
  const catMap = {};
  contacts.forEach((c) => {
    contactCategories(c).forEach((cat) => { catMap[cat] = (catMap[cat] || 0) + 1; });
  });
  const topEntry = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0];

  const tasksList = tasks || [];
  const tasksDone = tasksList.filter((t) => t.status === "done").length;

  return {
    total: contacts.length,
    addedToday: addedWithin(1),
    addedWeek: addedWithin(7),
    addedMonth: addedWithin(30),
    months,
    maxMonthCount,
    topCategory: topEntry ? { name: topEntry[0], count: topEntry[1] } : null,
    tasksTotal: tasksList.length,
    tasksDone,
    tasksActive: tasksList.length - tasksDone,
  };
}

// --- Подписка (Модуль 3D) ---
function emptySubscription() {
  // channelBonusClaimed — бонус за подписку на Telegram-канал (см.
  // api/verify-channel-sub.js) уже получен. Намеренно НЕ прибавляется прямо
  // в aiRequestsLimit при сохранении — App.jsx всегда переустанавливает
  // aiRequestsLimit из этой функции при загрузке (см. комментарий в App.jsx
  // рядом с loadWithLegacyMigration("fp_subscription")), так что любой бонус,
  // "запечённый" прямо в лимит, слетал бы при каждом перезапуске. Вместо
  // этого effectiveAiLimit в App.jsx = aiRequestsLimit + бонус, если флаг стоит.
  return { plan: "free", aiRequestsUsed: 0, aiRequestsLimit: 10, renewsAt: null, channelBonusClaimed: false };
}

export {
  emptyMessengers, emptyContact, emptyTask, emptySubtask, subtaskProgress, buildReminderAt,
  nextRepeatDate, REPEAT_LABELS, initials, pad, formatRuPhone, pluralPeople,
  csvEscape, parseCsv, findColIndex, contactsFromGoogleCsv, resizeImageFile,
  computeHealthMetrics, emptyGoal, computeGoalProgress, emptySubscription, computeContactStats,
  buildContactLink, isSafeContactUrl, sanitizeAiText, sanitizeAiObject, contactCategories,
  sanitizeMessengerNick,
};
