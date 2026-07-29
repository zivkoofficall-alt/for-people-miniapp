import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from "react";
import {
  Search, Plus, X, Phone, Download, Upload, Trash2, ArrowUpRight, User,
  Tag as TagIcon, Layers, Brain, CalendarDays, Camera, Sparkles,
  ChevronLeft, ChevronRight, Briefcase, MapPin, Mail, Heart, Send, Users, Wand2, ListChecks, Gauge, Target, CreditCard, Lock,
} from "lucide-react";
import { storage } from "./storage";
import { MESSENGERS, DEFAULT_CATEGORIES, ENERGY_OPTIONS, TRUST_OPTIONS, STEP_DEFS, DEFAULT_TASK_TYPES } from "./constants.js";
import { emptyContact, emptyTask, emptyGoal, emptySubscription, computeGoalProgress, buildContactLink, initials, pluralPeople, csvEscape, resizeImageFile, nextRepeatDate, contactCategories, sanitizeMessengerNick } from "./helpers.js";
import { globalCss, INK, PURPLE, styles } from "./theme.js";
import { PsychRow, Field, InlineAdd, ConfirmModal, SplashScreen } from "./components/Ui.jsx";
import ContactCard from "./components/ContactCard.jsx";

// Ленивая загрузка: код AI-помощника и импорта из Google подгружается
// отдельным чанком только в момент открытия — не увеличивает вес
// первого экрана приложения.
const AiAssistantModal = lazy(() => import("./components/AiAssistantModal.jsx"));
const ImportModal = lazy(() => import("./components/ImportModal.jsx"));
const QuickAddAI = lazy(() => import("./components/QuickAddAI.jsx"));
const TaskBoard = lazy(() => import("./components/TaskBoard.jsx"));
const HealthCheck = lazy(() => import("./components/HealthCheck.jsx"));
const Goals = lazy(() => import("./components/Goals.jsx"));
const Profile = lazy(() => import("./components/Profile.jsx"));

// Лёгкий fallback на время подгрузки чанка (обычно доли секунды на 3G+)
function LazyFallback() {
  return (
    <div style={styles.overlay}>
      <div style={{ ...styles.formSheet, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 160 }}>
        <div className="fp-pulse" style={{ color: "rgba(11,11,16,0.5)", fontSize: 13, fontWeight: 600 }}>Загрузка…</div>
      </div>
    </div>
  );
}


