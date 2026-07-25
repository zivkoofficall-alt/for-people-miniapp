import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from "react";
import {
  Search, Plus, X, Phone, Download, Upload, Trash2, ArrowUpRight, User,
  Check, Tag as TagIcon, Layers, Brain, CalendarDays, Camera, Sparkles,
  ChevronLeft, ChevronRight, Briefcase, MapPin, Mail, Heart, Send, Users, Wand2, ListChecks, Gauge, Target, CreditCard,
} from "lucide-react";
import { storage } from "./storage";
import { MESSENGERS, DEFAULT_CATEGORIES, ENERGY_OPTIONS, TRUST_OPTIONS, STEP_DEFS } from "./constants.js";
import { emptyMessengers, emptyContact, emptyTask, emptyGoal, emptySubscription, computeGoalProgress, initials, pad, formatRuPhone, csvEscape, resizeImageFile } from "./helpers.js";
import { globalCss, INK, PURPLE, PURPLE_SOFT, styles } from "./theme.js";
import { PsychRow, Field, InlineAdd } from "./components/Ui.jsx";
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
  const [contacts, setContacts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [tags, setTags] = useState([]);
  const [tasks, setTasks] = useState([]); // NEW — задачи по контактам (Модуль 3A/3B)
  const [goals, setGoals] = useState([]); // NEW — цели (Модуль 3D)
  const [subscription, setSubscription] = useState(emptySubscription()); // NEW — тариф/лимит AI (Модуль 3D)
  const [loaded, setLoaded] = useState(false);

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);

  const [openId, setOpenId] = useState(null);
  const [drafting, setDrafting] = useState(null);
  const [step, setStep] = useState(0);
  const [toast, setToast] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkPopover, setBulkPopover] = useState(null);
  const [bulkTagPicks, setBulkTagPicks] = useState(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const avatarInputRef = useRef(null);

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

  useEffect(() => {
    (async () => {
      try { const r = await storage.get("fp_contacts", false); if (r && r.value) setContacts(JSON.parse(r.value)); } catch (e) {}
      try { const r2 = await storage.get("fp_categories", false); if (r2 && r2.value) setCategories(JSON.parse(r2.value)); } catch (e) {}
      try { const r3 = await storage.get("fp_tags", false); if (r3 && r3.value) setTags(JSON.parse(r3.value)); } catch (e) {}
      try { const r4 = await storage.get("fp_tasks", false); if (r4 && r4.value) setTasks(JSON.parse(r4.value)); } catch (e) {}
      try { const r5 = await storage.get("fp_goals", false); if (r5 && r5.value) setGoals(JSON.parse(r5.value)); } catch (e) {}
      try { const r6 = await storage.get("fp_subscription", false); if (r6 && r6.value) setSubscription({ ...emptySubscription(), ...JSON.parse(r6.value) }); } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  const persistContacts = useCallback(async (next) => {
    setContacts(next);
    try { await storage.set("fp_contacts", JSON.stringify(next), false); }
    catch (e) { showToast("Не удалось сохранить"); }
  }, []);
  const persistCategories = useCallback(async (next) => {
    setCategories(next);
    try { await storage.set("fp_categories", JSON.stringify(next), false); } catch (e) {}
  }, []);
  const persistTags = useCallback(async (next) => {
    setTags(next);
    try { await storage.set("fp_tags", JSON.stringify(next), false); } catch (e) {}
  }, []);
  const persistTasks = useCallback(async (next) => {
    setTasks(next);
    try { await storage.set("fp_tasks", JSON.stringify(next), false); } catch (e) {}
  }, []);
  const persistGoals = useCallback(async (next) => {
    setGoals(next);
    try { await storage.set("fp_goals", JSON.stringify(next), false); } catch (e) {}
  }, []);
  const persistSubscription = useCallback(async (next) => {
    setSubscription(next);
    try { await storage.set("fp_subscription", JSON.stringify(next), false); } catch (e) {}
  }, []);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2000); }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = contacts;
    if (q) {
      list = list.filter((c) => {
        const msgHay = MESSENGERS.map((m) => { const d = c.messengers?.[m.key]; return d ? `${d.nick} ${d.phone}` : ""; }).join(" ");
        const hay = [c.firstName, c.lastName, c.phone, c.email, c.job, c.company, c.city, c.interests, c.helpWith,
          c.comment, c.category, (c.tags || []).join(" "), msgHay].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }
    if (activeCategory) list = list.filter((c) => c.category === activeCategory);
    return [...list].sort((a, b) => (a.lastName || a.firstName || "").localeCompare(b.lastName || b.firstName || "", "ru"));
  }, [contacts, query, activeCategory]);

  const openContact = openId ? contacts.find((c) => c.id === openId) : null;

  function startNew() { setDrafting(emptyContact()); setStep(0); }
  function startEdit(c) { setDrafting(JSON.parse(JSON.stringify(c))); setStep(0); setOpenId(null); }

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
  function toggleMessenger(key) {
    setDrafting((d) => ({ ...d, messengers: { ...d.messengers, [key]: { ...d.messengers[key], enabled: !d.messengers[key].enabled } } }));
  }
  function updateMessengerField(key, field, value) {
    setDrafting((d) => ({ ...d, messengers: { ...d.messengers, [key]: { ...d.messengers[key], [field]: value } } }));
  }
  function toggleDraftTag(t) {
    setDrafting((d) => { const has = d.tags.includes(t); return { ...d, tags: has ? d.tags.filter((x) => x !== t) : [...d.tags, t] }; });
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

  async function bulkSetCategory(cat) {
    const next = contacts.map((c) => (selectedIds.has(c.id) ? { ...c, category: cat } : c));
    await persistContacts(next); setBulkPopover(null); setSelectMode(false); setSelectedIds(new Set());
    showToast(`Категория «${cat}» применена`);
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

  function exportCsv() {
    const headers = ["Имя", "Фамилия", "Телефон", "Email", "Профессия", "Компания", "Город", "День рождения",
      "Интересы", "Чем может помочь", "Категория", "Теги",
      ...MESSENGERS.flatMap((m) => [`${m.label} ник`, `${m.label} телефон`]),
      "Комментарий", "Тип личности", "Ценности", "Стиль общения", "Триггеры", "Поведение в конфликте",
      "Доверие", "Энергия", "Как познакомились", "Последний контакт"];
    const rows = contacts.map((c) => [
      c.firstName, c.lastName, c.phone, c.email, c.job, c.company, c.city, c.birthday, c.interests, c.helpWith,
      c.category, (c.tags || []).join("; "),
      ...MESSENGERS.flatMap((m) => [c.messengers?.[m.key]?.nick || "", c.messengers?.[m.key]?.phone || ""]),
      c.comment, c.psych?.personality || "", c.psych?.values || "", c.psych?.commStyle || "", c.psych?.triggers || "",
      c.psych?.conflictStyle || "", c.psych?.trust || "", c.psych?.energy || "", c.psych?.howMet || "", c.psych?.lastContact || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.map(csvEscape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "for-people.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast("Выгружено в CSV");
  }

  async function handleImportConfirmed(parsedContacts) {
    await persistContacts([...contacts, ...parsedContacts]);
    showToast(`Импортировано: ${parsedContacts.length}`);
    setImportOpen(false);
  }

  // Принимает "parsed" от QuickAddAI: {firstName,lastName,category,tags,job,
  // interests,helpWith,comment,task}. Здесь и только здесь превращаем это
  // в настоящий Contact/Task и сохраняем — компонент виджета ничего не пишет
  // в storage сам, только собирает и валидирует данные.
  async function handleQuickAddCreate(parsed) {
    if (!parsed.firstName.trim() && !parsed.lastName.trim()) {
      showToast("AI не распознал имя — откройте карточку и впишите вручную.");
    }
    const newContact = {
      ...emptyContact(),
      firstName: parsed.firstName.trim(),
      lastName: parsed.lastName.trim(),
      category: (parsed.category || "").trim(),
      tags: (parsed.tags || []).filter(Boolean),
      job: (parsed.job || "").trim(),
      interests: (parsed.interests || "").trim(),
      helpWith: (parsed.helpWith || "").trim(),
      comment: (parsed.comment || "").trim(),
    };
    await persistContacts([...contacts, newContact]);
    if (newContact.category && !categories.includes(newContact.category)) {
      await persistCategories([...categories, newContact.category]);
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
    });
    await persistTasks([...tasks, newTask]);
    showToast("Задача создана");
  }
  async function handleUpdateTaskStatus(taskId, newStatus) {
    const next = tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
    await persistTasks(next);
  }
  async function handleDeleteTask(taskId) {
    const next = tasks.filter((t) => t.id !== taskId);
    await persistTasks(next);
    showToast("Задача удалена");
  }

  // --- Цели (Модуль 3D) ---
  async function handleCreateGoal(draft) {
    await persistGoals([...goals, emptyGoal(draft)]);
    showToast("Цель создана");
  }
  async function handleToggleQualDone(goalId) {
    const next = goals.map((g) => (g.id === goalId ? { ...g, status: g.status === "done" ? "in_progress" : "done" } : g));
    await persistGoals(next);
  }
  async function handleDeleteGoal(goalId) {
    await persistGoals(goals.filter((g) => g.id !== goalId));
    showToast("Цель удалена");
  }

  // --- Подписка / лимит AI-запросов (Модуль 3D) ---
  // Реального биллинга здесь нет (см. Profile.jsx) — это только контроль
  // лимита, чтобы демо-режим free-плана имел смысл в интерфейсе.
  const canUseAi = subscription.plan === "pro" || subscription.aiRequestsUsed < subscription.aiRequestsLimit;
  const remainingAi = subscription.plan === "pro" ? Infinity : Math.max(0, subscription.aiRequestsLimit - subscription.aiRequestsUsed);
  async function recordAiUsage() {
    if (subscription.plan === "pro") return;
    await persistSubscription({ ...subscription, aiRequestsUsed: subscription.aiRequestsUsed + 1 });
  }
  async function handleActivateDemoPro() {
    await persistSubscription({ ...subscription, plan: "pro" });
    showToast("Pro активирован в демо-режиме");
    setProfileOpen(false);
  }
  async function handleDowngradeToFree() {
    await persistSubscription({ ...emptySubscription(), aiRequestsUsed: 0 });
    showToast("Возвращено на Free Trial");
  }

  const avatarStack = contacts.slice(0, 4);
  const lastContact = contacts.length > 0 ? [...contacts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] : null;
  const activeGoal = goals.find((g) => g.status !== "done") || null;

  return (
    <div style={styles.app}>
      <style>{globalCss}</style>

      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.topBar}>
            <div style={styles.navLeft}>Contacts</div>
            <div style={styles.navCenterLogo}>FOR PEOPLE</div>
            <div style={styles.topActions}>
              <button className="fp-btn" style={styles.iconBtn} onClick={() => setProfileOpen(true)} aria-label="Личный кабинет">
                <CreditCard size={15} strokeWidth={2.25} />
                {subscription.plan === "pro" && <span style={{ ...styles.iconBtnBadge, background: "#7C4DFF" }}>P</span>}
              </button>
              <button className="fp-btn" style={styles.iconBtn} onClick={() => setGoalsOpen(true)} aria-label="Цели">
                <Target size={15} strokeWidth={2.25} />
              </button>
              <button className="fp-btn" style={styles.iconBtn} onClick={() => setHealthCheckOpen(true)} aria-label="Оценить окружение">
                <Gauge size={15} strokeWidth={2.25} />
              </button>
              <button className="fp-btn" style={styles.iconBtn} onClick={() => setTaskBoardOpen(true)} aria-label="Задачи">
                <ListChecks size={15} strokeWidth={2.25} />
                {tasks.filter((t) => t.status !== "done").length > 0 && (
                  <span style={styles.iconBtnBadge}>{tasks.filter((t) => t.status !== "done").length}</span>
                )}
              </button>
              <button className="fp-btn" style={styles.iconBtn} onClick={() => setAiOpen(true)} aria-label="AI помощник"><Sparkles size={15} strokeWidth={2.25} /></button>
              <button className="fp-btn" style={styles.iconBtn} onClick={() => setImportOpen(true)} aria-label="Импорт"><Upload size={15} strokeWidth={2.25} /></button>
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

          <div style={styles.heroPanel}>
            <div style={styles.heroPanelGlow1} />
            <div style={styles.heroPanelGlow2} />
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
                      {contacts.length} {contacts.length === 1 ? "человек" : "человек"} в базе
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
                {lastContact ? (
                  <button className="fp-btn" style={styles.featuredCard} onClick={() => setOpenId(lastContact.id)}>
                    <div style={styles.featuredAvatar}>{lastContact.avatar ? <img src={lastContact.avatar} alt="" style={styles.avatarImg} /> : initials(lastContact)}</div>
                    <div style={styles.featuredName}>{lastContact.firstName} {lastContact.lastName}</div>
                    <div style={styles.featuredSub}>{lastContact.job || lastContact.category || "Новый контакт"}</div>
                    <div style={styles.featuredBtn}><Send size={12} color="#fff" /> {lastContact.phone ? lastContact.phone.slice(0, 12) : "Открыть"}</div>
                  </button>
                ) : (
                  <button className="fp-btn" style={styles.featuredCard} onClick={startNew}>
                    <div style={styles.featuredAvatar}><Plus size={18} color="#7C4DFF" /></div>
                    <div style={styles.featuredName}>Добавить</div>
                    <div style={styles.featuredSub}>первого человека</div>
                  </button>
                )}
              </div>
            </div>
          </div>

          {activeGoal && (
            <button className="fp-btn" style={styles.goalStripCard} onClick={() => setGoalsOpen(true)}>
              <div style={styles.goalStripIcon}><Target size={15} color="#7C4DFF" /></div>
              <div style={styles.goalStripBody}>
                <div style={styles.goalStripTitle}>{activeGoal.title}</div>
                <div style={styles.goalStripTrack}>
                  <div style={{ ...styles.goalStripFill, width: `${computeGoalProgress(activeGoal, contacts).pct}%` }} />
                </div>
              </div>
              <span style={styles.goalStripPct}>{computeGoalProgress(activeGoal, contacts).pct}%</span>
            </button>
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
          {!loaded ? (
            <div style={styles.emptyState}><div style={styles.emptyTitle}>Загрузка…</div></div>
          ) : filtered.length === 0 ? (
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

      {!selectMode && (
        <>
          <button className="fp-fab" style={styles.fabSecondary} onClick={() => setQuickAddOpen(true)} aria-label="Быстрое добавление через AI">
            <Wand2 size={19} color="#fff" strokeWidth={2.25} />
          </button>
          <button className="fp-fab" style={styles.fab} onClick={startNew} aria-label="Добавить"><Plus size={22} color="#fff" strokeWidth={2.5} /></button>
        </>
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
        <div className="fp-overlay-anim" style={styles.overlay} onClick={() => setBulkPopover(null)}>
          <div className="fp-sheet-anim" style={styles.popoverSheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.popoverTitle}>Применить категорию</div>
            <div style={styles.chipWrap}>{categories.map((cat) => <button key={cat} className="fp-btn" style={styles.pickChip} onClick={() => bulkSetCategory(cat)}>{cat}</button>)}</div>
            <InlineAdd placeholder="Новая категория" onAdd={async (v) => { await addNewCategory(v); await bulkSetCategory(v); }} />
          </div>
        </div>
      )}

      {bulkPopover === "tag" && (
        <div className="fp-overlay-anim" style={styles.overlay} onClick={() => setBulkPopover(null)}>
          <div className="fp-sheet-anim" style={styles.popoverSheet} onClick={(e) => e.stopPropagation()}>
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

      {confirmBulkDelete && (
        <div className="fp-overlay-anim" style={styles.overlay} onClick={() => setConfirmBulkDelete(false)}>
          <div className="fp-sheet-anim" style={styles.confirmSheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.confirmTitle}>Удалить {selectedIds.size} контактов?</div>
            <div style={styles.confirmHint}>Действие необратимо.</div>
            <div style={styles.detailActions}>
              <button className="fp-btn" style={styles.secondaryPill} onClick={() => setConfirmBulkDelete(false)}>Отмена</button>
              <button className="fp-btn" style={styles.dangerPill} onClick={bulkDelete}>Удалить</button>
            </div>
          </div>
        </div>
      )}

      {openContact && (
        <div className="fp-overlay-anim" style={styles.overlay} onClick={() => setOpenId(null)}>
          <div className="fp-sheet-anim" style={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.sheetHandle} />
            <button className="fp-btn" style={styles.closeBtn} onClick={() => setOpenId(null)}><X size={16} color="#0B0B10" /></button>

            <div style={styles.avatarBubbleBig}>{openContact.avatar ? <img src={openContact.avatar} alt="" style={styles.avatarImgBig} /> : initials(openContact)}</div>
            <div style={styles.detailName}>{openContact.firstName} {openContact.lastName}</div>
            {openContact.job && <div style={styles.detailSub}>{openContact.job}{openContact.company ? ` · ${openContact.company}` : ""}</div>}
            {openContact.category && <div style={styles.detailCategoryTag}>{openContact.category}</div>}
            {openContact.tags && openContact.tags.length > 0 && (
              <div style={{ ...styles.chipWrap, marginTop: 8 }}>{openContact.tags.map((t) => <span key={t} style={styles.tagBadge}>#{t}</span>)}</div>
            )}

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

      {confirmDeleteId && (
        <div className="fp-overlay-anim" style={styles.overlay} onClick={() => setConfirmDeleteId(null)}>
          <div className="fp-sheet-anim" style={styles.confirmSheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.confirmTitle}>Удалить контакт?</div>
            <div style={styles.confirmHint}>Действие необратимо.</div>
            <div style={styles.detailActions}>
              <button className="fp-btn" style={styles.secondaryPill} onClick={() => setConfirmDeleteId(null)}>Отмена</button>
              <button className="fp-btn" style={styles.dangerPill} onClick={() => deleteContact(confirmDeleteId)}>Удалить</button>
            </div>
          </div>
        </div>
      )}

      {drafting && (
        <div className="fp-overlay-anim" style={styles.overlay} onClick={() => setDrafting(null)}>
          <div className="fp-sheet-anim" style={styles.formSheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.sheetHandle} />
            <div style={styles.formHeader}>
              <div style={styles.formTitle}>{contacts.some((c) => c.id === drafting.id) ? "Редактировать" : "Новый человек"}</div>
              <button className="fp-btn" style={styles.closeBtn} onClick={() => setDrafting(null)}><X size={16} color="#0B0B10" /></button>
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
                      <button key={cat} className="fp-btn" style={{ ...styles.pickChip, ...(drafting.category === cat ? styles.pickChipActive : {}) }} onClick={() => setDrafting({ ...drafting, category: drafting.category === cat ? "" : cat })}>{cat}</button>
                    ))}
                  </div>
                  <InlineAdd placeholder="Новая категория" onAdd={async (v) => { await addNewCategory(v); setDrafting((d) => ({ ...d, category: v.trim() })); }} />
                  <div style={styles.sectionLabel}>Теги</div>
                  <div style={styles.chipWrap}>
                    {tags.map((t) => (
                      <button key={t} className="fp-btn" style={{ ...styles.pickChip, ...(drafting.tags.includes(t) ? styles.pickChipActive : {}) }} onClick={() => toggleDraftTag(t)}>#{t}</button>
                    ))}
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
                        <Field label="Ник" value={drafting.messengers[m.key].nick} onChange={(v) => updateMessengerField(m.key, "nick", v)} placeholder="@username" compact />
                        <Field label="Телефон" value={drafting.messengers[m.key].phone} onChange={(v) => updateMessengerField(m.key, "phone", v)} placeholder="+7 (900) 000…" compact phoneMask />
                      </div>
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
                <button className="fp-btn" style={styles.secondaryPill} onClick={() => setDrafting(null)}>Отмена</button>
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
            onDeleteTask={handleDeleteTask}
            onCreateTask={handleCreateTask}
            onOpenContact={(id) => { setTaskBoardOpen(false); setOpenId(id); }}
          />
        </Suspense>
      )}

      {healthCheckOpen && (
        <Suspense fallback={<LazyFallback />}>
          <HealthCheck
            contacts={contacts}
            categories={categories}
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
            onToggleQualDone={handleToggleQualDone}
            onDeleteGoal={handleDeleteGoal}
          />
        </Suspense>
      )}

      {profileOpen && (
        <Suspense fallback={<LazyFallback />}>
          <Profile
            subscription={subscription}
            onClose={() => setProfileOpen(false)}
            onActivateDemoPro={handleActivateDemoPro}
            onDowngradeToFree={handleDowngradeToFree}
          />
        </Suspense>
      )}

      <div style={styles.versionTag}>for people · v1.2.0</div>

      {toast && <div className="fp-slideup" style={styles.toast}>{toast}</div>}
    </div>
  );
}

