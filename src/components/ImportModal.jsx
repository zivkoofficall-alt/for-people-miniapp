import React, { useState, useRef } from "react";
import { X, Upload } from "lucide-react";
import { styles } from "../theme.js";
import { contactsFromGoogleCsv } from "../helpers.js";

// ImportModal — вынесен в отдельный чанк и грузится через React.lazy() из App.jsx.
// Он открывается редко, поэтому нет смысла тащить его код в основной bundle
// при первой загрузке приложения.
export default function ImportModal({ onClose, onImport }) {
  const [importPreview, setImportPreview] = useState(null);
  const [importError, setImportError] = useState("");
  const [closing, setClosing] = useState(false);
  const fileInputRef = useRef(null);
  function handleClose() { setClosing(true); setTimeout(onClose, 180); }

  function handleFilePicked(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImportError("");
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = contactsFromGoogleCsv(String(reader.result));
        if (parsed.length === 0) {
          setImportError("Не удалось найти контакты в файле. Убедитесь, что это экспорт в формате Google CSV.");
          setImportPreview(null);
        } else setImportPreview(parsed);
      } catch (err) {
        setImportError("Не получилось прочитать файл.");
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  }

  async function confirmImport() {
    if (!importPreview || importPreview.length === 0) return;
    await onImport(importPreview);
  }

  return (
    <div className={closing ? "fp-overlay-anim-out" : "fp-overlay-anim"} style={styles.overlay} onClick={handleClose}>
      <div className={closing ? "fp-sheet-anim-out" : "fp-sheet-anim"} style={styles.formSheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.sheetHandle} />
        <div style={styles.formHeader}>
          <div style={styles.formTitle}>Импорт из Google</div>
          <button className="fp-btn" style={styles.closeBtn} onClick={handleClose}><X size={16} color="#0B0B10" /></button>
        </div>
        <div style={styles.importHint}>Прямой вход в Google-аккаунт здесь недоступен. Экспортируйте контакты (Google Контакты → Экспорт → формат Google CSV) и загрузите файл ниже.</div>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFilePicked} style={{ display: "none" }} />
        <button className="fp-btn" style={styles.uploadZone} onClick={() => fileInputRef.current && fileInputRef.current.click()}>
          <Upload size={20} color="#7C4DFF" /><span>Выбрать CSV-файл</span>
        </button>
        {importError && <div style={styles.importError}>{importError}</div>}
        {importPreview && (
          <>
            <div style={styles.importFound}>Найдено контактов: {importPreview.length}</div>
            <div style={{ ...styles.detailActions, marginTop: 14 }}>
              <button className="fp-btn" style={styles.secondaryPill} onClick={() => setImportPreview(null)}>Отмена</button>
              <button className="fp-btn" style={styles.primaryPill} onClick={confirmImport}>Импортировать</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
