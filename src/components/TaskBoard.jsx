import React, { useState, useMemo, useRef } from "react";
import { X, ListChecks, Plus, Trash2, Search, ChevronLeft, Star, Check } from "lucide-react";
import { styles } from "../theme.js";
import { initials } from "../helpers.js";
import { TASK_TYPES, TASK_TYPE_COLORS, STATUS_COLUMNS } from "../constants.js";
import { Field } from "./Ui.jsx";

// TaskBoard (Модуль 3B) — переписан под мобильный формат.
//
// Раньше это был десктопный Kanban (3 колонки, горизонтальный скролл,
// стрелки "переместить влево/вправо"). На телефоне это плохо читалось:
// непонятно, что вообще делать с задачей, кроме как её листать между
// колонками. Теперь это единая лента, привычная по Reminders/To Do:
//   • группировка по срокам (Просрочено / Сегодня / Завтра / Неделя / Позже /
//     Без срока) вместо статусов-колонок — так сразу видно, что горит;
//   • переключатель "Активные / Готово" — готовые задачи не занимают место;
//   • свайп влево по задаче — быстрое удаление;
//   • тап по кружку слева — отметить готовой одним касанием;
//   • тап по звезде — важная задача, поднимается в начало своей группы;
//   • тап по самой задаче — открывает полноценное редактирование (раньше
//     задачу нельзя было отредактировать вообще, только двигать/удалять);
//   • поиск и фильтр по типу задачи (Follow-up/Обещание/Интро).

function formatDueDate(iso) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
function isOverdue(iso, status) {
  if (!iso || status === "done") return false;
  const today = new Date().toISOString().slice(0, 10);
  return iso < today;
}
function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysIso(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Группы по срокам — ключевая замена трёх десктопных колонок.
const BUCKETS = [
  { key: "overdue", label: "Просрочено" },
  { key: "today", label: "Сегодня" },
  { key: "tomorrow", label: "Завтра" },
  { key: "week", label: "На этой неделе" },
  { key: "later", label: "Позже" },
  { key: "none", label: "Без срока" },
];

function bucketOf(task) {
  if (!task.dueDate) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate + "T00:00:00");
  const diffDays = Math.round((due - today) / 86400000);
  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays <= 7) return "week";
  return "later";
}

// --- Свайпаемая строка задачи ---
// touch-action: pan-y на строке (см. theme.js) отдаёт браузеру вертикальный
// скролл списка, а горизонтальные жесты — нам, без лишних preventDefault-хаков.
function TaskRow({ task, contact, onToggleDone, onToggleImportant, onDelete, onOpenContact, onOpen }) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const horizontal = useRef(false);
  const baseX = useRef(0);
  const OPEN_X = -76;

  function handleTouchStart(e) {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    baseX.current = dragX;
    horizontal.current = false;
    setDragging(true);
  }
  function handleTouchMove(e) {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (!horizontal.current) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) horizontal.current = true;
      else if (Math.abs(dy) > 8) return; // вертикальный скролл — не наше дело
    }
    if (!horizontal.current) return;
    const next = Math.max(OPEN_X - 12, Math.min(0, baseX.current + dx));
    setDragX(next);
  }
  function handleTouchEnd() {
    setDragging(false);
    setDragX(dragX < OPEN_X / 2 ? OPEN_X : 0);
  }

  const overdue = isOverdue(task.dueDate, task.status);
  const dueLabel = formatDueDate(task.dueDate);
  const typeInfo = TASK_TYPES.find((t) => t.key === task.type) || TASK_TYPES[0];
  const color = TASK_TYPE_COLORS[task.type] || TASK_TYPE_COLORS.follow_up;
  const done = task.status === "done";

  function handleRowClick() {
    if (dragX !== 0) { setDragX(0); return; }
    onOpen(task);
  }

  return (
    <div style={styles.taskRowWrap}>
      <div style={styles.taskRowDeleteBg}>
        <button className="fp-btn" style={{ display: "flex", alignItems: "center", gap: 6, color: "#fff" }} onClick={() => onDelete(task.id)}>
          <Trash2 size={15} /> Удалить
        </button>
      </div>
      <div
        className="fp-card"
        style={{ ...styles.taskRow, transform: `translateX(${dragX}px)`, transition: dragging ? "none" : "transform .2s ease" }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleRowClick}
      >
        <button
          className="fp-btn"
          style={{ ...styles.taskRowCheck, ...(done ? styles.taskRowCheckDone : {}) }}
          onClick={(e) => { e.stopPropagation(); onToggleDone(task); }}
          aria-label="Отметить готовой"
        >
          {done && <Check size={12} color="#fff" strokeWidth={3} />}
        </button>
        <button
          className="fp-btn"
          style={{ ...styles.taskRowAvatar, cursor: contact ? "pointer" : "default" }}
          onClick={(e) => { e.stopPropagation(); if (contact) onOpenContact(contact.id); }}
          disabled={!contact}
        >
          {contact ? (contact.avatar ? <img src={contact.avatar} alt="" style={styles.avatarImg} /> : initials(contact)) : "?"}
        </button>
        <div style={styles.taskRowBody}>
          <div style={{ ...styles.taskRowTitle, ...(done ? styles.taskRowTitleDone : {}) }}>{task.title}</div>
          <div style={styles.taskRowMeta}>
            <span style={{ ...styles.taskRowTypeDot, background: color }} />
            <span>{typeInfo.label}</span>
            <span>·</span>
            <span>{contact ? `${contact.firstName} ${contact.lastName}`.trim() : "Контакт удалён"}</span>
            {dueLabel && (
              <span style={{ ...styles.taskRowDue, ...(overdue ? styles.taskRowDueOverdue : {}) }}>· {overdue ? "просрочено" : dueLabel}</span>
            )}
          </div>
        </div>
        <button
          className="fp-btn"
          style={{ ...styles.taskRowStar, ...(task.important ? styles.taskRowStarActive : {}) }}
          onClick={(e) => { e.stopPropagation(); onToggleImportant(task.id); }}
          aria-label="Важная задача"
        >
          <Star size={15} fill={task.important ? "currentColor" : "none"} />
        </button>
      </div>
    </div>
  );
}

