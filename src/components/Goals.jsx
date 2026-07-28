import React, { useState } from "react";
import { X, Target, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { styles } from "../theme.js";
import { computeGoalProgress } from "../helpers.js";
import { Field } from "./Ui.jsx";

function GoalCard({ goal, contacts, onToggleQualDone, onDelete, onEdit }) {
  const progress = computeGoalProgress(goal, contacts);
  function handleDeleteClick(e) {
    e.stopPropagation();
    onDelete(goal.id);
  }
  function handleToggleClick(e) {
    e.stopPropagation();
    onToggleQualDone(goal.id);
  }
  return (
    <div className="fp-btn" style={styles.goalCard} onClick={() => onEdit(goal)} role="button" tabIndex={0}>
      <div style={styles.goalCardTop}>
        <div style={styles.goalTitle}>{goal.title}</div>
        <button className="fp-btn" style={styles.goalDeleteBtn} onClick={handleDeleteClick} aria-label="Удалить цель">
          <Trash2 size={14} />
        </button>
      </div>

      {goal.type === "qualitative" ? (
        <>
          <div style={styles.goalMeta}>Качественная цель</div>
          <button
            className="fp-btn"
            style={{ ...styles.goalQualToggle, ...(progress.isDone ? styles.goalQualToggleDone : {}) }}
            onClick={handleToggleClick}
          >
            {progress.isDone ? <CheckCircle2 size={18} color="#22A37A" /> : <Circle size={18} color="rgba(11,11,16,0.3)" />}
            <span style={{ fontSize: 12.5, fontWeight: 600, color: progress.isDone ? "#22A37A" : "rgba(11,11,16,0.5)" }}>
              {progress.isDone ? "Выполнено" : "Отметить как выполненную"}
            </span>
          </button>
        </>
      ) : (
        <>
          <div style={styles.goalMeta}>
            {goal.targetCategory ? `Категория: ${goal.targetCategory}` : goal.targetTag ? `Тег: #${goal.targetTag}` : "Ручной счётчик"}
          </div>
          <div style={{ ...styles.goalProgressTrack, width: "100%", boxSizing: "border-box" }}>
            <div style={{ ...styles.goalProgressFill, width: `${progress.pct}%` }} />
          </div>
          <div style={styles.goalProgressLabel}>
            <span>{progress.displayText}</span>
            <span style={{ minWidth: 34, textAlign: "right" }}>{progress.pct}%</span>
          </div>
        </>
      )}
      <div style={styles.goalEditHint}>Нажмите, чтобы изменить</div>
    </div>
  );
}

function NewGoalForm({ categories, tags, initialGoal, onCancel, onCreate, onSave }) {
  const isEdit = !!initialGoal;
  const [type, setType] = useState(initialGoal?.type || "quantitative");
  const [title, setTitle] = useState(initialGoal?.title || "");
  const [basis, setBasis] = useState(initialGoal?.targetCategory ? "category" : initialGoal?.targetTag ? "tag" : "manual");
  const [targetCategory, setTargetCategory] = useState(initialGoal?.targetCategory || "");
  const [targetTag, setTargetTag] = useState(initialGoal?.targetTag || "");
  const [targetCount, setTargetCount] = useState(String(initialGoal?.targetCount || "10"));

  function handleSave() {
    if (!title.trim()) return;
    const draft = { type, title: title.trim() };
    if (type === "quantitative") {
      draft.targetCount = parseInt(targetCount, 10) || 1;
      draft.targetCategory = basis === "category" ? (targetCategory || null) : null;
      draft.targetTag = basis === "tag" ? (targetTag || null) : null;
    }
    if (isEdit) onSave(initialGoal.id, draft);
    else onCreate(draft);
  }

  const targetHint = basis === "category"
    ? (targetCategory ? `Цель считается выполненной, когда в категории «${targetCategory}» будет столько контактов.` : "Сначала выберите категорию ниже.")
    : basis === "tag"
      ? (targetTag ? `Цель считается выполненной, когда наберётся столько контактов с тегом #${targetTag}.` : "Сначала выберите тег ниже.")
      : "Считайте сами: каждый раз, когда продвинулись к цели, увеличивайте число вручную.";

  return (
    <div className="fp-step-anim" style={{ marginBottom: 16 }}>
      <div style={styles.sectionLabel}>Как отслеживать цель</div>
      <div style={styles.chipWrap}>
        <button className="fp-btn" style={{ ...styles.pickChip, ...(type === "quantitative" ? styles.pickChipActive : {}) }} onClick={() => setType("quantitative")}>Считать числом</button>
        <button className="fp-btn" style={{ ...styles.pickChip, ...(type === "qualitative" ? styles.pickChipActive : {}) }} onClick={() => setType("qualitative")}>Просто отметить</button>
      </div>
      <div style={styles.formHelperText}>
        {type === "quantitative"
          ? "Прогресс считается сам — например, «завести 10 новых контактов в дизайне»."
          : "Без чисел — просто отметьте цель выполненной, когда сделаете. Подходит для целей вроде «наладить контакт с ключевым партнёром»."}
      </div>

      <Field
        label="Название цели"
        value={title}
        onChange={setTitle}
        placeholder={type === "quantitative" ? "Расширить сеть в сфере ИИ" : "Поддерживать контакт с VIP-партнёрами"}
      />

      {type === "quantitative" && (
        <>
          <div style={styles.sectionLabel}>К какому контакту или категории относится цель?</div>
          <div style={styles.chipWrap}>
            <button className="fp-btn" style={{ ...styles.pickChip, ...(basis === "category" ? styles.pickChipActive : {}) }} onClick={() => setBasis("category")}>По категории</button>
            <button className="fp-btn" style={{ ...styles.pickChip, ...(basis === "tag" ? styles.pickChipActive : {}) }} onClick={() => setBasis("tag")}>По тегу</button>
            <button className="fp-btn" style={{ ...styles.pickChip, ...(basis === "manual" ? styles.pickChipActive : {}) }} onClick={() => setBasis("manual")}>Считаю сам(а)</button>
          </div>
          <div style={styles.formHelperText}>
            {basis === "category" && "Прогресс = сколько контактов сейчас в выбранной категории."}
            {basis === "tag" && "Прогресс = сколько контактов сейчас с выбранным тегом."}
            {basis === "manual" && "Никакой автоматики — число двигаете сами, когда прогресс есть."}
          </div>

          {basis === "category" && (
            <div style={styles.chipWrap}>
              {categories.map((c) => (
                <button key={c} className="fp-btn" style={{ ...styles.pickChip, ...(targetCategory === c ? styles.pickChipActive : {}) }} onClick={() => setTargetCategory(c)}>{c}</button>
              ))}
            </div>
          )}
          {basis === "tag" && (
            <div style={styles.chipWrap}>
              {tags.length === 0 && <span style={styles.emptyHintSmall}>Тегов пока нет</span>}
              {tags.map((t) => (
                <button key={t} className="fp-btn" style={{ ...styles.pickChip, ...(targetTag === t ? styles.pickChipActive : {}) }} onClick={() => setTargetTag(t)}>#{t}</button>
              ))}
            </div>
          )}

          <Field label="Целевое число" value={targetCount} onChange={setTargetCount} placeholder="10" />
          <div style={{ ...styles.formHelperText, marginTop: -6 }}>{targetHint}</div>
        </>
      )}

      <div style={{ ...styles.detailActions, marginTop: 16 }}>
        <button className="fp-btn" style={styles.secondaryPill} onClick={onCancel}>Отмена</button>
        <button className="fp-btn" style={styles.primaryPill} onClick={handleSave} disabled={!title.trim()}>{isEdit ? "Сохранить" : "Создать"}</button>
      </div>
    </div>
  );
}

export default function Goals({ goals, contacts, categories, tags, onClose, onCreateGoal, onUpdateGoal, onToggleQualDone, onDeleteGoal }) {
  const [addingOpen, setAddingOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [closing, setClosing] = useState(false);
  function handleClose() { setClosing(true); setTimeout(onClose, 180); }

  const formOpen = addingOpen || !!editingGoal;

  function closeForm() {
    setAddingOpen(false);
    setEditingGoal(null);
  }

  return (
    <div className={closing ? "fp-overlay-anim-out" : "fp-overlay-anim"} style={styles.overlay} onClick={handleClose}>
      <div className={closing ? "fp-sheet-anim-out" : "fp-sheet-anim"} style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.sheetHandle} />
        <button className="fp-btn" style={styles.closeBtn} onClick={handleClose}><X size={16} color="#0B0B10" /></button>

        <div style={styles.formTitle}><Target size={17} color="#7C4DFF" style={{ marginRight: 6, verticalAlign: -3 }} />Цели</div>

        {formOpen ? (
          <NewGoalForm
            categories={categories}
            tags={tags}
            initialGoal={editingGoal}
            onCancel={closeForm}
            onCreate={(draft) => { onCreateGoal(draft); closeForm(); }}
            onSave={(id, draft) => { onUpdateGoal(id, draft); closeForm(); }}
          />
        ) : (
          <>
            <div style={{ ...styles.formHelperText, marginTop: 2 }}>Цель помогает отслеживать прогресс в развитии вашей сети контактов — по числу или просто как задачу «сделал/не сделал».</div>
            <button className="fp-btn" style={{ ...styles.circlePillBtn, marginTop: 10 }} onClick={() => setAddingOpen(true)}>
              Новая цель
              <span style={styles.exploreBtnCircle}><Plus size={13} color="#0B0B10" strokeWidth={2.5} /></span>
            </button>

            {goals.length === 0 ? (
              <div style={{ ...styles.emptyHint, marginTop: 16 }}>Пока нет целей — добавьте первую, чтобы отслеживать прогресс по сети контактов.</div>
            ) : (
              <div style={{ ...styles.goalsGrid, marginTop: 16 }}>
                {goals.map((g) => (
                  <div key={g.id} style={goals.length === 1 ? { gridColumn: "1 / -1" } : undefined}>
                    <GoalCard goal={g} contacts={contacts} onToggleQualDone={onToggleQualDone} onDelete={onDeleteGoal} onEdit={setEditingGoal} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
