import React, { useState } from "react";
import { X, Target, Plus, Trash2, CheckCircle2, Circle } from "lucide-react";
import { styles } from "../theme.js";
import { emptyGoal, computeGoalProgress } from "../helpers.js";
import { Field } from "./Ui.jsx";

function GoalCard({ goal, contacts, onToggleQualDone, onDelete }) {
  const progress = computeGoalProgress(goal, contacts);
  return (
    <div style={styles.goalCard}>
      <div style={styles.goalCardTop}>
        <div style={styles.goalTitle}>{goal.title}</div>
        <button className="fp-btn" style={styles.goalDeleteBtn} onClick={() => onDelete(goal.id)} aria-label="Удалить цель">
          <Trash2 size={14} />
        </button>
      </div>

      {goal.type === "qualitative" ? (
        <>
          <div style={styles.goalMeta}>Качественная цель</div>
          <button className="fp-btn" style={styles.goalQualToggle} onClick={() => onToggleQualDone(goal.id)}>
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
          <div style={styles.goalProgressTrack}>
            <div style={{ ...styles.goalProgressFill, width: `${progress.pct}%` }} />
          </div>
          <div style={styles.goalProgressLabel}>
            <span>{progress.displayText}</span>
            <span>{progress.pct}%</span>
          </div>
        </>
      )}
    </div>
  );
}

function NewGoalForm({ categories, tags, onCancel, onCreate }) {
  const [type, setType] = useState("quantitative");
  const [title, setTitle] = useState("");
  const [basis, setBasis] = useState("manual"); // 'category' | 'tag' | 'manual'
  const [targetCategory, setTargetCategory] = useState("");
  const [targetTag, setTargetTag] = useState("");
  const [targetCount, setTargetCount] = useState("10");

  function handleSave() {
    if (!title.trim()) return;
    const draft = { type, title: title.trim() };
    if (type === "quantitative") {
      draft.targetCount = parseInt(targetCount, 10) || 1;
      if (basis === "category") draft.targetCategory = targetCategory || null;
      else if (basis === "tag") draft.targetTag = targetTag || null;
    }
    onCreate(draft);
  }

  return (
    <div className="fp-step-anim" style={{ marginBottom: 16 }}>
      <div style={styles.sectionLabel}>Тип цели</div>
      <div style={styles.chipWrap}>
        <button className="fp-btn" style={{ ...styles.pickChip, ...(type === "quantitative" ? styles.pickChipActive : {}) }} onClick={() => setType("quantitative")}>Количественная</button>
        <button className="fp-btn" style={{ ...styles.pickChip, ...(type === "qualitative" ? styles.pickChipActive : {}) }} onClick={() => setType("qualitative")}>Качественная</button>
      </div>

      <Field
        label="Формулировка"
        value={title}
        onChange={setTitle}
        placeholder={type === "quantitative" ? "Расширить сеть в сфере ИИ" : "Поддерживать контакт с VIP-партнёрами"}
      />

      {type === "quantitative" && (
        <>
          <div style={styles.sectionLabel}>Считать по</div>
          <div style={styles.chipWrap}>
            <button className="fp-btn" style={{ ...styles.pickChip, ...(basis === "category" ? styles.pickChipActive : {}) }} onClick={() => setBasis("category")}>Категории</button>
            <button className="fp-btn" style={{ ...styles.pickChip, ...(basis === "tag" ? styles.pickChipActive : {}) }} onClick={() => setBasis("tag")}>Тегу</button>
            <button className="fp-btn" style={{ ...styles.pickChip, ...(basis === "manual" ? styles.pickChipActive : {}) }} onClick={() => setBasis("manual")}>Вручную</button>
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

          <Field label="Цель (число)" value={targetCount} onChange={setTargetCount} placeholder="10" />
        </>
      )}

      <div style={{ ...styles.detailActions, marginTop: 16 }}>
        <button className="fp-btn" style={styles.secondaryPill} onClick={onCancel}>Отмена</button>
        <button className="fp-btn" style={styles.primaryPill} onClick={handleSave} disabled={!title.trim()}>Создать</button>
      </div>
    </div>
  );
}

export default function Goals({ goals, contacts, categories, tags, onClose, onCreateGoal, onToggleQualDone, onDeleteGoal }) {
  const [addingOpen, setAddingOpen] = useState(false);

  return (
    <div className="fp-overlay-anim" style={styles.overlay} onClick={onClose}>
      <div className="fp-sheet-anim" style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.sheetHandle} />
        <button className="fp-btn" style={styles.closeBtn} onClick={onClose}><X size={16} color="#0B0B10" /></button>

        <div style={styles.formTitle}><Target size={17} color="#7C4DFF" style={{ marginRight: 6, verticalAlign: -3 }} />Цели</div>

        {addingOpen ? (
          <NewGoalForm
            categories={categories}
            tags={tags}
            onCancel={() => setAddingOpen(false)}
            onCreate={(draft) => { onCreateGoal(draft); setAddingOpen(false); }}
          />
        ) : (
          <>
            <button className="fp-btn" style={{ ...styles.exploreBtn, marginTop: 14 }} onClick={() => setAddingOpen(true)}>
              Новая цель
              <span style={styles.exploreBtnCircle}><Plus size={13} color="#0B0B10" strokeWidth={2.5} /></span>
            </button>

            {goals.length === 0 ? (
              <div style={{ ...styles.emptyHint, marginTop: 16 }}>Пока нет целей — добавьте первую, чтобы отслеживать прогресс по сети контактов.</div>
            ) : (
              <div style={{ marginTop: 16 }}>
                {goals.map((g) => (
                  <GoalCard key={g.id} goal={g} contacts={contacts} onToggleQualDone={onToggleQualDone} onDelete={onDeleteGoal} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
