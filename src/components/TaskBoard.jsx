import React, { useState, useMemo, useRef } from "react";
import { X, ListChecks, Plus, Trash2, Search, ChevronLeft, ChevronRight, Star, Check, Sun, Calendar as CalendarIcon, List as ListIcon, Bell, Repeat, ListTodo, Pencil, Settings2 } from "lucide-react";
import { styles, PURPLE } from "../theme.js";
import { initials } from "../helpers.js";
import { DEFAULT_TASK_TYPES, TASK_TYPE_PALETTE, STATUS_COLUMNS } from "../constants.js";
import { Field, ConfirmModal } from "./Ui.jsx";
import { emptySubtask, subtaskProgress, REPEAT_LABELS } from "../helpers.js";

// TaskBoard (Модуль 3B) — мобильный многофункциональный таск-менеджер.
//
// Три вида ленты вместо одного списка:
//   • «Сегодня» — то, что реально горит прямо сейчас (просрочено + сегодня +
//     помечено важным), без лишнего скролла по датам;
//   • «Список» — классическая группировка по срокам (Просрочено / Сегодня /
//     Завтра / Неделя / Позже / Без срока) + переключатель Активные/Готово;
//   • «Календарь» — месячная сетка с точками-индикаторами задач по дням,
//     тап по дню показывает список задач этого дня ниже.
// Задача теперь умеет: чек-лист подзадач, напоминание на конкретное время
// дня (локальное уведомление, см. App.jsx), повтор (день/неделя/месяц —
// при выполнении повторяющейся задачи следующая создаётся автоматически).
// Свайп влево — быстрое удаление, тап по кружку — готово одним касанием,
// тап по звезде — важная задача, поиск и фильтр по типу — как раньше.
//
// Типы задач больше не зашиты жёстко: список (taskTypes) приходит из
// App.jsx (state + storage), тут только читаем его и, при необходимости,
// правим через onAddTaskType/onRenameTaskType/onDeleteTaskType. Клик по
// самой карточке задачи больше НЕ открывает редактирование — только явная
// кнопка-карандаш. Удаление задачи, отметка «Готово» и удаление типа задачи
// теперь проходят через подтверждение (ConfirmModal), чтобы не терять
// данные от случайного тапа.

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
function slugifyTypeKey(label, existingKeys) {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "") || "type";
  let key = base;
  let i = 2;
  while (existingKeys.includes(key)) { key = `${base}_${i}`; i++; }
  return key;
}

// Группы по срокам — для вида "Список".
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

const VIEWS = [
  { key: "today", label: "Сегодня", icon: Sun },
  { key: "list", label: "Список", icon: ListIcon },
  { key: "calendar", label: "Календарь", icon: CalendarIcon },
];

