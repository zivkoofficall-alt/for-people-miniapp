import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Search, Plus, X, Phone, Download, Upload, Trash2, ArrowUpRight, User,
  Check, Tag as TagIcon, Layers, Brain, CalendarDays, Camera, Sparkles,
  ChevronLeft, ChevronRight, Briefcase, MapPin, Mail, Heart, Send, Users,
} from "lucide-react";
import { storage } from "./storage";

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

function emptyMessengers() {
  const m = {};
  MESSENGERS.forEach((x) => { m[x.key] = { enabled: false, nick: "", phone: "" }; });
  return m;
}

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
    category: "",
    tags: [],
    messengers: emptyMessengers(),
    comment: "",
    psych: {
      personality: "", values: "", commStyle: "", triggers: "", conflictStyle: "",
      trust: "", energy: "", howMet: "", lastContact: "",
    },
    createdAt: Date.now(),
  };
}

function initials(c) {
  const a = (c.firstName || "").trim()[0] || "";
  const b = (c.lastName || "").trim()[0] || "";
  return (a + b).toUpperCase() || "?";
}
function pad(n) { return String(n).padStart(2, "0"); }
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

export default function ForPeople() {
  const [contacts, setContacts] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [tags, setTags] = useState([]);
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
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiScrollRef = useRef(null);

  const anyOverlayOpen = !!(
    openId || drafting || confirmDeleteId || bulkPopover || confirmBulkDelete || importOpen || aiOpen
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
  function toggleSelected(id) {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }
  function handleCardClick(c) { if (selectMode) toggleSelected(c.id); else setOpenId(c.id); }

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

  function handleFilePicked(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImportError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = contactsFromGoogleCsv(String(reader.result));
        if (parsed.length === 0) { setImportError("Не удалось найти контакты в файле. Убедитесь, что это экспорт в формате Google CSV."); setImportPreview(null); }
        else setImportPreview(parsed);
      } catch (err) { setImportError("Не получилось прочитать файл."); setImportPreview(null); }
    };
    reader.readAsText(file);
  }
  async function confirmImport() {
    if (!importPreview || importPreview.length === 0) return;
    await persistContacts([...contacts, ...importPreview]);
    showToast(`Импортировано: ${importPreview.length}`);
    setImportOpen(false); setImportPreview(null);
  }

  useEffect(() => {
    if (aiScrollRef.current) aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
  }, [aiMessages, aiLoading]);

  async function sendAiQuery(text) {
    const q = (text ?? aiInput).trim();
    if (!q || aiLoading) return;
    setAiInput("");
    setAiMessages((prev) => [...prev, { role: "user", text: q }]);
    setAiLoading(true);
    try {
      const compact = contacts.map((c) => ({
        id: c.id, name: `${c.firstName} ${c.lastName}`.trim(), category: c.category, tags: c.tags,
        job: c.job, city: c.city, interests: c.interests, helpWith: c.helpWith,
        note: (c.comment || "").slice(0, 140), values: (c.psych?.values || "").slice(0, 140),
      }));
      const prompt = `Ты помощник личной книги контактов "for people". Вот контакты пользователя в JSON: ${JSON.stringify(compact)}. Запрос пользователя: "${q}". Определи, кто из контактов может помочь, опираясь на поля job, interests, helpWith, tags, category, note, values. Ответь СТРОГО в формате JSON без markdown, без пояснений вне JSON: {"message": "короткая дружелюбная фраза на русском, представляющая подходящих людей, или сообщение что подходящих контактов не нашлось", "matchIds": ["id1","id2"]}. Если контактов нет или ничего не подходит — matchIds: [].`;

      // ВАЖНО: ключ Anthropic API нельзя хранить в коде фронтенда — его увидит
      // любой пользователь через "Инструменты разработчика" в браузере.
      // Поэтому запрос идёт не напрямую в Anthropic, а на твой собственный
      // маленький backend (прокси), который и хранит ключ у себя.
      // Адрес backend задаётся в файле .env через VITE_AI_PROXY_URL.
      const proxyUrl = import.meta.env.VITE_AI_PROXY_URL;
      if (!proxyUrl) {
        setAiMessages((prev) => [...prev, {
          role: "ai",
          text: "AI-помощник ещё не подключён: не задан адрес backend-прокси (VITE_AI_PROXY_URL в .env). Смотри README — там пример готового прокси-сервера.",
          matches: [],
        }]);
        return;
      }

      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const parsed = await response.json(); // прокси должен вернуть { message, matchIds }
      const matches = contacts.filter((c) => (parsed.matchIds || []).includes(c.id));
      setAiMessages((prev) => [...prev, { role: "ai", text: parsed.message || "Готово.", matches }]);
    } catch (err) {
      setAiMessages((prev) => [...prev, { role: "ai", text: "Не получилось обработать запрос. Попробуйте переформулировать.", matches: [] }]);
    } finally { setAiLoading(false); }
  }

  const avatarStack = contacts.slice(0, 4);
  const lastContact = contacts.length > 0 ? [...contacts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] : null;

  return (
    <div style={styles.app}>
      <style>{globalCss}</style>

      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.topBar}>
            <div style={styles.navLeft}>Contacts</div>
            <div style={styles.navCenterLogo}>FOR PEOPLE</div>
            <div style={styles.topActions}>
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
              {filtered.map((c, i) => {
                const isSelected = selectedIds.has(c.id);
                return (
                  <button key={c.id} className="fp-card" style={{ ...styles.card, animationDelay: `${Math.min(i * 30, 300)}ms` }} onClick={() => handleCardClick(c)}>
                    {selectMode && (
                      <div style={{ ...styles.selectCheck, ...(isSelected ? styles.selectCheckActive : {}) }}>
                        {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                      </div>
                    )}
                    <div style={styles.cardTopRow}>
                      <span style={styles.cardIndex}>{pad(i + 1)}</span>
                      {!selectMode && <ArrowUpRight size={15} color="rgba(11,11,16,0.3)" strokeWidth={2.25} />}
                    </div>
                    <div style={styles.avatarBubble}>{c.avatar ? <img src={c.avatar} alt="" style={styles.avatarImg} /> : initials(c)}</div>
                    <div style={styles.cardName}>{c.firstName} {c.lastName}</div>
                    {c.job && <div style={styles.cardJob}>{c.job}</div>}
                    {c.phone && <div style={styles.cardPhone}>{c.phone}</div>}
                    {c.category && <div style={styles.cardCategory}>{c.category}</div>}
                    <div style={styles.cardBadgeRow}>
                      {MESSENGERS.filter((m) => c.messengers?.[m.key]?.enabled).map((m) => (
                        <span key={m.key} style={{ ...styles.msgBadge, background: `${m.color}18`, color: m.color }}>{m.short}</span>
                      ))}
                    </div>
                    {c.tags && c.tags.length > 0 && (
                      <div style={styles.cardBadgeRow}>{c.tags.slice(0, 3).map((t) => <span key={t} style={styles.tagBadge}>#{t}</span>)}</div>
                    )}
                  </button>
                );
              })}
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
        <button className="fp-fab" style={styles.fab} onClick={startNew} aria-label="Добавить"><Plus size={22} color="#fff" strokeWidth={2.5} /></button>
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
                    <Field label="Телефон" value={drafting.phone} onChange={(v) => setDrafting({ ...drafting, phone: v })} placeholder="+7 900 000-00-00" />
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
                      <div style={{ display: "flex", gap: 8 }}>
                        <Field label="Ник" value={drafting.messengers[m.key].nick} onChange={(v) => updateMessengerField(m.key, "nick", v)} placeholder="@username" compact />
                        <Field label="Телефон" value={drafting.messengers[m.key].phone} onChange={(v) => updateMessengerField(m.key, "phone", v)} placeholder="+7 900…" compact />
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
        <div className="fp-overlay-anim" style={styles.overlay} onClick={() => { setImportOpen(false); setImportPreview(null); setImportError(""); }}>
          <div className="fp-sheet-anim" style={styles.formSheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.sheetHandle} />
            <div style={styles.formHeader}>
              <div style={styles.formTitle}>Импорт из Google</div>
              <button className="fp-btn" style={styles.closeBtn} onClick={() => { setImportOpen(false); setImportPreview(null); }}><X size={16} color="#0B0B10" /></button>
            </div>
            <div style={styles.importHint}>Прямой вход в Google-аккаунт здесь недоступен. Экспортируйте контакты (Google Контакты → Экспорт → формат Google CSV) и загрузите файл ниже.</div>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFilePicked} style={{ display: "none" }} />
            <button className="fp-btn" style={styles.uploadZone} onClick={() => fileInputRef.current && fileInputRef.current.click()}>
              <Upload size={20} color="#7C4DFF" /><span>Выбрать CSV-файл</span>
            </button>
            {importError && <div style={styles.importError}>{importError}</div>}
            {importPreview && (
              <>
                <div style={styles.importFound}>Найдено контактов: {importPreview.length}</div>
                <div style={{ ...styles.detailActions, marginTop: 14 }}>
                  <button className="fp-btn" style={styles.secondaryPill} onClick={() => setImportPreview(null)}>Отмена</button>
                  <button className="fp-btn" style={styles.primaryPill} onClick={confirmImport}>Импортировать</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {aiOpen && (
        <div className="fp-overlay-anim" style={styles.overlay} onClick={() => setAiOpen(false)}>
          <div className="fp-sheet-anim" style={styles.aiSheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.sheetHandle} />
            <div style={styles.formHeader}>
              <div style={styles.formTitle}><Sparkles size={16} color="#7C4DFF" style={{ marginRight: 6, verticalAlign: -3 }} />AI помощник</div>
              <button className="fp-btn" style={styles.closeBtn} onClick={() => setAiOpen(false)}><X size={16} color="#0B0B10" /></button>
            </div>

            <div ref={aiScrollRef} style={styles.aiScroll}>
              {aiMessages.length === 0 && (
                <div style={styles.aiIntro}>
                  Опишите, что вам нужно — я подберу подходящих людей из вашей книги контактов по интересам, профессии и заметкам.
                  <div style={{ ...styles.chipWrap, marginTop: 12 }}>
                    {AI_SUGGESTIONS.map((s) => <button key={s} className="fp-btn" style={styles.pickChip} onClick={() => sendAiQuery(s)}>{s}</button>)}
                  </div>
                </div>
              )}
              {aiMessages.map((m, i) => (
                <div key={i} className="fp-msg-in" style={{ ...styles.aiMsgRow, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ ...styles.aiBubble, ...(m.role === "user" ? styles.aiBubbleUser : styles.aiBubbleAi) }}>
                    {m.text}
                    {m.matches && m.matches.length > 0 && (
                      <div style={styles.aiMatchRow}>
                        {m.matches.map((mc) => (
                          <button key={mc.id} className="fp-btn" style={styles.aiMatchCard} onClick={() => { setAiOpen(false); setOpenId(mc.id); }}>
                            <div style={styles.avatarBubbleSmall}>{mc.avatar ? <img src={mc.avatar} alt="" style={styles.avatarImg} /> : initials(mc)}</div>
                            <div style={styles.aiMatchName}>{mc.firstName} {mc.lastName}</div>
                            {mc.job && <div style={styles.aiMatchJob}>{mc.job}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div style={{ ...styles.aiMsgRow, justifyContent: "flex-start" }}>
                  <div style={{ ...styles.aiBubble, ...styles.aiBubbleAi }} className="fp-pulse">Ищу подходящих людей…</div>
                </div>
              )}
            </div>

            <div style={styles.aiInputRow}>
              <input style={styles.aiInput} placeholder="Например: я хочу починить машину" value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendAiQuery(); }} />
              <button className="fp-btn" style={styles.aiSendBtn} onClick={() => sendAiQuery()} disabled={aiLoading}><Send size={16} color="#fff" /></button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fp-slideup" style={styles.toast}>{toast}</div>}
    </div>
  );
}

function PsychRow({ label, value }) {
  return (<div style={styles.psychRow}><div style={styles.psychLabel}>{label}</div><div style={styles.psychValue}>{value}</div></div>);
}

function Field({ label, value, onChange, placeholder, textarea, compact }) {
  return (
    <label style={{ ...styles.fieldWrap, flex: compact ? 1 : undefined }}>
      {label && <span style={styles.fieldLabel}>{label}</span>}
      {textarea ? (
        <textarea style={{ ...styles.fieldInput, height: 62, resize: "none", fontFamily: "inherit" }} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input style={styles.fieldInput} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      )}
    </label>
  );
}

function InlineAdd({ placeholder, onAdd }) {
  const [v, setV] = useState("");
  return (
    <div style={styles.inlineAddRow}>
      <input style={styles.inlineAddInput} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { onAdd(v); setV(""); } }} />
      <button className="fp-btn" style={styles.inlineAddBtn} onClick={() => { if (v.trim()) { onAdd(v); setV(""); } }}><Plus size={14} color="#0B0B10" /></button>
    </div>
  );
}

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500;1,600&family=Inter:wght@400;500;600;700&display=swap');
  @keyframes fpFadeIn { from{opacity:0} to{opacity:1} }
  @keyframes fpSlideUp { from{opacity:0; transform:translateY(26px)} to{opacity:1; transform:translateY(0)} }
  @keyframes fpStepIn { from{opacity:0; transform:translateX(16px)} to{opacity:1; transform:translateX(0)} }
  @keyframes fpCardIn { from{opacity:0; transform:translateY(10px) scale(0.96)} to{opacity:1; transform:translateY(0) scale(1)} }
  @keyframes fpPulse { 0%,100%{opacity:0.55} 50%{opacity:1} }
  .fp-overlay-anim { animation: fpFadeIn .18s ease; }
  .fp-sheet-anim { animation: fpSlideUp .3s cubic-bezier(.2,.8,.2,1); }
  .fp-step-anim { animation: fpStepIn .22s ease; }
  .fp-slideup { animation: fpSlideUp .25s ease; }
  .fp-msg-in { animation: fpSlideUp .22s ease; display:flex; }
  .fp-card { transition: transform .15s ease, box-shadow .15s ease; animation: fpCardIn .3s ease both; cursor:pointer; }
  .fp-card:active { transform: scale(0.96); }
  .fp-btn { transition: transform .12s ease, opacity .12s ease; cursor:pointer; }
  .fp-btn:active { transform: scale(0.94); }
  .fp-fab { transition: transform .15s ease; }
  .fp-fab:active { transform: scale(0.9); }
  .fp-pulse { animation: fpPulse 1.2s ease-in-out infinite; }
`;

const INK = "#0B0B10";
const MUTED = "rgba(11,11,16,0.55)";
const PURPLE = "#7C4DFF";
const PURPLE_SOFT = "#EDE7FE";
const BG = "#FBFAFC";
const CARD_BORDER = "1px solid rgba(11,11,16,0.08)";
const SHEET_BG = "#FFFFFF";
const CARD_SHADOW = "0 4px 18px rgba(20,10,50,0.06)";

const styles = {
  app: { minHeight: "100vh", background: BG, fontFamily: "'Inter', sans-serif", color: INK, position: "relative" },
  shell: { display: "flex", flexDirection: "column", minHeight: "100vh" },
  header: { padding: "18px 16px 0" },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 8 },
  navLeft: { fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: "0.04em", display: "none" },
  navCenterLogo: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: "0.12em", color: INK },
  topActions: { display: "flex", alignItems: "center", gap: 7, marginLeft: "auto" },
  iconBtn: { width: 33, height: 33, borderRadius: 999, background: "#fff", border: CARD_BORDER, display: "flex", alignItems: "center", justifyContent: "center", color: INK, boxShadow: CARD_SHADOW },
  pillBtnGhost: { background: "#fff", border: CARD_BORDER, color: INK, borderRadius: 999, padding: "8px 14px", fontSize: 12, fontWeight: 700, fontFamily: "'Inter', sans-serif", boxShadow: CARD_SHADOW },
  pillBtnGhostActive: { background: INK, color: "#fff", border: `1px solid ${INK}` },
  heroRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 10 },
  heroTextBlock: { flex: 1 },
  heroTextBlockRight: { flex: 1, textAlign: "right" },
  heroEyebrow: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontStyle: "italic", fontWeight: 600, fontSize: 15, color: INK, marginBottom: 2 },
  heroTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 38, lineHeight: 0.95, margin: 0, color: PURPLE, letterSpacing: "-0.01em" },
  statsPanel: { display: "flex", alignItems: "center", background: "#fff", border: CARD_BORDER, borderRadius: 20, padding: "14px 10px", marginBottom: 14, boxShadow: CARD_SHADOW },
  heroPanel: { position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #9B7FF3 0%, #7C5CE8 100%)", borderRadius: 28, padding: 18, marginBottom: 14, boxShadow: "0 14px 30px rgba(124,77,255,0.28)" },
  heroPanelGlow1: { position: "absolute", top: -40, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.12)", filter: "blur(10px)" },
  heroPanelGlow2: { position: "absolute", bottom: -50, left: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.08)", filter: "blur(14px)" },
  heroPanelTop: { position: "relative", zIndex: 1, display: "flex", gap: 14 },
  heroPanelLeft: { flex: 1.15, display: "flex", flexDirection: "column" },
  heroPanelBadge: { display: "inline-block", alignSelf: "flex-start", fontSize: 10.5, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.18)", borderRadius: 999, padding: "4px 10px", marginBottom: 10 },
  heroPanelHeading: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 19, lineHeight: 1.2, color: "#fff", marginBottom: 8 },
  heroPanelDesc: { fontSize: 12, lineHeight: 1.5, color: "rgba(255,255,255,0.85)", marginBottom: 14 },
  exploreBtn: { alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, background: INK, color: "#fff", border: "none", borderRadius: 999, padding: "9px 8px 9px 16px", fontSize: 12.5, fontWeight: 700, fontFamily: "'Inter', sans-serif", marginBottom: 14 },
  exploreBtnCircle: { width: 24, height: 24, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" },
  heroPanelRight: { flex: 1, display: "flex", flexDirection: "column", gap: 10 },
  heroStatsRow: { display: "flex", justifyContent: "space-between", gap: 4 },
  heroStatItem: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },
  heroStatIconWrap: { width: 26, height: 26, borderRadius: 9, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2 },
  heroStatNum: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 14, color: "#fff" },
  heroStatLabel: { fontSize: 8.5, color: "rgba(255,255,255,0.8)", fontWeight: 600, textAlign: "center" },
  featuredLabel: { fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginTop: 4 },
  featuredCard: { background: "#fff", borderRadius: 18, padding: 12, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3, boxShadow: "0 8px 20px rgba(20,10,60,0.18)", textAlign: "left" },
  featuredAvatar: { width: 34, height: 34, borderRadius: 11, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: PURPLE, overflow: "hidden", marginBottom: 2 },
  featuredName: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 12.5, color: INK },
  featuredSub: { fontSize: 10, color: MUTED },
  featuredBtn: { display: "flex", alignItems: "center", gap: 4, background: PURPLE, color: "#fff", borderRadius: 999, padding: "5px 10px", fontSize: 10, fontWeight: 700, marginTop: 4 },
  statItem: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 },
  statIconWrap: { width: 26, height: 26, borderRadius: 9, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statNum: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, color: INK },
  statLabel: { fontSize: 10, color: MUTED, fontWeight: 500 },
  statDivider: { width: 1, height: 30, background: "rgba(11,11,16,0.08)" },
  socialProofRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14 },
  avatarCluster: { display: "flex", alignItems: "center" },
  clusterAvatar: { width: 26, height: 26, borderRadius: "50%", background: PURPLE_SOFT, border: "2px solid #FBFAFC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, color: PURPLE, overflow: "hidden", fontFamily: "'Plus Jakarta Sans', sans-serif" },
  socialProofText: { fontSize: 11.5, color: MUTED, fontWeight: 500 },
  searchBar: { display: "flex", alignItems: "center", gap: 9, background: "#fff", border: CARD_BORDER, borderRadius: 999, padding: "13px 16px", marginBottom: 14, boxShadow: CARD_SHADOW },
  searchInput: { flex: 1, background: "transparent", border: "none", outline: "none", color: INK, fontSize: 14, fontFamily: "'Inter', sans-serif" },
  clearBtn: { background: "none", border: "none", padding: 2 },
  categoryRow: { display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4 },
  categoryChip: { flexShrink: 0, background: "#fff", border: CARD_BORDER, color: MUTED, borderRadius: 999, padding: "7px 14px", fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif" },
  categoryChipActive: { background: INK, color: "#fff", border: `1px solid ${INK}` },
  main: { flex: 1, padding: "8px 16px 110px" },
  emptyState: { height: "50vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center" },
  emptyIconWrap: { width: 56, height: 56, borderRadius: "50%", background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  emptyTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: INK },
  emptyHint: { fontSize: 12.5, color: MUTED },
  emptyHintSmall: { fontSize: 11.5, color: MUTED, marginTop: 4 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 10 },
  card: { position: "relative", background: "#fff", border: CARD_BORDER, borderRadius: 22, padding: 14, textAlign: "left", display: "flex", flexDirection: "column", gap: 7, fontFamily: "'Inter', sans-serif", boxShadow: CARD_SHADOW },
  selectCheck: { position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: "50%", border: "1.5px solid rgba(11,11,16,0.25)", display: "flex", alignItems: "center", justifyContent: "center" },
  selectCheckActive: { background: PURPLE, border: `1.5px solid ${PURPLE}` },
  cardTopRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardIndex: { fontSize: 10.5, color: "rgba(11,11,16,0.35)", fontWeight: 600 },
  avatarBubble: { width: 40, height: 40, borderRadius: 14, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: PURPLE, overflow: "hidden" },
  avatarBubbleSmall: { width: 30, height: 30, borderRadius: 10, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 12, color: PURPLE, overflow: "hidden", marginBottom: 4 },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  cardName: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14.5, lineHeight: 1.2, color: INK },
  cardJob: { fontSize: 10.5, color: MUTED },
  cardPhone: { fontSize: 11.5, color: MUTED },
  cardCategory: { fontSize: 10, fontWeight: 700, color: PURPLE, alignSelf: "flex-start", background: PURPLE_SOFT, borderRadius: 999, padding: "2px 8px" },
  cardBadgeRow: { display: "flex", gap: 5, flexWrap: "wrap" },
  msgBadge: { fontSize: 9.5, fontWeight: 700, padding: "3px 7px", borderRadius: 999 },
  tagBadge: { fontSize: 9.5, fontWeight: 600, padding: "3px 7px", borderRadius: 999, background: "rgba(11,11,16,0.06)", color: MUTED },
  addCard: { background: "transparent", border: "1.5px dashed rgba(124,77,255,0.35)", borderRadius: 22, minHeight: 150, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 },
  addCardLabel: { fontSize: 11.5, fontWeight: 600, color: PURPLE, textAlign: "center" },
  fab: { position: "fixed", bottom: 22, right: 20, width: 56, height: 56, borderRadius: "50%", background: INK, border: "none", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 26px rgba(11,11,16,0.3)", zIndex: 40 },
  bulkBar: { position: "fixed", bottom: 20, left: 16, right: 16, background: INK, borderRadius: 20, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 45, boxShadow: "0 10px 30px rgba(0,0,0,0.25)" },
  bulkCount: { fontSize: 12.5, fontWeight: 700, color: "#fff" },
  bulkActions: { display: "flex", gap: 8 },
  bulkBtn: { display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 999, padding: "7px 11px", fontSize: 11.5, fontWeight: 600, color: "#fff" },
  overlay: { position: "fixed", inset: 0, background: "rgba(11,11,16,0.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, overscrollBehavior: "contain", touchAction: "none" },
  popoverSheet: { width: "100%", maxWidth: 480, background: SHEET_BG, borderRadius: "26px 26px 0 0", padding: "22px 20px 26px", border: "1px solid rgba(11,11,16,0.08)", borderBottom: "none", overscrollBehavior: "contain" },
  popoverTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 14, color: INK },
  chipWrap: { display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 },
  pickChip: { background: "#fff", border: CARD_BORDER, color: INK, borderRadius: 999, padding: "8px 14px", fontSize: 12.5, fontWeight: 600 },
  pickChipSmall: { background: "#fff", border: CARD_BORDER, color: INK, borderRadius: 999, padding: "7px 13px", fontSize: 12.5, fontWeight: 600, minWidth: 38 },
  pickChipActive: { background: PURPLE, color: "#fff", border: `1px solid ${PURPLE}` },
  inlineAddRow: { display: "flex", gap: 8, marginBottom: 6 },
  inlineAddInput: { flex: 1, background: "#F5F3FA", border: CARD_BORDER, borderRadius: 999, padding: "9px 14px", color: INK, fontSize: 13, outline: "none" },
  inlineAddBtn: { width: 36, height: 36, borderRadius: "50%", background: "#F5F3FA", border: CARD_BORDER, display: "flex", alignItems: "center", justifyContent: "center" },
  confirmSheet: { width: "100%", maxWidth: 480, background: SHEET_BG, borderRadius: "26px 26px 0 0", padding: "24px 20px 26px", border: "1px solid rgba(11,11,16,0.08)", borderBottom: "none", overscrollBehavior: "contain" },
  confirmTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 17, marginBottom: 4, color: INK },
  confirmHint: { fontSize: 12.5, color: MUTED, marginBottom: 18 },
  detailActions: { display: "flex", gap: 10 },
  primaryPill: { flex: 1, background: INK, color: "#fff", border: "none", borderRadius: 999, padding: "13px 0", fontSize: 14, fontWeight: 700, fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 },
  secondaryPill: { flex: 1, background: "#fff", color: INK, border: CARD_BORDER, borderRadius: 999, padding: "13px 0", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'Inter', sans-serif" },
  dangerPill: { flex: 1, background: "#E5484D", color: "#fff", border: "none", borderRadius: 999, padding: "13px 0", fontSize: 14, fontWeight: 700, fontFamily: "'Inter', sans-serif" },
  sheet: { position: "relative", width: "100%", maxWidth: 480, background: SHEET_BG, borderRadius: "28px 28px 0 0", padding: "26px 20px 24px", maxHeight: "88vh", overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", fontFamily: "'Inter', sans-serif", border: "1px solid rgba(11,11,16,0.08)", borderBottom: "none" },
  formSheet: { position: "relative", width: "100%", maxWidth: 480, background: SHEET_BG, borderRadius: "28px 28px 0 0", padding: "26px 20px 24px", maxHeight: "90vh", overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", fontFamily: "'Inter', sans-serif", border: "1px solid rgba(11,11,16,0.08)", borderBottom: "none" },
  sheetHandle: { position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 36, height: 4, borderRadius: 2, background: "rgba(11,11,16,0.15)" },
  closeBtn: { position: "absolute", top: 16, right: 16, background: "#F5F3FA", border: CARD_BORDER, borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center" },
  avatarBubbleBig: { width: 64, height: 64, borderRadius: 20, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 22, color: PURPLE, marginBottom: 10, overflow: "hidden" },
  avatarImgBig: { width: "100%", height: "100%", objectFit: "cover", borderRadius: 20 },
  detailName: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 22, marginBottom: 2, color: INK },
  detailSub: { fontSize: 12.5, color: MUTED, marginBottom: 6 },
  detailCategoryTag: { display: "inline-block", fontSize: 11, fontWeight: 700, color: PURPLE, background: PURPLE_SOFT, borderRadius: 999, padding: "4px 11px", marginBottom: 4 },
  sectionLabel: { fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", color: MUTED, margin: "18px 0 10px" },
  detailFields: { display: "flex", flexDirection: "column", gap: 12 },
  detailField: { display: "flex", alignItems: "center", gap: 10 },
  detailLink: { color: INK, fontSize: 14.5, textDecoration: "none", fontWeight: 500 },
  detailText: { color: INK, fontSize: 14 },
  detailHint: { fontSize: 13, color: MUTED },
  detailNote: { background: "#F5F3FA", border: CARD_BORDER, borderRadius: 16, padding: "12px 14px", fontSize: 13.5, lineHeight: 1.5, color: INK },
  psychBlock: { background: PURPLE_SOFT, border: "1px solid rgba(124,77,255,0.22)", borderRadius: 18, padding: "6px 14px" },
  psychRow: { padding: "10px 0", borderBottom: "1px solid rgba(124,77,255,0.15)" },
  psychLabel: { fontSize: 10.5, fontWeight: 700, color: "#8A6FE0", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.02em" },
  psychValue: { fontSize: 13.5, color: INK, lineHeight: 1.45 },
  psychFormBlock: { background: PURPLE_SOFT, border: "1px solid rgba(124,77,255,0.22)", borderRadius: 18, padding: 14, display: "flex", flexDirection: "column", gap: 12 },
  formHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  formTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 18, display: "flex", alignItems: "center", color: INK },
  stepTabs: { display: "flex", gap: 6, marginTop: 16, marginBottom: 6, overflowX: "auto" },
  stepTab: { flexShrink: 0, background: "#F5F3FA", border: CARD_BORDER, color: MUTED, borderRadius: 999, padding: "7px 13px", fontSize: 11.5, fontWeight: 600 },
  stepTabActive: { background: INK, color: "#fff", border: `1px solid ${INK}` },
  avatarRow: { display: "flex", alignItems: "center", gap: 14, marginTop: 12, marginBottom: 6 },
  avatarPicker: { width: 64, height: 64, borderRadius: 20, background: PURPLE_SOFT, border: "1.5px dashed rgba(124,77,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  avatarHint: { fontSize: 12, color: MUTED, lineHeight: 1.4 },
  formGrid: { display: "flex", flexDirection: "column", gap: 10 },
  fieldWrap: { display: "flex", flexDirection: "column", gap: 5, marginBottom: 4 },
  fieldLabel: { fontSize: 10.5, fontWeight: 700, color: MUTED, letterSpacing: "0.02em" },
  fieldInput: { background: "#F5F3FA", border: CARD_BORDER, borderRadius: 14, padding: "10px 13px", fontSize: 14, color: INK, outline: "none", fontFamily: "'Inter', sans-serif" },
  messengerFieldsRow: { background: "#F5F3FA", borderRadius: 16, padding: 12, marginBottom: 4, marginTop: 10, display: "flex", flexDirection: "column", gap: 8 },
  messengerFieldsLabel: { fontSize: 10.5, color: MUTED, fontWeight: 600 },
  importHint: { fontSize: 12.5, color: MUTED, lineHeight: 1.5, marginBottom: 16, marginTop: 10 },
  uploadZone: { width: "100%", background: PURPLE_SOFT, border: "1.5px dashed rgba(124,77,255,0.4)", borderRadius: 18, padding: "22px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: PURPLE, fontSize: 13, fontWeight: 600 },
  importError: { fontSize: 12.5, color: "#E5484D", marginTop: 12 },
  importFound: { fontSize: 13, fontWeight: 700, marginTop: 16, color: INK },
  aiSheet: { position: "relative", width: "100%", maxWidth: 480, background: SHEET_BG, borderRadius: "28px 28px 0 0", padding: "26px 20px 16px", height: "82vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif", border: "1px solid rgba(11,11,16,0.08)", borderBottom: "none", overscrollBehavior: "contain" },
  aiScroll: { flex: 1, overflowY: "auto", marginTop: 12, display: "flex", flexDirection: "column", gap: 12, paddingBottom: 8, overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" },
  aiIntro: { fontSize: 13.5, color: MUTED, lineHeight: 1.6, background: "#F5F3FA", borderRadius: 16, padding: 14 },
  aiMsgRow: { display: "flex" },
  aiBubble: { maxWidth: "85%", borderRadius: 18, padding: "11px 15px", fontSize: 13.5, lineHeight: 1.5 },
  aiBubbleUser: { background: INK, color: "#fff", fontWeight: 500, borderBottomRightRadius: 6 },
  aiBubbleAi: { background: "#F5F3FA", color: INK, border: CARD_BORDER, borderBottomLeftRadius: 6 },
  aiMatchRow: { display: "flex", gap: 8, overflowX: "auto", marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(11,11,16,0.1)" },
  aiMatchCard: { flexShrink: 0, width: 88, background: "#fff", border: CARD_BORDER, borderRadius: 14, padding: 8, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" },
  aiMatchName: { fontSize: 10.5, fontWeight: 700, color: INK, lineHeight: 1.2 },
  aiMatchJob: { fontSize: 9, color: MUTED, marginTop: 2 },
  aiInputRow: { display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid rgba(11,11,16,0.08)" },
  aiInput: { flex: 1, background: "#F5F3FA", border: CARD_BORDER, borderRadius: 999, padding: "11px 16px", color: INK, fontSize: 13.5, outline: "none" },
  aiSendBtn: { width: 40, height: 40, borderRadius: "50%", background: PURPLE, border: "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  toast: { position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)", background: INK, color: "#fff", padding: "10px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", zIndex: 60 },
};
