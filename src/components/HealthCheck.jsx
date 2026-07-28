import React, { useMemo, useState } from "react";
import { X, Gauge, Lightbulb, Users, TrendingUp, Layers2, PieChart } from "lucide-react";
import { styles } from "../theme.js";
import { initials, computeHealthMetrics, computeContactStats, sanitizeAiText } from "../helpers.js";

const STATUS_META = {
  red: { color: "#E5484D", label: "🔴 Нужна гигиена базы" },
  orange: { color: "#D98C2B", label: "🟠 Хороший фундамент" },
  green: { color: "#22A37A", label: "🟢 Сильная сеть" },
};

const STATUS_HINT = {
  red: "База пока разрозненная — есть куда расти по разнообразию, активности и глубине контактов.",
  orange: "Неплохая основа. Ещё немного внимания к деталям — и сеть станет по-настоящему сильной.",
  green: "Отличное окружение: разнообразное, живое и хорошо задокументированное.",
};

// Палитра для донат-чарта категорий — идёт по кругу, если категорий больше.
const DONUT_PALETTE = ["#7C4DFF", "#2AA0DB", "#22A37A", "#D98C2B", "#E5484D", "#8A6FE0", "#3F6FCB", "#25A45C"];

// --- Универсальное SVG-кольцо прогресса ---
function ProgressRing({ pct, size, stroke, color, trackColor = "rgba(255,255,255,0.25)" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, pct)) / 100) * c;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset .6s ease" }}
      />
    </svg>
  );
}

function MetricCard({ label, pct, color }) {
  return (
    <div style={styles.healthMetricCard}>
      <div style={styles.healthMetricRingWrap}>
        <ProgressRing pct={pct} size={48} stroke={5} color={color} trackColor="rgba(11,11,16,0.08)" />
        <span style={styles.healthMetricPct}>{pct}%</span>
      </div>
      <span style={styles.healthMetricLabel}>{label}</span>
    </div>
  );
}

