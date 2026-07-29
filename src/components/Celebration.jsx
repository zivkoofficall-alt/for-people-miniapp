import React, { useEffect, useMemo, useState } from "react";
import { PartyPopper } from "lucide-react";
import { styles } from "../theme.js";

// Палитра конфетти — переиспользует акценты приложения (фиолетовый,
// оранжевый, зелёный, синий), чтобы не выбиваться из общего дизайна.
const CONFETTI_COLORS = ["#7C4DFF", "#D98C2B", "#22A37A", "#2AA0DB", "#E5484D", "#C2489B"];
const PIECE_COUNT = 26;
const VISIBLE_MS = 1700; // сколько бейдж виден на полной непрозрачности
const EXIT_MS = 280; // длительность анимации исчезновения

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Полноэкранная, некликабельная (pointerEvents: none) анимация:
 * конфетти падает сверху + по центру всплывает бейдж с текстом.
 * Сама себя закрывает через onDone — вызывающий код (App.jsx) просто
 * держит её в state и убирает по колбэку, ничего таймерами снаружи не считает.
 */
export default function Celebration({ title, subtitle, onDone }) {
  const [exiting, setExiting] = useState(false);

  const pieces = useMemo(() => {
    return Array.from({ length: PIECE_COUNT }, (_, i) => ({
      id: i,
      left: randomBetween(2, 98),
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: randomBetween(0, 0.35),
      duration: randomBetween(1.5, 2.3),
      size: randomBetween(6, 11),
      drift: randomBetween(-40, 40),
      spin: randomBetween(220, 520) * (Math.random() > 0.5 ? 1 : -1),
      round: Math.random() > 0.5,
    }));
  }, []);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), VISIBLE_MS);
    const doneTimer = setTimeout(() => onDone && onDone(), VISIBLE_MS + EXIT_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.celebrateWrap} aria-live="polite">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="fp-confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.round ? "50%" : 3,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            "--fp-drift": `${p.drift}px`,
            "--fp-spin": `${p.spin}deg`,
          }}
        />
      ))}
      <div className={exiting ? "fp-celebrate-badge-out" : "fp-celebrate-badge"} style={styles.celebrateBadge}>
        <div className="fp-celebrate-ring" style={styles.celebrateIconRing}>
          <PartyPopper size={26} color="#fff" />
        </div>
        <div style={styles.celebrateTitle}>Цель достигнута!</div>
        {title && <div style={styles.celebrateSubtitle}>«{title}»</div>}
        {subtitle && <div style={styles.celebrateSubtitle}>{subtitle}</div>}
      </div>
    </div>
  );
}
