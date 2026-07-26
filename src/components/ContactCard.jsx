import React from "react";
import { ArrowUpRight, Check, Clock, Phone, Send } from "lucide-react";
import { styles } from "../theme.js";
import { initials, pad, buildContactLink } from "../helpers.js";
import { MESSENGERS } from "../constants.js";

// ContactCard — вынесен и обёрнут в React.memo, чтобы при массовых операциях
// (bulk-редактирование, выделение) перерисовывались только реально
// изменившиеся карточки, а не весь список.
//
// contentVisibility: "auto" — лёгкая замена полноценной виртуализации
// (react-window). Браузер сам пропускает layout/paint для карточек,
// которые сейчас не видны на экране. Для CSS grid с переносом строк это
// работает надёжнее, чем классические "windowing"-библиотеки, которые
// рассчитаны на списки с фиксированной высотой строки.
//
// Корневой элемент — div с role="button", а не <button>: внутри есть свои
// кнопки ("Были на связи", "Написать"), а вложенный <button> внутри <button>
// невалиден в HTML и ломает клики/доступность.
function ContactCardBase({ contact, index, selectMode, isSelected, onClick, onMarkContacted }) {
  const c = contact;
  const link = buildContactLink(c);

  function handleRootClick() {
    onClick(c.id);
  }
  function handleRootKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick(c.id);
    }
  }
  function handleMarkContacted(e) {
    e.stopPropagation();
    onMarkContacted(c.id);
  }
  function handleWriteClick(e) {
    e.stopPropagation();
  }

  return (
    <div
      className="fp-card"
      role="button"
      tabIndex={0}
      style={{
        ...styles.card,
        animationDelay: `${Math.min(index * 30, 300)}ms`,
        contentVisibility: "auto",
        containIntrinsicSize: "0 210px",
      }}
      onClick={handleRootClick}
      onKeyDown={handleRootKeyDown}
    >
      {selectMode && (
        <div style={{ ...styles.selectCheck, ...(isSelected ? styles.selectCheckActive : {}) }}>
          {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
        </div>
      )}
      <div style={styles.cardTopRow}>
        <span style={styles.cardIndex}>{pad(index + 1)}</span>
        {!selectMode && <ArrowUpRight size={15} color="rgba(11,11,16,0.3)" strokeWidth={2.25} />}
      </div>
      <div style={styles.avatarBubble}>{c.avatar ? <img src={c.avatar} alt="" style={styles.avatarImg} /> : initials(c)}</div>
      <div style={styles.cardName}>{c.firstName} {c.lastName}</div>
      {c.job && <div style={styles.cardJob}>{c.job}</div>}
      {c.category && <div style={styles.cardCategory}>{c.category}</div>}
      <div style={styles.cardBadgeRow}>
        {MESSENGERS.filter((m) => c.messengers?.[m.key]?.enabled).map((m) => (
          <span key={m.key} style={{ ...styles.msgBadge, background: `${m.color}18`, color: m.color }}>{m.short}</span>
        ))}
      </div>
      {c.tags && c.tags.length > 0 && (
        <div style={styles.cardBadgeRow}>{c.tags.slice(0, 3).map((t) => <span key={t} style={styles.tagBadge}>#{t}</span>)}</div>
      )}

      {!selectMode && (
        <div style={styles.cardActionsRow}>
          <button
            className="fp-btn"
            style={styles.cardActionGhost}
            onClick={handleMarkContacted}
            aria-label="Были на связи"
            title="Отметить, что были на связи сегодня"
          >
            <Clock size={13} />
          </button>
          {link ? (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="fp-btn"
              style={styles.cardActionPrimary}
              onClick={handleWriteClick}
            >
              {link.label === "Позвонить" ? <Phone size={12} /> : <Send size={12} />} {link.label === "Позвонить" ? "Позвонить" : "Написать"}
            </a>
          ) : (
            <span style={styles.cardActionDisabled}>Нет контактов</span>
          )}
        </div>
      )}
    </div>
  );
}

function areEqual(prev, next) {
  return (
    prev.contact === next.contact &&
    prev.index === next.index &&
    prev.selectMode === next.selectMode &&
    prev.isSelected === next.isSelected &&
    prev.onClick === next.onClick &&
    prev.onMarkContacted === next.onMarkContacted
  );
}

const ContactCard = React.memo(ContactCardBase, areEqual);
export default ContactCard;
