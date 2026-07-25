import React, { useState, useRef, useEffect } from "react";
import { X, Wand2, Mic, Square, Sparkles, CalendarDays } from "lucide-react";
import { styles } from "../theme.js";
import { TASK_TYPES } from "../constants.js";

const EXAMPLE = "Например: «Познакомился с Игорем на конференции. Он SEO-специалист, любит хайкинг, обещал скинуть чек-лист по аудиту к пятнице»";

// Считает ближайшую дату для дня недели вроде "пятница", отталкиваясь от
// сегодняшнего дня. Нужен клиенту, а не модели, чтобы не полагаться на то,
// что AI умеет безошибочно складывать календарь — тут проще и надёжнее
// посчитать самим и просто передать модели уже готовую дату в подсказке.
function nextWeekdayIso(fromDate, weekdayRu) {
  const map = { "воскресенье": 0, "понедельник": 1, "вторник": 2, "среда": 3, "четверг": 4, "пятница": 5, "суббота": 6 };
  const target = map[weekdayRu.toLowerCase()];
  if (target === undefined) return null;
  const d = new Date(fromDate);
  const diff = (target - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function QuickAddAI({ categories, onClose, onCreate, remainingAi = Infinity, onUseAi, onOpenProfile }) {
  const [step, setStep] = useState("input"); // 'input' | 'review'
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState(null);
  const recognitionRef = useRef(null);
  const blocked = remainingAi <= 0;

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = "ru-RU";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch (e) {} };
  }, []);

  function toggleListening() {
    if (!recognitionRef.current) return;
    if (listening) { recognitionRef.current.stop(); setListening(false); }
    else { setListening(true); try { recognitionRef.current.start(); } catch (e) { setListening(false); } }
  }

  async function handleParse() {
    const q = text.trim();
    if (!q || parsing || blocked) return;
    setParsing(true);
    setError("");
    try {
      const proxyUrl = import.meta.env.VITE_AI_PROXY_URL;
      if (!proxyUrl) {
        setError("AI-помощник ещё не подключён: не задан VITE_AI_PROXY_URL в .env. Смотри README.");
        return;
      }
      const today = new Date();
      const todayIso = today.toISOString().slice(0, 10);
      const weekday = today.toLocaleDateString("ru-RU", { weekday: "long" });
      const existingCategories = (categories || []).join(", ");
      const prompt = `Ты помощник для быстрого добавления контакта в личную CRM "for people". Пользователь описал новое знакомство свободным текстом. Разбери его на структурированные данные.

Сегодня: ${todayIso} (${weekday}). Если в тексте есть срок вроде "к пятнице" — вычисли ближайшую дату этого дня недели от сегодня и подставь в формате YYYY-MM-DD.
Уже существующие категории пользователя: ${existingCategories || "нет"}. Используй одну из них, если подходит, иначе предложи новую короткую.

Текст пользователя: "${q}"

Ответь СТРОГО в формате JSON без markdown и пояснений вне JSON:
{
  "firstName": "",
  "lastName": "",
  "category": "",
  "tags": ["...", "..."],
  "job": "",
  "interests": "",
  "helpWith": "",
  "comment": "краткая заметка о знакомстве своими словами (2-3 предложения)",
  "task": null или {"title": "...", "type": "follow_up|promise|intro", "dueDate": "YYYY-MM-DD или null"}
}`;

      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "proxy error");

      setParsed({
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        category: data.category || "",
        tags: Array.isArray(data.tags) ? data.tags : [],
        job: data.job || "",
        interests: data.interests || "",
        helpWith: data.helpWith || "",
        comment: data.comment || q,
        task: data.task && data.task.title ? {
          title: data.task.title,
          type: TASK_TYPES.some((t) => t.key === data.task.type) ? data.task.type : "follow_up",
          dueDate: data.task.dueDate || null,
        } : null,
      });
      setStep("review");
      if (onUseAi) onUseAi();
    } catch (e) {
      setError("Не получилось разобрать текст. Попробуйте переформулировать или заполните карточку вручную.");
    } finally {
      setParsing(false);
    }
  }

  function updateParsed(patch) { setParsed((p) => ({ ...p, ...patch })); }
  function updateTask(patch) { setParsed((p) => ({ ...p, task: p.task ? { ...p.task, ...patch } : patch })); }

  function handleConfirm() {
    if (!parsed) return;
    onCreate(parsed);
  }

  return (
    <div className="fp-overlay-anim" style={styles.overlay} onClick={onClose}>
      <div className="fp-sheet-anim" style={styles.formSheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.sheetHandle} />
        <div style={styles.formHeader}>
          <div style={styles.formTitle}><Wand2 size={16} color="#7C4DFF" style={{ marginRight: 6, verticalAlign: -3 }} />Быстрое добавление</div>
          <button className="fp-btn" style={styles.closeBtn} onClick={onClose}><X size={16} color="#0B0B10" /></button>
        </div>

        {step === "input" && (
          <div className="fp-step-anim">
            <div style={styles.sectionLabel}>Опишите знакомство своими словами</div>
            <textarea
              style={styles.quickAddTextarea}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Печатайте или наговорите голосом…"
            />
            <div style={styles.micRow}>
              {speechSupported ? (
                <button
                  className="fp-btn"
                  style={{ ...styles.micBtn, ...(listening ? styles.micBtnActive : {}) }}
                  onClick={toggleListening}
                  aria-label={listening ? "Остановить запись" : "Начать голосовой ввод"}
                >
                  {listening ? <Square size={16} color="#fff" /> : <Mic size={18} color="#7C4DFF" />}
                </button>
              ) : (
                <div style={styles.micHint}>Голосовой ввод недоступен в этом браузере — используйте текст.</div>
              )}
              {speechSupported && (
                <div style={styles.micHint}>{listening ? "Слушаю… нажмите ещё раз, чтобы остановить" : "Нажмите на микрофон и говорите"}</div>
              )}
            </div>
            <div style={styles.quickAddExample}>{EXAMPLE}</div>
            {blocked && (
              <div style={styles.aiBlockedCard}>
                <span style={styles.aiBlockedText}>Лимит бесплатных AI-запросов исчерпан на этот месяц.</span>
                {onOpenProfile && <button className="fp-btn" style={styles.primaryPill} onClick={onOpenProfile}>Открыть Личный кабинет</button>}
              </div>
            )}
            {error && <div style={styles.importError}>{error}</div>}
            <div style={{ ...styles.detailActions, marginTop: 18 }}>
              <button className="fp-btn" style={styles.secondaryPill} onClick={onClose}>Отмена</button>
              <button className="fp-btn" style={styles.primaryPill} onClick={handleParse} disabled={parsing || !text.trim() || blocked}>
                {parsing ? "Разбираю…" : (<><Sparkles size={14} /> Разобрать с AI</>)}
              </button>
            </div>
          </div>
        )}

        {step === "review" && parsed && (
          <div className="fp-step-anim">
            <div style={styles.sectionLabel}>Проверьте — можно поправить перед сохранением</div>
            <div style={styles.formGrid}>
              <label style={styles.fieldWrap}>
                <span style={styles.fieldLabel}>Имя</span>
                <input style={styles.fieldInput} value={parsed.firstName} onChange={(e) => updateParsed({ firstName: e.target.value })} />
              </label>
              <label style={styles.fieldWrap}>
                <span style={styles.fieldLabel}>Фамилия</span>
                <input style={styles.fieldInput} value={parsed.lastName} onChange={(e) => updateParsed({ lastName: e.target.value })} />
              </label>
              <label style={styles.fieldWrap}>
                <span style={styles.fieldLabel}>Категория</span>
                <input style={styles.fieldInput} value={parsed.category} onChange={(e) => updateParsed({ category: e.target.value })} />
              </label>
              <label style={styles.fieldWrap}>
                <span style={styles.fieldLabel}>Профессия</span>
                <input style={styles.fieldInput} value={parsed.job} onChange={(e) => updateParsed({ job: e.target.value })} />
              </label>
            </div>

            <div style={styles.sectionLabel}>Теги</div>
            <div style={styles.chipWrap}>
              {parsed.tags.map((t, i) => (
                <button key={i} className="fp-btn" style={styles.pickChip} onClick={() => updateParsed({ tags: parsed.tags.filter((_, idx) => idx !== i) })}>
                  #{t} ✕
                </button>
              ))}
            </div>

            <label style={styles.fieldWrap}>
              <span style={styles.fieldLabel}>Интересы</span>
              <textarea style={{ ...styles.fieldInput, height: 50, resize: "none" }} value={parsed.interests} onChange={(e) => updateParsed({ interests: e.target.value })} />
            </label>
            <label style={styles.fieldWrap}>
              <span style={styles.fieldLabel}>Чем может помочь</span>
              <textarea style={{ ...styles.fieldInput, height: 50, resize: "none" }} value={parsed.helpWith} onChange={(e) => updateParsed({ helpWith: e.target.value })} />
            </label>
            <label style={styles.fieldWrap}>
              <span style={styles.fieldLabel}>Заметка</span>
              <textarea style={{ ...styles.fieldInput, height: 62, resize: "none" }} value={parsed.comment} onChange={(e) => updateParsed({ comment: e.target.value })} />
            </label>

            {parsed.task && (
              <>
                <div style={styles.sectionLabel}>Автоматическая задача</div>
                <div style={styles.taskPreviewCard}>
                  <div style={styles.taskPreviewLabel}>AI нашёл обещание/договорённость в тексте</div>
                  <input style={styles.fieldInput} value={parsed.task.title} onChange={(e) => updateTask({ title: e.target.value })} />
                  <div style={styles.chipWrap}>
                    {TASK_TYPES.map((t) => (
                      <button key={t.key} className="fp-btn" style={{ ...styles.pickChipSmall, ...(parsed.task.type === t.key ? styles.pickChipActive : {}) }} onClick={() => updateTask({ type: t.key })}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <label style={styles.fieldWrap}>
                    <span style={styles.fieldLabel}><CalendarDays size={11} style={{ marginRight: 4, verticalAlign: -2 }} />Срок</span>
                    <input type="date" style={styles.fieldInput} value={parsed.task.dueDate || ""} onChange={(e) => updateTask({ dueDate: e.target.value })} />
                  </label>
                  <button className="fp-btn" style={styles.secondaryPill} onClick={() => setParsed({ ...parsed, task: null })}>Не создавать задачу</button>
                </div>
              </>
            )}

            <div style={{ ...styles.detailActions, marginTop: 18 }}>
              <button className="fp-btn" style={styles.secondaryPill} onClick={() => setStep("input")}>Назад</button>
              <button className="fp-btn" style={styles.primaryPill} onClick={handleConfirm}>Сохранить</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