// --- Свайпаемая строка задачи ---
// touch-action: pan-y на строке (см. theme.js) отдаёт браузеру вертикальный
// скролл списка, а горизонтальные жесты — нам, без лишних preventDefault-хаков.
// Тап по самой карточке больше не открывает редактирование (только сбрасывает
// свайп, если он был приоткрыт) — для перехода в редактирование теперь есть
// отдельная кнопка-карандаш справа.
function TaskRow({ task, contact, typeInfo, onToggleDone, onToggleImportant, onRequestDelete, onOpenContact, onEdit }) {
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
  const color = typeInfo.color || PURPLE;
  const done = task.status === "done";
  const sp = subtaskProgress(task);

  function handleRowClick() {
    // Клик по карточке больше не открывает редактирование — только
    // закрывает приоткрытый свайп, если он был.
    if (dragX !== 0) setDragX(0);
  }

  return (
    <div style={styles.taskRowWrap}>
      <div style={styles.taskRowDeleteBg}>
        <button className="fp-btn" style={{ display: "flex", alignItems: "center", gap: 6, color: "#fff" }} onClick={() => onRequestDelete(task.id)}>
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
            {sp.total > 0 && (
              <span style={styles.taskRowIndicator}><ListTodo size={10.5} />{sp.done}/{sp.total}</span>
            )}
            {task.reminderTime && (
              <span style={styles.taskRowIndicator}><Bell size={10.5} />{task.reminderTime}</span>
            )}
            {task.repeat && task.repeat !== "none" && (
              <span style={styles.taskRowIndicator}><Repeat size={10.5} /></span>
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
        <button
          className="fp-btn"
          style={styles.taskRowEditBtn}
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          aria-label="Редактировать задачу"
        >
          <Pencil size={13} />
        </button>
      </div>
    </div>
  );
}

// --- Мини-календарь месяца ---
function MonthCalendar({ tasks, typeColorOf, selectedDate, onSelectDate }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!t.dueDate) return;
      (map[t.dueDate] = map[t.dueDate] || []).push(t);
    });
    return map;
  }, [tasks]);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    // Понедельник = 0
    const leading = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const list = [];
    for (let i = 0; i < leading; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      list.push(iso);
    }
    return list;
  }, [cursor]);

  const monthLabel = cursor.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
  const todayStr = todayIso();

  return (
    <div>
      <div style={styles.calHeader}>
        <button className="fp-btn" style={styles.calNavBtn} onClick={() => setCursor((c) => { const n = new Date(c); n.setMonth(n.getMonth() - 1); return n; })}>
          <ChevronLeft size={15} color="#0B0B10" />
        </button>
        <div style={styles.calMonthLabel}>{monthLabel}</div>
        <button className="fp-btn" style={styles.calNavBtn} onClick={() => setCursor((c) => { const n = new Date(c); n.setMonth(n.getMonth() + 1); return n; })}>
          <ChevronRight size={15} color="#0B0B10" />
        </button>
      </div>
      <div style={styles.calWeekRow}>
        {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => <div key={d} style={styles.calWeekday}>{d}</div>)}
      </div>
      <div style={styles.calGrid}>
        {cells.map((iso, i) => {
          if (!iso) return <div key={`e${i}`} />;
          const dayTasks = tasksByDate[iso] || [];
          const isToday = iso === todayStr;
          const isSelected = iso === selectedDate;
          const dayNum = Number(iso.slice(-2));
          return (
            <button
              key={iso}
              className="fp-btn"
              style={{ ...styles.calCell, ...(isToday ? styles.calCellToday : {}), ...(isSelected ? styles.calCellSelected : {}) }}
              onClick={() => onSelectDate(iso === selectedDate ? null : iso)}
            >
              <span style={{ ...styles.calDayNum, ...(isSelected ? styles.calDayNumSelected : {}) }}>{dayNum}</span>
              <div style={styles.calDotsRow}>
                {dayTasks.slice(0, 3).map((t) => (
                  <span key={t.id} style={{ ...styles.calDot, background: isSelected ? "#fff" : typeColorOf(t.type) }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Управление типами задач ---
// Доступно и из формы создания/редактирования задачи, и из общего списка
// (иконка настроек рядом с фильтром по типу). Переименование — прямо в
// строке, удаление типа — через общее ConfirmModal (нельзя удалить
// последний оставшийся тип).
function TaskTypeManager({ taskTypes, onAdd, onRename, onDelete, onClose }) {
  const [draft, setDraft] = useState("");
  const [pendingDeleteKey, setPendingDeleteKey] = useState(null);
  const [closing, setClosing] = useState(false);
  function handleClose() { setClosing(true); setTimeout(onClose, 180); }

  function handleAdd() {
    if (!draft.trim()) return;
    onAdd(draft.trim());
    setDraft("");
  }

  const pendingType = taskTypes.find((t) => t.key === pendingDeleteKey);

  return (
    <div className={closing ? "fp-overlay-anim-out" : "fp-overlay-anim"} style={styles.overlay} onClick={handleClose}>
      <div className={closing ? "fp-sheet-anim-out" : "fp-sheet-anim"} style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.sheetHandle} />
        <button className="fp-btn" style={styles.closeBtn} onClick={handleClose}><X size={16} color="#0B0B10" /></button>
        <div style={styles.formTitle}><Settings2 size={17} color="#7C4DFF" style={{ marginRight: 6, verticalAlign: -3 }} />Типы задач</div>
        <div style={{ marginTop: 10 }}>
          {taskTypes.map((t) => (
            <div key={t.key} style={styles.typeManageRow}>
              <span style={{ ...styles.typeManageColorDot, background: t.color }} />
              <input
                style={styles.typeManageInput}
                value={t.label}
                onChange={(e) => onRename(t.key, e.target.value)}
              />
              <button
                className="fp-btn"
                style={styles.typeManageDelBtn}
                onClick={() => setPendingDeleteKey(t.key)}
                disabled={taskTypes.length <= 1}
                aria-label="Удалить тип"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div style={{ ...styles.inlineAddRow, marginTop: 12 }}>
          <input
            style={styles.inlineAddInput}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Новый тип задачи…"
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          />
          <button className="fp-btn" style={styles.inlineAddBtn} onClick={handleAdd}><Plus size={14} color="#0B0B10" /></button>
        </div>
      </div>

      <ConfirmModal
        open={!!pendingType}
        title={`Удалить тип «${pendingType?.label}»?`}
        hint="Задачи этого типа не удалятся, но перестанут быть помечены этим типом."
        confirmLabel="Удалить"
        danger
        onConfirm={() => { onDelete(pendingDeleteKey); setPendingDeleteKey(null); }}
        onCancel={() => setPendingDeleteKey(null)}
      />
    </div>
  );
}

// --- Форма создания/редактирования задачи ---
function TaskForm({ mode, contacts, taskTypes, initialTask, onCancel, onSave, onRequestDelete, onManageTypes }) {
  const [query, setQuery] = useState("");
  const [contactId, setContactId] = useState(initialTask?.contactId || null);
  const [type, setType] = useState(initialTask?.type || (taskTypes[0] && taskTypes[0].key) || "follow_up");
  const [title, setTitle] = useState(initialTask?.title || "");
  const [dueDate, setDueDate] = useState(initialTask?.dueDate || "");
  const [important, setImportant] = useState(!!initialTask?.important);
  const [status, setStatus] = useState(initialTask?.status || "todo");
  const [subtasks, setSubtasks] = useState(initialTask?.subtasks || []);
  const [subtaskDraft, setSubtaskDraft] = useState("");
  const [reminderTime, setReminderTime] = useState(initialTask?.reminderTime || "");
  const [repeat, setRepeat] = useState(initialTask?.repeat || "none");

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

  function addSubtask() {
    if (!subtaskDraft.trim()) return;
    setSubtasks((prev) => [...prev, emptySubtask(subtaskDraft.trim())]);
    setSubtaskDraft("");
  }
  function toggleSubtask(id) {
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));
  }
  function removeSubtask(id) {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  }

  function handleSave() {
    if (!contactId || !title.trim()) return;
    onSave({
      contactId, type, title: title.trim(), dueDate: dueDate || null, important, status,
      subtasks, reminderTime: dueDate ? (reminderTime || null) : null, repeat,
    });
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

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={styles.sectionLabel}>Тип задачи</div>
        <button className="fp-btn" style={styles.boardManageTypesBtn} onClick={onManageTypes}>
          <Settings2 size={12} /> Управление
        </button>
      </div>
      <div style={styles.chipWrap}>
        {taskTypes.map((t) => (
          <button key={t.key} className="fp-btn" style={{ ...styles.pickChip, ...(type === t.key ? { ...styles.pickChipActive, background: t.color } : {}) }} onClick={() => setType(t.key)}>{t.label}</button>
        ))}
      </div>

      <Field label="Что нужно сделать" value={title} onChange={setTitle} placeholder="Например: скинуть контакт дизайнера" />

      <div style={styles.fieldWrap}>
        <span style={styles.fieldLabel}>Срок</span>
        <div style={styles.quickDateRow}>
          {quickDates.map((q) => (
            <button key={q.label} className="fp-btn" style={{ ...styles.pickChipSmall, ...(dueDate === q.value ? styles.pickChipActive : {}) }} onClick={() => setDueDate(q.value)}>{q.label}</button>
          ))}
          <button className="fp-btn" style={{ ...styles.pickChipSmall, ...(!dueDate ? styles.pickChipActive : {}) }} onClick={() => { setDueDate(""); setReminderTime(""); }}>Без срока</button>
        </div>
        <input type="date" style={styles.fieldInput} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>

      {dueDate && (
        <div style={styles.fieldWrap}>
          <span style={styles.fieldLabel}>Напоминание в день срока</span>
          <div style={styles.reminderToggleRow}>
            <button
              className="fp-btn"
              style={{ ...styles.pickChip, ...(reminderTime ? styles.pickChipActive : {}) }}
              onClick={() => setReminderTime((v) => (v ? "" : "09:00"))}
            >
              <Bell size={13} style={{ verticalAlign: -2, marginRight: 5 }} /> {reminderTime ? "Включено" : "Напомнить"}
            </button>
            {reminderTime && (
              <input type="time" style={styles.reminderTimeInput} value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
            )}
          </div>
        </div>
      )}

      <div style={styles.fieldWrap}>
        <span style={styles.fieldLabel}>Повтор</span>
        <div style={styles.chipWrap}>
          {Object.entries(REPEAT_LABELS).map(([key, label]) => (
            <button key={key} className="fp-btn" style={{ ...styles.pickChipSmall, ...(repeat === key ? styles.pickChipActive : {}) }} onClick={() => setRepeat(key)}>{label}</button>
          ))}
        </div>
      </div>

      <div style={styles.fieldWrap}>
        <span style={styles.fieldLabel}>Подзадачи{subtasks.length > 0 ? ` · ${subtasks.filter((s) => s.done).length}/${subtasks.length}` : ""}</span>
        {subtasks.length > 0 && (
          <div style={styles.subtaskList}>
            {subtasks.map((s) => (
              <div key={s.id} style={styles.subtaskRow}>
                <button className="fp-btn" style={{ ...styles.subtaskCheck, ...(s.done ? styles.subtaskCheckDone : {}) }} onClick={() => toggleSubtask(s.id)}>
                  {s.done && <Check size={11} color="#fff" strokeWidth={3} />}
                </button>
                <span style={{ ...styles.subtaskText, ...(s.done ? styles.subtaskTextDone : {}) }}>{s.text}</span>
                <button className="fp-btn" style={styles.subtaskDelBtn} onClick={() => removeSubtask(s.id)}><X size={13} /></button>
              </div>
            ))}
          </div>
        )}
        <div style={styles.subtaskAddRow}>
          <input
            style={styles.subtaskAddInput}
            placeholder="Добавить пункт…"
            value={subtaskDraft}
            onChange={(e) => setSubtaskDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addSubtask(); }}
          />
          <button className="fp-btn" style={styles.subtaskAddBtn} onClick={addSubtask}><Plus size={15} color="#fff" /></button>
        </div>
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
        <button className="fp-btn" style={styles.dangerGhostBtn} onClick={() => onRequestDelete(initialTask.id)}>
          <Trash2 size={14} style={{ verticalAlign: -2, marginRight: 6 }} /> Удалить задачу
        </button>
      )}
    </div>
  );
}

export default function TaskBoard({
  contacts, tasks, onClose, onUpdateTaskStatus, onUpdateTask, onToggleImportant, onDeleteTask, onCreateTask, onOpenContact,
  taskTypes, onAddTaskType, onRenameTaskType, onDeleteTaskType,
}) {
  const effectiveTypes = taskTypes && taskTypes.length ? taskTypes : DEFAULT_TASK_TYPES;

  const [closing, setClosing] = useState(false);
  function handleClose() { setClosing(true); setTimeout(onClose, 180); }

  const [mode, setMode] = useState("list"); // 'list' | 'create' | 'edit'
  const [editingTask, setEditingTask] = useState(null);
  const [view, setView] = useState("today"); // 'today' | 'list' | 'calendar'
  const [tab, setTab] = useState("active"); // 'active' | 'done' — только для вида "Список"
  const [typeFilter, setTypeFilter] = useState(() => new Set());
  const [query, setQuery] = useState("");
  const [calSelectedDate, setCalSelectedDate] = useState(null);
  const [typesManagerOpen, setTypesManagerOpen] = useState(false);

  // Подтверждения — защита от случайного тапа/свайпа.
  const [pendingDeleteId, setPendingDeleteId] = useState(null); // id задачи на удаление
  const [pendingCompleteTask, setPendingCompleteTask] = useState(null); // задача, которую отмечаем "Готово"

  const contactMap = useMemo(() => {
    const m = {};
    contacts.forEach((c) => { m[c.id] = c; });
    return m;
  }, [contacts]);

  const typeMap = useMemo(() => {
    const m = {};
    effectiveTypes.forEach((t) => { m[t.key] = t; });
    return m;
  }, [effectiveTypes]);
  function typeInfoOf(key) { return typeMap[key] || effectiveTypes[0] || DEFAULT_TASK_TYPES[0]; }
  function typeColorOf(key) { return typeInfoOf(key).color || PURPLE; }

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

  // «Сегодня» — просрочено + сегодня + важное, одним списком без вкладок.
  const todayTasks = useMemo(() => {
    const list = activeTasks.filter((t) => {
      const b = bucketOf(t);
      return b === "overdue" || b === "today" || t.important;
    });
    return list.sort((a, b) => {
      if (!!a.important !== !!b.important) return a.important ? -1 : 1;
      const ba = bucketOf(a) === "overdue" ? 0 : 1;
      const bb = bucketOf(b) === "overdue" ? 0 : 1;
      if (ba !== bb) return ba - bb;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return 0;
    });
  }, [activeTasks]);

  const calendarSourceTasks = useMemo(() => tasks.filter(matchesFilters), [tasks, typeFilter, query, contactMap]);
  const calendarDayTasks = useMemo(
    () => (calSelectedDate ? calendarSourceTasks.filter((t) => t.dueDate === calSelectedDate) : []),
    [calendarSourceTasks, calSelectedDate]
  );

  // Отметка "Готово" — защищена подтверждением (частая причина мисс-кликов:
  // свайп и тап по кружку рядом). Снятие отметки (передумал/ошибся) обратимо
  // одним тапом и подтверждения не требует.
  function handleToggleDone(task) {
    if (task.status === "done") {
      onUpdateTaskStatus(task.id, "todo");
    } else {
      setPendingCompleteTask(task);
    }
  }
  function confirmComplete() {
    if (pendingCompleteTask) onUpdateTaskStatus(pendingCompleteTask.id, "done");
    setPendingCompleteTask(null);
  }

  function requestDeleteTask(taskId) { setPendingDeleteId(taskId); }
  function confirmDeleteTask() {
    if (pendingDeleteId) {
      onDeleteTask(pendingDeleteId);
      if (mode !== "list" && editingTask?.id === pendingDeleteId) closeForm();
    }
    setPendingDeleteId(null);
  }

  function openCreate() { setEditingTask(null); setMode("create"); }
  function openEdit(task) { setEditingTask(task); setMode("edit"); }
  function closeForm() { setMode("list"); setEditingTask(null); }
  function handleFormSave(draft) {
    if (mode === "edit") onUpdateTask(editingTask.id, draft);
    else onCreateTask(draft);
    closeForm();
  }
  function toggleTypeFilter(key) {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function handleAddType(label) {
    const key = slugifyTypeKey(label, effectiveTypes.map((t) => t.key));
    const usedColors = effectiveTypes.map((t) => t.color);
    const color = TASK_TYPE_PALETTE.find((c) => !usedColors.includes(c)) || TASK_TYPE_PALETTE[effectiveTypes.length % TASK_TYPE_PALETTE.length];
    onAddTaskType({ key, label, color });
  }
  function handleRenameType(key, label) { onRenameTaskType(key, label); }
  function handleDeleteType(key) {
    if (effectiveTypes.length <= 1) return; // всегда должен остаться хотя бы один тип
    onDeleteTaskType(key);
    setTypeFilter((prev) => { const next = new Set(prev); next.delete(key); return next; });
  }

  const isFormOpen = mode !== "list";

  return (
    <div className={closing ? "fp-overlay-anim-out" : "fp-overlay-anim"} style={styles.boardOverlay}>
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
              <button className="fp-btn" style={styles.closeBtn} onClick={handleClose}><X size={16} color="#0B0B10" /></button>
            </div>
          </>
        )}
      </div>

      {isFormOpen ? (
        <div style={{ padding: "16px 16px 24px", overflowY: "auto" }}>
          <TaskForm
            mode={mode}
            contacts={contacts}
            taskTypes={effectiveTypes}
            initialTask={editingTask}
            onCancel={closeForm}
            onSave={handleFormSave}
            onRequestDelete={requestDeleteTask}
            onManageTypes={() => setTypesManagerOpen(true)}
          />
        </div>
      ) : (
        <>
          <div style={styles.boardToolbar}>
            <div style={styles.viewSwitch}>
              {VIEWS.map((v) => {
                const Icon = v.icon;
                return (
                  <button key={v.key} className="fp-btn" style={{ ...styles.viewSwitchBtn, ...(view === v.key ? styles.viewSwitchBtnActive : {}) }} onClick={() => setView(v.key)}>
                    <Icon size={13} />{v.label}
                  </button>
                );
              })}
            </div>
            <div style={styles.searchBar}>
              <Search size={15} color="rgba(11,11,16,0.4)" />
              <input style={styles.searchInput} placeholder="Найти задачу или контакт…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            {view === "list" && (
              <div style={styles.segControl}>
                <button className="fp-btn" style={{ ...styles.segBtn, ...(tab === "active" ? styles.segBtnActive : {}) }} onClick={() => setTab("active")}>
                  Активные{activeCount > 0 ? ` · ${activeCount}` : ""}
                </button>
                <button className="fp-btn" style={{ ...styles.segBtn, ...(tab === "done" ? styles.segBtnActive : {}) }} onClick={() => setTab("done")}>
                  Готово{doneCount > 0 ? ` · ${doneCount}` : ""}
                </button>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ ...styles.boardFilterRow, flex: 1 }}>
                {effectiveTypes.map((t) => (
                  <button
                    key={t.key}
                    className="fp-btn"
                    style={{ ...styles.pickChipSmall, ...(typeFilter.has(t.key) ? { ...styles.pickChipActive, background: t.color } : {}) }}
                    onClick={() => toggleTypeFilter(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button className="fp-btn" style={styles.taskRowEditBtn} onClick={() => setTypesManagerOpen(true)} aria-label="Управление типами задач">
                <Settings2 size={13} />
              </button>
            </div>
          </div>

          <div style={styles.boardScroll}>
            {view === "today" && (
              todayTasks.length === 0 ? (
                <div style={styles.boardEmptyState}>
                  <Sun size={30} color="rgba(11,11,16,0.2)" />
                  <div style={styles.boardEmptyTitle}>На сегодня всё чисто</div>
                  <div style={styles.boardEmptyHint}>Здесь появятся просроченные, сегодняшние и важные задачи.</div>
                </div>
              ) : (
                todayTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    contact={contactMap[task.contactId]}
                    typeInfo={typeInfoOf(task.type)}
                    onToggleDone={handleToggleDone}
                    onToggleImportant={onToggleImportant}
                    onRequestDelete={requestDeleteTask}
                    onOpenContact={onOpenContact}
                    onEdit={openEdit}
                  />
                ))
              )
            )}

            {view === "list" && (
              tab === "active" ? (
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
                            typeInfo={typeInfoOf(task.type)}
                            onToggleDone={handleToggleDone}
                            onToggleImportant={onToggleImportant}
                            onRequestDelete={requestDeleteTask}
                            onOpenContact={onOpenContact}
                            onEdit={openEdit}
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
                    typeInfo={typeInfoOf(task.type)}
                    onToggleDone={handleToggleDone}
                    onToggleImportant={onToggleImportant}
                    onRequestDelete={requestDeleteTask}
                    onOpenContact={onOpenContact}
                    onEdit={openEdit}
                  />
                ))
              )
            )}

            {view === "calendar" && (
              <>
                <MonthCalendar tasks={calendarSourceTasks} typeColorOf={typeColorOf} selectedDate={calSelectedDate} onSelectDate={setCalSelectedDate} />
                {calSelectedDate && (
                  <>
                    <div style={styles.calSelectedLabel}>
                      {new Date(calSelectedDate + "T00:00:00").toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} · {calendarDayTasks.length}
                    </div>
                    {calendarDayTasks.length === 0 ? (
                      <div style={{ ...styles.boardEmptyHint, textAlign: "center", padding: "20px 0" }}>На этот день задач нет.</div>
                    ) : (
                      calendarDayTasks.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          contact={contactMap[task.contactId]}
                          typeInfo={typeInfoOf(task.type)}
                          onToggleDone={handleToggleDone}
                          onToggleImportant={onToggleImportant}
                          onRequestDelete={requestDeleteTask}
                          onOpenContact={onOpenContact}
                          onEdit={openEdit}
                        />
                      ))
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}

      {typesManagerOpen && (
        <TaskTypeManager
          taskTypes={effectiveTypes}
          onAdd={handleAddType}
          onRename={handleRenameType}
          onDelete={handleDeleteType}
          onClose={() => setTypesManagerOpen(false)}
        />
      )}

      <ConfirmModal
        open={!!pendingDeleteId}
        title="Удалить задачу?"
        hint="Действие необратимо."
        confirmLabel="Удалить"
        danger
        onConfirm={confirmDeleteTask}
        onCancel={() => setPendingDeleteId(null)}
      />

      <ConfirmModal
        open={!!pendingCompleteTask}
        title="Отметить задачу готовой?"
        hint={pendingCompleteTask ? pendingCompleteTask.title : ""}
        confirmLabel="Готово"
        onConfirm={confirmComplete}
        onCancel={() => setPendingCompleteTask(null)}
      />
    </div>
  );
}
