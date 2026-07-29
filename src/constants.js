// constants.js — общие константы, вынесены отдельно, чтобы их могли
// подключать модули, которые грузятся лениво (AI, импорт), без App.jsx целиком

const MESSENGERS = [
  { key: "whatsapp", label: "WhatsApp", short: "WA", color: "#25A45C", nickPrefix: "wa.me/", nickPlaceholder: "79261234567" },
  { key: "vk", label: "VK", short: "VK", color: "#3F6FCB", nickPrefix: "vk.com/", nickPlaceholder: "id12345" },
  { key: "telegram", label: "Telegram", short: "TG", color: "#2AA0DB", nickPrefix: "t.me/", nickPlaceholder: "username" },
  { key: "line", label: "LINE", short: "LN", color: "#22B14C", nickPrefix: "line.me/ti/p/~", nickPlaceholder: "username" },
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

// Типы задач раньше были жёстко зашиты. Теперь это лишь набор ПО УМОЛЧАНИЮ —
// реальный список хранится в App.jsx (state + storage, ключ "fp_task_types")
// и может редактироваться пользователем (добавление/переименование/удаление)
// прямо в TaskBoard. DEFAULT_TASK_TYPES используется как значение при первом
// запуске и как аварийный fallback, если сохранённый список почему-то пуст.
const DEFAULT_TASK_TYPES = [
  { key: "follow_up", label: "Follow-up", hint: "Списаться / узнать как дела", color: "#7C4DFF" },
  { key: "promise", label: "Обещание", hint: "Я должен / мне должны", color: "#D98C2B" },
  { key: "intro", label: "Интро", hint: "Познакомить с кем-то", color: "#22A37A" },
];
// Экспорты TASK_TYPES / TASK_TYPE_COLORS оставлены для модулей, которые пока
// не переведены на динамический список (например QuickAddAI.jsx).
const TASK_TYPES = DEFAULT_TASK_TYPES;
const TASK_TYPE_COLORS = DEFAULT_TASK_TYPES.reduce((acc, t) => { acc[t.key] = t.color; return acc; }, {});
// Палитра для новых пользовательских типов — по кругу, чтобы не совпадали с уже занятыми.
const TASK_TYPE_PALETTE = ["#7C4DFF", "#D98C2B", "#22A37A", "#2AA0DB", "#E5484D", "#C2489B", "#4C6EF5", "#9C6B30"];

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
    "Безлимитный AI-поиск по контактам",
    "Безлимитное AI-добавление контактов голосом/текстом",
    "Безлимитный AI-анализ окружения и рекомендации",
    "Расширенная аналитика: динамика базы, разбор по категориям",
    "Приоритетная поддержка",
    "Всё из Free — без ограничений",
  ],
};
const PRO_PRICE_LABEL = "990 ₽/мес";
// Цена в звёздах Telegram (валюта XTR). Технически сама сумма списывается
// сервером — см. api/create-stars-invoice.js; здесь только то, что
// показывается пользователю на витрине (should совпадать с суммой на бэке).
const PRO_PRICE_STARS = 599;
const PRO_PRICE_STARS_OLD = 1999;
// Карта и СБП временно отключены (заготовка интерфейса без реальной
// интеграции с платёжным провайдером) — оставлен единственный реально
// подключённый способ оплаты, Telegram Stars (см. api/create-stars-invoice.js).
// Чтобы вернуть карту/СБП обратно, достаточно раскомментировать строки ниже —
// остальной код (Profile.jsx) их поддерживает как есть.
const PAYMENT_METHODS = [
  { key: "stars", label: "⭐ Telegram Stars" },
  // { key: "card", label: "Карта" },
  // { key: "sbp", label: "СБП" },
];

// --- Бонус за подписку на Telegram-канал ---
// Ссылка должна быть публичным username-каналом (или t.me/c/... для приватного,
// но тогда getChatMember тоже сработает только если бот — участник/админ этого
// канала, см. api/verify-channel-sub.js). Проверка подписки строго на бэкенде —
// фронтенд её не может подделать, см. комментарии в api/verify-channel-sub.js.
const CHANNEL_URL = "https://t.me/people_circle";
const CHANNEL_BONUS_AMOUNT = 5;

export { MESSENGERS, DEFAULT_CATEGORIES, ENERGY_OPTIONS, TRUST_OPTIONS, STEP_DEFS, AI_SUGGESTIONS, TASK_TYPES, TASK_TYPE_COLORS, DEFAULT_TASK_TYPES, TASK_TYPE_PALETTE, STATUS_COLUMNS, PLAN_FEATURES, PRO_PRICE_LABEL, PRO_PRICE_STARS, PRO_PRICE_STARS_OLD, PAYMENT_METHODS, CHANNEL_URL, CHANNEL_BONUS_AMOUNT };