export default function ForPeople() {
  // --- Изоляция данных по пользователю (Фаза C, IDOR-защита) ---
  // Раньше ключи хранилища были статичными ("fp_contacts" и т.д.) — если бы
  // несколько Telegram-аккаунтов оказались в одном браузере/устройстве
  // (например, при тестировании или на общем компьютере), они бы читали и
  // писали одну и ту же базу. tgUserId здесь — только для локального
  // разделения данных на клиенте (не источник авторизации: серверные
  // эндпоинты проверяют initData отдельно через validateInitData на бэкенде,
  // этому значению из initDataUnsafe они не доверяют).
  const tgUserId = (typeof window !== "undefined" && window.Telegram && window.Telegram.WebApp &&
    window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user &&
    window.Telegram.WebApp.initDataUnsafe.user.id) || null;
  const storageKey = useCallback((base) => `${base}_${tgUserId || "guest"}`, [tgUserId]);

  const [contacts, setContacts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [tags, setTags] = useState([]);
  const [tasks, setTasks] = useState([]); // NEW — задачи по контактам (Модуль 3A/3B)
  const [taskTypes, setTaskTypes] = useState(DEFAULT_TASK_TYPES); // NEW — редактируемые типы задач (Фаза 1)
  const [goals, setGoals] = useState([]); // NEW — цели (Модуль 3D)
  const [subscription, setSubscription] = useState(emptySubscription()); // NEW — тариф/лимит AI (Модуль 3D)
  const [loaded, setLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true); // NEW — полноэкранный сплэш при старте (Фаза B)
  const [splashClosing, setSplashClosing] = useState(false); // NEW — идёт fade-out сплэша
  const activeTaskCount = useMemo(() => tasks.filter((t) => t.status !== "done").length, [tasks]);

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);

  const [openId, setOpenId] = useState(null);
  const [drafting, setDrafting] = useState(null);
  const [step, setStep] = useState(0);
  const [tagsChipsExpanded, setTagsChipsExpanded] = useState(false); // NEW — теги в форме контакта: сначала первые 5, дальше по кнопке
  const [toast, setToast] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // closing* — та же анимация "плавного закрытия" (fp-*-anim-out), что уже
  // используется в Goals.jsx/HealthCheck.jsx/ConfirmModal: по тапу на фон/
  // крестик не размонтируем шторку сразу, а сперва проигрываем 180мс выхода.
  const [closingContact, setClosingContact] = useState(false);
  const [closingDraft, setClosingDraft] = useState(false);
  const [closingBulkPopover, setClosingBulkPopover] = useState(false);
  function closeContact() { setClosingContact(true); setTimeout(() => { setOpenId(null); setClosingContact(false); }, 180); }
  function closeDraft() { setClosingDraft(true); setTimeout(() => { setDrafting(null); setClosingDraft(false); }, 180); }
  function closeBulkPopover() { setClosingBulkPopover(true); setTimeout(() => { setBulkPopover(null); setClosingBulkPopover(false); }, 180); }

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkPopover, setBulkPopover] = useState(null);
  const [bulkTagPicks, setBulkTagPicks] = useState(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const avatarInputRef = useRef(null);
  // Держим свежий contacts в ref, чтобы handleMarkContacted не пересоздавался
  // на каждое изменение contacts — иначе React.memo у ContactCard терял бы смысл
  // (все карточки перерисовывались бы при любой правке любого контакта).
  const contactsRef = useRef(contacts);
  useEffect(() => { contactsRef.current = contacts; }, [contacts]);
  // Аналогичный ref для подписки: recordAiUsage вызывается из промисов AI-запросов
  // (AiAssistantModal/QuickAddAI/HealthCheck), которые могут занять заметное время
  // и в редких случаях завершиться почти одновременно (например, если пользователь
  // закрыл один AI-виджет и тут же открыл другой, пока первый запрос ещё летел).
  // Без ref оба обработчика читали бы один и тот же устаревший subscription из
  // замыкания рендера и оба записали бы "+1" от одной и той же базы — счётчик
  // использованных AI-запросов терял бы инкременты (classic lost update).
  const subscriptionRef = useRef(subscription);
  useEffect(() => { subscriptionRef.current = subscription; }, [subscription]);
  const tasksRef = useRef(tasks);
  useEffect(() => { tasksRef.current = tasks; }, [tasks]);

  // --- Локальные напоминания по задачам (Модуль 3B) ---
  // Работают только пока мини-апп открыт (без бэкенда/push): раз в 20 секунд
  // сравниваем "дата+время напоминания" с текущим моментом. Как только момент
  // наступил — показываем системный Notification (если разрешение уже дано) и
  // всегда дублируем тостом внутри приложения, затем помечаем reminderFired,
  // чтобы не показывать повторно.
  useEffect(() => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    if (Notification.permission === "default") { try { Notification.requestPermission(); } catch (e) {} }
    const timer = setInterval(() => {
      const now = Date.now();
      const due = (tasksRef.current || []).filter((t) => {
        if (t.status === "done" || t.reminderFired || !t.dueDate || !t.reminderTime) return false;
        const at = new Date(`${t.dueDate}T${t.reminderTime}:00`).getTime();
        return !Number.isNaN(at) && at <= now;
      });
      if (due.length === 0) return;
      due.forEach((t) => {
        try {
          if (Notification.permission === "granted") new Notification("Напоминание · for people", { body: t.title });
        } catch (e) {}
      });
      showToast(due.length === 1 ? `Напоминание: ${due[0].title}` : `Напоминаний: ${due.length}`);
      const ids = new Set(due.map((t) => t.id));
      const next = (tasksRef.current || []).map((t) => (ids.has(t.id) ? { ...t, reminderFired: true } : t));
      persistTasks(next);
    }, 20000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Адаптивный цвет FAB-кнопок (Модуль: контраст поверх hero-панели) ---
  // Кнопки "+" и "быстрое добавление" стоят fixed внизу справа. Пока под
  // ними фиолетовая hero-панель — фиолетовая кнопка на фиолетовом фоне
  // сливается. Отслеживаем скролл и сравниваем нижнюю границу панели с
  // вертикальной позицией каждой кнопки: если панель ещё "накрывает" кнопку —
  // кнопка становится белой, иначе — обычной фиолетовой. Переход анимируется
  // плавным fade (см. fabWhiteOverlay), а не мгновенной сменой цвета.
  const heroPanelRef = useRef(null);
  const [fabOnPurple, setFabOnPurple] = useState({ main: false, secondary: false });
  useEffect(() => {
    function updateFabColors() {
      const panel = heroPanelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      const vh = window.innerHeight;
      const mainY = vh - (78 + 28);   // fab: bottom 78, height 56 → центр
      const secY = vh - (144 + 23);   // fabSecondary: bottom 144, height 46 → центр
      setFabOnPurple((prev) => {
        const next = { main: rect.bottom > mainY, secondary: rect.bottom > secY };
        return (prev.main === next.main && prev.secondary === next.secondary) ? prev : next;
      });
    }
    updateFabColors();
    window.addEventListener("scroll", updateFabColors, { passive: true });
    window.addEventListener("resize", updateFabColors);
    return () => {
      window.removeEventListener("scroll", updateFabColors);
      window.removeEventListener("resize", updateFabColors);
    };
  }, []);

  const [aiOpen, setAiOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false); // NEW — умное добавление через AI/голос
  const [taskBoardOpen, setTaskBoardOpen] = useState(false); // NEW — таск-борд (Модуль 3B)
  const [healthCheckOpen, setHealthCheckOpen] = useState(false); // NEW — анализ окружения (Модуль 3C)
  const [goalsOpen, setGoalsOpen] = useState(false); // NEW — цели (Модуль 3D)
  const [profileOpen, setProfileOpen] = useState(false); // NEW — личный кабинет (Модуль 3D)

  const anyOverlayOpen = !!(
    openId || drafting || confirmDeleteId || bulkPopover || confirmBulkDelete || importOpen ||
    aiOpen || quickAddOpen || taskBoardOpen || healthCheckOpen || goalsOpen || profileOpen
  );

  useEffect(() => {
    if (anyOverlayOpen) {
      const prevOverflow = document.body.style.overflow;
      const prevPosition = document.body.style.position;
      const prevWidth = document.body.style.width;
      const scrollY = window.scrollY;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.position = prevPosition;
        document.body.style.top = "";
        document.body.style.width = prevWidth;
        window.scrollTo(0, scrollY);
      };
    }
  }, [anyOverlayOpen]);

  // Миграция со старых, не привязанных к пользователю ключей (до Фазы C
  // все писали под "fp_contacts" и т.п. без суффикса). Если под новым
  // (per-user) ключом пусто, но под старым что-то есть — забираем оттуда
  // один раз и сразу переносим под новый ключ, чтобы это больше не
  // требовалось. Без этого шага апдейт до Фазы C выглядел бы как та же
  // самая "пропажа контактов", которую чинили в Фазе A.
  //
  // Плюс отдельный случай: если приложение открывали не через бота (прямая
  // ссылка в браузере при разработке/тестировании), tgUserId тогда был
  // недоступен, и storageKey() писал под "..._guest". Как только у человека
  // появляется настоящий tgUserId, он смотрит уже в другой ключ и его
  // "guest"-данные выглядят пропавшими — хотя на самом деле просто лежат
  // в другом месте. Забираем их сюда же, один раз.
  async function loadWithLegacyMigration(base) {
    const newKey = storageKey(base);
    try {
      const r = await storage.get(newKey, false);
      if (r && r.value) return r.value;
    } catch (e) {}
    if (tgUserId) {
      try {
        const guest = await storage.get(`${base}_guest`, false);
        if (guest && guest.value) {
          storage.set(newKey, guest.value, false).catch(() => {});
          return guest.value;
        }
      } catch (e) {}
    }
    try {
      const legacy = await storage.get(base, false);
      if (legacy && legacy.value) {
        storage.set(newKey, legacy.value, false).catch(() => {});
        return legacy.value;
      }
    } catch (e) {}
    return null;
  }

  useEffect(() => {
    (async () => {
      try {
        const v = await loadWithLegacyMigration("fp_contacts");
        if (v) {
          // Контакты, сохранённые до поддержки нескольких категорий, хранят
          // одну строку в c.category — приводим их к новому массиву
          // c.categories один раз при загрузке, чтобы весь остальной код
          // работал с единым форматом и старые данные не "теряли" категорию.
          const parsedContacts = JSON.parse(v).map((c) =>
            Array.isArray(c.categories) ? c : { ...c, categories: contactCategories(c) }
          );
          setContacts(parsedContacts);
        }
      } catch (e) {}
      try { const v2 = await loadWithLegacyMigration("fp_categories"); if (v2) setCategories(JSON.parse(v2)); } catch (e) {}
      try { const v3 = await loadWithLegacyMigration("fp_tags"); if (v3) setTags(JSON.parse(v3)); } catch (e) {}
      try { const v4 = await loadWithLegacyMigration("fp_tasks"); if (v4) setTasks(JSON.parse(v4)); } catch (e) {}
      try { const v4b = await loadWithLegacyMigration("fp_task_types"); if (v4b) { const parsed = JSON.parse(v4b); if (Array.isArray(parsed) && parsed.length) setTaskTypes(parsed); } } catch (e) {}
      try { const v5 = await loadWithLegacyMigration("fp_goals"); if (v5) setGoals(JSON.parse(v5)); } catch (e) {}
      try { const v6 = await loadWithLegacyMigration("fp_subscription"); if (v6) setSubscription({ ...emptySubscription(), ...JSON.parse(v6) }); } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  // Сплэш уходит не мгновенно вместе с loaded=true, а сначала проигрывает
  // fade-out (см. fp-splash-out в theme.js), и только потом убирается из
  // дерева — иначе переход был бы резким морганием.
  useEffect(() => {
    if (!loaded) return;
    setSplashClosing(true);
    const t = setTimeout(() => setShowSplash(false), 400);
    return () => clearTimeout(t);
  }, [loaded]);

  // Гвард: пока начальная загрузка из storage не завершилась (loaded === false),
  // ни одна persist*-функция не пишет ничего. Раньше был риск: если пользователь
  // успевал нажать "Добавить" до того, как contacts/categories/... подтянулись
  // из хранилища, persistContacts([...contacts, newContact]) сохранял [newContact]
  // поверх ещё не загруженной (но реально существующей) базы — контакты терялись.
  function blockedBeforeLoad(what) {
    if (!loaded) {
      console.warn(`persist${what} заблокирован: начальная загрузка ещё не завершена`);
      return true;
    }
    return false;
  }

  const persistContacts = useCallback(async (next) => {
    if (blockedBeforeLoad("Contacts")) return;
    setContacts(next);
    try { await storage.set(storageKey("fp_contacts"), JSON.stringify(next), false); }
    catch (e) { showToast("Не удалось сохранить"); }
  }, [loaded, storageKey]);
  const persistCategories = useCallback(async (next) => {
    if (blockedBeforeLoad("Categories")) return;
    setCategories(next);
    try { await storage.set(storageKey("fp_categories"), JSON.stringify(next), false); } catch (e) {}
  }, [loaded, storageKey]);
  const persistTags = useCallback(async (next) => {
    if (blockedBeforeLoad("Tags")) return;
    setTags(next);
    try { await storage.set(storageKey("fp_tags"), JSON.stringify(next), false); } catch (e) {}
  }, [loaded, storageKey]);
  const persistTasks = useCallback(async (next) => {
    if (blockedBeforeLoad("Tasks")) return;
    setTasks(next);
    try { await storage.set(storageKey("fp_tasks"), JSON.stringify(next), false); } catch (e) {}
  }, [loaded, storageKey]);
  const persistTaskTypes = useCallback(async (next) => {
    if (blockedBeforeLoad("TaskTypes")) return;
    setTaskTypes(next);
    try { await storage.set(storageKey("fp_task_types"), JSON.stringify(next), false); } catch (e) {}
  }, [loaded, storageKey]);
  const persistGoals = useCallback(async (next) => {
    if (blockedBeforeLoad("Goals")) return;
    setGoals(next);
    try { await storage.set(storageKey("fp_goals"), JSON.stringify(next), false); } catch (e) {}
  }, [loaded, storageKey]);
  const persistSubscription = useCallback(async (next) => {
    if (blockedBeforeLoad("Subscription")) return;
    setSubscription(next);
    try { await storage.set(storageKey("fp_subscription"), JSON.stringify(next), false); } catch (e) {}
  }, [loaded, storageKey]);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2000); }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = contacts;
    if (q) {
      list = list.filter((c) => {
        const msgHay = MESSENGERS.map((m) => { const d = c.messengers?.[m.key]; return d ? `${d.nick} ${d.phone}` : ""; }).join(" ");
        const hay = [c.firstName, c.lastName, c.phone, c.email, c.job, c.company, c.city, c.interests, c.helpWith,
          c.comment, contactCategories(c).join(" "), (c.tags || []).join(" "), msgHay].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    if (activeCategory) list = list.filter((c) => contactCategories(c).includes(activeCategory));
    return [...list].sort((a, b) => (a.lastName || a.firstName || "").localeCompare(b.lastName || b.firstName || "", "ru"));
  }, [contacts, query, activeCategory]);

  const openContact = openId ? contacts.find((c) => c.id === openId) : null;

  function startNew() { setDrafting(emptyContact()); setStep(0); setTagsChipsExpanded(false); }
  function startEdit(c) { setDrafting(JSON.parse(JSON.stringify(c))); setStep(0); setOpenId(null); setTagsChipsExpanded(false); }

  function validateDraft(d) {
    if (!d.firstName.trim() && !d.lastName.trim()) return { msg: "Укажите имя или фамилию", step: 0 };
    for (const m of MESSENGERS) {
      const v = d.messengers[m.key];
      if (v.enabled && !v.nick.trim() && !v.phone.trim()) return { msg: `Для ${m.label} заполните ник или телефон`, step: 1 };
    }
    return null;
  }

  async function saveDraft() {
    const err = validateDraft(drafting);
    if (err) { showToast(err.msg); setStep(err.step); return; }
    const exists = contacts.some((c) => c.id === drafting.id);
    const next = exists ? contacts.map((c) => (c.id === drafting.id ? drafting : c)) : [...contacts, drafting];
    await persistContacts(next);
    setDrafting(null);
    showToast("Сохранено");
  }
  async function deleteContact(id) {
    await persistContacts(contacts.filter((c) => c.id !== id));
    setConfirmDeleteId(null); setOpenId(null); showToast("Удалено");
  }

  // "Были на связи" — быстрая отметка прямо с карточки, без открытия формы
  // редактирования. Пишет в psych.lastContact, который уже используется
  // в Recency-метрике анализа окружения (Модуль 3C) — обе фичи связаны сами собой.
  const handleMarkContacted = useCallback(async (id) => {
    const today = new Date().toISOString().slice(0, 10);
    const next = contactsRef.current.map((c) =>
      c.id === id ? { ...c, psych: { ...c.psych, lastContact: today } } : c
    );
    await persistContacts(next);
    showToast("Отмечено: были на связи сегодня");
  }, [persistContacts]);

  async function handleSetPreferredContact(id, method) {
    const next = contacts.map((c) => (c.id === id ? { ...c, preferredContact: method } : c));
    await persistContacts(next);
  }

  function toggleMessenger(key) {
    setDrafting((d) => ({ ...d, messengers: { ...d.messengers, [key]: { ...d.messengers[key], enabled: !d.messengers[key].enabled } } }));
  }
  function updateMessengerField(key, field, value) {
    const clean = field === "nick" ? sanitizeMessengerNick(key, value) : value;
    setDrafting((d) => ({ ...d, messengers: { ...d.messengers, [key]: { ...d.messengers[key], [field]: clean } } }));
  }
  function toggleDraftTag(t) {
    setDrafting((d) => { const has = d.tags.includes(t); return { ...d, tags: has ? d.tags.filter((x) => x !== t) : [...d.tags, t] }; });
  }
  function toggleDraftCategory(cat) {
    setDrafting((d) => {
      const current = d.categories || [];
      const has = current.includes(cat);
      return { ...d, categories: has ? current.filter((x) => x !== cat) : [...current, cat] };
    });
  }
  async function addNewCategory(name) { const n = name.trim(); if (!n || categories.includes(n)) return; await persistCategories([...categories, n]); }
  async function addNewTag(name) { const n = name.trim(); if (!n || tags.includes(n)) return; await persistTags([...tags, n]); }

  async function handleAvatarPicked(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageFile(file);
      setDrafting((d) => ({ ...d, avatar: dataUrl }));
    } catch (err) { showToast("Не удалось загрузить фото"); }
  }

  function toggleSelectMode() { setSelectMode((v) => !v); setSelectedIds(new Set()); setBulkPopover(null); }
  const toggleSelected = useCallback((id) => {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);
  // useCallback + зависимость только от selectMode: пересоздаётся не на каждый
  // рендер, а лишь когда реально меняется режим выбора. Это позволяет
  // React.memo у ContactCard действительно пропускать перерисовку карточек.
  const handleCardClick = useCallback((id) => {
    if (selectMode) toggleSelected(id); else setOpenId(id);
  }, [selectMode, toggleSelected]);

  async function bulkAddCategory(cat) {
    const next = contacts.map((c) =>
      selectedIds.has(c.id) ? { ...c, categories: Array.from(new Set([...contactCategories(c), cat])) } : c
    );
    await persistContacts(next); setBulkPopover(null); setSelectMode(false); setSelectedIds(new Set());
    showToast(`Категория «${cat}» добавлена`);
  }
  async function bulkApplyTags() {
    if (bulkTagPicks.size === 0) { setBulkPopover(null); return; }
    const picks = Array.from(bulkTagPicks);
    const next = contacts.map((c) => selectedIds.has(c.id) ? { ...c, tags: Array.from(new Set([...(c.tags || []), ...picks])) } : c);
    await persistContacts(next); setBulkPopover(null); setBulkTagPicks(new Set()); setSelectMode(false); setSelectedIds(new Set());
    showToast("Теги добавлены");
  }
  async function bulkDelete() {
    const next = contacts.filter((c) => !selectedIds.has(c.id));
    await persistContacts(next); setConfirmBulkDelete(false); setSelectMode(false); setSelectedIds(new Set());
    showToast("Контакты удалены");
  }

  async function exportCsv() {
    const headers = ["Имя", "Фамилия", "Телефон", "Email", "Профессия", "Компания", "Город", "День рождения",
      "Интересы", "Чем может помочь", "Категория", "Теги",
      ...MESSENGERS.flatMap((m) => [`${m.label} ник`, `${m.label} телефон`]),
      "Комментарий", "Тип личности", "Ценности", "Стиль общения", "Триггеры", "Поведение в конфликте",
      "Доверие", "Энергия", "Как познакомились", "Последний контакт"];
    const rows = contacts.map((c) => [
      c.firstName, c.lastName, c.phone, c.email, c.job, c.company, c.city, c.birthday, c.interests, c.helpWith,
      contactCategories(c).join("; "), (c.tags || []).join("; "),
      ...MESSENGERS.flatMap((m) => [c.messengers?.[m.key]?.nick || "", c.messengers?.[m.key]?.phone || ""]),
      c.comment, c.psych?.personality || "", c.psych?.values || "", c.psych?.commStyle || "", c.psych?.triggers || "",
      c.psych?.conflictStyle || "", c.psych?.trust || "", c.psych?.energy || "", c.psych?.howMet || "", c.psych?.lastContact || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");

    // Два уровня выгрузки, по надёжности:
    // 1) Бэкенд send-csv.js кладёт файл прямо в чат с ботом через Bot API
    //    sendDocument — работает везде, это основной путь внутри Telegram.
    // 2) Если бэкенд не настроен (нет VITE_SEND_CSV_URL) или запрос не
    //    удался — скачивание через Blob + <a download>. Раньше между этими
    //    двумя уровнями был третий шаг через tg.openLink(dataUrl): Telegram
    //    Mini Apps не поддерживают data:-ссылки в openLink — вызов не
    //    бросает исключение, но и не открывает файл, а код всё равно считал
    //    это успехом (показывал тост и делал return), из-за чего рабочий
    //    Blob-фолбэк ниже никогда не выполнялся внутри Telegram. Теперь при
    //    неудаче бэкенда сразу переходим к Blob-скачиванию, которое реально
    //    срабатывает и в браузере, и в современных Telegram-клиентах.
    const tg = window.Telegram && window.Telegram.WebApp;
    const sendCsvUrl = import.meta.env.VITE_SEND_CSV_URL;

    if (tg && tg.initData && sendCsvUrl) {
      try {
        const response = await fetch(sendCsvUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: tg.initData, csv, filename: "for-people.csv" }),
        });
        const data = await response.json();
        if (response.ok && data.ok) {
          showToast("Файл отправлен вам в Telegram");
          return;
        }
        console.warn("send-csv failed, falling back", data);
      } catch (e) {
        console.warn("send-csv request failed, falling back", e);
      }
    }

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "for-people.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast(sendCsvUrl ? "Не получилось отправить в чат — скачиваю файл напрямую" : "Выгружено в CSV");
  }

  async function handleImportConfirmed(parsedContacts) {
    await persistContacts([...contacts, ...parsedContacts]);
    showToast(`Импортировано: ${parsedContacts.length}`);
    setImportOpen(false);
  }

  // Принимает "parsed" от QuickAddAI: {firstName,lastName,category,tags,job,
  // interests,helpWith,comment,task,psych}. Здесь и только здесь превращаем
  // это в настоящий Contact/Task и сохраняем — компонент виджета ничего не
  // пишет в storage сам, только собирает и валидирует данные.
  async function handleQuickAddCreate(parsed) {
    if (!parsed.firstName.trim() && !parsed.lastName.trim()) {
      showToast("AI не распознал имя — откройте карточку и впишите вручную.");
    }
    const parsedCategory = (parsed.category || "").trim();
    const base = emptyContact();
    const newContact = {
      ...base,
      firstName: parsed.firstName.trim(),
      lastName: parsed.lastName.trim(),
      categories: parsedCategory ? [parsedCategory] : [],
      tags: (parsed.tags || []).filter(Boolean),
      job: (parsed.job || "").trim(),
      interests: (parsed.interests || "").trim(),
      helpWith: (parsed.helpWith || "").trim(),
      comment: (parsed.comment || "").trim(),
      // Психологический портрет — только если AI реально его собрал (текста
      // хватило); остальные psych-поля (доверие, энергия и т.д.) остаются
      // пустыми, как в base, — их AI не пытается угадывать.
      psych: parsed.psych ? { ...base.psych, ...parsed.psych } : base.psych,
    };
    await persistContacts([...contacts, newContact]);
    if (parsedCategory && !categories.includes(parsedCategory)) {
      await persistCategories([...categories, parsedCategory]);
    }
    const newTags = newContact.tags.filter((t) => !tags.includes(t));
    if (newTags.length > 0) await persistTags([...tags, ...newTags]);

    if (parsed.task && parsed.task.title) {
      const newTask = emptyTask({
        contactId: newContact.id,
        type: parsed.task.type || "follow_up",
        title: parsed.task.title.trim(),
        dueDate: parsed.task.dueDate || null,
      });
      await persistTasks([...tasks, newTask]);
      showToast("Контакт и задача сохранены");
    } else {
      showToast("Контакт сохранён");
    }
    setQuickAddOpen(false);
  }

  // --- Таск-борд (Модуль 3B) ---
  async function handleCreateTask(draft) {
    const newTask = emptyTask({
      contactId: draft.contactId,
      type: draft.type || "follow_up",
      title: draft.title.trim(),
      dueDate: draft.dueDate || null,
      important: !!draft.important,
      subtasks: draft.subtasks || [],
      reminderTime: draft.reminderTime || null,
      repeat: draft.repeat || "none",
    });
    await persistTasks([...tasks, newTask]);
    showToast("Задача создана");
  }
  // Единая точка редактирования задачи — используется и быстрым чекбоксом
  // (меняет только status), и полной формой редактирования (title/type/
  // dueDate/contactId/important/subtasks/reminderTime/repeat). completedAt
  // проставляется/сбрасывается автоматически при переходе в 'done' и обратно —
  // пригодится для сортировки вкладки "Готово" по свежести выполнения.
  // Если у завершаемой задачи задан повтор — тут же заводим следующую
  // "живую" копию с пересчитанным сроком, чтобы серия (например,
  // еженедельный созвон) не обрывалась после первого выполнения.
  async function handleUpdateTask(taskId, patch) {
    let extra = null;
    const next = tasks.map((t) => {
      if (t.id !== taskId) return t;
      const merged = { ...t, ...patch };
      if (patch.status) {
        merged.completedAt = patch.status === "done" ? Date.now() : null;
        if (patch.status === "done" && t.repeat && t.repeat !== "none" && t.dueDate) {
          const nextDue = nextRepeatDate(t.dueDate, t.repeat);
          if (nextDue) {
            extra = emptyTask({
              contactId: t.contactId, type: t.type, title: t.title, dueDate: nextDue,
              important: t.important, repeat: t.repeat, reminderTime: t.reminderTime,
              subtasks: (t.subtasks || []).map((s) => ({ ...s, done: false })),
            });
          }
        }
      }
      return merged;
    });
    await persistTasks(extra ? [...next, extra] : next);
    if (extra) showToast("Готово! Следующая задача серии создана автоматически");
  }
  async function handleUpdateTaskStatus(taskId, newStatus) {
    await handleUpdateTask(taskId, { status: newStatus });
  }
  async function handleToggleTaskImportant(taskId) {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    await handleUpdateTask(taskId, { important: !t.important });
  }
  async function handleDeleteTask(taskId) {
    const next = tasks.filter((t) => t.id !== taskId);
    await persistTasks(next);
    showToast("Задача удалена");
  }

  // --- Типы задач (Фаза 1) — редактируемые пользователем ---
  async function handleAddTaskType({ key, label, color }) {
    if (!label.trim()) return;
    await persistTaskTypes([...taskTypes, { key, label: label.trim(), hint: "", color }]);
  }
  async function handleRenameTaskType(key, label) {
    await persistTaskTypes(taskTypes.map((t) => (t.key === key ? { ...t, label } : t)));
  }
  async function handleDeleteTaskType(key) {
    if (taskTypes.length <= 1) return;
    await persistTaskTypes(taskTypes.filter((t) => t.key !== key));
  }

  // --- Цели (Модуль 3D) ---
  async function handleCreateGoal(draft) {
    await persistGoals([...goals, emptyGoal(draft)]);
    showToast("Цель создана");
  }
  async function handleUpdateGoal(goalId, draft) {
    const next = goals.map((g) => (g.id === goalId ? { ...g, ...draft } : g));
    await persistGoals(next);
    showToast("Цель обновлена");
  }
  async function handleToggleQualDone(goalId) {
    const next = goals.map((g) => (g.id === goalId ? { ...g, status: g.status === "done" ? "in_progress" : "done" } : g));
    await persistGoals(next);
  }
  async function handleDeleteGoal(goalId) {
    await persistGoals(goals.filter((g) => g.id !== goalId));
    showToast("Цель удалена");
  }
  async function handleTogglePinnedGoal(goalId) {
    const target = goals.find((g) => g.id === goalId);
    if (!target) return;
    if (!target.pinnedOnHome) {
      const pinnedCount = goals.filter((g) => g.pinnedOnHome && !computeGoalProgress(g, contacts).isDone).length;
      if (pinnedCount >= 2) {
        showToast("Можно закрепить не больше 2 целей");
        return;
      }
    }
    const next = goals.map((g) => (g.id === goalId ? { ...g, pinnedOnHome: !g.pinnedOnHome } : g));
    await persistGoals(next);
  }

  // --- Подписка / лимит AI-запросов (Модуль 3D) ---
  // Реального биллинга здесь нет (см. Profile.jsx) — это только контроль
  // лимита, чтобы демо-режим free-плана имел смысл в интерфейсе.
  const canUseAi = subscription.plan === "pro" || subscription.aiRequestsUsed < subscription.aiRequestsLimit;
  const remainingAi = subscription.plan === "pro" ? Infinity : Math.max(0, subscription.aiRequestsLimit - subscription.aiRequestsUsed);
  async function recordAiUsage() {
    const current = subscriptionRef.current;
    if (current.plan === "pro") return;
    const next = { ...current, aiRequestsUsed: current.aiRequestsUsed + 1 };
    subscriptionRef.current = next; // сразу, синхронно — следующий вызов увидит инкремент, даже не дождавшись persist
    await persistSubscription(next);
  }
  async function handleActivateDemoPro() {
    const next = { ...subscriptionRef.current, plan: "pro" };
    subscriptionRef.current = next;
    await persistSubscription(next);
    showToast("Pro активирован в демо-режиме");
    setProfileOpen(false);
  }
  async function handleActivateProViaStars() {
    const next = { ...subscriptionRef.current, plan: "pro" };
    subscriptionRef.current = next;
    await persistSubscription(next);
    showToast("Оплата прошла — Pro Networker активирован ⭐");
    setProfileOpen(false);
  }
  async function handleDowngradeToFree() {
    const next = { ...emptySubscription(), aiRequestsUsed: 0 };
    subscriptionRef.current = next;
    await persistSubscription(next);
    showToast("Возвращено на Free Trial");
  }

  const avatarStack = contacts.slice(0, 4);
  const lastContact = contacts.length > 0 ? [...contacts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] : null;
  // activeGoals — все ещё не выполненные цели (раньше был только первый —
  // activeGoal, из-за чего на главном экране показывалась только одна
  // цель, даже если пользователь завёл несколько). computeGoalProgress()
  // уже верно считает готовность для обоих типов целей (количественных и
  // качественных) — используем его вместо сырого поля status.
  const activeGoals = goals.filter((g) => !computeGoalProgress(g, contacts).isDone);
  // homeGoals — что реально показываем на главном экране: если активна 1
  // цель или 2 — показываем их все автоматически; если больше двух, авто-
  // показ выключается и остаются только вручную закреплённые (тумблер
  // «На главном экране» в настройках цели), максимум 2 из них.
  const homeGoals = activeGoals.length > 2 ? activeGoals.filter((g) => g.pinnedOnHome).slice(0, 2) : activeGoals;

  // --- Auth Gate (Модуль Фаза C) ---
  // Если initData отсутствует — приложение открыто не через Telegram
  // (браузер напрямую, левый iframe и т.п.). Показываем блокирующий экран
  // вместо данных пользователя. Исключение — локальная разработка через
  // `npm run dev`: import.meta.env.DEV истинен только там и никогда в
  // собранном продакшен-билде, так что это не дыра в безопасности.
  const hasTelegramContext = typeof window !== "undefined" && !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData);
  const isDevMode = import.meta.env.DEV;
  if (!hasTelegramContext && !isDevMode) {
    return <AuthGateScreen />;
  }

  return (
    <div style={styles.app}>
      <style>{globalCss}</style>

      {showSplash && <SplashScreen closing={splashClosing} />}

      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.topBar}>
            <div style={styles.navLeft}>Contacts</div>
            <div style={styles.navCenterLogo}>FOR PEOPLE</div>
            <div style={styles.topActions}>
              <button className="fp-btn" style={styles.iconBtn} onClick={exportCsv} aria-label="Экспорт"><Download size={15} strokeWidth={2.25} /></button>
              <button className="fp-btn" style={{ ...styles.pillBtnGhost, ...(selectMode ? styles.pillBtnGhostActive : {}) }} onClick={toggleSelectMode}>
                {selectMode ? "Готово" : "Выбрать"}
              </button>
            </div>
          </div>

          <div style={styles.heroRow}>
            <div style={styles.heroTextBlock}>
              <div style={styles.heroEyebrow}>Найди своих</div>
              <h1 style={styles.heroTitle}>PEOPLE</h1>
            </div>
            <div style={styles.heroTextBlockRight}>
              <div style={styles.heroEyebrow}>Построй свой</div>
              <h1 style={styles.heroTitle}>CIRCLE</h1>
            </div>
          </div>

          <div style={styles.heroPanel} ref={heroPanelRef}>
            <div style={styles.heroPanelGlow1} />
            <div style={styles.heroPanelGlow2} />
            <img src="/logo-mark.png" alt="" aria-hidden style={styles.heroPanelLogoMark} />
            <div style={styles.heroPanelTop}>
              <div style={styles.heroPanelLeft}>
                <div style={styles.heroPanelBadge}>✦ Личная CRM</div>
                <div style={styles.heroPanelHeading}>Люди, которые<br />всегда под рукой</div>
                <div style={styles.heroPanelDesc}>Находите нужного человека за секунды — по тегам, интересам и AI-подсказкам.</div>
                <button className="fp-btn" style={styles.exploreBtn} onClick={() => setAiOpen(true)}>
                  Открыть AI
                  <span style={styles.exploreBtnCircle}><ArrowUpRight size={13} color={INK} strokeWidth={2.5} /></span>
                </button>
                {avatarStack.length > 0 && (
                  <div style={styles.socialProofRow}>
                    <div style={styles.avatarCluster}>
                      {avatarStack.map((c, i) => (
                        <div key={c.id} style={{ ...styles.clusterAvatar, marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }}>
                          {c.avatar ? <img src={c.avatar} alt="" style={styles.avatarImg} /> : initials(c)}
                        </div>
                      ))}
                    </div>
                    <div style={styles.socialProofText}>
                      <Heart size={11} color="#fff" fill="#fff" style={{ marginRight: 4, verticalAlign: -1 }} />
                      {contacts.length} {pluralPeople(contacts.length)} в базе
                    </div>
                  </div>
                )}
              </div>

              <div style={styles.heroPanelRight}>
                <div style={styles.heroStatsRow}>
                  <div style={styles.heroStatItem}>
                    <div style={styles.heroStatIconWrap}><Users size={13} color="#fff" strokeWidth={2.25} /></div>
                    <div style={styles.heroStatNum}>{contacts.length}</div>
                    <div style={styles.heroStatLabel}>Контакты</div>
                  </div>
                  <div style={styles.heroStatItem}>
                    <div style={styles.heroStatIconWrap}><Layers size={13} color="#fff" strokeWidth={2.25} /></div>
                    <div style={styles.heroStatNum}>{categories.length}</div>
                    <div style={styles.heroStatLabel}>Категории</div>
                  </div>
                  <div style={styles.heroStatItem}>
                    <div style={styles.heroStatIconWrap}><TagIcon size={13} color="#fff" strokeWidth={2.25} /></div>
                    <div style={styles.heroStatNum}>{tags.length}</div>
                    <div style={styles.heroStatLabel}>Теги</div>
                  </div>
                </div>

                <div style={styles.featuredLabel}>На связи</div>
                {lastContact ? (() => {
                  const lastLink = buildContactLink(lastContact);
                  const isCall = lastLink?.label === "Позвонить";
                  return (
                    <button className="fp-btn" style={styles.featuredCard} onClick={() => setOpenId(lastContact.id)}>
                      <div style={styles.featuredTopRow}>
                        <div style={styles.featuredAvatar}>{lastContact.avatar ? <img src={lastContact.avatar} alt="" style={styles.avatarImg} /> : initials(lastContact)}</div>
                        <div style={styles.featuredBody}>
                          <div style={styles.featuredName}>{lastContact.firstName} {lastContact.lastName}</div>
                          <div style={styles.featuredSub}>{lastContact.job || contactCategories(lastContact)[0] || "Новый контакт"}</div>
                        </div>
                      </div>
                      {lastLink && (
                        <div style={styles.featuredBtn}>
                          {isCall ? <Phone size={11} color="#fff" /> : <Send size={11} color="#fff" />}
                          {isCall ? "Позвонить" : "Написать"}
                        </div>
                      )}
                    </button>
                  );
                })() : (
                  <button className="fp-btn" style={styles.featuredCard} onClick={startNew}>
                    <div style={styles.featuredTopRow}>
                      <div style={styles.featuredAvatar}><Plus size={16} color="#7C4DFF" /></div>
                      <div style={styles.featuredBody}>
                        <div style={styles.featuredName}>Добавить</div>
                        <div style={styles.featuredSub}>первого человека</div>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>

          {homeGoals.length >= 1 && (
            <div style={styles.goalStripGrid}>
              {homeGoals.map((g) => {
                const pct = computeGoalProgress(g, contacts).pct;
                return (
                  <button
                    key={g.id}
                    className="fp-btn"
                    style={{ ...styles.goalStripCardSmall, ...(homeGoals.length === 1 ? { gridColumn: "1 / -1" } : {}) }}
                    onClick={() => setGoalsOpen(true)}
                  >
                    <div style={styles.goalStripSmallTop}>
                      <div style={styles.goalStripIconSmall}><Target size={12} color="#7C4DFF" /></div>
                      <span style={styles.goalStripSmallTitle}>{g.title}</span>
                    </div>
                    <div style={styles.goalStripTrack}>
                      <div style={{ ...styles.goalStripFill, width: `${pct}%` }} />
                    </div>
                    <span style={styles.goalStripSmallPct}>{pct}%</span>
                  </button>
                );
              })}
            </div>
          )}

          <div style={styles.searchBar}>
            <Search size={16} color="rgba(11,11,16,0.4)" style={{ flexShrink: 0 }} />
            <input style={styles.searchInput} placeholder="Имя, телефон, ник, тег…" value={query} onChange={(e) => setQuery(e.target.value)} />
            {query && <button className="fp-btn" style={styles.clearBtn} onClick={() => setQuery("")}><X size={14} color="rgba(11,11,16,0.5)" /></button>}
          </div>

          <div style={styles.categoryRow}>
            <button className="fp-btn" style={{ ...styles.categoryChip, ...(activeCategory === null ? styles.categoryChipActive : {}) }} onClick={() => setActiveCategory(null)}>Все · {contacts.length}</button>
            {categories.map((cat) => (
              <button key={cat} className="fp-btn" style={{ ...styles.categoryChip, ...(activeCategory === cat ? styles.categoryChipActive : {}) }} onClick={() => setActiveCategory(cat)}>{cat}</button>
            ))}
          </div>
        </header>

        <main style={styles.main}>
          {!loaded ? null : filtered.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIconWrap}><User size={26} color="#7C4DFF" strokeWidth={1.5} /></div>
              <div style={styles.emptyTitle}>{contacts.length === 0 ? "Пока пусто" : "Ничего не найдено"}</div>
              <div style={styles.emptyHint}>{contacts.length === 0 ? "Добавьте первого человека" : "Попробуйте другой запрос"}</div>
            </div>
          ) : (
            <div style={styles.grid}>
              {filtered.map((c, i) => (
                <ContactCard
                  key={c.id}
                  contact={c}
                  index={i}
                  selectMode={selectMode}
                  isSelected={selectedIds.has(c.id)}
                  onClick={handleCardClick}
                  onMarkContacted={handleMarkContacted}
                />
              ))}
              {!selectMode && (
                <button className="fp-card" style={styles.addCard} onClick={startNew}>
                  <Plus size={22} color="#7C4DFF" strokeWidth={1.75} />
                  <span style={styles.addCardLabel}>Добавить человека</span>
                </button>
              )}
            </div>
          )}
        </main>
      </div>

      {loaded && !selectMode && (
        <>
          <button className="fp-fab" style={styles.fabSecondary} onClick={() => setQuickAddOpen(true)} aria-label="Быстрое добавление через AI">
            <span aria-hidden style={{ ...styles.fabWhiteOverlay, opacity: fabOnPurple.secondary ? 1 : 0 }} />
            <Wand2 size={19} color={fabOnPurple.secondary ? PURPLE : "#fff"} strokeWidth={2.25} style={styles.fabIcon} />
          </button>
          <button className="fp-fab" style={styles.fab} onClick={startNew} aria-label="Добавить">
            <span aria-hidden style={{ ...styles.fabWhiteOverlay, opacity: fabOnPurple.main ? 1 : 0 }} />
            <Plus size={22} color={fabOnPurple.main ? PURPLE : "#fff"} strokeWidth={2.5} style={styles.fabIcon} />
          </button>
        </>
      )}

      {loaded && !selectMode && (
        <nav style={styles.bottomBar}>
          <button className="fp-btn" style={styles.bottomBarItem} onClick={() => setProfileOpen(true)}>
            <CreditCard size={18} strokeWidth={2.15} />
            {subscription.plan === "pro" && <span style={{ ...styles.iconBtnBadge, top: -2, right: 6, background: "#7C4DFF" }}>P</span>}
            <span style={styles.bottomBarLabel}>Кабинет</span>
          </button>
          <button className="fp-btn" style={styles.bottomBarItem} onClick={() => setGoalsOpen(true)}>
            <Target size={18} strokeWidth={2.15} />
            <span style={styles.bottomBarLabel}>Цели</span>
          </button>
          <button className="fp-btn" style={styles.bottomBarItem} onClick={() => setTaskBoardOpen(true)}>
            <ListChecks size={18} strokeWidth={2.15} />
            {activeTaskCount > 0 && (
              <span style={{ ...styles.iconBtnBadge, top: -2, right: 6 }}>{activeTaskCount}</span>
            )}
            <span style={styles.bottomBarLabel}>Задачи</span>
          </button>
          <button className="fp-btn" style={styles.bottomBarItem} onClick={() => setHealthCheckOpen(true)}>
            <Gauge size={18} strokeWidth={2.15} />
            <span style={styles.bottomBarLabel}>Анализ</span>
          </button>
          <button className="fp-btn" style={styles.bottomBarItem} onClick={() => setAiOpen(true)}>
            <Sparkles size={18} strokeWidth={2.15} />
            <span style={styles.bottomBarLabel}>AI</span>
          </button>
          <button className="fp-btn" style={styles.bottomBarItem} onClick={() => setImportOpen(true)}>
            <Upload size={18} strokeWidth={2.15} />
            <span style={styles.bottomBarLabel}>Импорт</span>
          </button>
        </nav>
      )}

      {selectMode && selectedIds.size > 0 && (
        <div className="fp-slideup" style={styles.bulkBar}>
          <span style={styles.bulkCount}>{selectedIds.size} выбрано</span>
          <div style={styles.bulkActions}>
            <button className="fp-btn" style={styles.bulkBtn} onClick={() => setBulkPopover(bulkPopover === "category" ? null : "category")}><Layers size={13} /> Категория</button>
            <button className="fp-btn" style={styles.bulkBtn} onClick={() => setBulkPopover(bulkPopover === "tag" ? null : "tag")}><TagIcon size={13} /> Тег</button>
            <button className="fp-btn" style={{ ...styles.bulkBtn, color: "#E5484D" }} onClick={() => setConfirmBulkDelete(true)}><Trash2 size={13} /> Удалить</button>
          </div>
        </div>
      )}

      {bulkPopover === "category" && (
        <div className={closingBulkPopover ? "fp-overlay-anim-out" : "fp-overlay-anim"} style={styles.overlay} onClick={closeBulkPopover}>
          <div className={closingBulkPopover ? "fp-sheet-anim-out" : "fp-sheet-anim"} style={styles.popoverSheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.popoverTitle}>Применить категорию</div>
            <div style={styles.chipWrap}>{categories.map((cat) => <button key={cat} className="fp-btn" style={styles.pickChip} onClick={() => bulkAddCategory(cat)}>{cat}</button>)}</div>
            <InlineAdd placeholder="Новая категория" onAdd={async (v) => { const n = v.trim(); await addNewCategory(n); await bulkAddCategory(n); }} />
          </div>
        </div>
      )}

      {bulkPopover === "tag" && (
        <div className={closingBulkPopover ? "fp-overlay-anim-out" : "fp-overlay-anim"} style={styles.overlay} onClick={closeBulkPopover}>
          <div className={closingBulkPopover ? "fp-sheet-anim-out" : "fp-sheet-anim"} style={styles.popoverSheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.popoverTitle}>Добавить тег выбранным</div>
            <div style={styles.chipWrap}>
              {tags.map((t) => {
                const active = bulkTagPicks.has(t);
                return <button key={t} className="fp-btn" style={{ ...styles.pickChip, ...(active ? styles.pickChipActive : {}) }} onClick={() => setBulkTagPicks((prev) => { const next = new Set(prev); if (next.has(t)) next.delete(t); else next.add(t); return next; })}>#{t}</button>;
              })}
            </div>
            <InlineAdd placeholder="Новый тег" onAdd={async (v) => { await addNewTag(v); setBulkTagPicks((prev) => new Set([...prev, v.trim()])); }} />
            <button className="fp-btn" style={styles.primaryPill} onClick={bulkApplyTags}>Применить</button>
          </div>
        </div>
      )}

      <ConfirmModal
        open={confirmBulkDelete}
        title={`Удалить ${selectedIds.size} контактов?`}
        hint="Действие необратимо."
        confirmLabel="Удалить"
        danger
        onConfirm={bulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />

      {openContact && (
        <div className={closingContact ? "fp-overlay-anim-out" : "fp-overlay-anim"} style={styles.overlay} onClick={closeContact}>
          <div className={closingContact ? "fp-sheet-anim-out" : "fp-sheet-anim"} style={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.sheetHandle} />
            <button className="fp-btn" style={styles.closeBtn} onClick={closeContact}><X size={16} color="#0B0B10" /></button>

            <div style={styles.avatarBubbleBig}>{openContact.avatar ? <img src={openContact.avatar} alt="" style={styles.avatarImgBig} /> : initials(openContact)}</div>
            <div style={styles.detailName}>{openContact.firstName} {openContact.lastName}</div>
            {openContact.job && <div style={styles.detailSub}>{openContact.job}{openContact.company ? ` · ${openContact.company}` : ""}</div>}
            {contactCategories(openContact).length > 0 && (
              <div style={{ ...styles.chipWrap, marginTop: 6 }}>
                {contactCategories(openContact).map((cat) => <span key={cat} style={styles.detailCategoryTag}>{cat}</span>)}
              </div>
            )}
            {openContact.tags && openContact.tags.length > 0 && (
              <div style={{ ...styles.chipWrap, marginTop: 8 }}>{openContact.tags.map((t) => <span key={t} style={styles.tagBadge}>#{t}</span>)}</div>
            )}

            {(() => {
              const link = buildContactLink(openContact);
              const methods = [
                openContact.phone && { key: "phone", label: "Звонок" },
                openContact.messengers?.telegram?.enabled && openContact.messengers.telegram.nick && { key: "telegram", label: "Telegram" },
                openContact.messengers?.whatsapp?.enabled && (openContact.messengers.whatsapp.phone || openContact.phone) && { key: "whatsapp", label: "WhatsApp" },
                openContact.messengers?.vk?.enabled && openContact.messengers.vk.nick && { key: "vk", label: "VK" },
                openContact.messengers?.line?.enabled && openContact.messengers.line.nick && { key: "line", label: "LINE" },
              ].filter(Boolean);
              // Порядок в methods (для отображения чипов) НЕ совпадает с
              // приоритетом фолбэка внутри buildContactLink (там telegram →
              // whatsapp → vk → line → phone). Раньше дефолтным активным
              // чипом при пустом preferredContact считался methods[0].key —
              // почти всегда "phone", из-за чего "Позвонить" подсвечивался
              // активным даже когда реальная ссылка/кнопка сверху вела в
              // мессенджер. Берём дефолт из уже посчитанного link, чтобы
              // подсветка совпадала с тем, что реально произойдёт по клику.
              const linkLabelToKey = { "Позвонить": "phone", Telegram: "telegram", WhatsApp: "whatsapp", VK: "vk", LINE: "line" };
              const defaultKey = (link && linkLabelToKey[link.label]) || methods[0]?.key;
              return (
                <>
                  {link && (
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="fp-btn" style={{ ...styles.primaryPill, marginTop: 14, textDecoration: "none" }}>
                      {link.label === "Позвонить" ? <Phone size={14} /> : <Send size={14} />} {link.label === "Позвонить" ? "Позвонить" : `Написать в ${link.label}`}
                    </a>
                  )}
                  {methods.length > 1 && (
                    <>
                      <div style={{ ...styles.sectionLabel, marginTop: 14 }}>Предпочтительный способ связи</div>
                      <div style={styles.chipWrap}>
                        {methods.map((m) => (
                          <button
                            key={m.key}
                            className="fp-btn"
                            style={{ ...styles.pickChipSmall, ...((openContact.preferredContact || defaultKey) === m.key ? styles.pickChipActive : {}) }}
                            onClick={() => handleSetPreferredContact(openContact.id, m.key)}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              );
            })()}

            <div style={styles.sectionLabel}>Контакты</div>
            <div style={styles.detailFields}>
              {openContact.phone && <div style={styles.detailField}><Phone size={15} color="#7C4DFF" /><a href={`tel:${openContact.phone}`} style={styles.detailLink}>{openContact.phone}</a></div>}
              {openContact.email && <div style={styles.detailField}><Mail size={15} color="#7C4DFF" /><a href={`mailto:${openContact.email}`} style={styles.detailLink}>{openContact.email}</a></div>}
              {openContact.city && <div style={styles.detailField}><MapPin size={15} color="#7C4DFF" /><span style={styles.detailText}>{openContact.city}</span></div>}
              {openContact.birthday && <div style={styles.detailField}><CalendarDays size={15} color="#7C4DFF" /><span style={styles.detailText}>{openContact.birthday}</span></div>}
              {MESSENGERS.filter((m) => openContact.messengers?.[m.key]?.enabled).map((m) => {
                const d = openContact.messengers[m.key];
                return <div key={m.key} style={styles.detailField}><span style={{ ...styles.msgBadge, background: `${m.color}18`, color: m.color }}>{m.short}</span><span style={styles.detailText}>{[d.nick, d.phone].filter(Boolean).join(" · ")}</span></div>;
              })}
              {!openContact.phone && !openContact.email && MESSENGERS.every((m) => !openContact.messengers?.[m.key]?.enabled) && <div style={styles.detailHint}>Нет данных для связи</div>}
            </div>

            {(openContact.interests || openContact.helpWith) && (
              <>
                <div style={styles.sectionLabel}>О человеке</div>
                <div style={styles.detailFields}>
                  {openContact.interests && <div style={styles.detailField}><Heart size={15} color="#7C4DFF" /><span style={styles.detailText}>{openContact.interests}</span></div>}
                  {openContact.helpWith && <div style={styles.detailField}><Briefcase size={15} color="#7C4DFF" /><span style={styles.detailText}>{openContact.helpWith}</span></div>}
                </div>
              </>
            )}

            {openContact.comment && <><div style={styles.sectionLabel}>Комментарий</div><div style={styles.detailNote}>{openContact.comment}</div></>}

            {(openContact.psych?.personality || openContact.psych?.values || openContact.psych?.commStyle || openContact.psych?.triggers ||
              openContact.psych?.conflictStyle || openContact.psych?.trust || openContact.psych?.energy || openContact.psych?.howMet || openContact.psych?.lastContact) && (
              <>
                <div style={styles.sectionLabel}><Brain size={12} style={{ marginRight: 4, verticalAlign: -2 }} />Психологический портрет</div>
                <div style={styles.psychBlock}>
                  {openContact.psych.personality && <PsychRow label="Тип личности" value={openContact.psych.personality} />}
                  {openContact.psych.values && <PsychRow label="Ценности и мотивация" value={openContact.psych.values} />}
                  {openContact.psych.commStyle && <PsychRow label="Стиль общения" value={openContact.psych.commStyle} />}
                  {openContact.psych.triggers && <PsychRow label="Триггеры" value={openContact.psych.triggers} />}
                  {openContact.psych.conflictStyle && <PsychRow label="В конфликте" value={openContact.psych.conflictStyle} />}
                  {openContact.psych.trust && <PsychRow label="Уровень доверия" value={`${openContact.psych.trust} / 5`} />}
                  {openContact.psych.energy && <PsychRow label="Энергия от общения" value={openContact.psych.energy} />}
                  {openContact.psych.howMet && <PsychRow label="Как познакомились" value={openContact.psych.howMet} />}
                  {openContact.psych.lastContact && <PsychRow label="Последний контакт" value={openContact.psych.lastContact} />}
                </div>
              </>
            )}

            <div style={{ ...styles.detailActions, marginTop: 20 }}>
              <button className="fp-btn" style={styles.secondaryPill} onClick={() => setConfirmDeleteId(openContact.id)}><Trash2 size={14} /> Удалить</button>
              <button className="fp-btn" style={styles.primaryPill} onClick={() => startEdit(openContact)}>Редактировать <ArrowUpRight size={14} /></button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!confirmDeleteId}
        title="Удалить контакт?"
        hint="Действие необратимо."
        confirmLabel="Удалить"
        danger
        onConfirm={() => deleteContact(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {drafting && (
        <div className={closingDraft ? "fp-overlay-anim-out" : "fp-overlay-anim"} style={styles.overlay} onClick={closeDraft}>
          <div className={closingDraft ? "fp-sheet-anim-out" : "fp-sheet-anim"} style={styles.formSheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.sheetHandle} />
            <div style={styles.formHeader}>
              <div style={styles.formTitle}>{contacts.some((c) => c.id === drafting.id) ? "Редактировать" : "Новый человек"}</div>
              <button className="fp-btn" style={styles.closeBtn} onClick={closeDraft}><X size={16} color="#0B0B10" /></button>
            </div>

            <div style={styles.stepTabs}>
              {STEP_DEFS.map((s, i) => (
                <button key={s.key} className="fp-btn" style={{ ...styles.stepTab, ...(step === i ? styles.stepTabActive : {}) }} onClick={() => setStep(i)}>{s.label}</button>
              ))}
            </div>

            <div key={step} className="fp-step-anim">
              {step === 0 && (
                <>
                  <div style={styles.avatarRow}>
                    <button className="fp-btn" style={styles.avatarPicker} onClick={() => avatarInputRef.current && avatarInputRef.current.click()}>
                      {drafting.avatar ? <img src={drafting.avatar} alt="" style={styles.avatarImgBig} /> : <Camera size={22} color="#7C4DFF" />}
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarPicked} />
                    <div style={styles.avatarHint}>Фото профиля<br /><span style={{ opacity: 0.55 }}>по желанию</span></div>
                  </div>
                  <div style={styles.formGrid}>
                    <Field label="Имя" value={drafting.firstName} onChange={(v) => setDrafting({ ...drafting, firstName: v })} placeholder="Иван" />
                    <Field label="Фамилия" value={drafting.lastName} onChange={(v) => setDrafting({ ...drafting, lastName: v })} placeholder="Петров" />
                    <Field label="Телефон" value={drafting.phone} onChange={(v) => setDrafting({ ...drafting, phone: v })} placeholder="+7 (900) 000-00-00" phoneMask />
                    <Field label="Email" value={drafting.email} onChange={(v) => setDrafting({ ...drafting, email: v })} placeholder="mail@example.com" />
                  </div>
                  <div style={styles.sectionLabel}>Категория</div>
                  <div style={styles.chipWrap}>
                    {categories.map((cat) => (
                      <button key={cat} className="fp-btn" style={{ ...styles.pickChip, ...((drafting.categories || []).includes(cat) ? styles.pickChipActive : {}) }} onClick={() => toggleDraftCategory(cat)}>{cat}</button>
                    ))}
                  </div>
                  <InlineAdd placeholder="Новая категория" onAdd={async (v) => { const n = v.trim(); await addNewCategory(n); if (n) setDrafting((d) => ({ ...d, categories: Array.from(new Set([...(d.categories || []), n])) })); }} />
                  <div style={styles.sectionLabel}>Теги</div>
                  <div style={styles.chipWrap}>
                    {(tagsChipsExpanded ? tags : tags.slice(0, 5)).map((t) => (
                      <button key={t} className="fp-btn" style={{ ...styles.pickChip, ...(drafting.tags.includes(t) ? styles.pickChipActive : {}) }} onClick={() => toggleDraftTag(t)}>#{t}</button>
                    ))}
                    {!tagsChipsExpanded && tags.length > 5 && (
                      <button className="fp-btn" style={styles.pickChip} onClick={() => setTagsChipsExpanded(true)}>Показать ещё ({tags.length - 5})</button>
                    )}
                  </div>
                  <InlineAdd placeholder="Новый тег" onAdd={async (v) => { await addNewTag(v); toggleDraftTag(v.trim()); }} />
                </>
              )}

              {step === 1 && (
                <>
                  <div style={styles.sectionLabel}>Мессенджеры</div>
                  <div style={styles.chipWrap}>
                    {MESSENGERS.map((m) => {
                      const on = drafting.messengers[m.key].enabled;
                      return <button key={m.key} className="fp-btn" style={{ ...styles.pickChip, ...(on ? { background: m.color, color: "#fff", border: `1px solid ${m.color}` } : {}) }} onClick={() => toggleMessenger(m.key)}>{m.label}</button>;
                    })}
                  </div>
                  {MESSENGERS.filter((m) => drafting.messengers[m.key].enabled).map((m) => (
                    <div key={m.key} className="fp-slideup" style={styles.messengerFieldsRow}>
                      <div style={styles.messengerFieldsLabel}>{m.label} — заполните хотя бы одно поле</div>
                      <div className="fp-pair-row">
                        <Field label="Ник" value={drafting.messengers[m.key].nick} onChange={(v) => updateMessengerField(m.key, "nick", v)} placeholder={m.nickPrefix ? `${m.nickPrefix}${m.nickPlaceholder}` : "@username"} compact />
                        <Field label="Телефон" value={drafting.messengers[m.key].phone} onChange={(v) => updateMessengerField(m.key, "phone", v)} placeholder="+7 (900) 000…" compact phoneMask />
                      </div>
                      {m.nickPrefix && (
                        <div style={styles.messengerPrefixHint}>Вставьте только {m.key === "whatsapp" ? "номер" : "юзернейм/id"} — ссылку {m.nickPrefix}… соберём сами; если вставите готовую ссылку, префикс срежем автоматически.</div>
                      )}
                    </div>
                  ))}
                  {MESSENGERS.every((m) => !drafting.messengers[m.key].enabled) && <div style={styles.emptyHintSmall}>Выберите хотя бы один мессенджер, если хотите его сохранить</div>}
                </>
              )}

              {step === 2 && (
                <>
                  <div style={styles.sectionLabel}>Работа и место</div>
                  <div style={styles.formGrid}>
                    <Field label="Профессия" value={drafting.job} onChange={(v) => setDrafting({ ...drafting, job: v })} placeholder="Дизайнер, автомеханик…" />
                    <Field label="Компания" value={drafting.company} onChange={(v) => setDrafting({ ...drafting, company: v })} placeholder="Название" />
                    <Field label="Город" value={drafting.city} onChange={(v) => setDrafting({ ...drafting, city: v })} placeholder="Москва" />
                    <div style={styles.fieldWrap}>
                      <span style={styles.fieldLabel}>День рождения</span>
                      <input type="date" style={styles.fieldInput} value={drafting.birthday} onChange={(e) => setDrafting({ ...drafting, birthday: e.target.value })} />
                    </div>
                  </div>
                  <div style={styles.sectionLabel}>Для AI-поиска</div>
                  <Field label="Интересы и хобби" value={drafting.interests} onChange={(v) => setDrafting({ ...drafting, interests: v })} placeholder="Горные лыжи, кулинария, гитара…" textarea />
                  <Field label="Чем может помочь" value={drafting.helpWith} onChange={(v) => setDrafting({ ...drafting, helpWith: v })} placeholder="Чинит машины, разбирается в праве, шьёт…" textarea />
                  <div style={styles.sectionLabel}>Комментарий</div>
                  <Field value={drafting.comment} onChange={(v) => setDrafting({ ...drafting, comment: v })} placeholder="Как познакомились, о чём говорили…" textarea />
                </>
              )}

              {step === 3 && (
                <div style={styles.psychFormBlock}>
                  <Field label="Тип личности / характер" value={drafting.psych.personality} onChange={(v) => setDrafting({ ...drafting, psych: { ...drafting.psych, personality: v } })} placeholder="Интроверт, аналитик, эмпат…" textarea />
                  <Field label="Ценности и мотивация" value={drafting.psych.values} onChange={(v) => setDrafting({ ...drafting, psych: { ...drafting.psych, values: v } })} placeholder="Что для него/неё важно" textarea />
                  <Field label="Как лучше общаться" value={drafting.psych.commStyle} onChange={(v) => setDrafting({ ...drafting, psych: { ...drafting.psych, commStyle: v } })} placeholder="Прямо, мягко, с юмором…" textarea />
                  <Field label="Триггеры / чувствительные темы" value={drafting.psych.triggers} onChange={(v) => setDrafting({ ...drafting, psych: { ...drafting.psych, triggers: v } })} placeholder="Чего лучше избегать" textarea />
                  <Field label="Поведение в конфликте" value={drafting.psych.conflictStyle} onChange={(v) => setDrafting({ ...drafting, psych: { ...drafting.psych, conflictStyle: v } })} placeholder="Замыкается, спорит, уходит от темы…" textarea />
                  <div style={styles.fieldWrap}>
                    <span style={styles.fieldLabel}>Уровень доверия</span>
                    <div style={styles.chipWrap}>
                      {TRUST_OPTIONS.map((n) => <button key={n} className="fp-btn" style={{ ...styles.pickChipSmall, ...(drafting.psych.trust === n ? styles.pickChipActive : {}) }} onClick={() => setDrafting({ ...drafting, psych: { ...drafting.psych, trust: n } })}>{n}</button>)}
                    </div>
                  </div>
                  <div style={styles.fieldWrap}>
                    <span style={styles.fieldLabel}>Энергия от общения</span>
                    <div style={styles.chipWrap}>
                      {ENERGY_OPTIONS.map((opt) => <button key={opt} className="fp-btn" style={{ ...styles.pickChipSmall, ...(drafting.psych.energy === opt ? styles.pickChipActive : {}) }} onClick={() => setDrafting({ ...drafting, psych: { ...drafting.psych, energy: opt } })}>{opt}</button>)}
                    </div>
                  </div>
                  <Field label="Как познакомились" value={drafting.psych.howMet} onChange={(v) => setDrafting({ ...drafting, psych: { ...drafting.psych, howMet: v } })} placeholder="На конференции, через друзей…" />
                  <div style={styles.fieldWrap}>
                    <span style={styles.fieldLabel}><CalendarDays size={11} style={{ marginRight: 4, verticalAlign: -2 }} />Последний контакт</span>
                    <input type="date" style={styles.fieldInput} value={drafting.psych.lastContact} onChange={(e) => setDrafting({ ...drafting, psych: { ...drafting.psych, lastContact: e.target.value } })} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ ...styles.detailActions, marginTop: 20 }}>
              {step === 0 ? (
                <button className="fp-btn" style={styles.secondaryPill} onClick={closeDraft}>Отмена</button>
              ) : (
                <button className="fp-btn" style={styles.secondaryPill} onClick={() => setStep((s) => Math.max(0, s - 1))}><ChevronLeft size={15} /> Назад</button>
              )}
              {step < STEP_DEFS.length - 1 ? (
                <button className="fp-btn" style={styles.primaryPill} onClick={() => setStep((s) => Math.min(STEP_DEFS.length - 1, s + 1))}>Далее <ChevronRight size={15} /></button>
              ) : (
                <button className="fp-btn" style={styles.primaryPill} onClick={saveDraft}>Сохранить</button>
              )}
            </div>
          </div>
        </div>
      )}

      {importOpen && (
        <Suspense fallback={<LazyFallback />}>
          <ImportModal onClose={() => setImportOpen(false)} onImport={handleImportConfirmed} />
        </Suspense>
      )}

      {aiOpen && (
        <Suspense fallback={<LazyFallback />}>
          <AiAssistantModal
            contacts={contacts}
            onClose={() => setAiOpen(false)}
            onOpenContact={(id) => { setAiOpen(false); setOpenId(id); }}
            remainingAi={remainingAi}
            onUseAi={recordAiUsage}
            onOpenProfile={() => { setAiOpen(false); setProfileOpen(true); }}
          />
        </Suspense>
      )}

      {quickAddOpen && (
        <Suspense fallback={<LazyFallback />}>
          <QuickAddAI
            categories={categories}
            onClose={() => setQuickAddOpen(false)}
            onCreate={handleQuickAddCreate}
            remainingAi={remainingAi}
            onUseAi={recordAiUsage}
            onOpenProfile={() => { setQuickAddOpen(false); setProfileOpen(true); }}
          />
        </Suspense>
      )}

      {taskBoardOpen && (
        <Suspense fallback={<LazyFallback />}>
          <TaskBoard
            contacts={contacts}
            tasks={tasks}
            onClose={() => setTaskBoardOpen(false)}
            onUpdateTaskStatus={handleUpdateTaskStatus}
            onUpdateTask={handleUpdateTask}
            onToggleImportant={handleToggleTaskImportant}
            onDeleteTask={handleDeleteTask}
            onCreateTask={handleCreateTask}
            onOpenContact={(id) => { setTaskBoardOpen(false); setOpenId(id); }}
            taskTypes={taskTypes}
            onAddTaskType={handleAddTaskType}
            onRenameTaskType={handleRenameTaskType}
            onDeleteTaskType={handleDeleteTaskType}
          />
        </Suspense>
      )}

      {healthCheckOpen && (
        <Suspense fallback={<LazyFallback />}>
          <HealthCheck
            contacts={contacts}
            categories={categories}
            tasks={tasks}
            onClose={() => setHealthCheckOpen(false)}
            remainingAi={remainingAi}
            onUseAi={recordAiUsage}
            onOpenProfile={() => { setHealthCheckOpen(false); setProfileOpen(true); }}
          />
        </Suspense>
      )}

      {goalsOpen && (
        <Suspense fallback={<LazyFallback />}>
          <Goals
            goals={goals}
            contacts={contacts}
            categories={categories}
            tags={tags}
            onClose={() => setGoalsOpen(false)}
            onCreateGoal={handleCreateGoal}
            onUpdateGoal={handleUpdateGoal}
            onToggleQualDone={handleToggleQualDone}
            onDeleteGoal={handleDeleteGoal}
            onTogglePinned={handleTogglePinnedGoal}
          />
        </Suspense>
      )}

      {profileOpen && (
        <Suspense fallback={<LazyFallback />}>
          <Profile
            subscription={subscription}
            contacts={contacts}
            tasks={tasks}
            onClose={() => setProfileOpen(false)}
            onActivateDemoPro={handleActivateDemoPro}
            onActivateProViaStars={handleActivateProViaStars}
            onDowngradeToFree={handleDowngradeToFree}
          />
        </Suspense>
      )}

      {toast && <div className="fp-slideup" style={styles.toast}>{toast}</div>}
    </div>
  );
}

function AuthGateScreen() {
  return (
    <div style={styles.authGateWrap}>
      <div style={styles.authGateIcon}><Lock size={26} color="#7C4DFF" strokeWidth={2} /></div>
      <div style={styles.authGateTitle}>Доступ ограничен</div>
      <div style={styles.authGateText}>
        Это приложение работает только внутри Telegram. Откройте его через
        нашего бота, чтобы продолжить — ваши контакты привязаны к вашему
        Telegram-аккаунту и недоступны из обычного браузера.
      </div>
    </div>
  );
}

