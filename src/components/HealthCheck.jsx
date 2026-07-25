import React, { useEffect, useMemo, useState } from "react";
import { X, Gauge, Lightbulb, Users, TrendingUp, Layers2 } from "lucide-react";
import { styles } from "../theme.js";
import { initials, computeHealthMetrics } from "../helpers.js";

const STATUS_META = {
  red: { color: "#E5484D", bg: "#FCE9E8", label: "🔴 Нужна гигиена базы" },
  orange: { color: "#D98C2B", bg: "#FBF0DF", label: "🟠 Хороший фундамент" },
  green: { color: "#22A37A", bg: "#E4F5EF", label: "🟢 Сильная сеть" },
};

const STATUS_HINT = {
  red: "База пока разрозненная — есть куда расти по разнообразию, активности и глубине контактов.",
  orange: "Неплохая основа. Ещё немного внимания к деталям — и сеть станет по-настоящему сильной.",
  green: "Отличное окружение: разнообразное, живое и хорошо задокументированное.",
};

function MetricBar({ label, pct, color }) {
  return (
    <div style={styles.metricRow}>
      <div style={styles.metricRowTop}>
        <span style={styles.metricLabel}>{label}</span>
        <span style={styles.metricPct}>{pct}%</span>
      </div>
      <div style={styles.metricTrack}>
        <div style={{ ...styles.metricFill, width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function HealthCheck({ contacts, categories, onClose, remainingAi = Infinity, onUseAi, onOpenProfile }) {
  const metrics = useMemo(() => computeHealthMetrics(contacts, categories), [contacts, categories]);
  const meta = STATUS_META[metrics.status];
  const blocked = remainingAi <= 0;

  const [recommendations, setRecommendations] = useState(null);
  const [recError, setRecError] = useState("");
  const [loadingRec, setLoadingRec] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchRecommendations() {
      if (contacts.length === 0 || blocked) return;
      setLoadingRec(true);
      setRecError("");
      try {
        const proxyUrl = import.meta.env.VITE_AI_PROXY_URL;
        if (!proxyUrl) {
          setRecError("AI ещё не подключён (VITE_AI_PROXY_URL в .env) — показаны только цифры, без рекомендаций.");
          return;
        }
        const prompt = `Ты аналитик личной CRM "for people". Вот точно посчитанные данные об окружении пользователя (сами цифры уже верны, не пересчитывай их):
- Общий счёт: ${metrics.score}/100
- Разнообразие сфер: ${metrics.diversityScore}%
- Активность связей (контакт за 90 дней): ${metrics.recencyScore}%
- Глубина профилей (заметки/интересы): ${metrics.depthScore}%
- Распределение по категориям: ${metrics.categoryDistribution.map((d) => `${d.name}: ${d.count}`).join(", ") || "нет данных"}
- Категории без единого контакта: ${metrics.gapCategories.join(", ") || "нет пропусков"}
- Контакты, с которыми давно не было связи (или дата не указана): ${metrics.staleContacts.map((c) => `${c.firstName} ${c.lastName}${c.category ? ` (${c.category})` : ""}`).join(", ") || "нет"}

Дай ровно 3 коротких конкретных рекомендации на русском, каждая — одно предложение, опирающееся на реальные цифры/имена/категории выше (например "У вас 0 контактов в категории X" или "Вы давно не общались с Y из категории Z"). Без вступлений и общих слов.
Ответь СТРОГО в JSON без markdown: {"recommendations": ["...", "...", "..."]}`;

        const response = await fetch(proxyUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        const data = await response.json();
        if (!response.ok || data.error) throw new Error(data.error || "proxy error");
        if (!cancelled) {
          setRecommendations(Array.isArray(data.recommendations) ? data.recommendations.slice(0, 3) : []);
          if (onUseAi) onUseAi();
        }
      } catch (e) {
        if (!cancelled) setRecError("Не получилось получить рекомендации от AI. Цифры выше по-прежнему точные.");
      } finally {
        if (!cancelled) setLoadingRec(false);
      }
    }
    fetchRecommendations();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fp-overlay-anim" style={styles.overlay} onClick={onClose}>
      <div className="fp-sheet-anim" style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.sheetHandle} />
        <button className="fp-btn" style={styles.closeBtn} onClick={onClose}><X size={16} color="#0B0B10" /></button>

        <div style={styles.formTitle}><Gauge size={17} color="#7C4DFF" style={{ marginRight: 6, verticalAlign: -3 }} />Оценка окружения</div>

        {contacts.length === 0 ? (
          <div style={styles.emptyHint}>Добавьте хотя бы несколько контактов, чтобы увидеть анализ.</div>
        ) : (
          <>
            <div style={styles.healthScoreRow}>
              <div style={{ ...styles.healthScoreCircle, borderColor: meta.color, background: meta.bg }}>
                <span style={{ ...styles.healthScoreNum, color: meta.color }}>{metrics.score}</span>
                <span style={{ ...styles.healthScoreMax, color: meta.color }}>из 100</span>
              </div>
              <div>
                <div style={{ ...styles.healthStatusLabel, color: meta.color }}>{meta.label}</div>
                <div style={styles.healthStatusHint}>{STATUS_HINT[metrics.status]}</div>
              </div>
            </div>

            <MetricBar label="Разнообразие сфер" pct={metrics.diversityScore} color="#7C4DFF" />
            <MetricBar label="Активность связей (90 дней)" pct={metrics.recencyScore} color="#2AA0DB" />
            <MetricBar label="Глубина профилей" pct={metrics.depthScore} color="#22A37A" />

            <div style={styles.sectionLabel}><Layers2 size={12} style={{ marginRight: 4, verticalAlign: -2 }} />По категориям</div>
            {metrics.categoryDistribution.map((d) => (
              <div key={d.name} style={styles.distRow}>
                <span style={styles.distName}>{d.name}</span>
                <div style={styles.distTrack}><div style={{ ...styles.distFill, width: `${d.pct}%` }} /></div>
                <span style={styles.distCount}>{d.count}</span>
              </div>
            ))}
            {metrics.gapCategories.length > 0 && (
              <div style={{ ...styles.chipWrap, marginTop: 8 }}>
                {metrics.gapCategories.map((c) => <span key={c} style={styles.gapChip}>0 контактов · {c}</span>)}
              </div>
            )}

            {metrics.staleContacts.length > 0 && (
              <>
                <div style={styles.sectionLabel}><Users size={12} style={{ marginRight: 4, verticalAlign: -2 }} />Давно не общались</div>
                <div style={styles.staleRow}>
                  {metrics.staleContacts.map((c) => (
                    <div key={c.id} style={styles.staleChip}>
                      <div style={styles.staleAvatar}>{c.avatar ? <img src={c.avatar} alt="" style={styles.avatarImg} /> : initials(c)}</div>
                      <span style={styles.staleName}>{c.firstName || c.lastName}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={styles.sectionLabel}><TrendingUp size={12} style={{ marginRight: 4, verticalAlign: -2 }} />Рекомендации</div>
            {blocked ? (
              <div style={styles.aiBlockedCard}>
                <span style={styles.aiBlockedText}>Лимит бесплатных AI-запросов исчерпан на этот месяц — текстовые рекомендации недоступны, но цифры и шкалы выше по-прежнему точные.</span>
                {onOpenProfile && <button className="fp-btn" style={styles.primaryPill} onClick={onOpenProfile}>Открыть Личный кабинет</button>}
              </div>
            ) : (
              <>
                {loadingRec && <div className="fp-pulse" style={styles.aiIntro}>AI анализирует ваше окружение…</div>}
                {!loadingRec && recError && <div style={styles.importError}>{recError}</div>}
                {!loadingRec && recommendations && recommendations.map((r, i) => (
                  <div key={i} style={styles.recCard}>
                    <Lightbulb size={16} color="#7C4DFF" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={styles.recText}>{r}</span>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
