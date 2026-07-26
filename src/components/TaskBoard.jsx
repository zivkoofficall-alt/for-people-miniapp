import React, { useState, useMemo } from "react";
import { X, ListChecks, Plus, ChevronLeft, ChevronRight, Trash2, Search } from "lucide-react";
import { styles } from "../theme.js";
import { initials } from "../helpers.js";
import { TASK_TYPES, TASK_TYPE_COLORS, STATUS_COLUMNS } from "../constants.js";
import { Field } from "./Ui.jsx";

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

function TaskCard({ task, contact, onMove, onDelete, onOpenContact }) {
  const typeInfo = TASK_TYPES.find((t) => t.key === task.type) || TASK_TYPES[0];
  const color = TASK_TYPE_COLORS[task.type] || TASK_TYPE_COLORS.follow_up;
  const colIndex = STATUS_COLUMNS.findIndex((c) => c.key === task.status);
  const dueLabel = formatDueDate(task.dueDate);
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <div className="fp-card" style={styles.taskCard}>
      <div style={styles.taskCardTop}>
        <button
          className="fp-btn"
          style={{ ...styles.taskCardAvatar, cursor: contact ? "pointer" : "default" }}
          onClick={() => contact && onOpenContact(contact.id)}
          disabled={!contact}
        >
          {contact ? (contact.avatar ? <img src={contact.avatar} alt="" style={styles.avatarImg} /> : initials(contact)) : "?"}
        </button>
        <button
          className="fp-btn"
          style={{ ...styles.taskCardContactName, background: "none", border: "none", padding: 0, textAlign: "left" }}
          onClick={() => contact && onOpenContact(contact.id)}
        >
          {contact ? `${contact.firstName} ${contact.lastName}`.trim() : "Контакт удалён"}
        </button>
        <span style={{ ...styles.taskTypeBadge, background: color }}>{typeInfo.label}</span>
      </div>

      <div style={styles.taskCardTitle}>{task.title}</div>

      <div style={styles.taskCardFooter}>
        {dueLabel ? (
          <span style={{ ...styles.taskCardDue, ...(overdue ? styles.taskCardDueOverdue : {}) }}>
            {overdue ? "Просрочено · " : ""}{dueLabel}
          </span>
        ) : <span />}
        <div style={styles.taskCardActions}>
          {colIndex > 0 && (
            <button className="fp-btn" style={styles.taskCardMoveBtn} onClick={() => onMove(task.id, STATUS_COLUMNS[colIndex - 1].key)} aria-label="Назад">
              <ChevronLeft size={13} />
            </button>
          )}
          {colIndex < STATUS_COLUMNS.length - 1 && (
            <button className="fp-btn" style={styles.taskCardMoveBtn} onClick={() => onMove(task.id, STATUS_COLUMNS[colIndex + 1].key)} aria-label="Вперёд">
              <ChevronRight size={13} />
            </button>
          )}
          <button className="fp-btn" style={styles.taskCardDeleteBtn} onClick={() => onDelete(task.id)} aria-label="Удалить задачу">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function NewTaskForm({ contacts, onCancel, onCreate }) {
  const [query, setQuery] = useState("");
  const [contactId, setContactId] = useState(null);
  const [type, setType] = useState("follow_up");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? contacts.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(q))
      : contacts;
    return list.slice(0, 30);
  }, [contacts, query]);

  const selectedContact = contacts.find((c) => c.id === contactId);

  function handleSave() {
    if (!contactId || !title.trim()) return;
    onCreate({ contactId, type, title: title.trim(), dueDate: dueDate || null });
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
        <span style={styles.fieldLabel}>Срок (необязательно)</span>
        <input type="date" style={styles.fieldInput} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>

      <div style={{ ...styles.detailActions, marginTop: 16 }}>
        <button className="fp-btn" style={styles.secondaryPill} onClick={onCancel}>Отмена</button>
        <button className="fp-btn" style={styles.primaryPill} onClick={handleSave} disabled={!contactId || !title.trim()}>Создать</button>
      </div>
    </div>
  );
}

export default function TaskBoard({ contacts, tasks, onClose, onUpdateTaskStatus, onDeleteTask, onCreateTask, onOpenContact }) {
  const [addingOpen, setAddingOpen] = useState(false);

  const byColumn = useMemo(() => {
    const map = {};
    STATUS_COLUMNS.forEach((col) => { map[col.key] = []; });
    const sorted = [...tasks].sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    sorted.forEach((t) => { (map[t.status] || map.todo).push(t); });
    return map;
  }, [tasks]);

  return (
    <div className="fp-overlay-anim" style={styles.boardOverlay}>
      <div style={styles.boardHeader}>
        <div style={styles.boardTitle}><ListChecks size={18} color="#7C4DFF" />Задачи по контактам</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="fp-btn" style={styles.boardAddBtn} onClick={() => setAddingOpen(true)}><Plus size={14} />Задача</button>
          <button className="fp-btn" style={styles.closeBtn} onClick={onClose}><X size={16} color="#0B0B10" /></button>
        </div>
      </div>

      {addingOpen ? (
        <div style={{ padding: "16px 16px 24px", overflowY: "auto" }}>
          <NewTaskForm
            contacts={contacts}
            onCancel={() => setAddingOpen(false)}
            onCreate={(draft) => { onCreateTask(draft); setAddingOpen(false); }}
          />
        </div>
      ) : (
        <div style={styles.boardColumns}>
          {STATUS_COLUMNS.map((col) => {
            const colTasks = byColumn[col.key] || [];
            return (
              <div key={col.key} style={styles.boardColumn}>
                <div style={styles.boardColumnHeader}>
                  <span style={styles.boardColumnTitle}>{col.label}</span>
                  <span style={styles.boardColumnCount}>{colTasks.length}</span>
                </div>
                <div style={styles.boardColumnBody}>
                  {colTasks.length === 0 && <div style={styles.boardEmptyCol}>Пусто</div>}
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      contact={contacts.find((c) => c.id === task.contactId)}
                      onMove={onUpdateTaskStatus}
                      onDelete={onDeleteTask}
                      onOpenContact={onOpenContact}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
