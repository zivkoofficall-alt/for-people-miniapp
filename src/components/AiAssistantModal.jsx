import React, { useState, useRef, useEffect } from "react";
import { X, Sparkles, Send } from "lucide-react";
import { styles } from "../theme.js";
import { initials, sanitizeAiText } from "../helpers.js";
import { AI_SUGGESTIONS } from "../constants.js";

// AiAssistantModal — вынесен в отдельный чанк (React.lazy в App.jsx).
// Открывается по кнопке "AI помощник", код грузится только в этот момент,
// а не при первом рендере всего приложения.
export default function AiAssistantModal({ contacts, onClose, onOpenContact, remainingAi = Infinity, onUseAi, onOpenProfile }) {
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const aiScrollRef = useRef(null);
  const blocked = remainingAi <= 0;
  function handleClose() { setClosing(true); setTimeout(onClose, 180); }

  useEffect(() => {
    if (aiScrollRef.current) aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
  }, [aiMessages, aiLoading]);

  async function sendAiQuery(text) {
    const q = (text ?? aiInput).trim();
    if (!q || aiLoading || blocked) return;
    setAiInput("");
    setAiMessages((prev) => [...prev, { role: "user", text: q }]);
    setAiLoading(true);
    try {
      const compact = contacts.map((c) => ({
        id: c.id, name: `${c.firstName} ${c.lastName}`.trim(), category: c.category, tags: c.tags,
        job: c.job, city: c.city, interests: c.interests, helpWith: c.helpWith,
        note: (c.comment || "").slice(0, 140), values: (c.psych?.values || "").slice(0, 140),
      }));
      const prompt = `Ты — помощник личной книги контактов "for people". Твоя задача: понять, что нужно пользователю, и найти среди его контактов тех, кто реально может помочь — даже если формулировка запроса не совпадает дословно с полями контакта.

Контакты пользователя в JSON (поля: id, name, category, tags, job, city, interests, helpWith, note, values):
${JSON.stringify(compact)}

Запрос пользователя: "${q}"

Правила сопоставления:
1. Сопоставляй по смыслу, а не только по точным словам. Пример: запрос "кто разбирается в праве" должен находить контакты с job/tags/interests вроде "юрист", "адвокат", "юридический консультант", "законодательство" — а не только контакты, где буквально написано слово "право".
2. Учитывай ВСЕ поля контакта — job, interests, helpWith, tags, category, note, values — прежде чем решить, что подходящих нет.
3. Если ни один контакт явно не подходит — это нормальный, ожидаемый результат: верни matchIds: [] и напиши в message короткое дружелюбное объяснение (например, что среди контактов пока нет подходящих специалистов), НЕ придумывай несуществующих людей и не выбирай случайных контактов "на всякий случай".
4. Если контактов в базе нет вообще — тоже верни matchIds: [] с соответствующим сообщением.

Ответь СТРОГО в формате JSON, без markdown и без единого слова вне JSON:
{"message": "короткая дружелюбная фраза на русском (1-2 предложения)", "matchIds": ["id1", "id2"]}`;

      // ВАЖНО: ключ Anthropic API нельзя хранить в коде фронтенда — его увидит
      // любой пользователь через "Инструменты разработчика" в браузере.
      // Поэтому запрос идёт не напрямую в Anthropic, а на твой собственный
      // маленький backend (прокси), который и хранит ключ у себя.
      // Адрес backend задаётся в файле .env через VITE_AI_PROXY_URL.
      const proxyUrl = import.meta.env.VITE_AI_PROXY_URL;
      if (!proxyUrl) {
        setAiMessages((prev) => [...prev, {
          role: "ai",
          text: "AI-помощник ещё не подключён: не задан адрес backend-прокси (VITE_AI_PROXY_URL в .env). Смотри README — там пример готового прокси-сервера.",
          matches: [],
        }]);
        return;
      }

      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, initData: window.Telegram?.WebApp?.initData || "" }),
      });
      const parsed = await response.json(); // прокси возвращает JSON как есть — проверяем на ошибку
      if (!response.ok || parsed.error) throw new Error(parsed.error || "proxy error");
      const matches = contacts.filter((c) => (parsed.matchIds || []).includes(c.id));
      setAiMessages((prev) => [...prev, { role: "ai", text: sanitizeAiText(parsed.message) || "Готово.", matches }]);
      if (onUseAi) onUseAi();
    } catch (err) {
      const msg = err && err.message && err.message !== "proxy error"
        ? err.message
        : "Не получилось обработать запрос. Попробуйте переформулировать.";
      setAiMessages((prev) => [...prev, { role: "ai", text: msg, matches: [] }]);
    } finally { setAiLoading(false); }
  }

  return (
    <div className={closing ? "fp-overlay-anim-out" : "fp-overlay-anim"} style={styles.overlay} onClick={handleClose}>
      <div className={closing ? "fp-sheet-anim-out" : "fp-sheet-anim"} style={styles.aiSheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.sheetHandle} />
        <div style={styles.formHeader}>
          <div style={styles.formTitle}><Sparkles size={16} color="#7C4DFF" style={{ marginRight: 6, verticalAlign: -3 }} />AI помощник</div>
          <button className="fp-btn" style={styles.closeBtn} onClick={handleClose}><X size={16} color="#0B0B10" /></button>
        </div>

        <div ref={aiScrollRef} style={styles.aiScroll}>
          {blocked && (
            <div style={styles.aiBlockedCard}>
              <span style={styles.aiBlockedText}>Лимит бесплатных AI-запросов исчерпан на этот месяц.</span>
              {onOpenProfile && (
                <button className="fp-btn" style={styles.primaryPill} onClick={onOpenProfile}>Открыть Личный кабинет</button>
              )}
            </div>
          )}
          {!blocked && aiMessages.length === 0 && (
            <div style={styles.aiIntro}>
              Опишите, что вам нужно — я подберу подходящих людей из вашей книги контактов по интересам, профессии и заметкам.
              <div style={{ ...styles.chipWrap, marginTop: 12 }}>
                {AI_SUGGESTIONS.map((s) => <button key={s} className="fp-btn" style={styles.pickChip} onClick={() => sendAiQuery(s)}>{s}</button>)}
              </div>
            </div>
          )}
          {aiMessages.map((m, i) => (
            <div key={i} className="fp-msg-in" style={{ ...styles.aiMsgRow, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ ...styles.aiBubble, ...(m.role === "user" ? styles.aiBubbleUser : styles.aiBubbleAi) }}>
                {m.text}
                {m.matches && m.matches.length > 0 && (
                  <div style={styles.aiMatchRow}>
                    {m.matches.map((mc) => (
                      <button key={mc.id} className="fp-btn" style={styles.aiMatchCard} onClick={() => onOpenContact(mc.id)}>
                        <div style={styles.avatarBubbleSmall}>{mc.avatar ? <img src={mc.avatar} alt="" style={styles.avatarImg} /> : initials(mc)}</div>
                        <div style={styles.aiMatchName}>{mc.firstName} {mc.lastName}</div>
                        {mc.job && <div style={styles.aiMatchJob}>{mc.job}</div>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {aiLoading && (
            <div style={{ ...styles.aiMsgRow, justifyContent: "flex-start" }}>
              <div style={{ ...styles.aiBubble, ...styles.aiBubbleAi }} className="fp-pulse">Ищу подходящих людей…</div>
            </div>
          )}
        </div>

        <div style={styles.aiInputRow}>
          <input style={styles.aiInput} placeholder="Например: я хочу починить машину" value={aiInput} onChange={(e) => setAiInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendAiQuery(); }} disabled={blocked} />
          <button className="fp-btn" style={styles.aiSendBtn} onClick={() => sendAiQuery()} disabled={aiLoading || blocked}><Send size={16} color="#fff" /></button>
        </div>
      </div>
    </div>
  );
}
