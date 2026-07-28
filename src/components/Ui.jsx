import React, { useState } from "react";
import { Plus } from "lucide-react";
import { styles } from "../theme.js";
import { formatRuPhone } from "../helpers.js";

function PsychRow({ label, value }) {
  return (<div style={styles.psychRow}><div style={styles.psychLabel}>{label}</div><div style={styles.psychValue}>{value}</div></div>);
}

function Field({ label, value, onChange, placeholder, textarea, compact, phoneMask }) {
  const handleChange = (v) => {
    onChange(phoneMask ? formatRuPhone(v) : v);
  };
  // Вставка номера (Ctrl+V / контекстное меню "Вставить") в некоторых
  // WebView (в т.ч. внутри Telegram) может доходить до onChange частями
  // или с задержкой — из-за этого маска иногда съедала весь вставленный
  // номер до одной цифры. Явный onPaste с preventDefault читает буфer
  // обмена напрямую и целиком прогоняет его через ту же formatRuPhone —
  // никакой гонки с событиями браузера.
  const handlePaste = (e) => {
    if (!phoneMask) return;
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData("text");
    handleChange(pasted);
  };
  return (
    <label style={{ ...styles.fieldWrap, flex: compact ? 1 : undefined, minWidth: 0 }}>
      {label && <span style={styles.fieldLabel}>{label}</span>}
      {textarea ? (
        <textarea style={{ ...styles.fieldInput, height: 62, resize: "none", fontFamily: "inherit", minWidth: 0 }} value={value} onChange={(e) => handleChange(e.target.value)} placeholder={placeholder} />
      ) : (
        <input
          style={{ ...styles.fieldInput, minWidth: 0 }}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder}
          inputMode={phoneMask ? "tel" : undefined}
          type={phoneMask ? "tel" : "text"}
        />
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


// Единое модальное окно подтверждения — по образцу того, что уже
// использовалось в App.jsx для удаления контакта. Используется везде, где
// нужно защитить от случайного тапа: удаление задачи, удаление типа задачи,
// отметка задачи выполненной.
//
// closing — локальное состояние: по тапу на "Отмена"/фон не размонтируем
// сразу, а сперва проигрываем анимацию исчезновения (fp-*-anim-out) и только
// потом зовём настоящий onCancel/onConfirm — раньше окно пропадало рывком.
function ConfirmModal({ open, title, hint, confirmLabel = "Подтвердить", cancelLabel = "Отмена", danger, onConfirm, onCancel }) {
  const [closing, setClosing] = useState(false);

  if (!open && !closing) return null;

  function closeThen(action) {
    setClosing(true);
    setTimeout(() => { setClosing(false); action(); }, 180);
  }

  return (
    <div className={closing ? "fp-overlay-anim-out" : "fp-overlay-anim"} style={styles.overlay} onClick={() => closeThen(onCancel)}>
      <div className={closing ? "fp-sheet-anim-out" : "fp-sheet-anim"} style={styles.confirmSheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.confirmTitle}>{title}</div>
        {hint && <div style={styles.confirmHint}>{hint}</div>}
        <div style={styles.detailActions}>
          <button className="fp-btn" style={styles.secondaryPill} onClick={() => closeThen(onCancel)}>{cancelLabel}</button>
          <button className="fp-btn" style={danger ? styles.dangerPill : styles.primaryPill} onClick={() => closeThen(onConfirm)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// Полноэкранный экран загрузки (Фаза B, задача 1). Показывается, пока
// App.jsx ещё не дочитал данные из storage (loaded === false) — блокирует
// любое взаимодействие с интерфейсом под собой (position:fixed на весь
// экран, touchAction:none в styles.splashScreen), чтобы нельзя было тапнуть
// по ещё не готовым данным. closing=true запускает плавное исчезновение
// (fp-splash-out) перед тем, как App.jsx уберёт компонент из дерева.
function SplashScreen({ closing }) {
  return (
    <div className={closing ? "fp-splash-out" : undefined} style={styles.splashScreen}>
      <div className="fp-pulse" style={styles.splashLogoWrap}>
        <img src="/logo-mark.png" alt="" aria-hidden style={styles.splashLogo} />
      </div>
      <div style={styles.splashText}>Загрузка…</div>
    </div>
  );
}

export { PsychRow, Field, InlineAdd, ConfirmModal, SplashScreen };
