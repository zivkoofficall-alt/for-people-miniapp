// api/_lib/endpointPrompt.js
//
// Раскладывает накопленные сырые сообщения о багах/идеях по фазам
// (Критические баги / UI-UX / Безопасность / Прочее) простой эвристикой
// по ключевым словам — без обращения к AI, чтобы /endpoint работал мгновенно
// и бесплатно. Это черновая сортировка: Claude по промпту сам разберётся
// в деталях, задача бота — просто не смешать всё в одну кучу.

const PHASES = [
  {
    key: "critical",
    title: "🔴 ФАЗА A: КРИТИЧЕСКИЕ БАГИ",
    keywords: ["баг", "ошибк", "пропада", "пропал", "не работает", "не сохран", "краш", "падает", "критич", "теря"],
  },
  {
    key: "uiux",
    title: "🟡 ФАЗА B: UI / UX ДОРАБОТКИ",
    keywords: ["дизайн", "верстк", "кнопк", "экран", "стил", "интерфейс", "скролл", "отступ", "цвет", "анимац"],
  },
  {
    key: "security",
    title: "🛡 ФАЗА C: БЕЗОПАСНОСТЬ И АВТОРИЗАЦИЯ",
    keywords: ["безопас", "auth", "токен", "защит", "hmac", "xss", "утечк", "доступ", "авториз"],
  },
  {
    key: "other",
    title: "🔵 ДОПОЛНИТЕЛЬНО",
    keywords: [],
  },
];

function classify(text) {
  const lower = text.toLowerCase();
  for (const phase of PHASES) {
    if (phase.keywords.some((kw) => lower.includes(kw))) return phase.key;
  }
  return "other";
}

/** Увеличить patch-версию: "1.2.1" -> "1.2.2". Если формат не X.Y.Z — просто добавляет ".1". */
export function bumpVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec((version || "").trim());
  if (!match) return "1.0.1";
  const [, major, minor, patch] = match;
  return `${major}.${minor}.${Number(patch) + 1}`;
}

/**
 * Собирает готовый текст промпта из списка репортов и метаданных версии/даты.
 * Каждый report: { message, sender_name? } — sender_name показывается в
 * скобках, если репортов больше одного автора (групповой режим), чтобы
 * Claude видел, кто что написал, но не захламлял текст в личке один на один.
 */
export function buildEndpointPrompt(reports, { version, dateStr }) {
  const distinctSenders = new Set(reports.map((r) => r.sender_name).filter(Boolean));
  const showSender = distinctSenders.size > 1;

  const grouped = { critical: [], uiux: [], security: [], other: [] };
  for (const r of reports) {
    const line = showSender && r.sender_name ? `${r.message} (от ${r.sender_name})` : r.message;
    grouped[classify(r.message)].push(line);
  }

  const sections = PHASES.filter((p) => grouped[p.key].length > 0)
    .map((p) => {
      const items = grouped[p.key].map((m, i) => `${i + 1}. ${m}`).join("\n");
      return `#### ${p.title}\n${items}`;
    })
    .join("\n\n---\n\n");

  return [
    `Привет! Отличная работа по предыдущим фичам. Версия ${version}, ${dateStr}.`,
    "",
    "🚨 **ПРАВИЛО РАБОТЫ (ОБХОД ЛИМИТОВ):**",
    "Не выдавай все файлы за один раз. Сначала подтверди готовность, напиши короткий план и ожидай моей команды для отправки кода по Фазам.",
    "",
    "---",
    "",
    "### 🗺 СПИСОК ЗАДАЧ И ФИКСОВ",
    "",
    sections,
    "",
    "---",
    "",
    "Подтверди готовность, и начнём по шагам!",
  ].join("\n");
}

/** Короткий блок "Что обновлено", который бот шлёт отдельным сообщением. */
export function buildUpdatedBlock({ version, dateStr, count }) {
  return [
    "✅ Что обновлено:",
    `Дата: ${dateStr}`,
    `Версия: v${version}`,
    `Задач включено: ${count}`,
  ].join("\n");
}

/** Разбивает длинный текст на куски <=3900 символов (лимит Telegram — 4096), режет по строкам. */
export function splitForTelegram(text, maxLen = 3900) {
  if (text.length <= maxLen) return [text];
  const lines = text.split("\n");
  const chunks = [];
  let current = "";
  for (const line of lines) {
    if ((current + "\n" + line).length > maxLen) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