// --- Форма создания/редактирования задачи ---
function TaskForm({ mode, contacts, initialTask, onCancel, onSave, onDelete }) {
  const [query, setQuery] = useState("");
  const [contactId, setContactId] = useState(initialTask?.contactId || null);
  const [type, setType] = useState(initialTask?.type || "follow_up");
  const [title, setTitle] = useState(initialTask?.title || "");
  const [dueDate, setDueDate] = useState(initialTask?.dueDate || "");
  const [important, setImportant] = useState(!!initialTask?.important);
  const [status, setStatus] = useState(initialTask?.status || "todo");

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? contacts.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q))
      : contacts;
    return list.slice(0, 30);
  }, [contacts, query]);

  const selectedContact = contacts.find((c) => c.id === contactId);
  const quickDates = [
    { label: "Сегодня", value: todayIso() },
    { label: "Завтра", value: addDaysIso(1) },
    { label: "Через неделю", value: addDaysIso(7) },
  ];

  function handleSave() {
    if (!contactId || !title.trim()) return;
    onSave({ contactId, type, title: title.trim(), dueDate: dueDate || null, important, status });
  }

  return (
    <div className="fp-step-anim">
      <div style={styles.sectionLabel}>Контакт</div>
      {selectedContact ? (
        <div style={{ ...styles.contactPickRow, ...styles.contactPickRowActive, marginBottom: 8 }}>
          <div style={styles.contactPickAvatar}>{selectedContact.avatar ? <img src={selectedContact.avatar} alt="" style={styles.avatarImg} /> : initials(selectedContact)}</div>
          <span style={styles.contactPickName}>{selectedContact.firstName} {selectedContact.lastName}</span>
          <button className="fp-btn" style={{ ...styles.taskDiscardBtn, marginLeft: "auto" }} onClick={() => setContactId(null)}>Изменить</button>
        </div>
      ) : (
        <>
          <div style={styles.searchBar}>
            <Search size={15} color="rgba(11,11,16,0.4)" />
            <input style={styles.searchInput} placeholder="Найти контакт…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div style={styles.contactPickList}>
            {filteredContacts.length === 0 && <div style={{ ...styles.emptyHintSmall, padding: 10 }}>Никого не найдено</div>}
            {filteredContacts.map((c) => (
              <button key={c.id} className="fp-btn" style={styles.contactPickRow} onClick={() => setContactId(c.id)}>
                <div style={styles.contactPickAvatar}>{c.avatar ? <img src={c.avatar} alt="" style={styles.avatarImg} /> : initials(c)}</div>
                <span style={styles.contactPickName}>{c.firstName} {c.lastName}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <div style={styles.sectionLabel}>Тип задачи</div>
      <div style={styles.chipWrap}>
        {TASK_TYPES.map((t) => (
          <button key={t.key} className="fp-btn" style={{ ...styles.pickChip, ...(type === t.key ? styles.pickChipActive : {}) }} onClick={() => setType(t.key)}>{t.label}</button>
        ))}
      </div>

      <Field label="Что нужно сделать" value={title} onChange={setTitle} placeholder="Например: скинуть контакт дизайнера" />

      <div style={styles.fieldWrap}>
        <span style={styles.fieldLabel}>Срок</span>
        <div style={styles.quickDateRow}>
          {quickDates.map((q) => (
            <button key={q.label} className="fp-btn" style={{ ...styles.pickChipSmall, ...(dueDate === q.value ? styles.pickChipActive : {}) }} onClick={() => setDueDate(q.value)}>{q.label}</button>
          ))}
          <button className="fp-btn" style={{ ...styles.pickChipSmall, ...(!dueDate ? styles.pickChipActive : {}) }} onClick={() => setDueDate("")}>Без срока</button>
        </div>
        <input type="date" style={styles.fieldInput} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>

      <div style={styles.fieldWrap}>
        <span style={styles.fieldLabel}>Важность</span>
        <button className="fp-btn" style={{ ...styles.pickChip, ...(important ? styles.pickChipActive : {}) }} onClick={() => setImportant((v) => !v)}>
          <Star size={13} style={{ verticalAlign: -2, marginRight: 5 }} fill={important ? "currentColor" : "none"} /> Важная задача
        </button>
      </div>

      {mode === "edit" && (
        <div style={styles.fieldWrap}>
          <span style={styles.fieldLabel}>Статус</span>
          <div style={styles.chipWrap}>
            {STATUS_COLUMNS.map((c) => (
              <button key={c.key} className="fp-btn" style={{ ...styles.pickChipSmall, ...(status === c.key ? styles.pickChipActive : {}) }} onClick={() => setStatus(c.key)}>{c.label}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ ...styles.detailActions, marginTop: 16 }}>
        <button className="fp-btn" style={styles.secondaryPill} onClick={onCancel}>Отмена</button>
        <button className="fp-btn" style={styles.primaryPill} onClick={handleSave} disabled={!contactId || !title.trim()}>{mode === "edit" ? "Сохранить" : "Создать"}</button>
      </div>

      {mode === "edit" && (
        <button className="fp-btn" style={styles.dangerGhostBtn} onClick={() => onDelete(initialTask.id)}>
          <Trash2 size={14} style={{ verticalAlign: -2, marginRight: 6 }} /> Удалить задачу
        </button>
      )}
    </div>
  );
}

export default function TaskBoard({ contacts, tasks, onClose, onUpdateTaskStatus, onUpdateTask, onToggleImportant, onDeleteTask, onCreateTask, onOpenContact }) {
  const [mode, setMode] = useState("list"); // 'list' | 'create' | 'edit'
  const [editingTask, setEditingTask] = useState(null);
  const [tab, setTab] = useState("active"); // 'active' | 'done'
  const [typeFilter, setTypeFilter] = useState(() => new Set());
  const [query, setQuery] = useState("");

  const contactMap = useMemo(() => {
    const m = {};
    contacts.forEach((c) => { m[c.id] = c; });
    return m;
  }, [contacts]);

  function matchesFilters(t) {
    if (typeFilter.size > 0 && !typeFilter.has(t.type)) return false;
    if (query.trim()) {
      const c = contactMap[t.contactId];
      const hay = `${t.title} ${c ? `${c.firstName} ${c.lastName}` : ""}`.toLowerCase();
      if (!hay.includes(query.trim().toLowerCase())) return false;
    }
    return true;
  }

  const activeTasks = useMemo(() => tasks.filter((t) => t.status !== "done" && matchesFilters(t)), [tasks, typeFilter, query, contactMap]);
  const doneTasks = useMemo(
    () => tasks.filter((t) => t.status === "done" && matchesFilters(t))
      .sort((a, b) => (b.completedAt || b.createdAt || 0) - (a.completedAt || a.createdAt || 0)),
    [tasks, typeFilter, query, contactMap]
  );

  const activeCount = tasks.filter((t) => t.status !== "done").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  const grouped = useMemo(() => {
    const map = {};
    BUCKETS.forEach((b) => { map[b.key] = []; });
    const sorted = [...activeTasks].sort((a, b) => {
      if (!!a.important !== !!b.important) return a.important ? -1 : 1;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    sorted.forEach((t) => { (map[bucketOf(t)] || map.none).push(t); });
    return map;
  }, [activeTasks]);

  function handleToggleDone(task) {
    onUpdateTaskStatus(task.id, task.status === "done" ? "todo" : "done");
  }
  function openCreate() { setEditingTask(null); setMode("create"); }
  function openEdit(task) { setEditingTask(task); setMode("edit"); }
  function closeForm() { setMode("list"); setEditingTask(null); }
  function handleFormSave(draft) {
    if (mode === "edit") onUpdateTask(editingTask.id, draft);
    else onCreateTask(draft);
    closeForm();
  }
  function handleFormDelete(taskId) {
    onDeleteTask(taskId);
    closeForm();
  }
  function toggleTypeFilter(key) {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const isFormOpen = mode !== "list";

  return (
    <div className="fp-overlay-anim" style={styles.boardOverlay}>
      <div style={styles.boardHeader}>
        {isFormOpen ? (
          <>
            <button className="fp-btn" style={styles.boardBackBtn} onClick={closeForm} aria-label="Назад"><ChevronLeft size={16} color="#0B0B10" /></button>
            <div style={styles.boardTitle}>{mode === "edit" ? "Задача" : "Новая задача"}</div>
            <div style={{ width: 30, flexShrink: 0 }} />
          </>
        ) : (
          <>
            <div style={styles.boardTitle}><ListChecks size={18} color="#7C4DFF" />Задачи</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="fp-btn" style={styles.boardAddBtn} onClick={openCreate}><Plus size={14} />Задача</button>
              <button className="fp-btn" style={styles.closeBtn} onClick={onClose}><X size={16} color="#0B0B10" /></button>
            </div>
          </>
        )}
      </div>

      {isFormOpen ? (
        <div style={{ padding: "16px 16px 24px", overflowY: "auto" }}>
          <TaskForm
            mode={mode}
            contacts={contacts}
            initialTask={editingTask}
            onCancel={closeForm}
            onSave={handleFormSave}
            onDelete={handleFormDelete}
          />
        </div>
      ) : (
        <>
          <div style={styles.boardToolbar}>
            <div style={styles.searchBar}>
              <Search size={15} color="rgba(11,11,16,0.4)" />
              <input style={styles.searchInput} placeholder="Найти задачу или контакт…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div style={styles.segControl}>
              <button className="fp-btn" style={{ ...styles.segBtn, ...(tab === "active" ? styles.segBtnActive : {}) }} onClick={() => setTab("active")}>
                Активные{activeCount > 0 ? ` · ${activeCount}` : ""}
              </button>
              <button className="fp-btn" style={{ ...styles.segBtn, ...(tab === "done" ? styles.segBtnActive : {}) }} onClick={() => setTab("done")}>
                Готово{doneCount > 0 ? ` · ${doneCount}` : ""}
              </button>
            </div>
            <div style={styles.boardFilterRow}>
              {TASK_TYPES.map((t) => (
                <button
                  key={t.key}
                  className="fp-btn"
                  style={{ ...styles.pickChipSmall, ...(typeFilter.has(t.key) ? { ...styles.pickChipActive, background: TASK_TYPE_COLORS[t.key] } : {}) }}
                  onClick={() => toggleTypeFilter(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.boardScroll}>
            {tab === "active" ? (
              activeCount === 0 ? (
                <div style={styles.boardEmptyState}>
                  <ListChecks size={30} color="rgba(11,11,16,0.2)" />
                  <div style={styles.boardEmptyTitle}>Нет активных задач</div>
                  <div style={styles.boardEmptyHint}>Добавляйте follow-up, обещания и интро прямо из карточки контакта или кнопкой «Задача» выше.</div>
                </div>
              ) : activeTasks.length === 0 ? (
                <div style={styles.boardEmptyState}>
                  <Search size={26} color="rgba(11,11,16,0.2)" />
                  <div style={styles.boardEmptyTitle}>Ничего не найдено</div>
                  <div style={styles.boardEmptyHint}>Попробуйте изменить поиск или снять фильтр по типу.</div>
                </div>
              ) : (
                BUCKETS.map((b) => {
                  const list = grouped[b.key];
                  if (!list || list.length === 0) return null;
                  return (
                    <div key={b.key}>
                      <div style={styles.sectionGroupLabel}>
                        {b.label} <span style={styles.sectionGroupCount}>{list.length}</span>
                      </div>
                      {list.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          contact={contactMap[task.contactId]}
                          onToggleDone={handleToggleDone}
                          onToggleImportant={onToggleImportant}
                          onDelete={onDeleteTask}
                          onOpenContact={onOpenContact}
                          onOpen={openEdit}
                        />
                      ))}
                    </div>
                  );
                })
              )
            ) : doneTasks.length === 0 ? (
              <div style={styles.boardEmptyState}>
                <Check size={30} color="rgba(11,11,16,0.2)" />
                <div style={styles.boardEmptyTitle}>Пока ничего не готово</div>
                <div style={styles.boardEmptyHint}>Отмечайте задачи кружком слева — выполненные появятся здесь.</div>
              </div>
            ) : (
              doneTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  contact={contactMap[task.contactId]}
                  onToggleDone={handleToggleDone}
                  onToggleImportant={onToggleImportant}
                  onDelete={onDeleteTask}
                  onOpenContact={onOpenContact}
                  onOpen={openEdit}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
