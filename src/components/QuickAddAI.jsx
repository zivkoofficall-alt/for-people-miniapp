import React, { useState, useRef, useEffect } from "react";
import { X, Wand2, Mic, Square, Sparkles, CalendarDays, Brain } from "lucide-react";
import { styles } from "../theme.js";
import { TASK_TYPES } from "../constants.js";
import { sanitizeAiText } from "../helpers.js";
import { ConfirmModal } from "./Ui.jsx";

const EXAMPLE = "Например: «Познакомился с Игорем на конференции. Он SEO-специалист, любит хайкинг, обещал скинуть чек-лист по аудиту к пятнице»";

// Подписи для полей психологического портрета (Фаза D) — те же ключи, что
// и в App.jsx/helpers.js emptyContact().psych, чтобы форма контакта потом
// показывала ровно то же самое.
const PSYCH_LABELS = {
  personality: "Тип личности / характер",
  values: "Ценности и мотивация",
  commStyle: "Как лучше общаться",
  triggers: "Триггеры / чувствительные темы",
  conflictStyle: "Поведение в конфликте",
  howMet: "Как познакомились",
};

export default function QuickAddAI({ categories, onClose, onCreate, remainingAi = Infinity, onUseAi, onOpenProfile }) {
  const [step, setStep] = useState("input"); // 'input' | 'review'
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState("");
  const [parsed, setParsed] = useState(null);
  const [voiceWarning, setVoiceWarning] = useState(""); // NEW — речь распознана нечётко/неполно (Фаза D)
  const [confirmUnclearOpen, setConfirmUnclearOpen] = useState(false); // NEW — подтверждение продолжить с невнятной речью
  const recognitionRef = useRef(null);
  const blocked = remainingAi <= 0;
  const [closing, setClosing] = useState(false);
  function handleClose() { setClosing(true); setTimeout(onClose, 180); }

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = "ru-RU";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const results = Array.from(e.results);
      const transcript = results.map((r) => r[0].transcript).join(" ").trim();
      // Confidence не всегда поддерживается движком распознавания (часть
      // браузеров всегда отдаёт 0/undefined) — учитываем её, только если
      // реально пришло осмысленное значение, иначе ориентируемся на длину
      // распознанного текста: 1-2 слова обычно значит, что микрофон не
      // расслышал большую часть фразы.
      const confidences = results.map((r) => r[0].confidence).filter((c) => typeof c === "number" && c > 0);
      const avgConfidence = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : null;
      const wordCount = transcript.split(/\s+/).filter(Boolean).length;
      const unclear = !!transcript && ((avgConfidence !== null && avgConfidence < 0.55) || wordCount < 3);
      setVoiceWarning(unclear ? "Речь распознана не полностью или нечётко. Проверьте и дополните текст ниже вручную, прежде чем нажать «Разобрать с AI»." : "");
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    rec.onerror = (e) => {
      setListening(false);
      if (e.error === "no-speech") {
        setVoiceWarning("Не расслышал речь — попробуйте ещё раз поближе к микрофону или напечатайте текст вручную.");
      }
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch (e) {} };
  }, []);

  function toggleListening() {
    if (!recognitionRef.current) return;
    if (listening) { recognitionRef.current.stop(); setListening(false); }
    else { setListening(true); try { recognitionRef.current.start(); } catch (e) { setListening(false); } }
  }

  function handleParseClick() {
    const q = text.trim();
    if (!q || parsing || blocked) return;
    if (voiceWarning) { setConfirmUnclearOpen(true); return; }
    doParse();
  }

  async function doParse() {
    const q = text.trim();
    if (!q || parsing || blocked) return;
    setParsing(true);
    setError("");
    try {
      const proxyUrl = import.meta.env.VITE_AI_PROXY_URL;
      if (!proxyUrl) {
        setError("AI-помощник пока не подключён. Заполните карточку вручную — так тоже быстро.");
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

Сначала проверь, вообще ли этот текст описывает знакомство с человеком (кто-то, с кем познакомились/встретились/договорились и т.п.) — а не что-то не по теме (рецепт, случайный набор слов, погода, техническая инструкция и т.д.). Если текст НЕ про знакомство с человеком — верни ТОЛЬКО {"valid": false, "reason": "короткое пояснение, почему это не похоже на описание знакомства"}, без остальных полей.

Если текст подходит, ответь СТРОГО в формате JSON без markdown и пояснений вне JSON:
{
  "valid": true,
  "firstName": "",
  "lastName": "",
  "category": "",
  "tags": ["...", "..."],
  "job": "",
  "interests": "",
  "helpWith": "",
  "comment": "краткая заметка о знакомстве своими словами (2-3 предложения)",
  "task": null или {"title": "...", "type": "follow_up|promise|intro", "dueDate": "YYYY-MM-DD или null"},
  "psych": null или {"personality": "", "values": "", "commStyle": "", "triggers": "", "conflictStyle": "", "howMet": ""}
}

Про поле "psych" (психологический портрет): заполняй его ТОЛЬКО если в тексте
реально достаточно материала — описание характера, поведения, ценностей,
манеры общения (обычно это несколько развёрнутых предложений, не пара слов
"познакомились в кафе"). Если фактов мало или они только о профессии/месте
знакомства — верни "psych": null, ничего не придумывая от себя. Каждое
заполненное подполе — 1 короткое предложение, строго на основе того, что
написал пользователь, без домыслов. Не заполняй подполе, если для него нет
опоры в тексте — оставь его пустой строкой.`;

      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, initData: window.Telegram?.WebApp?.initData || "" }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "proxy error");

      // Текст не про знакомство с человеком (например, рецепт или случайный
      // набор слов) — не пытаемся собрать из него контакт, а прямо
      // объясняем пользователю, что не так, и не переходим на шаг проверки.
      if (data.valid === false) {
        setError(sanitizeAiText(data.reason) || "Не похоже, что это описание знакомства с человеком. Опишите, кого вы встретили и что о нём/ней известно.");
        return;
      }

      const aiComment = sanitizeAiText(data.comment);
      const psychRaw = data.psych && typeof data.psych === "object" ? {
        personality: sanitizeAiText(data.psych.personality),
        values: sanitizeAiText(data.psych.values),
        commStyle: sanitizeAiText(data.psych.commStyle),
        triggers: sanitizeAiText(data.psych.triggers),
        conflictStyle: sanitizeAiText(data.psych.conflictStyle),
        howMet: sanitizeAiText(data.psych.howMet),
      } : null;
      // Портрет прикладываем, только если AI реально заполнил хотя бы одно
      // подполе — иначе это просто девять пустых строк и нечего показывать.
      const psych = psychRaw && Object.values(psychRaw).some(Boolean) ? psychRaw : null;
      setParsed({
        firstName: sanitizeAiText(data.firstName),
        lastName: sanitizeAiText(data.lastName),
        category: sanitizeAiText(data.category),
        tags: Array.isArray(data.tags) ? data.tags.map(sanitizeAiText).filter(Boolean) : [],
        job: sanitizeAiText(data.job),
        interests: sanitizeAiText(data.interests),
        helpWith: sanitizeAiText(data.helpWith),
        // Заметка — то, что реально можно редактировать в поле; если AI не
        // смог её сформулировать, поле остаётся пустым (пользователь сам
        // впишет короткую заметку), а не молча заполняется исходным
        // текстом целиком — длинный текст показывается отдельным,
        // нередактируемым блоком ниже (originalText), чтобы не смешивать
        // системные/исходные данные с полем пользовательского ввода.
        comment: aiComment,
        originalText: aiComment ? "" : q,
        psych,
        task: data.task && data.task.title ? {
          title: sanitizeAiText(data.task.title),
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
  function updatePsych(patch) { setParsed((p) => ({ ...p, psych: p.psych ? { ...p.psych, ...patch } : patch })); }

  function handleConfirm() {
    if (!parsed) return;
    const { originalText, ...rest } = parsed;
    const comment = rest.comment.trim() || originalText || "";
    onCreate({ ...rest, comment });
  }

  return (
    <div className={closing ? "fp-overlay-anim-out" : "fp-overlay-anim"} style={styles.overlay} onClick={handleClose}>
      <div className={closing ? "fp-sheet-anim-out" : "fp-sheet-anim"} style={styles.formSheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.sheetHandle} />
        <div style={styles.formHeader}>
          <div style={styles.formTitle}><Wand2 size={16} color="#7C4DFF" style={{ marginRight: 6, verticalAlign: -3 }} />Быстрое добавление</div>
          <button className="fp-btn" style={styles.closeBtn} onClick={handleClose}><X size={16} color="#0B0B10" /></button>
        </div>

        {step === "input" && (
          <div className="fp-step-anim">
            <div style={styles.sectionLabel}>Опишите знакомство своими словами</div>
            <textarea
              style={styles.quickAddTextarea}
              value={text}
              onChange={(e) => { setText(e.target.value); if (voiceWarning) setVoiceWarning(""); }}
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
            {voiceWarning && <div style={styles.voiceWarningBanner}>⚠️ {voiceWarning}</div>}
            <div style={styles.quickAddExample}>{EXAMPLE}</div>
            {blocked && (
              <div style={styles.aiBlockedCard}>
                <span style={styles.aiBlockedText}>Лимит бесплатных AI-запросов исчерпан на этот месяц.</span>
                {onOpenProfile && <button className="fp-btn" style={styles.primaryPill} onClick={onOpenProfile}>Открыть Личный кабинет</button>}
              </div>
            )}
            {error && <div style={styles.importError}>{error}</div>}
            <div style={{ ...styles.detailActions, marginTop: 18 }}>
              <button className="fp-btn" style={styles.secondaryPill} onClick={handleClose}>Отмена</button>
              <button className="fp-btn" style={styles.primaryPill} onClick={handleParseClick} disabled={parsing || !text.trim() || blocked}>
                {parsing ? "Разбираю…" : (<><Sparkles size={14} /> Разобрать с AI</>)}
              </button>
            </div>
            <ConfirmModal
              open={confirmUnclearOpen}
              title="Речь распозналась не полностью"
              hint="Похоже, часть сказанного не расслышана, или текст получился слишком коротким. Проверьте его выше — можно дописать вручную, прежде чем отправлять на разбор. Продолжить как есть?"
              confirmLabel="Продолжить как есть"
              cancelLabel="Проверю текст"
              onConfirm={() => { setConfirmUnclearOpen(false); setVoiceWarning(""); doParse(); }}
              onCancel={() => setConfirmUnclearOpen(false)}
            />
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
              <textarea
                style={{ ...styles.fieldInput, height: 62, resize: "none" }}
                value={parsed.comment}
                onChange={(e) => updateParsed({ comment: e.target.value })}
                placeholder="Коротко о знакомстве — своими словами"
              />
            </label>

            {parsed.originalText && (
              <div style={styles.originalTextCard}>
                <div style={styles.originalTextLabel}>AI не смог коротко сформулировать заметку — вот ваш исходный текст, скопируйте нужное вручную:</div>
                <div style={styles.originalTextBody}>{parsed.originalText}</div>
                <button
                  className="fp-btn"
                  style={styles.originalTextUseBtn}
                  onClick={() => updateParsed({ comment: parsed.originalText, originalText: "" })}
                >
                  Использовать как заметку
                </button>
              </div>
            )}

            {parsed.psych && (
              <>
                <div style={styles.sectionLabel}><Brain size={12} style={{ marginRight: 4, verticalAlign: -2 }} />Психологический портрет (по вашему описанию)</div>
                <div style={styles.taskPreviewCard}>
                  <div style={styles.taskPreviewLabel}>Текста было достаточно, чтобы AI собрал черновик портрета — проверьте и поправьте, остальное можно дописать позже в карточке контакта</div>
                  {Object.entries(PSYCH_LABELS).filter(([key]) => parsed.psych[key]).map(([key, label]) => (
                    <label key={key} style={styles.fieldWrap}>
                      <span style={styles.fieldLabel}>{label}</span>
                      <textarea style={{ ...styles.fieldInput, height: 42, resize: "none" }} value={parsed.psych[key]} onChange={(e) => updatePsych({ [key]: e.target.value })} />
                    </label>
                  ))}
                  <button className="fp-btn" style={styles.secondaryPill} onClick={() => setParsed({ ...parsed, psych: null })}>Не сохранять портрет</button>
                </div>
              </>
            )}

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
