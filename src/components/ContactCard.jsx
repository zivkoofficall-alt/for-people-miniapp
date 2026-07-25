import React from "react";
import { ArrowUpRight, Check } from "lucide-react";
import { styles } from "../theme.js";
import { initials, pad } from "../helpers.js";
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
function ContactCardBase({ contact, index, selectMode, isSelected, onClick }) {
  const c = contact;
  return (
    <button
      className="fp-card"
      style={{
        ...styles.card,
        animationDelay: `${Math.min(index * 30, 300)}ms`,
        contentVisibility: "auto",
        containIntrinsicSize: "0 210px",
      }}
      onClick={() => onClick(c.id)}
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
}

function areEqual(prev, next) {
  return (
    prev.contact === next.contact &&
    prev.index === next.index &&
    prev.selectMode === next.selectMode &&
    prev.isSelected === next.isSelected &&
    prev.onClick === next.onClick
  );
}

const ContactCard = React.memo(ContactCardBase, areEqual);
export default ContactCard;
