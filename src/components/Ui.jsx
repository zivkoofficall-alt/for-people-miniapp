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


export { PsychRow, Field, InlineAdd };
