// constants.js — общие константы, вынесены отдельно, чтобы их могли
// подключать модули, которые грузятся лениво (AI, импорт), без App.jsx целиком

const MESSENGERS = [
  { key: "whatsapp", label: "WhatsApp", short: "WA", color: "#25A45C" },
  { key: "vk", label: "VK", short: "VK", color: "#3F6FCB" },
  { key: "telegram", label: "Telegram", short: "TG", color: "#2AA0DB" },
  { key: "line", label: "LINE", short: "LN", color: "#22B14C" },
];

const DEFAULT_CATEGORIES = ["Друзья", "Работа", "Семья", "Нетворкинг"];
const ENERGY_OPTIONS = ["Заряжает", "Нейтрально", "Истощает"];
const TRUST_OPTIONS = [1, 2, 3, 4, 5];
const STEP_DEFS = [
  { key: "basic", label: "Основное" },
  { key: "messengers", label: "Мессенджеры" },
  { key: "about", label: "О человеке" },
  { key: "psych", label: "Портрет" },
];
const AI_SUGGESTIONS = ["Почини машину", "Нужен дизайнер", "Кто разбирается в праве", "Ищу няню"];

const TASK_TYPES = [
  { key: "follow_up", label: "Follow-up", hint: "Списаться / узнать как дела" },
  { key: "promise", label: "Обещание", hint: "Я должен / мне должны" },
  { key: "intro", label: "Интро", hint: "Познакомить с кем-то" },
];

const TASK_TYPE_COLORS = {
  follow_up: "#7C4DFF",
  promise: "#D98C2B",
  intro: "#22A37A",
};

const STATUS_COLUMNS = [
  { key: "todo", label: "К выполнению" },
  { key: "in_progress", label: "В процессе" },
  { key: "done", label: "Готово" },
];

// --- Цели / Подписка (Модуль 3D) ---
const PLAN_FEATURES = {
  free: [
    "До 20 AI-запросов в месяц",
    "Все базовые функции (контакты, теги, портрет)",
    "Импорт/экспорт CSV",
    "Таск-борд и цели без ограничений",
  ],
  pro: [
    "Безлимитный AI-поиск и AI-добавление",
    "Безлимитный анализ окружения",
    "Всё из Free",
    "Поддержка в приоритете",
  ],
};
const PRO_PRICE_LABEL = "150 ⭐/мес";
// Должно совпадать с PRO_PRICE_STARS в api/create-invoice.js — это только
// для отображения цены на экране, реальную сумму списывает Telegram по
// значению из create-invoice.js.
const PRO_PRICE_STARS = 150;

export { MESSENGERS, DEFAULT_CATEGORIES, ENERGY_OPTIONS, TRUST_OPTIONS, STEP_DEFS, AI_SUGGESTIONS, TASK_TYPES, TASK_TYPE_COLORS, STATUS_COLUMNS, PLAN_FEATURES, PRO_PRICE_LABEL, PRO_PRICE_STARS };