// --- Донат-чарт распределения по категориям ---
function CategoryDonut({ distribution, total }) {
  const size = 108;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={styles.donutSection}>
      <div style={styles.donutWrap}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(11,11,16,0.06)" strokeWidth={stroke} />
          {distribution.map((d, i) => {
            const frac = total > 0 ? d.count / total : 0;
            const dash = frac * c;
            const el = (
              <circle
                key={d.name}
                cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={DONUT_PALETTE[i % DONUT_PALETTE.length]} strokeWidth={stroke}
                strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-acc}
                strokeLinecap={distribution.length > 1 ? "butt" : "round"}
              />
            );
            acc += dash;
            return el;
          })}
        </svg>
        <span style={styles.donutCenterNum}>{total}</span>
        <span style={{ ...styles.donutCenterLabel, marginTop: 20 }}>контактов</span>
      </div>
      <div style={styles.donutLegend}>
        {distribution.slice(0, 5).map((d, i) => (
          <div key={d.name} style={styles.donutLegendRow}>
            <span style={{ ...styles.donutLegendSwatch, background: DONUT_PALETTE[i % DONUT_PALETTE.length] }} />
            <span style={styles.donutLegendName}>{d.name}</span>
            <span style={styles.donutLegendCount}>{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Мини бар-чарт роста базы за 6 месяцев ---
function GrowthTrend({ months, maxCount }) {
  return (
    <div style={styles.statChartCard}>
      <div style={styles.statChartTitle}>Рост базы за 6 месяцев</div>
      <div style={styles.statChartRow}>
        {months.map((m) => (
          <div key={m.label} style={styles.statChartCol}>
            <div style={styles.statChartBarTrack}>
              <div style={{ ...styles.statChartBarFill, height: `${Math.max(6, (m.count / maxCount) * 100)}%` }} />
            </div>
            <span style={styles.statChartLabel}>{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HealthCheck({ contacts, categories, tasks = [], onClose, remainingAi = Infinity, onUseAi, onOpenProfile }) {
  const metrics = useMemo(() => computeHealthMetrics(contacts, categories), [contacts, categories]);
  const stats = useMemo(() => computeContactStats(contacts, tasks), [contacts, tasks]);
  const meta = STATUS_META[metrics.status];
  const blocked = remainingAi <= 0;

  const [recommendations, setRecommendations] = useState(null);
  const [recError, setRecError] = useState("");
  const [loadingRec, setLoadingRec] = useState(false);
  const [closing, setClosing] = useState(false);
  function handleClose() { setClosing(true); setTimeout(onClose, 180); }

  // Раньше рекомендации запрашивались у AI автоматически при каждом открытии
  // окна — это тратило AI-кредиты пользователя даже когда рекомендации были
  // не нужны, и часто показывало ошибку без видимой причины. Теперь запрос
  // идёт СТРОГО по клику на кнопку «Сгенерировать AI-рекомендации».
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
        body: JSON.stringify({ prompt, initData: window.Telegram?.WebApp?.initData || "" }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || "proxy error");
      setRecommendations(Array.isArray(data.recommendations) ? data.recommendations.slice(0, 3).map(sanitizeAiText) : []);
      if (onUseAi) onUseAi();
    } catch (e) {
      setRecError("Не получилось получить рекомендации от AI. Цифры выше по-прежнему точные.");
    } finally {
      setLoadingRec(false);
    }
  }

  return (
    <div className={closing ? "fp-overlay-anim-out" : "fp-overlay-anim"} style={styles.overlay} onClick={handleClose}>
      <div className={closing ? "fp-sheet-anim-out" : "fp-sheet-anim"} style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.sheetHandle} />
        <button className="fp-btn" style={styles.closeBtn} onClick={handleClose}><X size={16} color="#0B0B10" /></button>

        <div style={styles.formTitle}><Gauge size={17} color="#7C4DFF" style={{ marginRight: 6, verticalAlign: -3 }} />Оценка окружения</div>

        {contacts.length === 0 ? (
          <div style={styles.emptyHint}>Добавьте хотя бы несколько контактов, чтобы увидеть анализ.</div>
        ) : (
          <>
            <div style={styles.healthHero}>
              <div style={styles.healthHeroGlow} />
              <div style={styles.healthRingWrap}>
                <ProgressRing pct={metrics.score} size={88} stroke={7} color="#fff" />
                <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span style={styles.healthRingNum}>{metrics.score}</span>
                  <span style={styles.healthRingMax}>из 100</span>
                </div>
              </div>
              <div style={styles.healthHeroBody}>
                <div style={styles.healthStatusLabel}>{meta.label}</div>
                <div style={styles.healthStatusHint}>{STATUS_HINT[metrics.status]}</div>
              </div>
            </div>

            <div style={styles.healthMetricsGrid}>
              <MetricCard label="Разнообразие сфер" pct={metrics.diversityScore} color="#7C4DFF" />
              <MetricCard label="Активность связей" pct={metrics.recencyScore} color="#2AA0DB" />
              <MetricCard label="Глубина профилей" pct={metrics.depthScore} color="#22A37A" />
            </div>

            <div style={styles.sectionLabel}><PieChart size={12} style={{ marginRight: 4, verticalAlign: -2 }} />По категориям</div>
            <CategoryDonut distribution={metrics.categoryDistribution} total={contacts.length} />
            {metrics.gapCategories.length > 0 && (
              <div style={{ ...styles.chipWrap, marginTop: 8 }}>
                {metrics.gapCategories.map((c) => <span key={c} style={styles.gapChip}>0 контактов · {c}</span>)}
              </div>
            )}

            <div style={styles.sectionLabel}><Layers2 size={12} style={{ marginRight: 4, verticalAlign: -2 }} />Динамика</div>
            <GrowthTrend months={stats.months} maxCount={stats.maxMonthCount} />

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
                {loadingRec && (
                  <>
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="fp-pulse" style={{ ...styles.recSkeletonCard, animationDelay: `${i * 0.12}s` }}>
                        <span style={styles.recSkeletonIcon} />
                        <div style={styles.recSkeletonLines}>
                          <span style={{ ...styles.recSkeletonLine, width: "92%" }} />
                          <span style={{ ...styles.recSkeletonLine, width: "68%" }} />
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {!loadingRec && recError && <div style={styles.importError}>{recError}</div>}
                {!loadingRec && recommendations && recommendations.map((r, i) => (
                  <div key={i} style={styles.recCard}>
                    <Lightbulb size={16} color="#7C4DFF" style={{ flexShrink: 0, marginTop: 1 }} />
                    <span style={styles.recText}>{r}</span>
                  </div>
                ))}
                {!loadingRec && !recommendations && (
                  <button className="fp-btn" style={styles.recGenerateBtn} onClick={fetchRecommendations}>
                    <Lightbulb size={15} /> Сгенерировать AI-рекомендации
                  </button>
                )}
                {!loadingRec && (recommendations || recError) && (
                  <button className="fp-btn" style={{ ...styles.recGenerateBtn, background: "#fff", color: "#7C4DFF", border: "1px solid rgba(124,77,255,0.3)", boxShadow: "none" }} onClick={fetchRecommendations}>
                    <Lightbulb size={15} /> Сгенерировать заново
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
