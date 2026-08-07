import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Home, Bug, MessageCircle, Settings, LogOut, Send, Check, X, Trash2,
  RefreshCw, Copy, AlertTriangle, Lock, ChevronRight, ChevronLeft, Search,
  Users as UsersIcon, Tag, CreditCard, Cpu, Plus, Ban, ShieldCheck,
  TrendingUp, Wallet, MoreHorizontal, Sparkles, Crown, Calendar, Info,
  Shield, ShieldAlert, ClipboardList, Clock, ChevronDown, Star,
  Receipt, TrendingDown, History, BarChart3,
  Activity, Flag, ShieldOff, Zap, CircleDot, CheckCircle2, Eye, EyeOff, Bell,
  Megaphone, FlaskConical, Download, BellRing, Users2, Filter,
  MessageSquare, Pencil, Radio, Book,
  Bookmark, GitBranch, ListOrdered, Globe, RotateCcw, GripVertical,
  KeyRound, Wrench, Wifi, WifiOff, DatabaseBackup, UserX,
  Grid3x3, Smile, StickyNote, LayoutGrid, Flame, GripHorizontal,
  AtSign, MessagesSquare,
  Loader2, Inbox, CircleAlert,
  Smartphone, Monitor, TimerReset,
  ShieldQuestion, Hourglass,
  Moon, Sun, Layers,
} from "lucide-react";
import { fetchAdminSession, acceptAdminInvite, createAdminInvite, fetchAdminList, revokeAdminAccess, updateAdminPermissions, fetchAdminUsers, setUserBlocked, fetchPromoCodes, createPromoCode, togglePromoCode, deletePromoCode, fetchTransactions, fetchBugs, updateBug, fetchAuditLog, fetchHomeStats, fetchTeamChat, sendTeamChatMessage, fetchAdminHeatmap, fetchAlertSettings, saveAlertSetting, sendTestAlert, fetchReferrals, fetchLoginHistory, deleteLoginHistoryEntry, requestTwoFactorCode, verifyTwoFactorCode, fetchPricing, savePricing, setUserPlan, fetchUserActivity, deleteUserData } from "./adminApi";
import { getAdminLaunchMode } from "./adminLaunch";

/* ============================================================
   PREVIEW админ-панели for-people-miniapp.
   Визуальный язык — из src/theme.js (тот же, что в пользовательском мини-аппе):
   светлый фон, фиолетовый градиент, Plus Jakarta Sans + Inter.
   Структура навигации и плотность экранов — по мотивам банковских
   приложений (Тинькофф/Сбер): нижние табы, экран "Ещё" со списком
   разделов, детальные экраны с крупными карточками и переключателями.
   Всё на локальном state — действия (блок пользователя, создание промокода,
   переключение способов оплаты) реально меняют интерфейс в этой сессии.
   ============================================================ */

const INK = "var(--fp-ink)";
const MUTED = "var(--fp-muted)";
const MUTED_SOFT = "var(--fp-muted-soft)";
const PURPLE = "#7C4DFF";
const PURPLE_SOFT = "var(--fp-purple-soft)";
const PURPLE_GRADIENT = PURPLE;
const PURPLE_GRADIENT_SHADOW = "none";
const BG = "var(--fp-bg)";
const CARD_BORDER = "1px solid var(--fp-border)";
const CARD_SHADOW = "var(--fp-shadow)";
const DANGER = "#E5484D";
const DANGER_BG = "var(--fp-danger-bg)";
const SUCCESS = "#22A37A";
const SUCCESS_BG = "var(--fp-success-bg)";
const AMBER = "#B5722A";
const AMBER_BG = "var(--fp-amber-bg)";
const GOLD = "#D9A828";
const CARD_BG = "var(--fp-card-bg)";
const INPUT_BG = "var(--fp-input-bg)";

const globalCss = `
  :root {
    --fp-bg: #F5F4F8; --fp-card-bg: #ffffff; --fp-input-bg: #F5F3FA;
    --fp-ink: #0B0B10; --fp-muted: rgba(11,11,16,0.55); --fp-muted-soft: rgba(11,11,16,0.32);
    --fp-border: rgba(11,11,16,0.07); --fp-shadow: 0 4px 18px rgba(20,10,50,0.06);
    --fp-purple-soft: #EDE7FE; --fp-danger-bg: #FCE9E8; --fp-success-bg: #E4F6EE; --fp-amber-bg: #FBEEDD;
    --fp-hover-bg: #F7F6FB; --fp-active-bg: #F0EEF6; --fp-scrollbar: rgba(11,11,16,0.15);
  }
  [data-theme="dark"] {
    --fp-bg: #121116; --fp-card-bg: #1C1B22; --fp-input-bg: #26242D;
    --fp-ink: #F2F1F6; --fp-muted: rgba(242,241,246,0.6); --fp-muted-soft: rgba(242,241,246,0.36);
    --fp-border: rgba(255,255,255,0.09); --fp-shadow: 0 4px 18px rgba(0,0,0,0.35);
    --fp-purple-soft: rgba(124,77,255,0.22); --fp-danger-bg: rgba(229,72,77,0.18); --fp-success-bg: rgba(34,163,122,0.18); --fp-amber-bg: rgba(181,114,42,0.22);
    --fp-hover-bg: #24222B; --fp-active-bg: #2A2832; --fp-scrollbar: rgba(255,255,255,0.14);
  }
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500;1,600&family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; }
  button {
    all: unset; box-sizing: border-box; -webkit-appearance: none !important; appearance: none !important;
    -webkit-tap-highlight-color: transparent; font-family: inherit; cursor: pointer;
  }
  input, textarea { font-family: inherit; }
  body { margin: 0; background: ${BG}; }
  .fp-shell-root, .fp-shell-root * { transition: background-color .25s ease, border-color .25s ease, color .25s ease; }
  .fp-btn { transition: transform .12s ease, opacity .12s ease; cursor: pointer; }
  .fp-btn:active { transform: scale(0.94); }
  .fp-row { transition: transform .12s ease, background .12s ease; cursor: pointer; }
  .fp-row:active { transform: scale(0.98); background: var(--fp-active-bg) !important; }
  @keyframes fpSlide { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes fpFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes fpToast { 0% { opacity: 0; transform: translate(-50%, 8px); } 12% { opacity: 1; transform: translate(-50%, 0); } 88% { opacity: 1; transform: translate(-50%, 0); } 100% { opacity: 0; transform: translate(-50%, 8px); } }
  @keyframes fpShimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
  .fp-screen { animation: fpSlide .22s cubic-bezier(.2,.8,.2,1); }
  .fp-fade { animation: fpFade .18s ease; }
  .fp-toast { animation: fpToast 2.2s ease forwards; }
  @media (hover: hover) and (pointer: fine) {
    .fp-btn:hover:not(:disabled) { opacity: 0.88; }
    .fp-row:hover { background: var(--fp-hover-bg) !important; }
  }
  ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: var(--fp-scrollbar); border-radius: 999px; }
  .fp-switch { display: inline-block; width: 44px; height: 26px; border-radius: 999px; position: relative; flex-shrink: 0; transition: background .18s ease; }
  .fp-switch-knob { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.25); transition: transform .18s ease; }
`;

const s = {
  shell: { minHeight: "100vh", width: "100%", background: BG, color: INK, fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column", position: "relative" },
  header: { padding: "16px 16px 10px", display: "flex", alignItems: "center", gap: 10, background: BG, position: "sticky", top: 0, zIndex: 5 },
  backBtn: { width: 34, height: 34, borderRadius: "50%", background: CARD_BG, border: CARD_BORDER, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: CARD_SHADOW },
  headerTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 19, color: INK, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  page: { flex: 1, padding: "4px 16px 110px", overflowY: "auto" },
  card: { background: CARD_BG, border: CARD_BORDER, borderRadius: 14, padding: 16, boxShadow: CARD_SHADOW, marginBottom: 12 },
  heroCardSolid: {
    background: "#14121B", borderRadius: 24, padding: "18px 16px", marginBottom: 14, color: "#fff",
  },
  quietChip: { width: 36, height: 36, borderRadius: 11, background: "var(--fp-scrollbar)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  statGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 6 },
  statCard: { background: CARD_BG, border: CARD_BORDER, borderRadius: 14, padding: "13px 12px", boxShadow: CARD_SHADOW },
  sectionLabel: { fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", color: MUTED, margin: "18px 2px 10px" },
  fieldRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(11,11,16,0.06)" },
  fieldLabel: { fontSize: 13.5, color: INK, fontWeight: 500 },
  listRow: { display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 14, background: CARD_BG, marginBottom: 8, border: CARD_BORDER },
  avatarBubble: (bg, color) => ({ width: 40, height: 40, borderRadius: 13, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color, flexShrink: 0 }),
  badge: (bg, color) => ({ fontSize: 10.5, fontWeight: 700, padding: "3px 9px", borderRadius: 999, background: bg, color, whiteSpace: "nowrap", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", display: "inline-block", verticalAlign: "middle" }),
  primaryPill: { background: PURPLE, color: "#fff", border: "none", borderRadius: 14, padding: "13px 18px", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 },
  secondaryPill: { background: CARD_BG, color: INK, border: CARD_BORDER, borderRadius: 14, padding: "13px 0", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
  dangerGhost: { display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: DANGER_BG, color: DANGER, border: "none", borderRadius: 14, padding: "13px 18px", fontSize: 13.5, fontWeight: 700 },
  fieldInput: { width: "100%", background: INPUT_BG, border: CARD_BORDER, borderRadius: 14, padding: "12px 15px", fontSize: 14.5, color: INK, outline: "none" },
  searchBar: { display: "flex", alignItems: "center", gap: 9, background: CARD_BG, border: CARD_BORDER, borderRadius: 999, padding: "12px 16px", marginBottom: 14, boxShadow: CARD_SHADOW },
  bottomBar: {
    position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
    background: CARD_BG, borderTop: CARD_BORDER,
    display: "flex", justifyContent: "space-around", alignItems: "center",
    padding: "8px 4px", paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
    boxShadow: "0 -4px 20px rgba(11,11,16,0.06)",
  },
  bottomBarItem: (active) => ({
    position: "relative", display: "flex", flexDirection: "column", alignItems: "center",
    gap: 3, background: "none", border: "none", color: active ? PURPLE : MUTED, flex: 1, padding: "6px 0",
  }),
  bottomBarLabel: { fontSize: 9.5, fontWeight: 600 },
  banner: { borderRadius: 14, padding: "11px 14px", fontSize: 12, marginBottom: 14, display: "flex", alignItems: "center", gap: 8, fontWeight: 600 },
  overlay: { position: "fixed", inset: 0, background: "rgba(11,11,16,0.45)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 80 },
  sheet: { position: "relative", width: "100%", maxWidth: 480, background: CARD_BG, borderRadius: "28px 28px 0 0", padding: "22px 18px 24px", maxHeight: "86vh", overflowY: "auto", border: CARD_BORDER, borderBottom: "none" },
  toast: { position: "fixed", left: "50%", bottom: 96, transform: "translateX(-50%)", background: INK, color: "#fff", padding: "11px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600, zIndex: 90, whiteSpace: "nowrap", maxWidth: "calc(100% - 40px)", overflow: "hidden", textOverflow: "ellipsis", boxShadow: "0 10px 24px rgba(0,0,0,0.25)" },
};

function Switch({ on, onToggle, disabled }) {
  return (
    <button type="button" className="fp-btn" onClick={disabled ? undefined : onToggle} disabled={disabled}
      style={{ background: "none", border: "none", padding: 0, margin: 0, display: "inline-flex", alignItems: "center", flexShrink: 0, lineHeight: 0, opacity: disabled ? 0.6 : 1, cursor: disabled ? "default" : "pointer" }}>
      <span className="fp-switch" style={{ background: on ? PURPLE_GRADIENT : "var(--fp-scrollbar)" }}>
        <span className="fp-switch-knob" style={{ transform: on ? "translateX(18px)" : "translateX(0)" }} />
      </span>
    </button>
  );
}

function PermissionRow({ itemKey, label, on, onToggle, disabled, last }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: last ? "none" : s.fieldRow.borderBottom, opacity: disabled ? 0.6 : 1 }}>
      <div style={{ ...s.fieldRow, borderBottom: "none" }}>
        <span style={{ ...s.fieldLabel, display: "flex", alignItems: "center", gap: 7 }}>
          {label}
          <button type="button" className="fp-btn" onClick={() => setOpen((o) => !o)}
            style={{ width: 16, height: 16, borderRadius: "50%", background: open ? PURPLE_SOFT : "var(--fp-scrollbar)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: open ? PURPLE : MUTED_SOFT, lineHeight: 1 }}>?</span>
          </button>
        </span>
        <Switch on={on} onToggle={disabled ? undefined : onToggle} />
      </div>
      {open && (
        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, padding: "0 0 12px" }}>{PERMISSION_HELP[itemKey]}</div>
      )}
    </div>
  );
}

function TwoFactorSheet({ title, hint, rateLimited, onCancel, onConfirm }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(true); // true при первом монтировании — отправляем код сразу
  const [sendError, setSendError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  function send() {
    setSending(true);
    setSendError("");
    setError("");
    requestTwoFactorCode()
      .then(() => {
        setCooldown(30);
        const t = setInterval(() => setCooldown((c) => (c <= 1 ? (clearInterval(t), 0) : c - 1)), 1000);
      })
      .catch((e) => setSendError(e.message || "Не удалось отправить код"))
      .finally(() => setSending(false));
  }
  useEffect(send, []);

  async function submit() {
    if (input.trim().length !== 6 || verifying) return;
    setVerifying(true);
    setError("");
    try {
      const result = await verifyTwoFactorCode(input.trim());
      if (result.ok) onConfirm();
      else setError(result.reason || "Код не совпадает");
    } catch (e) {
      setError(e.message || "Не удалось проверить код");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div style={s.overlay} onClick={onCancel}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: rateLimited ? DANGER_BG : PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          {rateLimited ? <Hourglass size={22} color={DANGER} /> : <ShieldQuestion size={22} color={PURPLE} />}
        </div>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, marginBottom: 6, textAlign: "center" }}>{title}</div>
        <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 8, lineHeight: 1.5, textAlign: "center" }}>{hint}</div>
        {rateLimited && (
          <div style={{ ...s.banner, background: DANGER_BG, color: DANGER, marginBottom: 12 }}>
            <Hourglass size={13} /> Слишком много критичных действий подряд — нужно доп. подтверждение
          </div>
        )}
        {sendError ? (
          <div style={{ ...s.banner, background: DANGER_BG, color: DANGER, marginBottom: 14 }}>
            <CircleAlert size={13} /> {sendError}
          </div>
        ) : (
          <div style={{ ...s.banner, background: "#E7EEFC", color: "#3F6FCB", marginBottom: 14 }}>
            <Smartphone size={13} /> {sending ? "Отправляем код в Telegram…" : "Код отправлен вам в Telegram"}
          </div>
        )}
        <input
          value={input} onChange={(e) => { setInput(e.target.value); setError(""); }} autoFocus inputMode="numeric" maxLength={6}
          placeholder="Введите код из Telegram"
          style={{ ...s.fieldInput, textAlign: "center", letterSpacing: "0.3em", fontSize: 18, fontWeight: 700, marginBottom: error ? 8 : 10, border: error ? `1.5px solid ${DANGER}` : CARD_BORDER }}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
        />
        {error && <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: DANGER, marginBottom: 10 }}><CircleAlert size={12} /> {error}</div>}
        <button type="button" className="fp-btn" onClick={send} disabled={sending || cooldown > 0} style={{ background: "none", border: "none", padding: 0, fontSize: 12, color: cooldown > 0 ? MUTED_SOFT : PURPLE, fontWeight: 700, marginBottom: 16, cursor: cooldown > 0 ? "default" : "pointer" }}>
          {cooldown > 0 ? `Отправить ещё раз через ${cooldown}с` : "Отправить код ещё раз"}
        </button>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="fp-btn" onClick={onCancel} style={{ ...s.secondaryPill, flex: 1 }}>Отмена</button>
          <button type="button" className="fp-btn" onClick={submit} disabled={input.trim().length !== 6 || verifying} style={{ ...s.primaryPill, flex: 1 }}>{verifying ? "Проверяем…" : "Подтвердить"}</button>
        </div>
      </div>
    </div>
  );
}

function ReasonSheet({ title, hint, onCancel, onConfirm }) {
  const [reason, setReason] = useState("");
  return (
    <div style={s.overlay} onClick={onCancel}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 14, lineHeight: 1.5 }}>{hint}</div>
        <textarea
          value={reason} onChange={(e) => setReason(e.target.value)} autoFocus
          placeholder="Причина действия — попадёт в журнал"
          rows={3}
          style={{ ...s.fieldInput, resize: "none", marginBottom: 16 }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="fp-btn" onClick={onCancel} style={{ ...s.secondaryPill, flex: 1 }}>Отмена</button>
          <button type="button" className="fp-btn" onClick={() => onConfirm(reason.trim() || "Без указания причины")} style={{ ...s.primaryPill, flex: 1 }}>Подтвердить</button>
        </div>
      </div>
    </div>
  );
}

function RoleBadge({ role }) {
  const isSuper = role === "super";
  const Icon = isSuper ? Shield : ShieldAlert;
  return (
    <span style={{ ...s.badge(isSuper ? PURPLE_SOFT : AMBER_BG, isSuper ? PURPLE : AMBER), display: "inline-flex", alignItems: "center", gap: 4 }}>
      <Icon size={11} /> {isSuper ? "Супер-админ" : "Модератор"}
    </span>
  );
}

function EmptyState({ icon: Icon = Inbox, title, hint }) {
  return (
    <div className="fp-fade" style={{ ...s.card, textAlign: "center", padding: "36px 22px" }}>
      <div style={{ width: 60, height: 60, borderRadius: "50%", background: "linear-gradient(135deg, #F1EDFB 0%, #E8E2FB 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "inset 0 0 0 1px rgba(124,77,255,0.08)" }}>
        <Icon size={24} color={PURPLE} strokeWidth={1.8} />
      </div>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: INK, marginBottom: 5, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</div>
      {hint && <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.5, maxWidth: 240, margin: "0 auto" }}>{hint}</div>}
    </div>
  );
}

function Skeleton({ height = 16, width = "100%", radius = 8, style }) {
  return (
    <div style={{ height, width, borderRadius: radius, background: "linear-gradient(90deg, rgba(11,11,16,0.06) 25%, rgba(11,11,16,0.11) 37%, rgba(11,11,16,0.06) 63%)", backgroundSize: "400% 100%", animation: "fpShimmer 1.4s ease infinite", ...style }} />
  );
}

function ListSkeleton({ rows = 4 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ ...s.listRow }}>
          <Skeleton height={40} width={40} radius={13} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <Skeleton height={13} width="55%" />
            <Skeleton height={11} width="35%" />
          </div>
        </div>
      ))}
    </>
  );
}

/* ---------------- Демо-данные ---------------- */

const INITIAL_TRANSACTIONS = [
  { id: 1001, user: "Марина Соколова", tg: "@m_sokolova", amount: 599, status: "success", type: "Подписка Pro", time: "сегодня, 14:12" },
  { id: 1002, user: "Кирилл Ким", tg: "@k_kim", amount: 599, status: "success", type: "Подписка Pro", time: "сегодня, 09:47" },
  { id: 1003, user: "Аня Ковалёва", tg: "@ankova", amount: 599, status: "refunded", type: "Подписка Pro (возврат)", time: "вчера, 20:03" },
  { id: 1004, user: "Игорь Петров", tg: "@igpetrov", amount: 599, status: "failed", type: "Подписка Pro", time: "вчера, 11:30" },
  { id: 1005, user: "Света Орлова", tg: "@sveta_o", amount: 419, status: "success", type: "Подписка Pro (промо WELCOME30)", time: "3 дня назад" },
];

const PRICE_HISTORY = [
  { id: 1, from: 990, to: 599, note: "Снизили цену после теста конверсии", time: "2 нед. назад", actor: "Вы" },
  { id: 2, from: 1999, to: 990, note: "Первое снижение после запуска", time: "1.5 мес. назад", actor: "Вы" },
];

const INITIAL_PROMOS = [
  { id: 1, code: "WELCOME30", discount: 30, uses: 128, limit: 500, expires: "31 авг 2026", active: true },
  { id: 2, code: "CHANNEL5", discount: 100, uses: 412, limit: null, expires: "бессрочно", active: true },
  { id: 3, code: "SPRING2026", discount: 50, uses: 500, limit: 500, expires: "1 июн 2026", active: false },
  { id: 4, code: "FRIEND10", discount: 10, uses: 37, limit: 1000, expires: "31 дек 2026", active: true },
];

const DEMO_BUGS = [
  { id: 101, message: "При офлайне список задач иногда дублируется после синка", sender_name: "Марина", status: "new" },
  { id: 102, message: "Хочу тёмную/светлую тему переключать вручную", sender_name: "Дени", status: "in_progress" },
  { id: 103, message: "AI-ассистент не понимает «напомни завтра вечером»", sender_name: "Света", status: "new" },
  { id: 104, message: "Экспорт контактов в CSV не сохраняет теги", sender_name: "Кирилл", status: "resolved" },
];
const BUG_STATUS_META = {
  new: { label: "новый", bg: DANGER_BG, color: DANGER },
  in_progress: { label: "в работе", bg: AMBER_BG, color: AMBER },
  resolved: { label: "решено", bg: SUCCESS_BG, color: SUCCESS },
};
const DEMO_PROMPT = `# Баг-репорты и предложения — сборка v1.4.3

1. [Марина] При офлайне список задач иногда дублируется после синка
2. [Света] AI-ассистент не понимает «напомни завтра вечером»

Проверь каждый пункт, предложи фикс и оцени сложность.`;

const DIAG_LABELS = {
  TELEGRAM_BOT_TOKEN: "Telegram-бот", SUPABASE_URL: "Supabase URL", SUPABASE_SERVICE_ROLE_KEY: "Supabase ключ",
  ADMIN_CHAT_IDS: "Список админ-чатов", GEMINI_API_KEY: "Gemini API", GITHUB_TOKEN: "GitHub токен",
  GITHUB_REPO: "GitHub репозиторий", DEPLOY_NOTIFY_SECRET: "Уведомления о деплое",
};

const AVATAR_COLORS = ["#7C4DFF", "#3F6FCB", "#22A37A", "#D9A828", "#E5484D", "#B5722A"];

const PERMISSION_GROUPS = [
  { key: "team", title: "Команда", items: [
    { key: "teamChat", label: "Чат команды" },
    { key: "audit", label: "Журнал действий" },
    { key: "heatmap", label: "Активность админов" },
    { key: "roles", label: "Роли и доступы" },
  ] },
  { key: "money", title: "Деньги", items: [
    { key: "payment", label: "Оплата и цены" },
    { key: "transactions", label: "Транзакции" },
    { key: "revenue", label: "Отчёт по выручке" },
    { key: "referrals", label: "Рефералы" },
  ] },
  { key: "users", title: "Пользователи", items: [
    { key: "moderation", label: "Модерация" },
    { key: "bugs", label: "Баг-репорты" },
    { key: "broadcast", label: "Рассылка" },
  ] },
  { key: "product", title: "Продукт", items: [
    { key: "model", label: "AI-модель и лимиты" },
    { key: "aiUsage", label: "Расход AI" },
    { key: "flags", label: "Фиче-флаги" },
    { key: "onboarding", label: "Онбординг" },
    { key: "localization", label: "Локализация" },
    { key: "metrics", label: "Метрики продукта" },
    { key: "cohorts", label: "Когортный анализ" },
    { key: "nps", label: "NPS" },
    { key: "notes", label: "Заметки" },
    { key: "widgets", label: "Виджеты Главной" },
  ] },
  { key: "security", title: "Безопасность", items: [
    { key: "snapshots", label: "Снапшоты настроек" },
    { key: "secrets", label: "Возраст секретов" },
    { key: "maintenance", label: "Режим обслуживания" },
    { key: "webhook", label: "Вебхук Telegram" },
    { key: "loginHistory", label: "Входы в аккаунт" },
    { key: "alerts", label: "Алерты" },
  ] },
];
const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap((g) => g.items.map((it) => it.key));

const PERMISSION_HELP = {
  teamChat: "Переписка с другими администраторами внутри панели, с упоминаниями пользователей и багов.",
  audit: "Полная история действий команды: кто, что и когда изменил.",
  heatmap: "Тепловая карта — когда именно команда работает в панели по дням и времени суток.",
  roles: "Приглашать администраторов, менять их права и шаблоны ролей. Даёт доступ управлять доступом других.",
  payment: "Включать способы оплаты и менять цену подписки в Stars.",
  transactions: "Список всех платежей пользователей: кто, сколько, когда.",
  revenue: "Сводный отчёт по доходу — динамика, разбивка по периодам.",
  referrals: "Реферальная программа: кто кого привёл и начисленные бонусы.",
  moderation: "Жалобы на пользователей и решения по ним — предупреждать, банить.",
  bugs: "Баг-репорты от пользователей и переписка по ним.",
  broadcast: "Отправка сообщений всем пользователям или выбранному сегменту.",
  model: "Какая AI-модель используется и лимит бесплатных запросов.",
  aiUsage: "Расход запросов к AI-модели — сколько потрачено, кем.",
  flags: "Включение и выключение фиче-флагов — тестовых функций.",
  onboarding: "Экраны знакомства, которые видит новый пользователь.",
  localization: "Тексты интерфейса на разных языках.",
  metrics: "Ключевые метрики продукта: активность, удержание, рост.",
  cohorts: "Анализ групп пользователей по дате регистрации.",
  nps: "Опросы удовлетворённости и их результаты.",
  notes: "Внутренние заметки команды, не видны пользователям.",
  widgets: "Какие блоки показаны на Главной и в каком порядке.",
  snapshots: "Слепки настроек продукта на разные даты — можно откатиться.",
  secrets: "Сколько времени прошло с последней смены ключей и токенов.",
  maintenance: "Включение режима техработ для пользователей.",
  webhook: "Статус подключения Telegram-бота к серверу.",
  loginHistory: "Устройства и места, откуда входили в аккаунт, с возможностью выйти удалённо.",
  alerts: "Автоматические оповещения о сбоях и аномалиях.",
};

const DEFAULT_ROLE_TEMPLATES = [
  { id: "super", label: "Супер-админ", items: ALL_PERMISSION_KEYS, locked: true },
  { id: "moderator", label: "Модератор", items: ["teamChat", "audit", "moderation", "bugs", "broadcast"], locked: false },
  { id: "smm", label: "СММ", items: ["teamChat", "broadcast", "onboarding", "localization", "metrics", "notes", "widgets"], locked: false },
  { id: "finance", label: "Финансист", items: ["teamChat", "audit", "payment", "transactions", "revenue", "referrals"], locked: false },
];

function matchTemplate(items, templates) {
  const set = new Set(items);
  const match = templates.find((t) => t.items.length === set.size && t.items.every((k) => set.has(k)));
  return match ? match.id : null;
}

const INITIAL_AUDIT_LOG = [
  { id: 1, actor: "Вы", action: "Выключили промокод SPRING2026", reason: "Акция закончилась", time: "вчера, 18:42" },
  { id: 2, actor: "Вы", action: "Выдали Pro Кириллу Ким", reason: "Жест доброй воли — поддержка нашла баг", time: "3 дня назад" },
  { id: 3, actor: "Модератор Настя", action: "Заблокировали Свету Орлову", reason: "Подозрение на спам-рассылку", time: "5 дней назад" },
];

const INITIAL_ADMINS = [
  { id: "you", name: "Вы", tg: "@founder", avatarColor: AVATAR_COLORS[0], status: "active", isYou: true, permissions: ALL_PERMISSION_KEYS },
  { id: "a2", name: "Настя", tg: "@nastya_mod", avatarColor: AVATAR_COLORS[1], status: "active", isYou: false, permissions: ["teamChat", "audit", "moderation", "bugs", "broadcast"] },
  { id: "a3", name: "СММ-агент", tg: "@smm_agency", avatarColor: AVATAR_COLORS[2], status: "active", isYou: false, permissions: ["teamChat", "broadcast", "onboarding", "localization", "metrics", "notes", "widgets"] },
  { id: "a4", name: "", tg: "@dima_finance", avatarColor: AVATAR_COLORS[3], status: "invited", isYou: false, permissions: ["teamChat", "audit", "payment", "transactions", "revenue", "referrals"] },
];

const MODEL_OPTIONS = [
  { key: "gemini-2.5-flash", label: "Gemini 2.5 Flash", hint: "Быстрый, дешёвый — сейчас используется" },
  { key: "gemini-2.5-pro", label: "Gemini 2.5 Pro", hint: "Точнее, но дороже и медленнее" },
  { key: "gemini-2.0-flash", label: "Gemini 2.0 Flash", hint: "Предыдущее поколение, запасной вариант" },
];

const AI_USAGE_TREND = [
  { day: "Пн", value: 210 }, { day: "Вт", value: 260 }, { day: "Ср", value: 240 },
  { day: "Чт", value: 310 }, { day: "Пт", value: 355 }, { day: "Сб", value: 190 }, { day: "Вс", value: 170 },
];
const AI_TOP_USERS = [
  { name: "Кирилл Ким", tg: "@k_kim", requests: 412, cost: 1.86 },
  { name: "Марина Соколова", tg: "@m_sokolova", requests: 298, cost: 1.34 },
  { name: "Аня Ковалёва", tg: "@ankova", requests: 205, cost: 0.92 },
];

const FLAGGED_ACTIVITY = [
  { id: 1, user: "Света Орлова", tg: "@sveta_o", reason: "180 AI-запросов за час — сильно выше нормы", severity: "high", time: "2 часа назад" },
  { id: 2, user: "Неизвестный аккаунт", tg: "@user_9931204", reason: "Регистрация и сразу 40 попыток промокода подряд", severity: "high", time: "сегодня, 05:12" },
  { id: 3, user: "Дени Рахимов", tg: "@denirah", reason: "Одинаковый текст отправлен в 6 разных чатов", severity: "medium", time: "вчера" },
];

const DAU_TREND = [
  { day: "Пн", value: 62 }, { day: "Вт", value: 68 }, { day: "Ср", value: 71 },
  { day: "Чт", value: 65 }, { day: "Пт", value: 74 }, { day: "Сб", value: 48 }, { day: "Вс", value: 45 },
];
const RETENTION = [
  { label: "D1", value: 58 }, { label: "D7", value: 34 }, { label: "D30", value: 19 },
];
const FUNNEL = [
  { label: "Зарегистрировались", value: 100 },
  { label: "Добавили контакт", value: 74 },
  { label: "Активны 7+ дней", value: 41 },
  { label: "Оформили Pro", value: 12 },
];

const INITIAL_FLAGS = [
  { id: 1, name: "AI-ассистент 2.0", hint: "Новый движок с памятью контекста", enabled: true, rollout: 25 },
  { id: 2, name: "Голосовые заметки", hint: "Запись голосом вместо текста в задачах", enabled: true, rollout: 60 },
  { id: 3, name: "Общие цели с друзьями", hint: "Делиться прогрессом по целям", enabled: false, rollout: 0 },
  { id: 4, name: "Новый онбординг", hint: "Укороченный флоу первого запуска", enabled: true, rollout: 100 },
];

const INITIAL_ALERTS = [
  { id: 1, name: "Gemini-квота на исходе", hint: "Меньше 10% дневного лимита осталось", enabled: true },
  { id: 2, name: "Всплеск багов", hint: "Больше 5 новых баг-репортов за час", enabled: true },
  { id: 3, name: "Подозрительный пользователь", hint: "Сработало правило модерации", enabled: true },
  { id: 4, name: "Платёж не прошёл", hint: "Ошибка оплаты Stars у Pro-пользователя", enabled: false },
];

const INITIAL_TEMPLATES = [
  { id: 1, name: "Новый дизайн", text: "Обновили дизайн приложения — загляните в раздел «Цели» 👀", scheduled: null },
  { id: 2, name: "Скидка выходного дня", text: "Только сегодня: −30% на Pro по промокоду WEEKEND30", scheduled: "суббота, 10:00" },
  { id: 3, name: "Праздничное поздравление", text: "С праздником! Дарим 7 дней Pro всем активным пользователям 🎉", scheduled: null },
];

const INITIAL_ONBOARDING = [
  { id: 1, title: "Приветствие и разрешения", hint: "Доступ к контактам и уведомлениям", enabled: true },
  { id: 2, title: "Добавить первый контакт", hint: "Показываем, как это работает на примере", enabled: true },
  { id: 3, title: "Создать первую цель", hint: "Можно пропустить", enabled: true },
  { id: 4, title: "Подключить AI-ассистента", hint: "Демо-запрос, чтобы показать возможности", enabled: false },
  { id: 5, title: "Предложение Pro", hint: "Показывается на 3-й день, не сразу", enabled: true },
];

const LOCALIZATION_LANGS = [
  { code: "ru", label: "Русский", complete: 100 },
  { code: "en", label: "English", complete: 82 },
  { code: "es", label: "Español", complete: 41 },
  { code: "kz", label: "Қазақша", complete: 15 },
];
const LOCALIZATION_STRINGS = [
  { key: "onboarding.welcome_title", ru: "Добро пожаловать!", en: "Welcome!" },
  { key: "goals.add_button", ru: "Добавить цель", en: "Add goal" },
  { key: "pro.upsell_title", ru: "Откройте Pro", en: "Unlock Pro" },
];

const WINBACK_SEGMENT_COUNT = 2; // пользователей с lastActive не "сегодня"/"вчера" в демо-наборе

const INITIAL_SNAPSHOTS = [
  { id: 1, time: "вчера, 09:00", note: "Автоснапшот перед снижением цены", settings: { priceStars: 990, priceOld: 1999, model: "gemini-2.5-flash", freeLimit: 20 } },
  { id: 2, time: "5 дней назад", note: "Перед запуском промо WELCOME30", settings: { priceStars: 990, priceOld: 1999, model: "gemini-2.5-flash", freeLimit: 15 } },
];

const SECRET_AGES = [
  { key: "GEMINI_API_KEY", label: "Gemini API", days: 112 },
  { key: "TELEGRAM_BOT_TOKEN", label: "Telegram-бот", days: 41 },
  { key: "SUPABASE_SERVICE_ROLE_KEY", label: "Supabase ключ", days: 205 },
  { key: "DEPLOY_NOTIFY_SECRET", label: "Уведомления о деплое", days: 18 },
];
const SECRET_ROTATION_WARN_DAYS = 90;

const WEBHOOK_STATUS = { alive: true, lastPing: "2 минуты назад", responseMs: 184, endpoint: "/api/telegram-webhook" };

const COHORTS = [
  { month: "Май 2026", size: 42, d1: 64, d7: 38, d30: 22 },
  { month: "Июн 2026", size: 58, d1: 61, d7: 35, d30: 18 },
  { month: "Июл 2026", size: 71, d1: 59, d7: 31, d30: null },
];

const NPS_DATA = { score: 42, promoters: 58, passives: 27, detractors: 15, responses: 96 };
const NPS_COMMENTS = [
  { score: 10, text: "Наконец нормальный трекер контактов, а не просто список дел", who: "Кирилл Ким" },
  { score: 9, text: "AI-ассистент реально понимает контекст, это удобно", who: "Марина Соколова" },
  { score: 4, text: "Иногда путается с напоминаниями по времени", who: "Света Орлова" },
];

const HOME_WIDGET_OPTIONS = [
  { key: "balance", label: "Баланс и счётчики" },
  { key: "attention", label: "Требует внимания" },
  { key: "quickActions", label: "Быстрые действия" },
  { key: "activity", label: "Последняя активность" },
];

const HEATMAP_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const HEATMAP_SLOTS = ["утро", "день", "вечер", "ночь"];
const ADMIN_HEATMAP = [
  [2, 6, 4, 0], [1, 7, 5, 0], [3, 8, 3, 1], [2, 6, 6, 0], [4, 9, 7, 1], [0, 2, 1, 0], [0, 1, 1, 0],
];

const INITIAL_TEAM_CHAT = [
  { id: 1, author: "Настя", role: "moderator", text: "Заблокировала Свету Орлову — похоже на спам-рассылку одинаковым текстом", time: "вчера, 18:40", mention: { type: "user", id: 5, label: "Профиль: Света Орлова" } },
  { id: 2, author: "Вы", role: "super", text: "Видел, спасибо! Проверь ещё этот баг-репорт, пользователь жалуется на похожую тему", time: "вчера, 19:02", mention: { type: "bug", id: 103, label: "Баг: «завтра вечером» не понимает" } },
  { id: 3, author: "Настя", role: "moderator", text: "Гляну сегодня вечером, добавлю в буфер багов если подтвердится", time: "вчера, 19:05", mention: null },
  { id: 4, author: "Вы", role: "super", text: "Кстати, подняли цену Pro до 599 — если будут вопросы от пользователей, ссылайся на акцию весной", time: "сегодня, 09:10", mention: null },
];


const SESSION_IDLE_LIMIT_MS = 5 * 60 * 1000;
const SESSION_WARNING_MS = 60 * 1000;

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_ACTIONS = 3;

/* ---------------- Мелкие переиспользуемые блоки ---------------- */

function Header({ title, onBack, identity, onProfileTap, darkMode, onToggleDark }) {
  return (
    <div style={s.header}>
      {onBack && (
        <button type="button" className="fp-btn" onClick={onBack} style={s.backBtn}>
          <ChevronLeft size={18} color={INK} />
        </button>
      )}
      <div style={s.headerTitle}>{title}</div>
      {!onBack && (
        <button type="button" className="fp-btn" onClick={onToggleDark} style={{ width: 34, height: 34, borderRadius: "50%", background: CARD_BG, border: CARD_BORDER, boxShadow: CARD_SHADOW, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {darkMode ? <Sun size={15} color={GOLD} /> : <Moon size={15} color={MUTED} />}
        </button>
      )}
      {!onBack && identity && (
        <button type="button" className="fp-btn" onClick={onProfileTap} style={{ display: "flex", alignItems: "center", gap: 7, padding: "4px 10px 4px 4px", borderRadius: 999, background: CARD_BG, border: CARD_BORDER, boxShadow: CARD_SHADOW, flexShrink: 0 }}>
          <div style={{ width: 26, height: 26, borderRadius: "50%", background: identity.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {identity.name.slice(0, 1).toUpperCase()}
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: INK, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{identity.name}</span>
        </button>
      )}
    </div>
  );
}

function Toast({ text }) {
  if (!text) return null;
  return <div className="fp-toast" style={s.toast}>{text}</div>;
}

/* ---------------- Главная (Дашборд) ---------------- */

function HomeScreen({ unreadChat, onNav, widgets, priceStars, pinned, role, adminName }) {
  const [stats, setStats] = useState(null); // null = грузится
  useEffect(() => {
    fetchHomeStats().then(setStats).catch(() => setStats({ totalUsers: 0, proUsers: 0, revenueStars: 0, openBugs: 0, pendingInvites: 0, recentLog: [] }));
  }, []);

  const canSeeMoney = role === "super";
  const [hideBalance, setHideBalance] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 6 ? "Доброй ночи" : hour < 12 ? "Доброе утро" : hour < 18 ? "Добрый день" : "Добрый вечер";
  const firstName = (adminName || "").trim().split(" ")[0];

  const openBugs = stats?.openBugs || 0;
  const pendingInvites = stats?.pendingInvites || 0;
  const attentionItems = [
    openBugs > 0 && { icon: Bug, text: `${openBugs} баг-репорт${openBugs === 1 ? "" : "а"} без ответа`, urgent: true, onClick: () => onNav("bugs") },
    unreadChat > 0 && { icon: MessageSquare, text: `${unreadChat} непрочитанных в чате команды`, urgent: false, onClick: () => onNav("teamChat") },
    role === "super" && pendingInvites > 0 && { icon: UsersIcon, text: `${pendingInvites} приглашение ещё не принято`, urgent: false, onClick: () => onNav("roles") },
  ].filter(Boolean);

  const recentLog = stats?.recentLog || [];

  const sections = {
    balance: (
      <div key="balance" style={s.heroCardSolid}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.55)", letterSpacing: "0.01em" }}>{canSeeMoney ? "Собрано звёзд всего" : "Пользователей всего"}</div>
            {canSeeMoney && (
              <button type="button" className="fp-btn" onClick={() => setHideBalance((h) => !h)} style={{ padding: 3, display: "flex" }}>
                {hideBalance ? <EyeOff size={13} color="rgba(255,255,255,0.5)" /> : <Eye size={13} color="rgba(255,255,255,0.5)" />}
              </button>
            )}
          </div>
          <button type="button" className="fp-btn" onClick={() => onNav(canSeeMoney ? "transactions" : "users")}
            style={{ background: "rgba(255,255,255,0.14)", color: "#fff", borderRadius: 999, padding: "6px 12px", fontSize: 11.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
            История <ChevronRight size={12} />
          </button>
        </div>

        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 32, marginBottom: 16, display: "flex", alignItems: "baseline", gap: 6, letterSpacing: "-0.01em" }}>
          {stats === null ? "…" : canSeeMoney ? (hideBalance ? "••••••" : stats.revenueStars.toLocaleString("ru-RU")) : stats.totalUsers}
          {canSeeMoney && !hideBalance && stats !== null && <Star size={16} color="rgba(255,255,255,0.7)" fill="rgba(255,255,255,0.7)" style={{ marginBottom: 2 }} />}
        </div>
        {canSeeMoney && stats !== null && (
          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.55)", marginTop: -10, marginBottom: 16 }}>из них {stats.proUsers} с Pro</div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {canSeeMoney ? (
            <>
              <button type="button" className="fp-btn" onClick={() => onNav("transactions")} style={{ flex: 1, background: "#fff", color: "#14121B", border: "none", borderRadius: 999, padding: "11px 8px", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><History size={13} /> Платежи</button>
              <button type="button" className="fp-btn" onClick={() => onNav("payment")} style={{ flex: 1, background: "rgba(255,255,255,0.12)", color: "#fff", border: "none", borderRadius: 999, padding: "11px 8px", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><CreditCard size={13} /> Цены</button>
            </>
          ) : (
            <>
              <button type="button" className="fp-btn" onClick={() => onNav("users")} style={{ flex: 1, background: "#fff", color: "#14121B", border: "none", borderRadius: 999, padding: "11px 8px", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><UsersIcon size={13} /> Все</button>
              <button type="button" className="fp-btn" onClick={() => onNav("bugs")} style={{ flex: 1, background: "rgba(255,255,255,0.12)", color: "#fff", border: "none", borderRadius: 999, padding: "11px 8px", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Bug size={13} /> Баги</button>
            </>
          )}
        </div>
      </div>
    ),
    attention: attentionItems.length > 0 && (
      <div key="attention">
        <div style={s.sectionLabel}>Требует внимания</div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10, marginBottom: 4 }}>
          {attentionItems.map((item, i) => (
            <HomeTile key={i} icon={item.icon} label={item.text} onClick={item.onClick} urgent={item.urgent} />
          ))}
        </div>
      </div>
    ),
    quickActions: (
      <div key="quickActions">
        <div style={s.sectionLabel}>Быстрые действия</div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10, marginBottom: 4 }}>
          <HomeTile icon={Megaphone} label="Рассылка" sub="Написать пользователям" onClick={() => onNav("broadcast")} />
          <HomeTile icon={MessageSquare} label="Чат команды" sub={unreadChat > 0 ? `${unreadChat} новых` : "Всё прочитано"} onClick={() => onNav("teamChat")} badge={unreadChat > 0 ? unreadChat : null} />
          <HomeTile icon={Cpu} label="AI-модель" sub="Настройки, лимиты" onClick={() => onNav("model")} />
          <HomeTile icon={ClipboardList} label="Журнал" sub="Кто что делал" onClick={() => onNav("audit")} />
        </div>
      </div>
    ),
    activity: (
      <div key="activity">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={s.sectionLabel}>Последняя активность</div>
          {recentLog.length > 0 && <button type="button" className="fp-btn" onClick={() => onNav("audit")} style={{ fontSize: 12, fontWeight: 700, color: PURPLE, marginRight: 2 }}>Все</button>}
        </div>
        {recentLog.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Пока пусто" hint="Действия команды появятся здесь" />
        ) : (
          <div style={{ background: INPUT_BG, borderRadius: 18, padding: "4px 14px", marginBottom: 12 }}>
            {recentLog.map((item, i, arr) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 0", borderBottom: i === arr.length - 1 ? "none" : "1px solid var(--fp-border)" }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: "#14121B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ClipboardList size={15} color="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: INK, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.action}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{item.actorName} · {formatRelativeTime(item.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
  };

  return (
    <div className="fp-screen">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "2px 2px 16px" }}>
        <div>
          <div style={{ fontSize: 12, color: MUTED, fontWeight: 500, marginBottom: 2 }}>{greeting}</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 19, fontWeight: 800, color: INK }}>{firstName || "Привет"}</div>
        </div>
        <button type="button" className="fp-btn" onClick={() => onNav("audit")} style={{ position: "relative", width: 38, height: 38, borderRadius: "50%", background: CARD_BG, border: CARD_BORDER, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Bell size={16} color={INK} />
          {attentionItems.length > 0 && (
            <span style={{ position: "absolute", top: 8, right: 9, width: 7, height: 7, borderRadius: "50%", background: DANGER, border: `1.5px solid ${CARD_BG}` }} />
          )}
        </button>
      </div>

      {pinned.length > 0 && (
        <>
          <div style={s.sectionLabel}>Закреплённое</div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10, marginBottom: 4 }}>
            {pinned.map((key) => {
              const meta = buildMenuGroups(role, 0).flatMap((g) => g.items).find((it) => it.key === key);
              if (!meta) return null;
              return <HomeTile key={key} icon={meta.icon} label={meta.label} sub={meta.hint} onClick={() => onNav(key)} />;
            })}
          </div>
        </>
      )}

      {widgets.filter((w) => w.enabled).map((w) => sections[w.key])}
    </div>
  );
}

function HomeTile({ icon: Icon, label, sub, onClick, urgent, badge }) {
  return (
    <button type="button" className="fp-row" onClick={onClick}
      style={{ background: INPUT_BG, border: "none", borderRadius: 18, padding: "14px 14px 13px", textAlign: "left", display: "flex", flexDirection: "column", gap: 10, position: "relative", minHeight: 92 }}>
      {(urgent || badge > 0) && (
        <span style={{ position: "absolute", top: 12, right: 12, minWidth: badge > 0 ? 17 : 8, height: badge > 0 ? 17 : 8, padding: badge > 0 ? "0 4px" : 0, borderRadius: 999, background: DANGER, color: "#fff", fontSize: 9.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{badge > 9 ? "9+" : (badge > 0 ? badge : "")}</span>
      )}
      <div style={{ width: 34, height: 34, borderRadius: 11, background: "#14121B", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={16} color="#fff" />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: INK, lineHeight: 1.25 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 2, lineHeight: 1.3 }}>{sub}</div>}
      </div>
    </button>
  );
}

/* ---------------- Пользователи ---------------- */

const USER_FILTERS = [
  { key: "all", label: "Все" },
  { key: "pro", label: "Pro" },
  { key: "free", label: "Free" },
  { key: "blocked", label: "Заблокированы" },
];
const PAGE_SIZE = 4;

function formatRelativeTime(isoString) {
  if (!isoString) return "давно";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} дн назад`;
  return new Date(isoString).toLocaleDateString("ru-RU");
}

function UsersScreen({ onOpenUser }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [listError, setListError] = useState("");

  function load(search) {
    setLoading(true); setListError("");
    fetchAdminUsers(search)
      .then(({ users }) => setUsers(users))
      .catch((e) => setListError(e.message || "Не удалось загрузить список"))
      .finally(() => setLoading(false));
  }

  // Debounce поиска — не долбим сервер на каждую нажатую букву.
  useEffect(() => {
    const t = setTimeout(() => load(query.trim() || undefined), 300);
    return () => clearTimeout(t);
  }, [query]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (filter === "pro") return u.plan === "pro";
      if (filter === "free") return u.plan === "free";
      if (filter === "blocked") return u.blocked;
      return true;
    });
  }, [users, filter]);

  const visible = filtered.slice(0, page * PAGE_SIZE);

  return (
    <div className="fp-screen">
      <div style={s.searchBar}>
        <Search size={16} color={MUTED} />
        <input
          value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Поиск по имени или @username"
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: INK }}
        />
      </div>
      <div style={{ display: "flex", gap: 7, marginBottom: 12, overflowX: "auto" }}>
        {USER_FILTERS.map((f) => (
          <button key={f.key} type="button" className="fp-btn" onClick={() => { setFilter(f.key); setPage(1); }}
            style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", background: filter === f.key ? PURPLE_GRADIENT : CARD_BG, color: filter === f.key ? "#fff" : INK, border: filter === f.key ? "none" : CARD_BORDER, boxShadow: filter === f.key ? PURPLE_GRADIENT_SHADOW : "none" }}>
            {f.label}
          </button>
        ))}
      </div>

      {listError && <div style={{ fontSize: 12.5, color: DANGER, marginBottom: 12 }}>{listError}</div>}

      {loading ? (
        <ListSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={query ? Search : UsersIcon} title={query ? `Ничего не найдено по «${query}»` : "Здесь пока пусто"} hint={query ? "Проверьте написание имени или @username" : "Как только кто-то откроет апп, он появится тут"} />
      ) : (
        <>
      <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 10 }}>{filtered.length} из {users.length}</div>
      {visible.map((u) => (
        <button key={u.chatId} type="button" className="fp-row" onClick={() => onOpenUser(u)} style={{ ...s.listRow, width: "100%", textAlign: "left" }}>
          <div style={s.avatarBubble(PURPLE_SOFT, PURPLE)}>{(u.name || u.tgUsername || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: INK, fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name || "Без имени"}</div>
              {u.plan === "pro" && <Crown size={13} color={GOLD} />}
            </div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{u.tgUsername ? `@${u.tgUsername}` : u.chatId} · был(а) {formatRelativeTime(u.lastSeenAt)}</div>
          </div>
          {u.blocked ? (
            <span style={s.badge(DANGER_BG, DANGER)}>заблокирован</span>
          ) : (
            <span style={s.badge(u.plan === "pro" ? "#FBEEDD" : "#EEF" , u.plan === "pro" ? GOLD : MUTED)}>{u.plan === "pro" ? "Pro" : "Free"}</span>
          )}
          <ChevronRight size={16} color={MUTED_SOFT} />
        </button>
      ))}
      {visible.length < filtered.length && (
        <button type="button" className="fp-btn" onClick={() => setPage((p) => p + 1)} style={{ ...s.secondaryPill, width: "100%", marginTop: 4 }}>
          Показать ещё ({filtered.length - visible.length})
        </button>
      )}
        </>
      )}
    </div>
  );
}

const USER_TABS = [
  { key: "bugs", label: "Баги" },
  { key: "referrals", label: "Рефералы" },
];

function UserDetailScreen({ user, onTogglePlan, onToggleBlock, role, isRateLimited, registerDangerousAction, notify }) {
  const [pending, setPending] = useState(null); // 'plan' | 'block' | null
  const [awaiting2FA, setAwaiting2FA] = useState(null); // { action, reason } | null
  const [tab, setTab] = useState("bugs");
  const [activity, setActivity] = useState(null); // null = грузится
  const [activityError, setActivityError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    if (!user?.chatId) return;
    setActivity(null);
    setActivityError("");
    fetchUserActivity(user.chatId)
      .then(setActivity)
      .catch((e) => setActivityError(e.message || "Не удалось загрузить активность"));
    setTab("bugs");
  }, [user?.chatId]);

  if (!user) return null;

  function confirmReason(reason) {
    setAwaiting2FA({ action: pending, reason });
    setPending(null);
  }
  async function confirm2FA() {
    try {
      if (awaiting2FA.action === "plan") await onTogglePlan(user, awaiting2FA.reason);
      if (awaiting2FA.action === "block") await onToggleBlock(user, awaiting2FA.reason);
      if (awaiting2FA.action === "delete") {
        await deleteUserData(user.chatId, awaiting2FA.reason);
        notify(`Данные ${user.name || user.chatId} удалены`);
      }
      registerDangerousAction();
      setAwaiting2FA(null);
    } catch (e) {
      notify(e.message || "Не удалось выполнить действие");
      setAwaiting2FA(null);
    }
  }

  return (
    <div className="fp-screen">
      <div style={{ ...s.card, textAlign: "center", paddingTop: 22, paddingBottom: 20 }}>
        <div style={{ width: 68, height: 68, borderRadius: 20, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 24, color: PURPLE }}>
          {(user.name || user.tgUsername || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
        </div>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 18 }}>{user.name || "Без имени"}</div>
        <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{user.tgUsername ? `@${user.tgUsername}` : user.chatId}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 10 }}>
          <span style={s.badge(user.plan === "pro" ? "#FBEEDD" : "#EEF", user.plan === "pro" ? GOLD : MUTED)}>{user.plan === "pro" ? "Pro" : "Free"}</span>
          {user.blocked && <span style={s.badge(DANGER_BG, DANGER)}>заблокирован</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
        {USER_TABS.map((t) => (
          <button key={t.key} type="button" className="fp-btn" onClick={() => setTab(t.key)}
            style={{ flex: 1, padding: "9px 0", borderRadius: 12, fontSize: 12.5, fontWeight: 700, textAlign: "center", background: tab === t.key ? PURPLE_GRADIENT : CARD_BG, color: tab === t.key ? "#fff" : INK, border: tab === t.key ? "none" : CARD_BORDER, boxShadow: tab === t.key ? PURPLE_GRADIENT_SHADOW : "none" }}>
            {t.label}{activity ? ` · ${t.key === "bugs" ? activity.bugs.length : activity.referred.length}` : ""}
          </button>
        ))}
      </div>

      {activity === null ? (
        activityError ? <div style={{ fontSize: 12.5, color: DANGER, marginBottom: 12 }}>{activityError}</div> : <ListSkeleton rows={2} />
      ) : (
        <>
          {tab === "bugs" && (
            activity.bugs.length === 0 ? (
              <EmptyState icon={Bug} title="Багов нет" hint="Пользователь ничего не присылал боту" />
            ) : activity.bugs.map((b) => (
              <div key={b.id} style={s.rowCard}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: INK }}>{b.message}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{b.status === "resolved" ? "решено" : b.status === "in_progress" ? "в работе" : "новый"} · {formatRelativeTime(b.created_at)}</div>
                </div>
              </div>
            ))
          )}
          {tab === "referrals" && (
            <>
              <div style={s.card}>
                <div style={s.fieldRow}><span style={s.fieldLabel}>Кто привёл</span><span style={{ fontSize: 13, color: MUTED }}>{activity.referredBy || "никто (пришёл сам)"}</span></div>
                <div style={{ ...s.fieldRow, borderBottom: "none" }}><span style={s.fieldLabel}>Сам привёл</span><span style={{ fontSize: 13, color: MUTED }}>{activity.referred.length}</span></div>
              </div>
              {activity.referred.length > 0 && activity.referred.map((r, i) => (
                <div key={i} style={s.rowCard}>
                  <div style={{ flex: 1, fontSize: 13, color: INK }}>{r.name}</div>
                  <div style={{ fontSize: 11.5, color: MUTED }}>{formatRelativeTime(r.time)}</div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      <div style={s.sectionLabel}>Информация</div>
      <div style={s.card}>
        <div style={s.fieldRow}><span style={s.fieldLabel}>Первый визит</span><span style={{ fontSize: 13, color: MUTED }}>{user.firstSeenAt ? formatRelativeTime(user.firstSeenAt) : "—"}</span></div>
        <div style={{ ...s.fieldRow, borderBottom: "none" }}><span style={s.fieldLabel}>Был в сети</span><span style={{ fontSize: 13, color: MUTED }}>{formatRelativeTime(user.lastSeenAt)}</span></div>
      </div>

      <div style={s.sectionLabel}>Управление</div>
      <div style={s.card}>
        {role === "super" ? (
          <div style={s.fieldRow}>
            <span style={s.fieldLabel}>Доступ Pro</span>
            <Switch on={user.plan === "pro"} onToggle={() => setPending("plan")} />
          </div>
        ) : (
          <div style={{ ...s.fieldRow, opacity: 0.5 }}>
            <span style={s.fieldLabel}>Доступ Pro</span>
            <span style={{ fontSize: 11.5, color: MUTED }}>только супер-админ</span>
          </div>
        )}
        <div style={{ ...s.fieldRow, borderBottom: "none" }}>
          <span style={s.fieldLabel}>Заблокирован</span>
          <Switch on={user.blocked} onToggle={() => setPending("block")} />
        </div>
      </div>

      {role === "super" && (
        <>
          <div style={s.sectionLabel}>Данные по запросу пользователя (GDPR)</div>
          <div style={s.card}>
            <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 10, lineHeight: 1.5 }}>
              Контакты, задачи и цели хранятся только на устройстве пользователя (Telegram CloudStorage) — сервер их не видит и экспортировать/удалить не может. Ниже — то, что реально есть на сервере.
            </div>
            <button type="button" className="fp-btn" onClick={() => {
              if (!activity) return;
              downloadCsv(`user-${user.chatId}-data.csv`, toCsv(
                [...activity.bugs.map((b) => ({ type: "bug_report", value: b.message, note: b.status })),
                 ...activity.referred.map((r) => ({ type: "referred", value: r.name, note: r.time }))],
                ["type", "value", "note"]
              ));
            }} disabled={!activity} style={{ ...s.secondaryPill, width: "100%", marginBottom: 8, opacity: activity ? 1 : 0.5 }}>
              <Download size={14} /> Экспортировать данные с сервера
            </button>
            <button type="button" className="fp-btn" onClick={() => setDeleting(true)} style={{ ...s.dangerGhost, width: "100%" }}>
              <UserX size={14} /> Удалить данные пользователя безвозвратно
            </button>
          </div>
        </>
      )}

      {pending && (
        <ReasonSheet
          title={pending === "plan" ? (user.plan === "pro" ? "Забрать Pro-доступ" : "Выдать Pro-доступ") : (user.blocked ? "Разблокировать" : "Заблокировать")}
          hint="Действие попадёт в журнал администратора с указанием причины."
          onCancel={() => setPending(null)}
          onConfirm={confirmReason}
        />
      )}

      {awaiting2FA && (
        <TwoFactorSheet
          title={awaiting2FA.action === "plan" ? "Подтвердите изменение Pro" : awaiting2FA.action === "delete" ? "Подтвердите удаление данных" : "Подтвердите блокировку"}
          hint="Критичное действие требует второго фактора подтверждения."
          rateLimited={isRateLimited()}
          onCancel={() => setAwaiting2FA(null)}
          onConfirm={confirm2FA}
        />
      )}

      {deleting && (
        <div style={s.overlay} onClick={() => setDeleting(false)}>
          <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <UserX size={18} color={DANGER} />
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17 }}>Удалить данные {user.name || user.chatId}?</div>
            </div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 14, lineHeight: 1.5 }}>
              Баг-репорты и реферальные связи на сервере будут стёрты безвозвратно, запись пользователя удалена.
              Наберите <b style={{ color: INK }}>УДАЛИТЬ</b>, чтобы подтвердить.
            </div>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="УДАЛИТЬ" style={{ ...s.fieldInput, marginBottom: 14, textAlign: "center" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="fp-btn" onClick={() => { setDeleting(false); setConfirmText(""); }} style={{ ...s.secondaryPill, flex: 1 }}>Отмена</button>
              <button type="button" className="fp-btn" disabled={confirmText.trim() !== "УДАЛИТЬ"} onClick={() => {
                setDeleting(false); setConfirmText("");
                setAwaiting2FA({ action: "delete", reason: "Право на забвение — запрос на удаление данных" });
              }} style={{ ...s.dangerGhost, flex: 1, opacity: confirmText.trim() === "УДАЛИТЬ" ? 1 : 0.5 }}>Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Промокоды ---------------- */

function PromoScreen() {
  const [promos, setPromos] = useState(null); // null = грузится
  const [listError, setListError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState("20");
  const [limit, setLimit] = useState("100");
  const [boundChatId, setBoundChatId] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  function load() {
    setListError("");
    fetchPromoCodes().then(({ promos }) => setPromos(promos)).catch((e) => setListError(e.message || "Не удалось загрузить"));
  }
  useEffect(load, []);

  function validate() {
    const errs = {};
    const trimmed = code.trim();
    if (!trimmed) errs.code = "Введите код промокода";
    else if (trimmed.length < 3) errs.code = "Минимум 3 символа";
    const d = Number(discount);
    if (!discount || isNaN(d)) errs.discount = "Укажите скидку";
    else if (d < 1 || d > 100) errs.discount = "От 1 до 100%";
    if (!boundChatId.trim()) {
      const l = Number(limit);
      if (!limit || isNaN(l)) errs.limit = "Укажите лимит";
      else if (l < 1) errs.limit = "Минимум 1";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit() {
    if (!validate() || saving) return;
    setSaving(true);
    try {
      await createPromoCode({
        code: code.trim().toUpperCase(),
        discount: Number(discount),
        usesLimit: boundChatId.trim() ? null : Number(limit),
        boundChatId: boundChatId.trim() || null,
      });
      setCode(""); setDiscount("20"); setLimit("100"); setBoundChatId(""); setErrors({});
      setShowForm(false);
      load();
    } catch (e) {
      setErrors({ code: e.message || "Не получилось создать" });
    } finally {
      setSaving(false);
    }
  }

  async function onToggle(id) { await togglePromoCode(id).catch((e) => setListError(e.message)); load(); }
  async function onDelete(id) { await deletePromoCode(id).catch((e) => setListError(e.message)); load(); }

  return (
    <div className="fp-screen">
      <button type="button" className="fp-btn" onClick={() => setShowForm(true)} style={{ ...s.primaryPill, width: "100%", marginBottom: 14 }}>
        <Plus size={16} /> Создать промокод
      </button>

      {listError && <div style={{ fontSize: 12.5, color: DANGER, marginBottom: 12 }}>{listError}</div>}

      {promos === null ? (
        <ListSkeleton rows={3} />
      ) : promos.length === 0 ? (
        <EmptyState icon={Tag} title="Промокодов пока нет" hint="Создайте первый, чтобы предложить скидку пользователям" />
      ) : promos.map((p) => (
        <div key={p.id} style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: "0.02em" }}>{p.code}</div>
            <span style={s.badge(p.active ? SUCCESS_BG : DANGER_BG, p.active ? SUCCESS : DANGER)}>{p.active ? "активен" : "выключен"}</span>
          </div>
          {p.boundChatId && (
            <div style={{ ...s.badge(PURPLE_SOFT, PURPLE), display: "inline-block", marginBottom: 8 }}>только для {p.boundChatId}</div>
          )}
          <div style={{ fontSize: 13, color: MUTED, marginBottom: 10 }}>
            Скидка {p.discount}% · использован {p.usesCount}{p.usesLimit ? ` из ${p.usesLimit}` : ""} · {p.expiresAt ? `до ${new Date(p.expiresAt).toLocaleDateString("ru-RU")}` : "бессрочно"}
          </div>
          {p.usesLimit && (
            <div style={{ height: 6, borderRadius: 999, background: "rgba(11,11,16,0.07)", overflow: "hidden", marginBottom: 12 }}>
              <div style={{ height: "100%", borderRadius: 999, width: `${Math.min(100, (p.usesCount / p.usesLimit) * 100)}%`, background: PURPLE_GRADIENT }} />
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="fp-btn" onClick={() => onToggle(p.id)} style={{ ...s.secondaryPill, flex: 1, padding: "10px 0" }}>
              {p.active ? "Выключить" : "Включить"}
            </button>
            <button type="button" className="fp-btn" onClick={() => onDelete(p.id)} style={{ ...s.dangerGhost, padding: "10px 14px" }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      {showForm && (
        <div style={s.overlay} onClick={() => setShowForm(false)}>
          <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, marginBottom: 16 }}>Новый промокод</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, marginBottom: 5 }}>КОД</div>
                <input value={code} onChange={(e) => { setCode(e.target.value); setErrors((er) => ({ ...er, code: null })); }} placeholder="Например, SUMMER25"
                  style={{ ...s.fieldInput, border: errors.code ? `1.5px solid ${DANGER}` : CARD_BORDER }} />
                {errors.code && <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: DANGER, marginTop: 5 }}><CircleAlert size={12} /> {errors.code}</div>}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, marginBottom: 5 }}>СКИДКА, %</div>
                  <input value={discount} onChange={(e) => { setDiscount(e.target.value); setErrors((er) => ({ ...er, discount: null })); }} type="number"
                    style={{ ...s.fieldInput, border: errors.discount ? `1.5px solid ${DANGER}` : CARD_BORDER }} />
                  {errors.discount && <div style={{ fontSize: 11.5, color: DANGER, marginTop: 5 }}>{errors.discount}</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, marginBottom: 5 }}>ЛИМИТ АКТИВАЦИЙ</div>
                  <input value={limit} onChange={(e) => { setLimit(e.target.value); setErrors((er) => ({ ...er, limit: null })); }} type="number" disabled={!!boundChatId.trim()}
                    style={{ ...s.fieldInput, opacity: boundChatId.trim() ? 0.5 : 1, border: errors.limit ? `1.5px solid ${DANGER}` : CARD_BORDER }} />
                  {errors.limit && <div style={{ fontSize: 11.5, color: DANGER, marginTop: 5 }}>{errors.limit}</div>}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, marginBottom: 5 }}>ПРИВЯЗАТЬ К TELEGRAM ID (НЕОБЯЗАТЕЛЬНО)</div>
                <input value={boundChatId} onChange={(e) => setBoundChatId(e.target.value)} placeholder="Например, 123456789" style={s.fieldInput} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="fp-btn" onClick={() => setShowForm(false)} style={{ ...s.secondaryPill, flex: 1 }}>Отмена</button>
              <button type="button" className="fp-btn" onClick={submit} disabled={saving} style={{ ...s.primaryPill, flex: 1, opacity: saving ? 0.6 : 1 }}>{saving ? "Создаём…" : "Создать"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Оплата и цены ---------------- */

function PaymentScreen({ settings, setSettings, notify, onPriceChange, isRateLimited, registerDangerousAction }) {
  const [priceStars, setPriceStars] = useState(String(settings.priceStars));
  const [priceOld, setPriceOld] = useState(String(settings.priceOld));
  const [error, setError] = useState("");
  const [awaiting2FA, setAwaiting2FA] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(true);

  // Реальная цена (та же, что видит api/create-stars-invoice.js) может
  // отличаться от дефолта 599/1999, зашитого в начальный useState settings
  // на верхнем уровне — подтягиваем актуальное значение с сервера.
  useEffect(() => {
    fetchPricing()
      .then(({ priceStars: ps, priceOld: po }) => {
        setSettings((s0) => ({ ...s0, priceStars: ps, priceOld: po ?? s0.priceOld }));
        setPriceStars(String(ps));
        setPriceOld(String(po ?? ""));
      })
      .catch(() => {}) // не удалось — остаёмся на локальном дефолте, не блокируем экран
      .finally(() => setLoadingPrice(false));
  }, []);

  function toggleMethod(key) {
    const enabledCount = Object.values({ ...settings.methods, [key]: !settings.methods[key] }).filter(Boolean).length;
    if (enabledCount === 0) { notify("Должен остаться хотя бы один способ оплаты"); return; }
    setSettings((s0) => ({ ...s0, methods: { ...s0.methods, [key]: !s0.methods[key] } }));
  }
  function save() {
    const newPrice = Number(priceStars);
    const newOld = Number(priceOld);
    if (!priceStars || isNaN(newPrice) || newPrice <= 0) { setError("Цена должна быть больше 0"); return; }
    if (priceOld && (isNaN(newOld) || newOld < 0)) { setError("Старая цена не может быть отрицательной"); return; }
    if (priceOld && newOld > 0 && newOld <= newPrice) { setError("Старая цена обычно выше новой — проверьте значения"); return; }
    setError("");
    if (newPrice !== settings.priceStars) {
      setAwaiting2FA({ newPrice, newOld: newOld || settings.priceOld });
      return;
    }
    // Меняется только "старая цена" (для зачёркнутой отметки скидки) — это
    // не критично, 2FA не требуется, но всё равно реально сохраняем.
    savePricing(settings.priceStars, newOld || settings.priceOld)
      .then(() => {
        setSettings((s0) => ({ ...s0, priceOld: newOld || s0.priceOld }));
        notify("Настройки оплаты сохранены");
      })
      .catch((e) => notify(e.message || "Не удалось сохранить"));
  }
  async function confirm2FA() {
    setSaving(true);
    try {
      await savePricing(awaiting2FA.newPrice, awaiting2FA.newOld);
      onPriceChange(settings.priceStars, awaiting2FA.newPrice);
      setSettings((s0) => ({ ...s0, priceStars: awaiting2FA.newPrice, priceOld: awaiting2FA.newOld }));
      registerDangerousAction();
      setAwaiting2FA(null);
      notify("Цена обновлена — новые счета уже выставляются по ней");
    } catch (e) {
      notify(e.message || "Не удалось сохранить цену на сервере");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fp-screen">
      <div style={s.sectionLabel}>Способы оплаты</div>
      <div style={s.card}>
        <div style={s.fieldRow}>
          <span style={{ ...s.fieldLabel, display: "flex", alignItems: "center", gap: 6 }}><Star size={14} color={PURPLE} fill={PURPLE} /> Telegram Stars</span>
          <Switch on={settings.methods.stars} onToggle={() => toggleMethod("stars")} />
        </div>
        <div style={s.fieldRow}>
          <span style={s.fieldLabel}>Банковская карта</span>
          <Switch on={settings.methods.card} onToggle={() => toggleMethod("card")} />
        </div>
        <div style={{ ...s.fieldRow, borderBottom: "none" }}>
          <span style={s.fieldLabel}>СБП</span>
          <Switch on={settings.methods.sbp} onToggle={() => toggleMethod("sbp")} />
        </div>
      </div>

      <div style={s.sectionLabel}>Цена подписки Pro</div>
      <div style={s.card}>
        <div style={{ display: "flex", gap: 10, marginBottom: error ? 8 : 4 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, marginBottom: 5, display: "flex", alignItems: "center", gap: 4 }}>ЦЕНА, <Star size={11} color={MUTED} fill={MUTED} /></div>
            <input value={priceStars} onChange={(e) => { setPriceStars(e.target.value); setError(""); }} type="number"
              style={{ ...s.fieldInput, border: error ? `1.5px solid ${DANGER}` : CARD_BORDER }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, marginBottom: 5, display: "flex", alignItems: "center", gap: 4 }}>СТАРАЯ ЦЕНА, <Star size={11} color={MUTED} fill={MUTED} /></div>
            <input value={priceOld} onChange={(e) => { setPriceOld(e.target.value); setError(""); }} type="number"
              style={{ ...s.fieldInput, border: error ? `1.5px solid ${DANGER}` : CARD_BORDER }} />
          </div>
        </div>
        {error && <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: DANGER }}><CircleAlert size={13} /> {error}</div>}
      </div>

      <div style={s.sectionLabel}>Бонус за подписку на канал</div>
      <div style={s.card}>
        <div style={{ ...s.fieldRow, borderBottom: "none" }}>
          <span style={s.fieldLabel}>Начислять AI-запросы за подписку</span>
          <Switch on={settings.channelBonus} onToggle={() => setSettings((s0) => ({ ...s0, channelBonus: !s0.channelBonus }))} />
        </div>
      </div>

      <button type="button" className="fp-btn" onClick={save} style={{ ...s.primaryPill, width: "100%", marginTop: 6 }}>Сохранить</button>

      {awaiting2FA && (
        <TwoFactorSheet
          title="Подтвердите изменение цены"
          hint={`Цена Pro изменится с ${settings.priceStars} на ${awaiting2FA.newPrice} Stars.`}
          rateLimited={isRateLimited()}
          onCancel={() => setAwaiting2FA(null)}
          onConfirm={confirm2FA}
        />
      )}
    </div>
  );
}

/* ---------------- AI-модель ---------------- */

function ModelScreen({ settings, setSettings, notify }) {
  const [limit, setLimit] = useState(String(settings.freeLimit));
  const limitNum = Number(limit);
  const limitError = limit.trim() === "" ? "Укажите значение"
    : !Number.isInteger(limitNum) ? "Только целое число"
    : limitNum <= 0 ? "Должно быть больше нуля"
    : limitNum > 100000 ? "Слишком большое значение"
    : null;

  function saveLimit() {
    if (limitError) return;
    setSettings((s0) => ({ ...s0, freeLimit: limitNum }));
    notify("Лимит обновлён");
  }

  return (
    <div className="fp-screen">
      <div style={{ ...s.banner, background: SUCCESS_BG, color: SUCCESS }}><Zap size={14} /> Изменения применяются мгновенно — деплой не нужен</div>
      <div style={s.sectionLabel}>Активная модель</div>
      <div style={s.card}>
        {MODEL_OPTIONS.map((m, i, arr) => (
          <button
            key={m.key} type="button" className="fp-row"
            onClick={() => { setSettings((s0) => ({ ...s0, model: m.key })); notify(`Модель: ${m.label}`); }}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", width: "100%", textAlign: "left", borderBottom: i === arr.length - 1 ? "none" : "1px solid rgba(11,11,16,0.06)" }}
          >
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${settings.model === m.key ? PURPLE : "rgba(11,11,16,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {settings.model === m.key && <div style={{ width: 10, height: 10, borderRadius: "50%", background: PURPLE_GRADIENT }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{m.label}</div>
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{m.hint}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={s.sectionLabel}>AI-функции</div>
      <div style={s.card}>
        <div style={s.fieldRow}>
          <span style={s.fieldLabel}>Голосовой ввод</span>
          <Switch on={settings.features.voice} onToggle={() => setSettings((s0) => ({ ...s0, features: { ...s0.features, voice: !s0.features.voice } }))} />
        </div>
        <div style={s.fieldRow}>
          <span style={s.fieldLabel}>Быстрое добавление (QuickAdd AI)</span>
          <Switch on={settings.features.quickAdd} onToggle={() => setSettings((s0) => ({ ...s0, features: { ...s0.features, quickAdd: !s0.features.quickAdd } }))} />
        </div>
        <div style={{ ...s.fieldRow, borderBottom: "none" }}>
          <span style={s.fieldLabel}>AI-анализ окружения</span>
          <Switch on={settings.features.insights} onToggle={() => setSettings((s0) => ({ ...s0, features: { ...s0.features, insights: !s0.features.insights } }))} />
        </div>
      </div>

      <div style={s.sectionLabel}>Лимит на Free-тарифе</div>
      <div style={s.card}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, marginBottom: 5 }}>AI-ЗАПРОСОВ В МЕСЯЦ</div>
        <input value={limit} onChange={(e) => setLimit(e.target.value)} type="number" style={{ ...s.fieldInput, marginBottom: limitError ? 8 : 10, border: limitError ? `1.5px solid ${DANGER}` : CARD_BORDER }} />
        {limitError && <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: DANGER, marginBottom: 10 }}><CircleAlert size={12} /> {limitError}</div>}
        <button type="button" className="fp-btn" onClick={saveLimit} disabled={!!limitError} style={{ ...s.primaryPill, width: "100%", opacity: limitError ? 0.5 : 1 }}>Сохранить лимит</button>
      </div>
    </div>
  );
}

/* ---------------- Баг-репорты ---------------- */

const BUG_FILTERS = [
  { key: "all", label: "Все" },
  { key: "pending", label: "Не собрано" },
  { key: "sent", label: "Уже собрано" },
];
const REAL_BUG_STATUS_META = {
  pending: { label: "не собрано", bg: AMBER_BG, color: AMBER },
  sent: { label: "собрано", bg: SUCCESS_BG, color: SUCCESS },
};

function BugReports({ notify }) {
  const [filter, setFilter] = useState("all");
  const [items, setItems] = useState(null); // null = грузится
  const [listError, setListError] = useState("");

  function load() {
    setListError("");
    fetchBugs().then(({ bugs }) => setItems(bugs)).catch((e) => setListError(e.message || "Не удалось загрузить"));
  }
  useEffect(load, []);

  const visible = (items || []).filter((it) => filter === "all" || it.status === filter);
  const sentCount = (items || []).filter((it) => it.status === "sent").length;

  async function setStatus(id, status) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status } : it)));
    try { await updateBug("setStatus", { id, status }); } catch (e) { notify(e.message || "Не получилось сохранить"); load(); }
  }
  async function removeOne(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    try { await updateBug("delete", { id }); } catch (e) { notify(e.message || "Не получилось удалить"); load(); }
  }
  async function clearSent() {
    if (!confirm("Удалить все уже собранные баг-репорты из буфера?")) return;
    try { await updateBug("clearSent", {}); load(); } catch (e) { notify(e.message || "Не получилось очистить"); }
  }

  return (
    <div className="fp-screen">
      <div style={{ ...s.banner, background: "#E7EEFC", color: "#3F6FCB" }}>
        <ShieldCheck size={14} /> Тот же буфер, что копит бот в Telegram — команда «Собрать промпт» по-прежнему выполняется там, командой /endpoint
      </div>

      <div style={{ display: "flex", gap: 7, marginBottom: 14, overflowX: "auto" }}>
        {BUG_FILTERS.map((f) => (
          <button key={f.key} type="button" className="fp-btn" onClick={() => setFilter(f.key)}
            style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", background: filter === f.key ? PURPLE_GRADIENT : CARD_BG, color: filter === f.key ? "#fff" : INK, border: filter === f.key ? "none" : CARD_BORDER, boxShadow: filter === f.key ? PURPLE_GRADIENT_SHADOW : "none" }}>
            {f.label}
          </button>
        ))}
      </div>

      {listError && <div style={{ fontSize: 12.5, color: DANGER, marginBottom: 12 }}>{listError}</div>}

      <button type="button" className="fp-btn" style={{ ...s.secondaryPill, width: "100%", marginBottom: 14 }} onClick={clearSent} disabled={sentCount === 0}>
        <Trash2 size={14} /> Очистить собранные ({sentCount})
      </button>

      {items === null ? (
        <ListSkeleton rows={3} />
      ) : visible.length === 0 ? (
        <EmptyState icon={Bug} title="Ничего нет в этом фильтре" hint="Попробуйте выбрать другой статус" />
      ) : (
        visible.map((it) => {
          const meta = REAL_BUG_STATUS_META[it.status] || REAL_BUG_STATUS_META.pending;
          return (
            <div key={it.id} style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 13, lineHeight: 1.45, color: INK, flex: 1 }}>{it.message}</div>
                <button type="button" className="fp-btn" onClick={() => removeOne(it.id)} style={{ padding: 2, flexShrink: 0 }}><X size={16} color={MUTED} /></button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>{it.senderName}</span>
                <span style={s.badge(meta.bg, meta.color)}>{meta.label}</span>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                {it.status !== "pending" && <button type="button" className="fp-btn" onClick={() => setStatus(it.id, "pending")} style={{ ...s.secondaryPill, flex: 1, padding: "8px 0", fontSize: 12 }}>Не собрано</button>}
                {it.status !== "sent" && <button type="button" className="fp-btn" onClick={() => setStatus(it.id, "sent")} style={{ ...s.secondaryPill, flex: 1, padding: "8px 0", fontSize: 12 }}>Собрано</button>}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ---------------- AI-ассистент ---------------- */

function AssistantChat({ users, promos, bugs, settings }) {
  const [messages, setMessages] = useState([
    { role: "model", text: "Привет! Я вижу текущие данные панели — спрашивайте про пользователей, промокоды, баги или выручку. Отвечаю по реальным цифрам из этой сессии." },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

  function answerFor(text) {
    const q = text.toLowerCase();
    const proCount = users.filter((u) => u.plan === "pro").length;
    const blockedCount = users.filter((u) => u.blocked).length;
    if (q.includes("сколько") && q.includes("pro")) return `Сейчас ${proCount} пользователей на Pro из ${users.length} всего — конверсия ${((proCount / users.length) * 100).toFixed(1)}%.`;
    if (q.includes("заблок")) return blockedCount > 0 ? `Заблокировано сейчас: ${blockedCount}. Проверьте раздел «Пользователи» → фильтр «Заблокированы».` : "Сейчас никто не заблокирован.";
    if (q.includes("промокод") || q.includes("промо")) {
      const active = promos.filter((p) => p.active);
      return `Активных промокодов: ${active.length} из ${promos.length}. Самый используемый — ${promos.slice().sort((a, b) => b.uses - a.uses)[0]?.code}.`;
    }
    if (q.includes("баг") || q.includes("bug")) {
      const newCount = bugs.filter((b) => b.status === "new").length;
      return `В буфере ${bugs.length} багов, из них ${newCount} новых и не разобранных ещё. Хотите, соберу промпт по новым?`;
    }
    if (q.includes("выручк") || q.includes("доход") || q.includes("mrr")) {
      return `MRR примерно ${proCount * settings.priceStars} Stars при текущих ${proCount} Pro-подписках. Подробнее — в «Отчёт по выручке».`;
    }
    return "Демо-режим: в реальной панели этот вопрос уйдёт в Gemini через /api/admin-chat вместе с текущим контекстом (пользователи, баги, промокоды). Попробуйте спросить про Pro, промокоды, баги или выручку — на них отвечаю уже сейчас по данным этой сессии.";
  }

  function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setDraft(""); setSending(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "model", text: answerFor(text) }]);
      setSending(false);
    }, 700);
  }

  return (
    <div className="fp-screen" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 170px)" }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", paddingRight: 2 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", marginBottom: 9 }}>
            <div style={{
              maxWidth: "78%", padding: "10px 14px", fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
              borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: m.role === "user" ? PURPLE_GRADIENT : CARD_BG,
              color: m.role === "user" ? "#fff" : INK,
              border: m.role === "user" ? "none" : CARD_BORDER,
              boxShadow: m.role === "user" ? PURPLE_GRADIENT_SHADOW : "none",
            }}>{m.text}</div>
          </div>
        ))}
        {sending && <div style={{ fontSize: 12, color: MUTED_SOFT }}>Ассистент печатает…</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: CARD_BG, border: CARD_BORDER, borderRadius: 999, padding: "6px 6px 6px 16px", marginTop: 10, boxShadow: CARD_SHADOW }}>
        <input
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: INK, fontSize: 14 }}
          placeholder="Спросите ассистента…" value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
        />
        <button type="button" className="fp-btn" onClick={send} style={{ width: 38, height: 38, borderRadius: "50%", background: PURPLE_GRADIENT, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: PURPLE_GRADIENT_SHADOW, flexShrink: 0 }}>
          <Send size={16} color="#fff" />
        </button>
      </div>
    </div>
  );
}

/* ---------------- Ещё (хаб настроек) ---------------- */

const STATUS_META = {
  success: { label: "успешно", bg: SUCCESS_BG, color: SUCCESS },
  refunded: { label: "возврат", bg: AMBER_BG, color: AMBER },
  failed: { label: "ошибка", bg: DANGER_BG, color: DANGER },
};

function TransactionsScreen() {
  const [transactions, setTransactions] = useState(null); // null = грузится
  const [listError, setListError] = useState("");

  useEffect(() => {
    fetchTransactions()
      .then(({ transactions }) => setTransactions(transactions))
      .catch((e) => setListError(e.message || "Не удалось загрузить"));
  }, []);

  const total = (transactions || []).reduce((sum, t) => sum + t.amountStars, 0);

  const groups = useMemo(() => {
    const map = new Map();
    (transactions || []).forEach((t) => {
      const d = new Date(t.createdAt);
      const label = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(t);
    });
    return Array.from(map.entries());
  }, [transactions]);

  return (
    <div className="fp-screen">
      <div style={s.statGrid}>
        <div style={{ ...s.statCard, gridColumn: "span 2" }}>
          <div style={{ fontSize: 10.5, color: MUTED_SOFT, marginBottom: 5, fontWeight: 600 }}>Собрано звёзд всего</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 19 }}>
            <Star size={16} color={PURPLE} fill={PURPLE} /> {total.toLocaleString("ru-RU")}
          </div>
        </div>
        <div style={s.statCard}>
          <div style={{ fontSize: 10.5, color: MUTED_SOFT, marginBottom: 5, fontWeight: 600 }}>Платежей</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 19 }}>{(transactions || []).length}</div>
        </div>
      </div>

      {listError && <div style={{ fontSize: 12.5, color: DANGER, marginBottom: 12 }}>{listError}</div>}

      {transactions === null ? (
        <ListSkeleton rows={4} />
      ) : transactions.length === 0 ? (
        <EmptyState icon={Receipt} title="Транзакций пока нет" hint="Здесь появятся платежи, как только кто-то оформит Pro" />
      ) : groups.map(([label, rows]) => (
        <div key={label}>
          <div style={s.sectionLabel}>{label}</div>
          <div style={{ background: INPUT_BG, borderRadius: 18, padding: "2px 14px", marginBottom: 14 }}>
            {rows.map((t, i) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 0", borderBottom: i === rows.length - 1 ? "none" : "1px solid var(--fp-border)" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#14121B", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 13, color: "#fff" }}>
                  <Star size={14} fill="#fff" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.chatId}</div>
                  <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.promoCode ? `Pro · промокод ${t.promoCode}` : "Pro Networker"}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end", fontSize: 13.5, fontWeight: 700, color: SUCCESS }}>
                    +{t.amountStars} <Star size={11} color={SUCCESS} fill={SUCCESS} />
                  </div>
                  <div style={{ fontSize: 10.5, color: MUTED_SOFT, marginTop: 2 }}>{new Date(t.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const REVENUE_TREND = [
  { month: "Фев", value: 320 }, { month: "Мар", value: 410 }, { month: "Апр", value: 480 },
  { month: "Май", value: 560 }, { month: "Июн", value: 610 }, { month: "Июл", value: 690 },
];

function RevenueScreen({ users, priceHistory, priceStars }) {
  const proCount = users.filter((u) => u.plan === "pro").length;
  const mrr = proCount * priceStars;
  const conversion = ((proCount / users.length) * 100).toFixed(1);
  const churn = "2.3";
  const maxTrend = Math.max(...REVENUE_TREND.map((r) => r.value));

  return (
    <div className="fp-screen">
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <div style={{ fontSize: 10.5, color: MUTED_SOFT, marginBottom: 5, fontWeight: 600 }}>MRR</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 16 }}><Star size={13} color={PURPLE} fill={PURPLE} />{mrr}</div>
        </div>
        <div style={s.statCard}>
          <div style={{ fontSize: 10.5, color: MUTED_SOFT, marginBottom: 5, fontWeight: 600 }}>Конверсия</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 16, color: SUCCESS }}>{conversion}%</div>
        </div>
        <div style={s.statCard}>
          <div style={{ fontSize: 10.5, color: MUTED_SOFT, marginBottom: 5, fontWeight: 600 }}>Отток</div>
          <div style={{ display: "flex", alignItems: "center", gap: 3, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 16, color: DANGER }}><TrendingDown size={13} />{churn}%</div>
        </div>
      </div>

      <div style={s.sectionLabel}>Динамика дохода (Stars) / мес</div>
      <div style={s.card}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 110 }}>
          {REVENUE_TREND.map((r) => (
            <div key={r.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: "100%", maxWidth: 26, height: `${(r.value / maxTrend) * 84}px`, borderRadius: 8, background: PURPLE_GRADIENT }} />
              <div style={{ fontSize: 10, color: MUTED_SOFT, fontWeight: 600 }}>{r.month}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={s.sectionLabel}>История изменения цены</div>
      {priceHistory.map((h) => (
        <div key={h.id} style={s.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, fontSize: 13.5, fontWeight: 700 }}>
            <Star size={13} color={MUTED} fill={MUTED} /> {h.from} → <Star size={13} color={PURPLE} fill={PURPLE} /> {h.to}
          </div>
          <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 4 }}>{h.note}</div>
          <div style={{ fontSize: 11, color: MUTED_SOFT }}>{h.actor} · {h.time}</div>
        </div>
      ))}
    </div>
  );
}

function AiUsageScreen() {
  const maxTrend = Math.max(...AI_USAGE_TREND.map((r) => r.value));
  const totalRequests = AI_USAGE_TREND.reduce((s0, r) => s0 + r.value, 0);
  const estCost = (totalRequests * 0.0045).toFixed(2);
  return (
    <div className="fp-screen">
      <div style={s.statGrid}>
        <div style={s.statCard}>
          <div style={{ fontSize: 10.5, color: MUTED_SOFT, marginBottom: 5, fontWeight: 600 }}>Запросов за неделю</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17 }}>{totalRequests}</div>
        </div>
        <div style={s.statCard}>
          <div style={{ fontSize: 10.5, color: MUTED_SOFT, marginBottom: 5, fontWeight: 600 }}>Оценка стоимости</div>
          <div style={{ display: "flex", alignItems: "center", gap: 3, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17 }}><Zap size={13} color={GOLD} />${estCost}</div>
        </div>
        <div style={s.statCard}>
          <div style={{ fontSize: 10.5, color: MUTED_SOFT, marginBottom: 5, fontWeight: 600 }}>Модель</div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: PURPLE }}>Gemini 2.5 Flash</div>
        </div>
      </div>

      <div style={s.sectionLabel}>Запросы по дням</div>
      <div style={s.card}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
          {AI_USAGE_TREND.map((r) => (
            <div key={r.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: "100%", maxWidth: 22, height: `${(r.value / maxTrend) * 78}px`, borderRadius: 7, background: "linear-gradient(135deg, #6FA8FF 0%, #3F6FCB 100%)" }} />
              <div style={{ fontSize: 10, color: MUTED_SOFT, fontWeight: 600 }}>{r.day}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={s.sectionLabel}>Топ по расходу AI</div>
      {AI_TOP_USERS.map((u, i) => (
        <div key={i} style={s.rowCard}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{u.name}</div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{u.tg} · {u.requests} запросов</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 13, fontWeight: 700, color: GOLD }}><Zap size={12} />${u.cost}</div>
        </div>
      ))}
    </div>
  );
}

const SEVERITY_META = {
  high: { label: "высокий риск", bg: DANGER_BG, color: DANGER },
  medium: { label: "средний риск", bg: AMBER_BG, color: AMBER },
};

function ModerationScreen({ notify }) {
  const [items, setItems] = useState(FLAGGED_ACTIVITY);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 450);
    return () => clearTimeout(t);
  }, []);

  function dismiss(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    notify("Отмечено как проверено");
  }
  function blockNow(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
    notify("Пользователь заблокирован");
  }

  return (
    <div className="fp-screen">
      <div style={{ ...s.banner, background: DANGER_BG, color: DANGER }}><Flag size={14} /> Автоматически найдено {items.length} подозрительных случая(ев)</div>
      {loading ? <ListSkeleton rows={2} /> : (
        <>
      {items.length === 0 && <EmptyState icon={ShieldCheck} title="Подозрительной активности не найдено" hint="Всё чисто — правила модерации ничего не подсветили" />}
      {items.map((it) => {
        const meta = SEVERITY_META[it.severity];
        return (
          <div key={it.id} style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{it.user}</div>
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{it.tg}</div>
              </div>
              <span style={s.badge(meta.bg, meta.color)}>{meta.label}</span>
            </div>
            <div style={{ fontSize: 13, color: INK, marginBottom: 4, lineHeight: 1.45, wordBreak: "break-word" }}>{it.reason}</div>
            <div style={{ fontSize: 11, color: MUTED_SOFT, marginBottom: 12 }}>{it.time}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" className="fp-btn" onClick={() => dismiss(it.id)} style={{ ...s.secondaryPill, flex: 1, padding: "10px 0" }}><Eye size={14} /> Проверено</button>
              <button type="button" className="fp-btn" onClick={() => blockNow(it.id)} style={{ ...s.dangerGhost, flex: 1 }}><Ban size={14} /> Заблокировать</button>
            </div>
          </div>
        );
      })}
      </>
      )}
    </div>
  );
}

function MetricsScreen({ users }) {
  const maxDau = Math.max(...DAU_TREND.map((r) => r.value));
  const wau = Math.round(DAU_TREND.reduce((s0, r) => s0 + r.value, 0) / DAU_TREND.length * 3.2);
  const mau = users.length;
  return (
    <div className="fp-screen">
      <div style={s.statGrid}>
        <div style={s.statCard}><div style={{ fontSize: 10.5, color: MUTED_SOFT, marginBottom: 5, fontWeight: 600 }}>DAU</div><div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17 }}>{DAU_TREND[DAU_TREND.length - 1].value}</div></div>
        <div style={s.statCard}><div style={{ fontSize: 10.5, color: MUTED_SOFT, marginBottom: 5, fontWeight: 600 }}>WAU</div><div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17 }}>{wau}</div></div>
        <div style={s.statCard}><div style={{ fontSize: 10.5, color: MUTED_SOFT, marginBottom: 5, fontWeight: 600 }}>MAU</div><div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17 }}>{mau}</div></div>
      </div>

      <div style={s.sectionLabel}>Активные пользователи по дням</div>
      <div style={s.card}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
          {DAU_TREND.map((r) => (
            <div key={r.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: "100%", maxWidth: 22, height: `${(r.value / maxDau) * 78}px`, borderRadius: 7, background: PURPLE_GRADIENT }} />
              <div style={{ fontSize: 10, color: MUTED_SOFT, fontWeight: 600 }}>{r.day}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={s.sectionLabel}>Retention</div>
      <div style={s.card}>
        {RETENTION.map((r, i, arr) => (
          <div key={r.label} style={{ marginBottom: i === arr.length - 1 ? 0 : 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
              <span style={{ fontWeight: 700, color: INK }}>{r.label}</span><span style={{ color: MUTED }}>{r.value}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "rgba(11,11,16,0.07)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, width: `${r.value}%`, background: PURPLE_GRADIENT }} />
            </div>
          </div>
        ))}
      </div>

      <div style={s.sectionLabel}>Воронка до Pro</div>
      <div style={s.card}>
        {FUNNEL.map((f, i, arr) => (
          <div key={f.label} style={{ marginBottom: i === arr.length - 1 ? 0 : 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
              <span style={{ color: INK }}>{f.label}</span><span style={{ fontWeight: 700, color: PURPLE }}>{f.value}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "rgba(11,11,16,0.07)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, width: `${f.value}%`, background: i === arr.length - 1 ? "linear-gradient(135deg,#FFD86B,#F2B33C)" : PURPLE_GRADIENT }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const BROADCAST_AUDIENCES = [
  { key: "all", label: "Все пользователи" },
  { key: "pro", label: "Только Pro" },
  { key: "free", label: "Только Free" },
  { key: "inactive", label: "Неактивные 7+ дней" },
];

const WINBACK_TEMPLATE = "Давно вас не видели! Вернитесь — дарим 3 дня Pro бесплатно, просто откройте приложение 💜";

function BroadcastScreen({ users, notify, onSent }) {
  const [audience, setAudience] = useState("all");
  const [text, setText] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState(null);
  const [templates, setTemplates] = useState(INITIAL_TEMPLATES);
  const [scheduled, setScheduled] = useState([]);
  const [scheduleAt, setScheduleAt] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  const recipients = useMemo(() => {
    if (audience === "pro") return users.filter((u) => u.plan === "pro");
    if (audience === "free") return users.filter((u) => u.plan === "free");
    if (audience === "inactive") return users.filter((u) => !["сегодня", "вчера"].includes(u.lastActive));
    return users;
  }, [users, audience]);

  function useWinback() {
    setAudience("inactive");
    setText(WINBACK_TEMPLATE);
    notify("Подставили win-back сегмент и шаблон");
  }
  function useTemplate(t) { setText(t.text); }
  function saveTemplate() {
    if (!templateName.trim() || !text.trim()) return;
    setTemplates((prev) => [{ id: Date.now(), name: templateName.trim(), text, scheduled: null }, ...prev]);
    setTemplateName(""); setSavingTemplate(false);
    notify("Шаблон сохранён");
  }
  function deleteTemplate(id) { setTemplates((prev) => prev.filter((t) => t.id !== id)); }

  function send() {
    if (scheduleAt.trim()) {
      setScheduled((prev) => [{ id: Date.now(), text, at: scheduleAt.trim(), audience, count: recipients.length }, ...prev]);
      notify(`Запланировано на ${scheduleAt.trim()}`);
    } else {
      setSent({ count: recipients.length, text });
      onSent(recipients.length, text);
      notify(`Разослано ${recipients.length} пользователям`);
    }
    setConfirming(false); setText(""); setScheduleAt("");
  }
  function cancelScheduled(id) {
    setScheduled((prev) => prev.filter((s0) => s0.id !== id));
    notify("Запланированная рассылка отменена");
  }

  return (
    <div className="fp-screen">
      <div style={{ ...s.banner, background: PURPLE_SOFT, color: PURPLE }}><Megaphone size={14} /> Уйдёт от Telegram-бота всем получателям сегмента</div>

      <button type="button" className="fp-btn" onClick={useWinback} style={{ ...s.secondaryPill, width: "100%", marginBottom: 14 }}>
        <RotateCcw size={14} /> Win-back: написать неактивным 30+ дней ({WINBACK_SEGMENT_COUNT})
      </button>

      {templates.length > 0 && (
        <>
          <div style={s.sectionLabel}>Шаблоны</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>
            {templates.map((t) => (
              <div key={t.id} style={{ ...s.card, marginBottom: 0, flexShrink: 0, width: 180, padding: 12, position: "relative" }}>
                <button type="button" className="fp-btn" onClick={() => deleteTemplate(t.id)} style={{ position: "absolute", top: 6, right: 6, padding: 3, zIndex: 1 }}>
                  <X size={12} color={MUTED_SOFT} />
                </button>
                <button type="button" className="fp-row" onClick={() => useTemplate(t)} style={{ width: "100%", textAlign: "left" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4, paddingRight: 14 }}>
                    <Bookmark size={13} color={PURPLE} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{t.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: MUTED, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{t.text}</div>
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={s.sectionLabel}>Кому</div>
      <div style={{ display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap" }}>
        {BROADCAST_AUDIENCES.map((a) => (
          <button key={a.key} type="button" className="fp-btn" onClick={() => setAudience(a.key)}
            style={{ padding: "8px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, background: audience === a.key ? PURPLE_GRADIENT : CARD_BG, color: audience === a.key ? "#fff" : INK, border: audience === a.key ? "none" : CARD_BORDER, boxShadow: audience === a.key ? PURPLE_GRADIENT_SHADOW : "none" }}>
            {a.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: MUTED, fontWeight: 600, marginBottom: 14 }}>Получателей: {recipients.length}</div>

      <div style={s.sectionLabel}>Текст сообщения</div>
      <div style={s.card}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={500} placeholder="Например: обновили дизайн приложения — загляните в раздел «Цели»"
          style={{ ...s.fieldInput, resize: "none", background: INPUT_BG, marginBottom: 6, border: text.length > 0 && text.trim().length < 10 ? `1.5px solid ${AMBER}` : CARD_BORDER }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          {text.length > 0 && text.trim().length < 10 ? (
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, color: AMBER }}><CircleAlert size={12} /> Слишком коротко — пользователи могут не понять контекст</span>
          ) : <span />}
          <span style={{ fontSize: 11, color: text.length > 450 ? DANGER : MUTED_SOFT, flexShrink: 0 }}>{text.length}/500</span>
        </div>
        <button type="button" className="fp-btn" onClick={() => setSavingTemplate(true)} disabled={!text.trim()} style={{ ...s.secondaryPill, padding: "9px 14px", fontSize: 12 }}>
          <Bookmark size={13} /> Сохранить как шаблон
        </button>
      </div>

      <div style={s.sectionLabel}>Отложенная отправка (необязательно)</div>
      <div style={s.card}>
        <input value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} placeholder="Например: 3 авг, 10:00" maxLength={40} style={s.fieldInput} />
      </div>

      <button type="button" className="fp-btn" onClick={() => setConfirming(true)} disabled={text.trim().length < 10 || recipients.length === 0} style={{ ...s.primaryPill, width: "100%" }}>
        <Send size={15} /> {scheduleAt.trim() ? `Запланировать на ${scheduleAt.trim()}` : `Отправить ${recipients.length} получателям`}
      </button>

      {scheduled.length > 0 && (
        <>
          <div style={s.sectionLabel}>Запланировано</div>
          {scheduled.map((s0) => (
            <div key={s0.id} style={s.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: INK }}><Calendar size={14} color={PURPLE} /> {s0.at}</div>
                <button type="button" className="fp-btn" onClick={() => cancelScheduled(s0.id)} style={{ padding: 2 }}><X size={15} color={DANGER} /></button>
              </div>
              <div style={{ fontSize: 12.5, color: MUTED }}>{s0.count} получателей · «{s0.text.slice(0, 50)}{s0.text.length > 50 ? "…" : ""}»</div>
            </div>
          ))}
        </>
      )}

      {sent && (
        <div style={{ ...s.card, marginTop: 14, borderColor: "rgba(34,163,122,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: SUCCESS, marginBottom: 4 }}><CheckCircle2 size={15} /> Отправлено</div>
          <div style={{ fontSize: 12.5, color: MUTED }}>{sent.count} получателей · «{sent.text.slice(0, 60)}{sent.text.length > 60 ? "…" : ""}»</div>
        </div>
      )}

      {confirming && (
        <div style={s.overlay} onClick={() => setConfirming(false)}>
          <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, marginBottom: 8 }}>{scheduleAt.trim() ? "Запланировать рассылку?" : "Отправить рассылку?"}</div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 16, lineHeight: 1.5 }}>
              Сообщение получат <b style={{ color: INK }}>{recipients.length}</b> пользователей через Telegram-бота{scheduleAt.trim() ? ` в ${scheduleAt.trim()}` : ""}. Отменить после отправки будет нельзя.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="fp-btn" onClick={() => setConfirming(false)} style={{ ...s.secondaryPill, flex: 1 }}>Отмена</button>
              <button type="button" className="fp-btn" onClick={send} style={{ ...s.primaryPill, flex: 1 }}>{scheduleAt.trim() ? "Запланировать" : "Отправить"}</button>
            </div>
          </div>
        </div>
      )}

      {savingTemplate && (
        <div style={s.overlay} onClick={() => setSavingTemplate(false)}>
          <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, marginBottom: 14 }}>Сохранить шаблон</div>
            <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Название шаблона" autoFocus maxLength={40} style={{ ...s.fieldInput, marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="fp-btn" onClick={() => setSavingTemplate(false)} style={{ ...s.secondaryPill, flex: 1 }}>Отмена</button>
              <button type="button" className="fp-btn" onClick={saveTemplate} disabled={!templateName.trim()} style={{ ...s.primaryPill, flex: 1, opacity: templateName.trim() ? 1 : 0.5 }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureFlagsScreen({ notify }) {
  const [flags, setFlags] = useState(INITIAL_FLAGS);

  function toggle(id) {
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)));
  }
  function setRollout(id, value) {
    setFlags((prev) => prev.map((f) => (f.id === id ? { ...f, rollout: value } : f)));
  }
  function save() { notify("Фиче-флаги сохранены"); }

  return (
    <div className="fp-screen">
      <div style={{ ...s.banner, background: "#E7EEFC", color: "#3F6FCB" }}><FlaskConical size={14} /> Включайте функции постепенно, на проценте пользователей</div>
      {flags.map((f) => (
        <div key={f.id} style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: INK, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{f.name}</div>
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{f.hint}</div>
            </div>
            <Switch on={f.enabled} onToggle={() => toggle(f.id)} />
          </div>
          {f.enabled && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: MUTED, marginBottom: 6 }}>
                <span>Раскатано на</span><span style={{ fontWeight: 700, color: PURPLE }}>{f.rollout}%</span>
              </div>
              <input type="range" min={0} max={100} step={5} value={f.rollout} onChange={(e) => setRollout(f.id, Number(e.target.value))} style={{ width: "100%", accentColor: PURPLE }} />
            </div>
          )}
        </div>
      ))}
      <button type="button" className="fp-btn" onClick={save} style={{ ...s.primaryPill, width: "100%", marginTop: 6 }}>Сохранить</button>
    </div>
  );
}

function toCsv(rows, headers) {
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers.map(esc).join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}
function downloadCsv(filename, csv) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function ExportScreen({ users, transactions, promos, notify }) {
  const exporters = [
    {
      key: "users", label: "Пользователи", hint: `${users.length} записей — имя, тариф, дата регистрации`,
      run: () => downloadCsv("users.csv", toCsv(users.map((u) => ({ name: u.name, tg: u.tg, plan: u.plan, joined: u.joined, contacts: u.contacts, blocked: u.blocked })), ["name", "tg", "plan", "joined", "contacts", "blocked"])),
    },
    {
      key: "transactions", label: "Транзакции", hint: `${transactions.length} записей — сумма, статус, дата`,
      run: () => downloadCsv("transactions.csv", toCsv(transactions.map((t) => ({ user: t.user, tg: t.tg, amount: t.amount, status: t.status, time: t.time })), ["user", "tg", "amount", "status", "time"])),
    },
    {
      key: "promos", label: "Промокоды", hint: `${promos.length} записей — использования, лимиты`,
      run: () => downloadCsv("promo-codes.csv", toCsv(promos.map((p) => ({ code: p.code, discount: p.discount, uses: p.uses, limit: p.limit, active: p.active })), ["code", "discount", "uses", "limit", "active"])),
    },
  ];
  return (
    <div className="fp-screen">
      <div style={{ ...s.banner, background: SUCCESS_BG, color: SUCCESS }}><Download size={14} /> Файлы скачиваются по-настоящему — это не заглушка</div>
      {exporters.map((ex) => (
        <div key={ex.key} style={{ ...s.card, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={s.avatarBubble(PURPLE_SOFT, PURPLE)}><ClipboardList size={17} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: INK, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{ex.label}</div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{ex.hint}</div>
          </div>
          <button type="button" className="fp-btn" onClick={() => { ex.run(); notify(`${ex.label}: CSV скачан`); }} style={{ ...s.secondaryPill, padding: "10px 14px" }}>
            <Download size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

function AlertsScreen({ notify }) {
  // Локально держим только метаданные (имя/подсказку) — они статичны.
  // Реальное вкл/выкл каждого алерта грузим из Supabase, а не берём
  // как раньше сразу из INITIAL_ALERTS (тот сбрасывался при перезагрузке).
  const [alerts, setAlerts] = useState(INITIAL_ALERTS.map((a) => ({ ...a, enabled: null }))); // null = ещё грузится
  const [savingId, setSavingId] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    fetchAlertSettings()
      .then(({ settings }) => {
        setAlerts((prev) => prev.map((a) => ({ ...a, enabled: settings?.[a.id] ?? a.enabled ?? true })));
      })
      .catch((e) => {
        setLoadError(e.message || "Не удалось загрузить настройки — показаны значения по умолчанию");
        setAlerts((prev) => prev.map((a) => ({ ...a, enabled: INITIAL_ALERTS.find((i) => i.id === a.id)?.enabled ?? true })));
      });
  }, []);

  async function toggle(id) {
    const current = alerts.find((a) => a.id === id);
    const next = !current.enabled;
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: next } : a)));
    setSavingId(id);
    try {
      await saveAlertSetting(id, next);
    } catch (e) {
      // Не удалось сохранить — откатываем тумблер и объясняем, что показанное на экране не сохранилось.
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, enabled: !next } : a)));
      notify(e.message || "Не удалось сохранить — попробуйте ещё раз");
    } finally {
      setSavingId(null);
    }
  }

  async function test(a) {
    setTestingId(a.id);
    try {
      await sendTestAlert(a.name);
      notify(`Тестовый алерт «${a.name}» отправлен вам в Telegram`);
    } catch (e) {
      notify(e.message || "Не получилось отправить — проверьте, что бот вам не заблокирован");
    } finally {
      setTestingId(null);
    }
  }

  return (
    <div className="fp-screen">
      <div style={{ ...s.banner, background: AMBER_BG, color: AMBER }}><BellRing size={14} /> Срабатывания уходят в админ-чат Telegram сразу, а не по жалобе</div>
      {loadError && <div style={{ fontSize: 12, color: DANGER, marginBottom: 10 }}>{loadError}</div>}
      {alerts.map((a) => (
        <div key={a.id} style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: INK, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{a.name}</div>
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{a.hint}</div>
            </div>
            {a.enabled === null ? (
              <div style={{ width: 40, height: 22, borderRadius: 999, background: "var(--fp-border)", opacity: 0.5 }} />
            ) : (
              <Switch on={a.enabled} onToggle={() => toggle(a.id)} disabled={savingId === a.id} />
            )}
          </div>
          <button
            type="button" className="fp-btn" onClick={() => test(a)}
            disabled={!a.enabled || testingId === a.id}
            style={{ ...s.secondaryPill, width: "100%", padding: "9px 0", fontSize: 12.5, opacity: a.enabled ? 1 : 0.5 }}
          >
            {testingId === a.id ? "Отправляем…" : "Отправить тестовый алерт"}
          </button>
        </div>
      ))}
    </div>
  );
}

function ReferralScreen() {
  const [referrers, setReferrers] = useState(null); // null = грузится
  const [listError, setListError] = useState("");

  useEffect(() => {
    fetchReferrals().then(({ referrers }) => setReferrers(referrers)).catch((e) => setListError(e.message || "Не удалось загрузить"));
  }, []);

  if (referrers === null) {
    return (
      <div className="fp-screen">
        {listError ? <div style={{ fontSize: 12.5, color: DANGER, marginBottom: 12 }}>{listError}</div> : <ListSkeleton rows={3} />}
      </div>
    );
  }

  const totalBonus = referrers.reduce((sum, r) => sum + r.bonusEarned, 0);
  const totalReferred = referrers.reduce((sum, r) => sum + r.referredCount, 0);
  return (
    <div className="fp-screen">
      <div style={s.statGrid}>
        <div style={{ ...s.statCard, gridColumn: "span 2" }}>
          <div style={{ fontSize: 10.5, color: MUTED_SOFT, marginBottom: 5, fontWeight: 600 }}>Начислено AI-запросов бонусом</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 19 }}><Star size={16} color={PURPLE} fill={PURPLE} /> {totalBonus}</div>
        </div>
        <div style={s.statCard}>
          <div style={{ fontSize: 10.5, color: MUTED_SOFT, marginBottom: 5, fontWeight: 600 }}>Приведено</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 19 }}>{totalReferred}</div>
        </div>
      </div>
      <div style={s.sectionLabel}>Топ по рефералам</div>
      {referrers.length === 0 ? (
        <EmptyState icon={GitBranch} title="Пока никого" hint="Как только кто-то откроет апп по реферальной ссылке друга — появится здесь" />
      ) : referrers.map((r) => (
        <div key={r.chatId} style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={s.avatarBubble(PURPLE_SOFT, PURPLE)}><GitBranch size={16} /></div>
              <div style={{ fontSize: 14, fontWeight: 700, color: INK, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{r.name}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: GOLD }}><Star size={12} color={GOLD} fill={GOLD} /> {r.bonusEarned}</div>
          </div>
          <div style={{ fontSize: 12, color: MUTED }}>Привёл {r.referredCount}: {r.referred.join(", ")}</div>
        </div>
      ))}
    </div>
  );
}

function OnboardingScreen({ notify }) {
  const [steps, setSteps] = useState(INITIAL_ONBOARDING);
  function toggle(id) { setSteps((prev) => prev.map((s0) => (s0.id === id ? { ...s0, enabled: !s0.enabled } : s0))); }
  function move(id, dir) {
    setSteps((prev) => {
      const idx = prev.findIndex((s0) => s0.id === id);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }
  function save() { notify("Порядок онбординга сохранён"); }

  return (
    <div className="fp-screen">
      <div style={{ ...s.banner, background: "#E7EEFC", color: "#3F6FCB" }}><ListOrdered size={14} /> Порядок и состав шагов применяются без деплоя</div>
      {steps.map((st, i) => (
        <div key={st.id} style={{ ...s.card, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <button type="button" className="fp-btn" onClick={() => move(st.id, -1)} disabled={i === 0} style={{ opacity: i === 0 ? 0.25 : 1 }}><ChevronDown size={14} color={MUTED} style={{ transform: "rotate(180deg)" }} /></button>
            <button type="button" className="fp-btn" onClick={() => move(st.id, 1)} disabled={i === steps.length - 1} style={{ opacity: i === steps.length - 1 ? 0.25 : 1 }}><ChevronDown size={14} color={MUTED} /></button>
          </div>
          <div style={{ width: 24, height: 24, borderRadius: 8, background: PURPLE_SOFT, color: PURPLE, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{st.title}</div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{st.hint}</div>
          </div>
          <Switch on={st.enabled} onToggle={() => toggle(st.id)} />
        </div>
      ))}
      <button type="button" className="fp-btn" onClick={save} style={{ ...s.primaryPill, width: "100%", marginTop: 6 }}>Сохранить порядок</button>
    </div>
  );
}

function LocalizationScreen({ notify }) {
  const [strings, setStrings] = useState(LOCALIZATION_STRINGS);
  function updateEn(key, value) { setStrings((prev) => prev.map((s0) => (s0.key === key ? { ...s0, en: value } : s0))); }
  function save() { notify("Переводы сохранены"); }

  return (
    <div className="fp-screen">
      <div style={s.sectionLabel}>Готовность языков</div>
      <div style={s.card}>
        {LOCALIZATION_LANGS.map((l, i, arr) => (
          <div key={l.code} style={{ marginBottom: i === arr.length - 1 ? 0 : 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
              <span style={{ fontWeight: 700, color: INK, display: "flex", alignItems: "center", gap: 6 }}><Globe size={13} color={MUTED} /> {l.label}</span>
              <span style={{ color: MUTED }}>{l.complete}%</span>
            </div>
            <div style={{ height: 7, borderRadius: 999, background: "rgba(11,11,16,0.07)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, width: `${l.complete}%`, background: l.complete === 100 ? "linear-gradient(135deg,#3ECF8E,#22A37A)" : PURPLE_GRADIENT }} />
            </div>
          </div>
        ))}
      </div>

      <div style={s.sectionLabel}>Строки интерфейса · English</div>
      {strings.map((str) => (
        <div key={str.key} style={s.card}>
          <div style={{ fontSize: 10.5, color: MUTED_SOFT, fontFamily: "monospace", marginBottom: 8 }}>{str.key}</div>
          <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 8 }}>RU: {str.ru}</div>
          <input value={str.en} onChange={(e) => updateEn(str.key, e.target.value)} style={s.fieldInput} />
        </div>
      ))}
      <button type="button" className="fp-btn" onClick={save} style={{ ...s.primaryPill, width: "100%", marginTop: 6 }}>Сохранить переводы</button>
    </div>
  );
}

function SnapshotScreen({ settings, setSettings, notify }) {
  const [snapshots, setSnapshots] = useState(INITIAL_SNAPSHOTS);

  function takeSnapshot() {
    setSnapshots((prev) => [{ id: Date.now(), time: "только что", note: "Ручной снапшот из панели", settings: { priceStars: settings.priceStars, priceOld: settings.priceOld, model: settings.model, freeLimit: settings.freeLimit } }, ...prev]);
    notify("Снапшот сохранён");
  }
  function restore(sn) {
    setSettings((s0) => ({ ...s0, ...sn.settings }));
    notify(`Настройки откачены к снапшоту от ${sn.time}`);
  }

  return (
    <div className="fp-screen">
      <div style={{ ...s.banner, background: "#E7EEFC", color: "#3F6FCB" }}><DatabaseBackup size={14} /> Цены, модель и лимиты можно откатить одним тапом</div>
      <button type="button" className="fp-btn" onClick={takeSnapshot} style={{ ...s.primaryPill, width: "100%", marginBottom: 14 }}>
        <DatabaseBackup size={15} /> Сделать снапшот сейчас
      </button>
      {snapshots.map((sn) => (
        <div key={sn.id} style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{sn.note}</div>
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{sn.time}</div>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
            <Star size={11} color={MUTED} fill={MUTED} /> {sn.settings.priceStars} · {sn.settings.model} · лимит {sn.settings.freeLimit}/мес
          </div>
          <button type="button" className="fp-btn" onClick={() => restore(sn)} style={{ ...s.secondaryPill, width: "100%", padding: "9px 0" }}>
            <RotateCcw size={13} /> Восстановить эти настройки
          </button>
        </div>
      ))}
    </div>
  );
}

function SecretsAgeScreen() {
  return (
    <div className="fp-screen">
      <div style={{ ...s.banner, background: AMBER_BG, color: AMBER }}><KeyRound size={14} /> Рекомендуем ротацию раз в {SECRET_ROTATION_WARN_DAYS} дней</div>
      {SECRET_AGES.map((s0) => {
        const warn = s0.days >= SECRET_ROTATION_WARN_DAYS;
        return (
          <div key={s0.key} style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{s0.label}</div>
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2, fontFamily: "monospace" }}>{s0.key}</div>
              </div>
              <span style={s.badge(warn ? DANGER_BG : SUCCESS_BG, warn ? DANGER : SUCCESS)}>{s0.days} дн.</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MaintenanceScreen({ settings, setSettings, notify }) {
  const [text, setText] = useState(settings.maintenanceText);
  function toggle() {
    setSettings((s0) => ({ ...s0, maintenanceMode: !s0.maintenanceMode }));
    notify(settings.maintenanceMode ? "Режим обслуживания выключен" : "Режим обслуживания включён для всех пользователей");
  }
  function saveText() {
    setSettings((s0) => ({ ...s0, maintenanceText: text }));
    notify("Текст баннера сохранён");
  }
  return (
    <div className="fp-screen">
      <div style={s.card}>
        <div style={s.fieldRow}>
          <span style={{ ...s.fieldLabel, display: "flex", alignItems: "center", gap: 6 }}><Wrench size={14} color={settings.maintenanceMode ? DANGER : MUTED} /> Режим обслуживания</span>
          <Switch on={settings.maintenanceMode} onToggle={toggle} />
        </div>
      </div>
      <div style={s.sectionLabel}>Текст баннера для пользователей</div>
      <div style={s.card}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Идут технические работы, вернёмся через 30 минут"
          style={{ ...s.fieldInput, resize: "none", marginBottom: 10 }} />
        <button type="button" className="fp-btn" onClick={saveText} style={{ ...s.secondaryPill, width: "100%" }}>Сохранить текст</button>
      </div>
      {settings.maintenanceMode && (
        <>
          <div style={s.sectionLabel}>Так это увидят пользователи</div>
          <div style={{ ...s.card, background: "#2B2130", color: "#fff", textAlign: "center" }}>
            <Wrench size={22} style={{ marginBottom: 8 }} />
            <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{text || "Идут технические работы"}</div>
          </div>
        </>
      )}
    </div>
  );
}

function WebhookScreen({ notify }) {
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState(WEBHOOK_STATUS);
  function check() {
    setChecking(true);
    setTimeout(() => { setStatus({ ...status, lastPing: "только что", responseMs: 150 + Math.round(Math.random() * 80) }); setChecking(false); notify("Пинг успешен"); }, 700);
  }
  return (
    <div className="fp-screen">
      <div style={{ ...s.card, textAlign: "center", paddingTop: 22, paddingBottom: 20 }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: status.alive ? SUCCESS_BG : DANGER_BG, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
          {status.alive ? <Wifi size={24} color={SUCCESS} /> : <WifiOff size={24} color={DANGER} />}
        </div>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17 }}>{status.alive ? "Вебхук активен" : "Вебхук недоступен"}</div>
        <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4, fontFamily: "monospace" }}>{status.endpoint}</div>
      </div>
      <div style={s.card}>
        <div style={s.fieldRow}><span style={s.fieldLabel}>Последний успешный пинг</span><span style={{ fontSize: 13, color: MUTED }}>{status.lastPing}</span></div>
        <div style={{ ...s.fieldRow, borderBottom: "none" }}><span style={s.fieldLabel}>Время ответа</span><span style={{ fontSize: 13, color: MUTED }}>{status.responseMs} мс</span></div>
      </div>
      <button type="button" className="fp-btn" onClick={check} disabled={checking} style={{ ...s.primaryPill, width: "100%" }}>
        <RefreshCw size={15} /> {checking ? "Проверяю…" : "Проверить сейчас"}
      </button>
    </div>
  );
}

function LoginHistoryScreen({ notify }) {
  const [entries, setEntries] = useState(null); // null = грузится
  const [listError, setListError] = useState("");

  function load() {
    fetchLoginHistory().then(({ entries }) => setEntries(entries)).catch((e) => setListError(e.message || "Не удалось загрузить"));
  }
  useEffect(load, []);

  async function remove(id) {
    const prev = entries;
    setEntries((cur) => cur.filter((e) => e.id !== id));
    try {
      await deleteLoginHistoryEntry(id);
      notify("Запись удалена из истории");
    } catch (e) {
      setEntries(prev);
      notify(e.message || "Не получилось удалить запись");
    }
  }

  return (
    <div className="fp-screen">
      <div style={{ ...s.banner, background: "#E7EEFC", color: "#3F6FCB" }}><Smartphone size={14} /> Реальные входы в панель — по User-Agent и IP, без выдуманных городов</div>
      {entries === null ? (
        listError ? <div style={{ fontSize: 12.5, color: DANGER }}>{listError}</div> : <ListSkeleton rows={3} />
      ) : entries.length === 0 ? (
        <EmptyState icon={Smartphone} title="Пока пусто" hint="Записи появятся после следующего входа в панель" />
      ) : entries.map((e) => (
        <div key={e.id} style={s.card}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div style={s.avatarBubble(e.current ? SUCCESS_BG : INPUT_BG, e.current ? SUCCESS : MUTED)}>
              {e.device.includes("iPhone") || e.device.includes("iPad") || e.device.includes("Android") ? <Smartphone size={17} /> : <Monitor size={17} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{e.device}</span>
                {e.current && <span style={s.badge(SUCCESS_BG, SUCCESS)}>последний вход</span>}
              </div>
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>{e.ip} · {formatRelativeTime(e.time)}</div>
            </div>
            <button type="button" className="fp-btn" onClick={() => remove(e.id)} style={{ padding: 6 }} title="Удалить запись из истории"><X size={16} color={DANGER} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CohortScreen() {
  return (
    <div className="fp-screen">
      <div style={{ ...s.banner, background: PURPLE_SOFT, color: PURPLE }}><Grid3x3 size={14} /> Retention по месяцу регистрации, а не общий процент</div>
      <div style={s.card}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) repeat(4, minmax(0, 0.6fr))", gap: 6, marginBottom: 10 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED_SOFT }}>КОГОРТА</div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED_SOFT, textAlign: "center" }}>N</div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED_SOFT, textAlign: "center" }}>D1</div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED_SOFT, textAlign: "center" }}>D7</div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: MUTED_SOFT, textAlign: "center" }}>D30</div>
        </div>
        {COHORTS.map((c, i, arr) => (
          <div key={c.month} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) repeat(4, minmax(0, 0.6fr))", gap: 6, alignItems: "center", padding: "9px 0", borderBottom: i === arr.length - 1 ? "none" : "1px solid rgba(11,11,16,0.06)" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: INK }}>{c.month}</div>
            <div style={{ fontSize: 12, color: MUTED, textAlign: "center" }}>{c.size}</div>
            {[c.d1, c.d7, c.d30].map((v, j) => (
              <div key={j} style={{ textAlign: "center" }}>
                {v == null ? <span style={{ fontSize: 11, color: MUTED_SOFT }}>—</span> : (
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 6px", borderRadius: 8, background: `rgba(124,77,255,${0.12 + v / 130})`, color: v >= 40 ? PURPLE : INK }}>{v}%</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: MUTED_SOFT, padding: "0 4px" }}>Более новые когорты ещё не набрали данных по D30 — это нормально.</div>
    </div>
  );
}

function NpsScreen() {
  const total = NPS_DATA.promoters + NPS_DATA.passives + NPS_DATA.detractors;
  return (
    <div className="fp-screen">
      <div style={{ ...s.card, textAlign: "center", paddingTop: 22, paddingBottom: 20 }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: NPS_DATA.score >= 0 ? SUCCESS_BG : DANGER_BG, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
          <Smile size={24} color={NPS_DATA.score >= 0 ? SUCCESS : DANGER} />
        </div>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 30 }}>{NPS_DATA.score}</div>
        <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>NPS · {NPS_DATA.responses} ответов</div>
      </div>
      <div style={s.card}>
        {[
          { label: "Промоутеры (9–10)", value: NPS_DATA.promoters, color: SUCCESS },
          { label: "Нейтралы (7–8)", value: NPS_DATA.passives, color: AMBER },
          { label: "Критики (0–6)", value: NPS_DATA.detractors, color: DANGER },
        ].map((row, i, arr) => (
          <div key={row.label} style={{ marginBottom: i === arr.length - 1 ? 0 : 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
              <span style={{ color: INK }}>{row.label}</span><span style={{ fontWeight: 700, color: row.color }}>{row.value}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "rgba(11,11,16,0.07)", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 999, width: `${row.value}%`, background: row.color }} />
            </div>
          </div>
        ))}
      </div>
      <div style={s.sectionLabel}>Свежие комментарии</div>
      {NPS_COMMENTS.map((c, i) => (
        <div key={i} style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>{c.who}</span>
            <span style={s.badge(c.score >= 9 ? SUCCESS_BG : c.score >= 7 ? AMBER_BG : DANGER_BG, c.score >= 9 ? SUCCESS : c.score >= 7 ? AMBER : DANGER)}>{c.score}/10</span>
          </div>
          <div style={{ fontSize: 13, color: INK, lineHeight: 1.45 }}>«{c.text}»</div>
        </div>
      ))}
    </div>
  );
}

function NotesScreen({ notify }) {
  const [notes, setNotes] = useState("Sber-подобные банки держат цену Pro-подписки в районе 300-400₽/мес — мы дешевле почти в 2 раза при курсе Stars.\n\nКонкурент \"ContactKeeper\" убрал бесплатный тариф в июне — можем перехватить их отток через win-back с акцентом на бесплатный план.");
  const [saved, setSaved] = useState(true);
  function save() { setSaved(true); notify("Заметки сохранены"); }
  return (
    <div className="fp-screen">
      <div style={{ ...s.banner, background: "#FBEEDD", color: GOLD }}><StickyNote size={14} /> Личное пространство — видно только супер-админам</div>
      <div style={s.card}>
        <textarea
          value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} rows={10}
          placeholder="Заметки о ценах конкурентов, идеи, наблюдения…"
          style={{ ...s.fieldInput, resize: "none", background: INPUT_BG, fontFamily: "inherit", lineHeight: 1.5 }}
        />
      </div>
      <button type="button" className="fp-btn" onClick={save} disabled={saved} style={{ ...s.primaryPill, width: "100%", opacity: saved ? 0.6 : 1 }}>
        {saved ? "Сохранено" : "Сохранить заметки"}
      </button>
    </div>
  );
}

function HeatmapScreen() {
  const [grid, setGrid] = useState(null); // null = грузится
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAdminHeatmap().then(({ grid }) => setGrid(grid)).catch((e) => setError(e.message || "Не удалось загрузить"));
  }, []);

  const max = grid ? Math.max(1, ...grid.flat()) : 1;

  return (
    <div className="fp-screen">
      <div style={{ ...s.banner, background: "#E7EEFC", color: "#3F6FCB" }}><Flame size={14} /> Построено по журналу действий за последние 4 недели</div>
      {error && <div style={{ fontSize: 12.5, color: DANGER, marginBottom: 12 }}>{error}</div>}
      {grid === null ? <ListSkeleton rows={3} /> : (
        <>
      <div style={s.card}>
        <div style={{ display: "grid", gridTemplateColumns: "34px repeat(4, minmax(0, 1fr))", gap: 6, marginBottom: 8 }}>
          <div />
          {HEATMAP_SLOTS.map((slot) => <div key={slot} style={{ fontSize: 10, color: MUTED_SOFT, fontWeight: 600, textAlign: "center" }}>{slot}</div>)}
        </div>
        {HEATMAP_DAYS.map((day, i) => (
          <div key={day} style={{ display: "grid", gridTemplateColumns: "34px repeat(4, minmax(0, 1fr))", gap: 6, marginBottom: 6, alignItems: "center" }}>
            <div style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>{day}</div>
            {grid[i].map((v, j) => (
              <div key={j} style={{ height: 26, borderRadius: 8, background: v === 0 ? "rgba(11,11,16,0.05)" : `rgba(124,77,255,${0.15 + (v / max) * 0.7})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {v > 0 && <span style={{ fontSize: 10.5, fontWeight: 700, color: v / max > 0.5 ? "#fff" : PURPLE }}>{v}</span>}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: MUTED_SOFT, padding: "0 4px" }}>Считается по всем действиям в журнале — чем больше записей накопится, тем точнее картина.</div>
        </>
      )}
    </div>
  );
}

function WidgetsScreen({ widgets, setWidgets, notify }) {
  function toggle(key) { setWidgets((prev) => prev.map((w) => (w.key === key ? { ...w, enabled: !w.enabled } : w))); }
  function move(key, dir) {
    setWidgets((prev) => {
      const idx = prev.findIndex((w) => w.key === key);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }
  function save() { notify("Порядок Главной сохранён"); }

  return (
    <div className="fp-screen">
      <div style={{ ...s.banner, background: PURPLE_SOFT, color: PURPLE }}><LayoutGrid size={14} /> Выберите, что видеть первым на Главной</div>
      {widgets.map((w, i) => {
        const meta = HOME_WIDGET_OPTIONS.find((o) => o.key === w.key);
        return (
          <div key={w.key} style={{ ...s.card, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button type="button" className="fp-btn" onClick={() => move(w.key, -1)} disabled={i === 0} style={{ opacity: i === 0 ? 0.25 : 1 }}><ChevronDown size={14} color={MUTED} style={{ transform: "rotate(180deg)" }} /></button>
              <button type="button" className="fp-btn" onClick={() => move(w.key, 1)} disabled={i === widgets.length - 1} style={{ opacity: i === widgets.length - 1 ? 0.25 : 1 }}><ChevronDown size={14} color={MUTED} /></button>
            </div>
            <GripHorizontal size={16} color={MUTED_SOFT} />
            <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: INK }}>{meta?.label}</div>
            <Switch on={w.enabled} onToggle={() => toggle(w.key)} />
          </div>
        );
      })}
      <button type="button" className="fp-btn" onClick={save} style={{ ...s.primaryPill, width: "100%", marginTop: 6 }}>Сохранить</button>
    </div>
  );
}

/* Иконка + подпись категории для строки в выпадающем списке @упоминаний */
const MENTION_KIND_META = {
  admin: { icon: Shield, color: PURPLE },
  user: { icon: UsersIcon, color: "#3F6FCB" },
  bug: { icon: Bug, color: DANGER },
};

function slugifyMention(raw) {
  return String(raw || "").replace(/^@/, "").trim().replace(/\s+/g, "_") || "user";
}

function TeamChatScreen() {
  const [messages, setMessages] = useState(null); // null = грузится
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [listError, setListError] = useState("");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  function load() {
    fetchTeamChat().then(({ messages }) => setMessages(messages)).catch((e) => setListError(e.message || "Не удалось загрузить"));
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 4000); // простой поллинг, без сокетов — для внутреннего чата команды хватает
    return () => clearInterval(t);
  }, []);

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

  // Данные для @упоминаний — грузим один раз при открытии экрана. Каждый
  // источник грузится независимо: если прав не хватает (например, список
  // юзеров доступен не всем ролям) — просто не будет этой категории.
  const [mentionPool, setMentionPool] = useState({ admins: [], users: [], bugs: [] });
  useEffect(() => {
    fetchAdminList().then(({ admins }) => setMentionPool((p) => ({ ...p, admins: admins || [] }))).catch(() => {});
    fetchAdminUsers("").then(({ users }) => setMentionPool((p) => ({ ...p, users: (users || []).slice(0, 60) }))).catch(() => {});
    fetchBugs().then(({ bugs }) => setMentionPool((p) => ({ ...p, bugs: (bugs || []).filter((b) => b.status !== "sent").slice(0, 40) }))).catch(() => {});
  }, []);

  // mention = { query, start, end } пока пользователь набирает "@..." | null
  const [mention, setMention] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);

  const mentionResults = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    const admins = mentionPool.admins
      .filter((a) => `${a.name || ""} ${a.tgUsername || ""}`.toLowerCase().includes(q))
      .map((a) => ({
        kind: "admin", key: `a${a.chatId}`,
        label: a.name || a.tgUsername || "Админ",
        sub: a.role === "super" ? "Супер-админ" : "Админ команды",
        insert: slugifyMention(a.tgUsername || a.name),
      }));
    const users = mentionPool.users
      .filter((u) => `${u.name || ""} ${u.tgUsername || ""}`.toLowerCase().includes(q))
      .map((u) => ({
        kind: "user", key: `u${u.chatId}`,
        label: u.name || u.tgUsername || "Пользователь",
        sub: u.plan === "pro" ? "Pro" : "Free",
        insert: slugifyMention(u.tgUsername || u.name),
      }));
    const bugs = mentionPool.bugs
      .filter((b) => `${b.message || ""} ${b.id}`.toLowerCase().includes(q))
      .map((b) => ({
        kind: "bug", key: `b${b.id}`,
        label: (b.message || `Баг #${b.id}`).slice(0, 44),
        sub: b.senderName ? `от ${b.senderName}` : "баг-репорт",
        insert: `bug${b.id}`,
      }));
    return [...admins, ...users, ...bugs].slice(0, 6);
  }, [mention, mentionPool]);

  function handleDraftChange(e) {
    const val = e.target.value;
    const pos = e.target.selectionStart ?? val.length;
    setDraft(val);
    const uptoCursor = val.slice(0, pos);
    const m = uptoCursor.match(/(?:^|\s)@([^\s@]*)$/);
    if (m) {
      setMention({ query: m[1], start: pos - m[1].length - 1, end: pos });
      setMentionIndex(0);
    } else {
      setMention(null);
    }
  }

  function selectMention(item) {
    if (!mention) return;
    const before = draft.slice(0, mention.start);
    const after = draft.slice(mention.end);
    const inserted = `@${item.insert} `;
    const next = `${before}${inserted}${after}`;
    setDraft(next);
    setMention(null);
    requestAnimationFrame(() => {
      const posn = (before + inserted).length;
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(posn, posn);
    });
  }

  function handleKeyDown(e) {
    if (mention && mentionResults.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => (i + 1) % mentionResults.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => (i - 1 + mentionResults.length) % mentionResults.length); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); selectMention(mentionResults[mentionIndex]); return; }
      if (e.key === "Escape") { setMention(null); return; }
    }
    if (e.key === "Enter") send();
  }

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true); setDraft(""); setMention(null);
    try {
      await sendTeamChatMessage(text);
      load();
    } catch (e) {
      setListError(e.message || "Не получилось отправить");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fp-screen" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 170px)" }}>
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", paddingRight: 2 }}>
        {messages === null ? (
          <ListSkeleton rows={4} />
        ) : messages.length === 0 ? (
          <EmptyState icon={MessagesSquare} title="Пока тихо" hint="Напишите первое сообщение команде" />
        ) : messages.map((m) => (
          <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: m.mine ? "flex-end" : "flex-start", marginBottom: 12 }}>
            {!m.mine && (
              <div style={{ fontSize: 11.5, fontWeight: 700, color: INK, marginBottom: 3, marginLeft: 2 }}>{m.senderName}</div>
            )}
            <div style={{
              maxWidth: "82%", padding: "10px 14px", fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
              borderRadius: m.mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
              background: m.mine ? PURPLE_GRADIENT : CARD_BG,
              color: m.mine ? "#fff" : INK,
              border: m.mine ? "none" : CARD_BORDER,
              boxShadow: m.mine ? PURPLE_GRADIENT_SHADOW : "none",
            }}>{m.text}</div>
            <div style={{ fontSize: 10, color: MUTED_SOFT, marginTop: 3 }}>{formatRelativeTime(m.createdAt)}</div>
          </div>
        ))}
      </div>

      {listError && <div style={{ fontSize: 12, color: DANGER, marginBottom: 8 }}>{listError}</div>}

      <div style={{ position: "relative" }}>
        {mention && mentionResults.length > 0 && (
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: "calc(100% + 8px)",
            background: CARD_BG, border: CARD_BORDER, borderRadius: 16, boxShadow: CARD_SHADOW,
            overflow: "hidden", zIndex: 5,
          }}>
            {mentionResults.map((item, i) => {
              const meta = MENTION_KIND_META[item.kind];
              const Icon = meta.icon;
              return (
                <button
                  type="button" key={item.key}
                  onMouseDown={(e) => { e.preventDefault(); selectMention(item); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
                    background: i === mentionIndex ? PURPLE_SOFT : "transparent", border: "none",
                    borderBottom: i < mentionResults.length - 1 ? CARD_BORDER : "none", cursor: "pointer", textAlign: "left",
                  }}
                >
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${meta.color}1A`, color: meta.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={13} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: MUTED_SOFT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, background: CARD_BG, border: CARD_BORDER, borderRadius: 999, padding: "6px 6px 6px 16px", boxShadow: CARD_SHADOW }}>
          <input
            ref={inputRef}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: INK, fontSize: 14 }}
            placeholder="Написать команде… (@ для упоминания)" value={draft}
            onChange={handleDraftChange}
            onKeyDown={handleKeyDown}
          />
          <button type="button" className="fp-btn" onClick={send} disabled={sending} style={{ width: 38, height: 38, borderRadius: "50%", background: PURPLE_GRADIENT, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: PURPLE_GRADIENT_SHADOW, flexShrink: 0, opacity: sending ? 0.6 : 1 }}>
            <Send size={16} color="#fff" />
          </button>
        </div>
      </div>
    </div>
  );
}

function AuditLogScreen() {
  const [log, setLog] = useState(null); // null = грузится
  const [listError, setListError] = useState("");

  useEffect(() => {
    fetchAuditLog().then(({ log }) => setLog(log)).catch((e) => setListError(e.message || "Не удалось загрузить"));
  }, []);

  return (
    <div className="fp-screen">
      <div style={{ ...s.banner, background: PURPLE_SOFT, color: PURPLE }}>
        <ClipboardList size={14} /> Каждое действие с деньгами и доступом фиксируется здесь
      </div>
      {listError && <div style={{ fontSize: 12.5, color: DANGER, marginBottom: 12 }}>{listError}</div>}
      {log === null ? <ListSkeleton rows={3} /> : (
        <>
      {log.length === 0 && <EmptyState icon={ClipboardList} title="Пока пусто" hint="Действия появятся здесь после первых изменений" />}
      {log.map((entry) => (
        <div key={entry.id} style={s.card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{entry.actorName}</div>
            <div style={{ fontSize: 11, color: MUTED_SOFT, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}><Clock size={11} /> {formatRelativeTime(entry.createdAt)}</div>
          </div>
          <div style={{ fontSize: 13, color: INK, marginBottom: 4 }}>{entry.action}</div>
          {entry.details && <div style={{ fontSize: 12, color: MUTED, fontStyle: "italic", wordBreak: "break-word" }}>«{entry.details}»</div>}
        </div>
      ))}
      </>
      )}
    </div>
  );
}

function buildMenuGroups(role, unreadChat) {
  return [
    {
      title: "Команда",
      items: [
        { key: "teamChat", icon: MessagesSquare, label: "Чат команды", hint: "Обсуждение с другими админами", bg: PURPLE_SOFT, color: PURPLE, badge: unreadChat > 0 ? unreadChat : null },
        { key: "audit", icon: ClipboardList, label: "Журнал действий", hint: "Кто и что менял", bg: "#EAF0FF", color: "#3F6FCB" },
        role === "super" && { key: "heatmap", icon: Flame, label: "Активность админов", hint: "Когда команда работает в панели", bg: DANGER_BG, color: DANGER },
        role === "super" && { key: "roles", icon: UsersIcon, label: "Роли и доступы", hint: "Кто и что может делать в панели", bg: PURPLE_SOFT, color: PURPLE },
      ].filter(Boolean),
    },
    {
      title: "Деньги",
      roleOnly: true,
      items: [
        { key: "payment", icon: CreditCard, label: "Оплата и цены", hint: "Stars, карта, СБП", bg: SUCCESS_BG, color: SUCCESS },
        { key: "transactions", icon: Receipt, label: "Транзакции", hint: "История платежей", bg: "#FBEEDD", color: GOLD },
        { key: "revenue", icon: BarChart3, label: "Отчёт по выручке", hint: "MRR, конверсия, отток", bg: SUCCESS_BG, color: SUCCESS },
        { key: "referrals", icon: GitBranch, label: "Рефералы", hint: "Кто кого привёл, бонусы", bg: PURPLE_SOFT, color: PURPLE },
      ],
    },
    {
      title: "Пользователи",
      items: [
        { key: "moderation", icon: Flag, label: "Модерация", hint: "Подозрительная активность", bg: DANGER_BG, color: DANGER },
        { key: "bugs", icon: Bug, label: "Баг-репорты", hint: "Статусы: новый/в работе/решено", bg: DANGER_BG, color: DANGER },
        { key: "broadcast", icon: Megaphone, label: "Рассылка", hint: "Сообщение всем или сегменту", bg: "#E7EEFC", color: "#3F6FCB" },
      ],
    },
    {
      title: "Продукт",
      roleOnly: true,
      items: [
        { key: "model", icon: Cpu, label: "AI-модель и лимиты", hint: "Gemini, фичи, квоты", bg: "#E7EEFC", color: "#3F6FCB" },
        { key: "aiUsage", icon: Activity, label: "Расход AI", hint: "Запросы, топ пользователей, стоимость", bg: "#E7EEFC", color: "#3F6FCB" },
        { key: "flags", icon: FlaskConical, label: "Фиче-флаги", hint: "Постепенный раскат функций", bg: "#E7EEFC", color: "#3F6FCB" },
        { key: "onboarding", icon: ListOrdered, label: "Онбординг", hint: "Шаги первого запуска", bg: "#E7EEFC", color: "#3F6FCB" },
        { key: "localization", icon: Globe, label: "Локализация", hint: "Языки и переводы строк", bg: SUCCESS_BG, color: SUCCESS },
        { key: "metrics", icon: BarChart3, label: "Метрики продукта", hint: "DAU/WAU/MAU, retention, воронка", bg: PURPLE_SOFT, color: PURPLE },
        { key: "cohorts", icon: Grid3x3, label: "Когортный анализ", hint: "Retention по месяцу регистрации", bg: PURPLE_SOFT, color: PURPLE },
        { key: "nps", icon: Smile, label: "NPS", hint: "Удовлетворённость пользователей", bg: SUCCESS_BG, color: SUCCESS },
        { key: "notes", icon: StickyNote, label: "Заметки", hint: "Конкуренты, цены, наблюдения", bg: "#FBEEDD", color: GOLD },
        { key: "widgets", icon: LayoutGrid, label: "Виджеты Главной", hint: "Что показывать первым", bg: "#E7EEFC", color: "#3F6FCB" },
      ],
    },
    {
      title: "Безопасность",
      roleOnly: true,
      items: [
        { key: "snapshots", icon: DatabaseBackup, label: "Снапшоты настроек", hint: "Сохранить и откатить конфиг", bg: "#E7EEFC", color: "#3F6FCB" },
        { key: "secrets", icon: KeyRound, label: "Возраст секретов", hint: "Когда пора менять ключи", bg: AMBER_BG, color: AMBER },
        { key: "maintenance", icon: Wrench, label: "Режим обслуживания", hint: "Баннер техработ для пользователей", bg: DANGER_BG, color: DANGER },
        { key: "webhook", icon: Wifi, label: "Вебхук Telegram", hint: "Статус и последний пинг", bg: SUCCESS_BG, color: SUCCESS },
        { key: "loginHistory", icon: Smartphone, label: "Входы в аккаунт", hint: "Устройства, где выполнен вход", bg: "#E7EEFC", color: "#3F6FCB" },
        { key: "alerts", icon: BellRing, label: "Алерты", hint: "Уведомления админам в Telegram", bg: AMBER_BG, color: AMBER },
      ],
    },
    {
      title: "Прочее",
      items: [
        { key: "assistant", icon: MessageCircle, label: "AI-ассистент", hint: "Отвечает по текущим данным", bg: PURPLE_SOFT, color: PURPLE },
        { key: "export", icon: Download, label: "Экспорт данных", hint: "CSV для бухгалтерии и разбора", bg: SUCCESS_BG, color: SUCCESS },
        { key: "about", icon: Info, label: "О панели", hint: "Версия, архитектура", bg: "#EEE", color: MUTED },
      ],
    },
  ]
    .map((g) => ({ ...g, items: g.roleOnly ? (role === "super" ? g.items : []) : g.items }))
    .filter((g) => g.items.length > 0);
}

function MoreScreen({ onNav, onLogout, role, unreadChat, pinned, onTogglePin }) {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => buildMenuGroups(role, unreadChat), [role, unreadChat]);

  const allItems = useMemo(() => groups.flatMap((g) => g.items), [role, unreadChat]);
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return allItems.filter((it) => it.label.toLowerCase().includes(q) || it.hint.toLowerCase().includes(q));
  }, [query, allItems]);

  function renderRow(it, i, arr) {
    const Icon = it.icon;
    const isPinned = pinned.includes(it.key);
    return (
      <div key={it.key} style={{ display: "flex", alignItems: "center", gap: 6, borderBottom: i === arr.length - 1 ? "none" : "1px solid rgba(11,11,16,0.06)" }}>
        <button type="button" className="fp-row" onClick={() => onNav(it.key)}
          style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, textAlign: "left", padding: "12px 4px" }}>
          <div style={s.avatarBubble(it.bg, it.color)}><Icon size={17} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: INK, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{it.label}</div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>{it.hint}</div>
          </div>
          {it.badge && <span style={{ ...s.badge(DANGER, "#fff"), marginRight: 2 }}>{it.badge}</span>}
        </button>
        <button type="button" className="fp-btn" onClick={() => onTogglePin(it)} style={{ padding: 6, flexShrink: 0 }} title={isPinned ? "Открепить" : "Закрепить на Главной"}>
          <Star size={16} color={isPinned ? GOLD : MUTED_SOFT} fill={isPinned ? GOLD : "none"} />
        </button>
        <ChevronRight size={16} color={MUTED_SOFT} style={{ marginRight: 4, flexShrink: 0 }} />
      </div>
    );
  }

  return (
    <div className="fp-screen">
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}><RoleBadge role={role} /></div>

      <div style={s.searchBar}>
        <Search size={16} color={MUTED} />
        <input
          value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по разделам настроек…"
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: 14, color: INK }}
        />
        {query && <button type="button" className="fp-btn" onClick={() => setQuery("")}><X size={15} color={MUTED} /></button>}
      </div>

      {searchResults ? (
        searchResults.length === 0 ? (
          <EmptyState icon={Search} title={`Ничего не нашлось по «${query}»`} hint="Попробуйте другой запрос" />
        ) : (
          <div style={s.card}>{searchResults.map((it, i, arr) => renderRow(it, i, arr))}</div>
        )
      ) : (
        groups.map((g) => (
          <div key={g.title}>
            <div style={s.sectionLabel}>{g.title}</div>
            <div style={s.card}>{g.items.map((it, i, arr) => renderRow(it, i, arr))}</div>
          </div>
        ))
      )}

      <button type="button" className="fp-btn" onClick={onLogout} style={{ ...s.dangerGhost, width: "100%" }}>
        <LogOut size={15} /> Выйти из панели
      </button>
    </div>
  );
}

/* ---------------- Роли и доступы ---------------- */

function RolesScreen({ templates, onInvite, onManageTemplates }) {
  const [inviting, setInviting] = useState(false);
  const [template, setTemplate] = useState(templates[0]?.id || null);
  const [creating, setCreating] = useState(false);
  const [createdLink, setCreatedLink] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [realAdmins, setRealAdmins] = useState(null); // null = ещё грузится
  const [pendingInvites, setPendingInvites] = useState([]);
  const [listError, setListError] = useState("");
  const [revoking, setRevoking] = useState(null); // chatId, для кого открыто подтверждение
  const [editing, setEditing] = useState(null); // объект админа, которого редактируем
  const [editTemplate, setEditTemplate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function openEdit(a) {
    setEditing(a);
    setEditTemplate(a.role === "super" ? "super" : (matchTemplate(a.permissions, templates) || templates[0]?.id));
    setSaveError("");
  }

  async function submitEdit() {
    if (saving || !editing) return;
    const t = templates.find((x) => x.id === editTemplate);
    const role = editTemplate === "super" ? "super" : "moderator";
    setSaving(true); setSaveError("");
    try {
      await updateAdminPermissions(editing.chatId, t ? t.items : [], role);
      setEditing(null);
      loadList();
    } catch (e) {
      setSaveError(e.message || "Не получилось сохранить");
    } finally {
      setSaving(false);
    }
  }

  function loadList() {
    setListError("");
    fetchAdminList()
      .then(({ admins, pendingInvites }) => { setRealAdmins(admins); setPendingInvites(pendingInvites); })
      .catch((e) => setListError(e.message || "Не удалось загрузить список"));
  }
  useEffect(loadList, []);

  async function confirmRevoke(chatId) {
    try {
      await revokeAdminAccess(chatId);
      setRevoking(null);
      loadList();
    } catch (e) {
      setListError(e.message || "Не получилось отозвать доступ");
      setRevoking(null);
    }
  }

  function openSheet() {
    setInviting(true); setCreatedLink(null); setError(""); setCopied(false);
    setTemplate(templates[0]?.id || null);
  }

  async function submitInvite() {
    if (creating) return;
    const t = templates.find((x) => x.id === template);
    const role = template === "super" ? "super" : "moderator";
    setCreating(true); setError("");
    try {
      const { link } = await onInvite({ role, permissions: t ? t.items : [] });
      if (!link) {
        setError("Ссылка создана, но VITE_ADMIN_MINIAPP_LINK не задан — добавьте её в .env, чтобы получать готовую ссылку");
      } else {
        setCreatedLink(link);
        loadList();
      }
    } catch (e) {
      setError(e.message || "Не получилось создать приглашение");
    } finally {
      setCreating(false);
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(createdLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fp-screen">
      <div style={{ ...s.banner, background: "#E7EEFC", color: "#3F6FCB" }}>
        <ShieldCheck size={14} /> Права проверяются и на сервере — скрытие пункта в интерфейсе не заменяет проверку доступа в API
      </div>

      {listError && <div style={{ fontSize: 12.5, color: DANGER, marginBottom: 12 }}>{listError}</div>}

      {realAdmins === null ? (
        <div style={{ fontSize: 13, color: MUTED, padding: "12px 2px" }}>Загружаем список…</div>
      ) : (
        <>
          {realAdmins.map((a) => {
            const tKey = templates.find((t) => t.id === (a.role === "super" ? "super" : matchTemplate(a.permissions, templates)));
            const tLabel = a.role === "super" ? "Супер-админ" : (tKey ? tKey.label : "Свой набор прав");
            return (
              <button type="button" className="fp-row" onClick={() => openEdit(a)} key={a.chatId} style={{ ...s.listRow, width: "100%", textAlign: "left", marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, color: PURPLE, flexShrink: 0 }}>
                  {(a.name || a.tgUsername || "?").slice(0, 1).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: INK, fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {a.name || "Без имени"}{a.isYou ? " (вы)" : ""}
                  </div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{a.tgUsername ? `@${a.tgUsername} · ` : ""}{tLabel}</div>
                </div>
                {!a.isYou && (
                  <span
                    role="button" tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); setRevoking(a.chatId); }}
                    style={{ padding: "6px 10px", borderRadius: 10, background: DANGER_BG, color: DANGER, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    Отозвать
                  </span>
                )}
              </button>
            );
          })}
          {realAdmins.length === 0 && (
            <div style={{ fontSize: 13, color: MUTED, padding: "8px 2px", marginBottom: 8 }}>Пока только вы. Создайте ссылку ниже, чтобы пригласить ещё кого-то.</div>
          )}

          {pendingInvites.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.03em", margin: "16px 0 8px" }}>Ссылки ждут перехода</div>
              {pendingInvites.map((inv) => (
                <div key={inv.token} style={{ ...s.listRow, marginBottom: 8 }}>
                  <div style={s.avatarBubble(AMBER_BG, AMBER)}><Clock size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: INK }}>{inv.role === "super" ? "Супер-админ" : "Модератор"}</div>
                    <div style={{ fontSize: 11.5, color: MUTED, marginTop: 1 }}>ссылка ещё не открыта</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      <div style={{ marginTop: 6 }}>
        <button type="button" className="fp-btn" onClick={openSheet} style={{ ...s.primaryPill, width: "100%" }}>
          <Plus size={15} /> Создать ссылку-приглашение
        </button>
        <button type="button" className="fp-btn" onClick={onManageTemplates} style={{ ...s.secondaryPill, width: "100%", marginTop: 10 }}>
          <Layers size={15} /> Шаблоны ролей
        </button>
      </div>

      {revoking && (
        <div style={s.overlay} onClick={() => setRevoking(null)}>
          <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: DANGER_BG, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <ShieldOff size={22} color={DANGER} />
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, marginBottom: 6, textAlign: "center" }}>Отозвать доступ?</div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 18, lineHeight: 1.5, textAlign: "center" }}>Человек сразу потеряет доступ к панели. Действие можно отменить, создав новую ссылку-приглашение.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="fp-btn" onClick={() => setRevoking(null)} style={{ ...s.secondaryPill, flex: 1 }}>Отмена</button>
              <button type="button" className="fp-btn" onClick={() => confirmRevoke(revoking)} style={{ ...s.primaryPill, flex: 1, background: DANGER }}>Отозвать</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div style={s.overlay} onClick={() => setEditing(null)}>
          <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, marginBottom: 6 }}>
              Права — {editing.name || editing.tgUsername || "без имени"}
            </div>
            <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 14, lineHeight: 1.5 }}>Изменения применяются сразу, при следующем открытии панели у человека будет новый набор прав.</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>Набор прав</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {templates.map((t) => (
                <button key={t.id} type="button" className="fp-btn" onClick={() => setEditTemplate(t.id)}
                  style={{ padding: "8px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, background: editTemplate === t.id ? PURPLE_GRADIENT : CARD_BG, color: editTemplate === t.id ? "#fff" : INK, border: editTemplate === t.id ? "none" : CARD_BORDER }}>
                  {t.label}
                </button>
              ))}
            </div>
            {saveError && <div style={{ fontSize: 12, color: DANGER, marginBottom: 14, textAlign: "left" }}>{saveError}</div>}
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="fp-btn" onClick={() => setEditing(null)} style={{ ...s.secondaryPill, flex: 1 }}>Отмена</button>
              <button type="button" className="fp-btn" onClick={submitEdit} disabled={saving} style={{ ...s.primaryPill, flex: 1, opacity: saving ? 0.6 : 1 }}>
                {saving ? "Сохраняем…" : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {inviting && (
        <div style={s.overlay} onClick={() => setInviting(false)}>
          <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
            {!createdLink ? (
              <>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, marginBottom: 6 }}>Создать ссылку-приглашение</div>
                <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 14, lineHeight: 1.5 }}>Тот, кто перейдёт по ссылке из своего Telegram, автоматически получит доступ с этим набором прав — вводить его username не нужно.</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 }}>Набор прав</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {templates.map((t) => (
                    <button key={t.id} type="button" className="fp-btn" onClick={() => setTemplate(t.id)}
                      style={{ padding: "8px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, background: template === t.id ? PURPLE_GRADIENT : CARD_BG, color: template === t.id ? "#fff" : INK, border: template === t.id ? "none" : CARD_BORDER }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {error && <div style={{ fontSize: 12, color: DANGER, marginBottom: 14, textAlign: "left" }}>{error}</div>}
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" className="fp-btn" onClick={() => setInviting(false)} style={{ ...s.secondaryPill, flex: 1 }}>Отмена</button>
                  <button type="button" className="fp-btn" onClick={submitInvite} disabled={creating} style={{ ...s.primaryPill, flex: 1, opacity: creating ? 0.6 : 1 }}>
                    {creating ? "Создаём…" : "Создать ссылку"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, marginBottom: 6 }}>Ссылка готова</div>
                <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 14, lineHeight: 1.5 }}>Отправьте её человеку — доступ откроется автоматически, как только он перейдёт по ней из Telegram. Ссылка одноразовая и действует 7 дней.</div>
                <div style={{ ...s.fieldInput, marginBottom: 14, wordBreak: "break-all", textAlign: "left", userSelect: "all" }}>{createdLink}</div>
                <button type="button" className="fp-btn" onClick={copyLink} style={{ ...s.primaryPill, width: "100%", marginBottom: 10 }}>
                  <Copy size={15} /> {copied ? "Скопировано" : "Скопировать ссылку"}
                </button>
                <button type="button" className="fp-btn" onClick={() => setInviting(false)} style={{ ...s.secondaryPill, width: "100%" }}>Готово</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminRoleDetailScreen({ admin, templates, onSave, onRevoke, isRateLimited, registerDangerousAction }) {
  const [items, setItems] = useState(admin.permissions);
  const [awaiting2FA, setAwaiting2FA] = useState(null); // { kind, reason } | null
  const [revoking, setRevoking] = useState(false);
  const [actionError, setActionError] = useState("");
  const dirty = JSON.stringify([...items].sort()) !== JSON.stringify([...admin.permissions].sort());
  const activeTemplate = matchTemplate(items, templates);
  const wouldLoseFullAccess = admin.isYou && admin.role === "super" && activeTemplate !== "super";

  function toggleItem(key) {
    setItems((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }
  function applyTemplate(id) { const t = templates.find((x) => x.id === id); if (t) setItems(t.items); }

  function requestSave() {
    if (wouldLoseFullAccess) return;
    setAwaiting2FA({ kind: "save", reason: `Изменение прав доступа — ${admin.name || admin.tgUsername}` });
  }
  function requestRevoke() {
    setRevoking(false);
    setAwaiting2FA({ kind: "revoke", reason: `Отзыв доступа — ${admin.name || admin.tgUsername}` });
  }
  async function confirm2FA() {
    setActionError("");
    try {
      if (awaiting2FA.kind === "save") await onSave(admin.chatId, items, awaiting2FA.reason);
      if (awaiting2FA.kind === "revoke") await onRevoke(admin.chatId, awaiting2FA.reason);
      registerDangerousAction();
      setAwaiting2FA(null);
    } catch (e) {
      setActionError(e.message || "Не получилось выполнить действие — сервер отказал");
      setAwaiting2FA(null);
    }
  }

  return (
    <div className="fp-screen">
      <div style={{ ...s.card, textAlign: "center", paddingTop: 20, paddingBottom: 18 }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", fontWeight: 800, fontSize: 20, color: PURPLE }}>
          {(admin.name || admin.tgUsername || "?").slice(0, 1).toUpperCase()}
        </div>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, color: INK }}>{admin.name || "Без имени"}</div>
        <div style={{ fontSize: 12.5, color: MUTED, marginTop: 2 }}>{admin.tgUsername ? `@${admin.tgUsername}` : "username скрыт"}</div>
      </div>

      {actionError && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12.5, color: DANGER, margin: "0 2px 12px", lineHeight: 1.5 }}>
          <CircleAlert size={13} style={{ flexShrink: 0, marginTop: 1 }} /> {actionError}
        </div>
      )}

      <div style={s.sectionLabel}>Шаблон</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
        {templates.map((t) => (
          <button key={t.id} type="button" className="fp-btn" onClick={() => applyTemplate(t.id)}
            style={{ padding: "8px 12px", borderRadius: 999, fontSize: 12.5, fontWeight: 700, background: activeTemplate === t.id ? PURPLE_GRADIENT : CARD_BG, color: activeTemplate === t.id ? "#fff" : INK, border: activeTemplate === t.id ? "none" : CARD_BORDER }}>
            {t.label}
          </button>
        ))}
      </div>

      {PERMISSION_GROUPS.map((g) => (
        <div key={g.key}>
          <div style={s.sectionLabel}>{g.title}</div>
          <div style={s.card}>
            {g.items.map((it, i) => (
              <PermissionRow key={it.key} itemKey={it.key} label={it.label} on={items.includes(it.key)} onToggle={() => toggleItem(it.key)} last={i === g.items.length - 1} />
            ))}
          </div>
        </div>
      ))}

      {wouldLoseFullAccess && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12, color: DANGER, margin: "10px 2px", lineHeight: 1.5 }}>
          <CircleAlert size={13} style={{ flexShrink: 0, marginTop: 1 }} /> Вы супер-админ — если больше некому управлять правами, сервер откажет в сохранении
        </div>
      )}

      <button type="button" className="fp-btn" onClick={requestSave} disabled={!dirty || wouldLoseFullAccess} style={{ ...s.primaryPill, width: "100%", marginTop: 8, opacity: (!dirty || wouldLoseFullAccess) ? 0.5 : 1 }}>
        Сохранить права
      </button>

      {!admin.isYou && (
        <button type="button" className="fp-btn" onClick={() => setRevoking(true)} style={{ ...s.dangerGhost, width: "100%", marginTop: 10 }}>
          <Ban size={15} /> Отозвать доступ
        </button>
      )}

      {revoking && (
        <div style={s.overlay} onClick={() => setRevoking(false)}>
          <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, marginBottom: 8 }}>Отозвать доступ у {admin.name || admin.tgUsername}?</div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 16, lineHeight: 1.5 }}>Потеряет вход в панель немедленно. Действие попадёт в журнал.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="fp-btn" onClick={() => setRevoking(false)} style={{ ...s.secondaryPill, flex: 1 }}>Отмена</button>
              <button type="button" className="fp-btn" onClick={requestRevoke} style={{ ...s.dangerGhost, flex: 1 }}>Отозвать</button>
            </div>
          </div>
        </div>
      )}

      {awaiting2FA && (
        <TwoFactorSheet
          title={awaiting2FA.kind === "revoke" ? "Подтвердите отзыв доступа" : "Подтвердите изменение прав"}
          hint={awaiting2FA.reason}
          rateLimited={isRateLimited()}
          onCancel={() => setAwaiting2FA(null)}
          onConfirm={confirm2FA}
        />
      )}
    </div>
  );
}

/* ---------------- Шаблоны ролей ---------------- */

function TemplatesScreen({ templates, onOpenTemplate, onCreate }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  function submit() {
    if (!name.trim()) return;
    onCreate(name.trim());
    setCreating(false); setName("");
  }

  return (
    <div className="fp-screen">
      <div style={{ ...s.banner, background: PURPLE_SOFT, color: PURPLE }}>
        <Layers size={14} /> Шаблон — стартовый набор прав для нового администратора. Изменение шаблона не трогает права уже добавленных людей
      </div>

      {templates.map((t) => (
        <button key={t.id} type="button" className="fp-row" onClick={() => onOpenTemplate(t.id)} style={{ ...s.listRow, width: "100%", textAlign: "left" }}>
          <div style={s.avatarBubble(PURPLE_SOFT, PURPLE)}><Layers size={16} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: INK, fontFamily: "'Plus Jakarta Sans', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{t.items.length} из {ALL_PERMISSION_KEYS.length} разделов</div>
          </div>
          {t.locked && <span style={s.badge(AMBER_BG, AMBER)}>защищён</span>}
          <ChevronRight size={16} color={MUTED_SOFT} style={{ flexShrink: 0 }} />
        </button>
      ))}

      <button type="button" className="fp-btn" onClick={() => setCreating(true)} style={{ ...s.secondaryPill, width: "100%", marginTop: 6 }}>
        <Plus size={15} /> Создать шаблон
      </button>

      {creating && (
        <div style={s.overlay} onClick={() => setCreating(false)}>
          <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, marginBottom: 14 }}>Новый шаблон</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Например: Поддержка" autoFocus maxLength={30} style={{ ...s.fieldInput, marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="fp-btn" onClick={() => setCreating(false)} style={{ ...s.secondaryPill, flex: 1 }}>Отмена</button>
              <button type="button" className="fp-btn" onClick={submit} disabled={!name.trim()} style={{ ...s.primaryPill, flex: 1, opacity: name.trim() ? 1 : 0.5 }}>Создать</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateDetailScreen({ template, usedByCount, onSave, onDelete }) {
  const [label, setLabel] = useState(template.label);
  const [items, setItems] = useState(template.items);
  const [deleting, setDeleting] = useState(false);
  const dirty = label.trim() !== template.label || JSON.stringify([...items].sort()) !== JSON.stringify([...template.items].sort());

  function toggleItem(key) {
    if (template.locked) return;
    setItems((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  return (
    <div className="fp-screen">
      {template.locked && (
        <div style={{ ...s.banner, background: AMBER_BG, color: AMBER, marginBottom: 14 }}>
          <ShieldAlert size={14} /> Этот шаблон защищён — супер-админ всегда должен иметь полный доступ, иначе некому будет управлять правами
        </div>
      )}

      <div style={s.sectionLabel}>Название</div>
      <div style={s.card}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={30} disabled={template.locked} style={{ ...s.fieldInput, opacity: template.locked ? 0.6 : 1 }} />
      </div>

      {PERMISSION_GROUPS.map((g) => (
        <div key={g.key}>
          <div style={s.sectionLabel}>{g.title}</div>
          <div style={s.card}>
            {g.items.map((it, i) => (
              <PermissionRow key={it.key} itemKey={it.key} label={it.label} on={items.includes(it.key)} onToggle={() => toggleItem(it.key)} disabled={template.locked} last={i === g.items.length - 1} />
            ))}
          </div>
        </div>
      ))}

      <button type="button" className="fp-btn" onClick={() => onSave(template.id, label.trim() || template.label, items)} disabled={!dirty || template.locked} style={{ ...s.primaryPill, width: "100%", marginTop: 8, opacity: (!dirty || template.locked) ? 0.5 : 1 }}>
        Сохранить шаблон
      </button>

      {!template.locked && (
        <button type="button" className="fp-btn" onClick={() => setDeleting(true)} style={{ ...s.dangerGhost, width: "100%", marginTop: 10 }}>
          <Trash2 size={15} /> Удалить шаблон
        </button>
      )}

      {deleting && (
        <div style={s.overlay} onClick={() => setDeleting(false)}>
          <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, marginBottom: 8 }}>Удалить «{template.label}»?</div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 16, lineHeight: 1.5 }}>
              {usedByCount > 0
                ? `У ${usedByCount} администратор(ов) права уже выданы по этому шаблону — они не изменятся, шаблон просто пропадёт из списка для новых приглашений.`
                : "Шаблон нигде не используется прямо сейчас — можно спокойно удалить."}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="fp-btn" onClick={() => setDeleting(false)} style={{ ...s.secondaryPill, flex: 1 }}>Отмена</button>
              <button type="button" className="fp-btn" onClick={() => onDelete(template.id)} style={{ ...s.dangerGhost, flex: 1 }}>Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminProfileScreen({ name, setName, color, setColor, role, auditLog, notify, darkMode, onToggleDark }) {
  const [draftName, setDraftName] = useState(name);
  const myActionsToday = auditLog.filter((e) => e.actor.startsWith("Вы") && e.time === "только что").length;

  function save() {
    setName(draftName.trim() || name);
    notify("Профиль обновлён");
  }

  return (
    <div className="fp-screen">
      <div style={{ ...s.card, textAlign: "center", paddingTop: 24, paddingBottom: 22 }}>
        <div style={{ width: 68, height: 68, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 26, color: "#fff" }}>
          {(draftName || name).slice(0, 1).toUpperCase()}
        </div>
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 18 }}>{name}</div>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}><RoleBadge role={role} /></div>
      </div>

      <div style={s.statGrid}>
        <div style={{ ...s.statCard, gridColumn: "span 3" }}>
          <div style={{ fontSize: 10.5, color: MUTED_SOFT, marginBottom: 5, fontWeight: 600 }}>Действий за сегодня</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 19 }}>{myActionsToday}</div>
        </div>
      </div>

      <div style={s.sectionLabel}>Оформление</div>
      <div style={s.card}>
        <div style={{ ...s.fieldRow, borderBottom: "none" }}>
          <span style={{ ...s.fieldLabel, display: "flex", alignItems: "center", gap: 7 }}>
            {darkMode ? <Moon size={15} color={MUTED} /> : <Sun size={15} color={GOLD} />} Тёмная тема
          </span>
          <Switch on={darkMode} onToggle={onToggleDark} />
        </div>
      </div>

      <div style={s.sectionLabel}>Имя</div>
      <div style={s.card}>
        <input value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="Ваше имя" maxLength={30} style={s.fieldInput} />
      </div>

      <div style={s.sectionLabel}>Цвет аватара</div>
      <div style={{ ...s.card, display: "flex", gap: 10 }}>
        {AVATAR_COLORS.map((c) => (
          <button key={c} type="button" className="fp-btn" onClick={() => setColor(c)}
            style={{ width: 32, height: 32, borderRadius: "50%", background: c, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: color === c ? `0 0 0 3px ${CARD_BG}, 0 0 0 5px ${c}` : "none" }}>
            {color === c && <Check size={14} color="#fff" />}
          </button>
        ))}
      </div>

      <button type="button" className="fp-btn" onClick={save} style={{ ...s.primaryPill, width: "100%", marginTop: 6 }}>Сохранить</button>
    </div>
  );
}

function AboutScreen() {
  return (
    <div className="fp-screen">
      <div style={s.sectionLabel}>Переменные окружения</div>
      <div style={s.card}>
        {Object.entries(DIAG_LABELS).map(([key, label], i, arr) => (
          <div key={key} style={{ ...s.fieldRow, borderBottom: i === arr.length - 1 ? "none" : s.fieldRow.borderBottom }}>
            <span style={s.fieldLabel}>{label}</span>
            <Check size={16} color={SUCCESS} />
          </div>
        ))}
      </div>
      <div style={s.card}>
        <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Про эту панель</div>
        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
          Личные данные пользователей мини-аппа (контакты, задачи, цели) хранятся в Telegram CloudStorage
          каждого пользователя отдельно и отсюда не видны. Эта панель — веб-версия того, что раньше было
          доступно только командами в Telegram-боте: статус Gemini, буфер багов/идей, сборка промпта для
          Claude, управление пользователями, промокодами и настройками оплаты.
        </div>
      </div>
    </div>
  );
}

/* ---------------- Login gate ---------------- */

// Реальная проверка доступа: без паролей и без выбора роли руками.
// При открытии сразу спрашивает у сервера "кто ты" (Telegram initData,
// подделать нельзя) — если это приглашение по ссылке, сначала принимает
// его (см. api/admin-invite-accept.js), иначе просто проверяет, есть ли
// уже доступ (api/admin-session.js). Ни один из двух запросов не может
// быть подделан снаружи: сервер сверяет подпись Telegram и chat_id в базе.
function LoginGate({ onSuccess }) {
  const [status, setStatus] = useState("checking"); // "checking" | "denied"
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const launch = getAdminLaunchMode();
      try {
        const data = launch.mode === "invite" ? await acceptAdminInvite(launch.token) : await fetchAdminSession();
        if (cancelled) return;
        const admin = data.admin;
        onSuccess({
          role: admin.role === "super" ? "super" : "moderator",
          name: admin.name || "Админ",
          permissions: admin.permissions || [],
          chatId: admin.chatId,
        });
      } catch (e) {
        if (cancelled) return;
        setErrorText(e.message || "Доступ не выдан");
        setStatus("denied");
      }
    }
    run();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ ...s.shell, alignItems: "center", justifyContent: "center", padding: "0 28px" }}>
      <style>{`${globalCss}\n@keyframes fpSpin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: "100%", maxWidth: 320, textAlign: "center" }} className="fp-fade">
        {status === "checking" ? (
          <>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <Loader2 size={24} color={PURPLE} style={{ animation: "fpSpin 1s linear infinite" }} />
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 19, marginBottom: 6 }}>for people · admin</div>
            <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>Проверяем доступ по Telegram…</div>
          </>
        ) : (
          <>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: DANGER_BG, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <Lock size={24} color={DANGER} />
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 19, marginBottom: 6 }}>Доступ закрыт</div>
            <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>{errorText}</div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Root ---------------- */

const TAB_ITEMS = [
  { key: "home", label: "Главная", icon: Home },
  { key: "users", label: "Пользователи", icon: UsersIcon },
  { key: "promo", label: "Промо", icon: Tag },
  { key: "more", label: "Ещё", icon: MoreHorizontal },
];
const TITLES = {
  home: "Главная", users: "Пользователи", userDetail: "Профиль", promo: "Промокоды",
  payment: "Оплата и цены", model: "AI-модель", bugs: "Баг-репорты", assistant: "AI-ассистент",
  more: "Ещё", about: "О панели", audit: "Журнал действий",
  transactions: "Транзакции", revenue: "Отчёт по выручке",
  aiUsage: "Расход AI", moderation: "Модерация",
  metrics: "Метрики продукта", broadcast: "Рассылка", flags: "Фиче-флаги",
  export: "Экспорт данных", alerts: "Алерты",
  referrals: "Реферальная программа", onboarding: "Онбординг", localization: "Локализация",
  snapshots: "Снапшоты настроек", secrets: "Возраст секретов", maintenance: "Режим обслуживания", webhook: "Вебхук Telegram", loginHistory: "Входы в аккаунт",
  profile: "Профиль администратора",
  cohorts: "Когортный анализ", nps: "NPS", notes: "Заметки", widgets: "Виджеты Главной", heatmap: "Активность админов",
  teamChat: "Чат команды", loginHistory: "История входов",
  roles: "Роли и доступы", adminRole: "Доступ администратора",
  templates: "Шаблоны ролей", templateDetail: "Шаблон роли",
};
const TOP_LEVEL = new Set(["home", "users", "promo", "more"]);
const USERS_TAB_SCREENS = new Set(["userDetail"]);
const MORE_TAB_SCREENS = new Set(Object.keys(TITLES).filter((k) => !TOP_LEVEL.has(k) && !USERS_TAB_SCREENS.has(k)));

export default function AdminApp() {
  const [session, setSession] = useState(null); // { role } | null
  const [stack, setStack] = useState(["home"]);

  const [promos, setPromos] = useState(INITIAL_PROMOS);
  const [auditLog, setAuditLog] = useState(INITIAL_AUDIT_LOG);
  const [transactions] = useState(INITIAL_TRANSACTIONS);
  const [priceHistory, setPriceHistory] = useState(PRICE_HISTORY);
  const [selectedUser, setSelectedUser] = useState(null); // объект реального пользователя (см. openUser)
  const [toast, setToast] = useState("");
  const [settings, setSettings] = useState({
    methods: { stars: true, card: false, sbp: false },
    priceStars: 599, priceOld: 1999,
    channelBonus: true,
    model: "gemini-2.5-flash",
    features: { voice: true, quickAdd: true, insights: true },
    freeLimit: 20,
    maintenanceMode: false,
    maintenanceText: "Идут технические работы, вернёмся через 30 минут.",
  });
  const [homeWidgets, setHomeWidgets] = useState(HOME_WIDGET_OPTIONS.map((w) => ({ key: w.key, enabled: true })));
  const [unreadChat, setUnreadChat] = useState(0);

  useEffect(() => {
    if (!session) return;
    function poll() { fetchHomeStats().then((d) => setUnreadChat(d.unreadChat || 0)).catch(() => {}); }
    poll();
    const t = setInterval(poll, 15000);
    return () => clearInterval(t);
  }, [session]);
  const [adminName, setAdminName] = useState("Админ");
  function updateAdminName(newName) {
    setAdminName(newName);
    if (role === "super") setAdmins((prev) => prev.map((a) => (a.isYou ? { ...a, name: newName } : a)));
  }
  const [adminColor, setAdminColor] = useState(AVATAR_COLORS[0]);
  const [pinned, setPinned] = useState(["broadcast", "moderation"]);
  const [darkMode, setDarkMode] = useState(false);
  const [bugs, setBugs] = useState(DEMO_BUGS);
  const [admins, setAdmins] = useState(INITIAL_ADMINS);
  const [selectedAdminId, setSelectedAdminId] = useState(null);
  const [templates, setTemplates] = useState(DEFAULT_ROLE_TEMPLATES);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const dangerousActionsRef = useRef([]);

  function isRateLimited() {
    const now = Date.now();
    dangerousActionsRef.current = dangerousActionsRef.current.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    return dangerousActionsRef.current.length >= RATE_LIMIT_MAX_ACTIONS;
  }
  function registerDangerousAction() {
    dangerousActionsRef.current.push(Date.now());
  }
  const [sessionWarning, setSessionWarning] = useState(false);
  const [warningSecondsLeft, setWarningSecondsLeft] = useState(60);
  const lastActivityRef = useRef(Date.now());

  const screen = stack[stack.length - 1];
  const toastTimer = useRef(null);

  useEffect(() => {
    function onPointerDown(e) {
      if (e.target.closest(".fp-btn, .fp-row")) {
        try { navigator.vibrate?.(8); } catch {}
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    function markActive() {
      lastActivityRef.current = Date.now();
      setSessionWarning(false);
    }
    document.addEventListener("pointerdown", markActive);
    document.addEventListener("keydown", markActive);
    return () => {
      document.removeEventListener("pointerdown", markActive);
      document.removeEventListener("keydown", markActive);
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= SESSION_IDLE_LIMIT_MS) {
        setSession(null);
        setSessionWarning(false);
      } else if (idle >= SESSION_IDLE_LIMIT_MS - SESSION_WARNING_MS) {
        setSessionWarning(true);
        setWarningSecondsLeft(Math.ceil((SESSION_IDLE_LIMIT_MS - idle) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (session) lastActivityRef.current = Date.now();
  }, [session]);

  function staySignedIn() {
    lastActivityRef.current = Date.now();
    setSessionWarning(false);
  }

  function notify(text) {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  }
  function push(scr) { if (scr === "teamChat") setUnreadChat(0); setStack((st) => [...st, scr]); }
  function back() { setStack((st) => (st.length > 1 ? st.slice(0, -1) : st)); }
  function goTab(key) { setStack([key]); }
  function openUser(user) { setSelectedUser(user); push("userDetail"); }
  function openAdminRole(id) { setSelectedAdminId(id); push("adminRole"); }
  function openTemplateDetail(id) { setSelectedTemplateId(id); push("templateDetail"); }
  function createRoleTemplate(label) {
    const t = { id: `t${Date.now()}`, label, items: [], locked: false };
    setTemplates((prev) => [...prev, t]);
    logAction(`Создан шаблон роли «${label}»`, "");
    notify("Шаблон создан");
    setSelectedTemplateId(t.id);
    push("templateDetail");
  }
  function saveRoleTemplate(id, label, items) {
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, label, items } : t)));
    logAction(`Изменён шаблон роли «${label}»`, "");
    notify("Шаблон сохранён");
    back();
  }
  function deleteRoleTemplate(id) {
    const t = templates.find((x) => x.id === id);
    setTemplates((prev) => prev.filter((x) => x.id !== id));
    logAction(`Удалён шаблон роли «${t.label}»`, "");
    notify("Шаблон удалён");
    back();
  }
  async function inviteAdmin({ role, permissions }) {
    const { startParam } = await createAdminInvite(role, permissions);
    const base = import.meta.env.VITE_ADMIN_MINIAPP_LINK;
    const link = base ? `${base}?startapp=${startParam}` : null;
    const tKey = matchTemplate(permissions, templates);
    logAction("Создана ссылка-приглашение", `Набор прав: ${tKey ? templates.find((t) => t.id === tKey).label : "свой набор"}`);
    notify("Ссылка создана");
    return { link };
  }
  function acceptInvite(id, name) {
    let acceptedRole = "moderator";
    setAdmins((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      acceptedRole = matchTemplate(a.permissions, templates) === "super" ? "super" : "moderator";
      return { ...a, name, status: "active" };
    }));
    logAction(`Принял приглашение — ${name}`, "");
    return acceptedRole;
  }
  function saveAdminPermissions(id, items, reason) {
    const a = admins.find((x) => x.id === id);
    setAdmins((prev) => prev.map((x) => (x.id === id ? { ...x, permissions: items } : x)));
    logAction(`Изменены права доступа — ${a.name}`, reason);
    notify("Права обновлены");
    back();
  }
  function revokeAdmin(id, reason) {
    const a = admins.find((x) => x.id === id);
    setAdmins((prev) => prev.filter((x) => x.id !== id));
    logAction(`Отозван доступ — ${a.name}`, reason);
    notify("Доступ отозван");
    back();
  }
  function logout() { setSession(null); setSessionWarning(false); setStack(["home"]); }

  function logAction(action, reason) {
    setAuditLog((prev) => [{ id: Date.now(), actor: session?.role === "super" ? "Вы (супер-админ)" : "Вы (модератор)", action, reason, time: "только что" }, ...prev]);
  }

  // Реально меняют тариф/блокировку через API (было — мутация локального
  // мока INITIAL_USERS). selectedUser обновляем оптимистично из ответа,
  // чтобы UserDetailScreen сразу показал актуальное состояние.
  async function togglePlan(u, reason) {
    const nextPlan = u.plan === "pro" ? "free" : "pro";
    await setUserPlan(u.chatId, nextPlan, reason);
    setSelectedUser((prev) => (prev && prev.chatId === u.chatId ? { ...prev, plan: nextPlan } : prev));
    logAction(`${u.plan === "pro" ? "Забрали" : "Выдали"} Pro у ${u.name || u.chatId}`, reason);
    notify("Тариф пользователя обновлён");
  }
  async function toggleBlock(u, reason) {
    await setUserBlocked(u.chatId, !u.blocked);
    setSelectedUser((prev) => (prev && prev.chatId === u.chatId ? { ...prev, blocked: !prev.blocked } : prev));
    logAction(`${u.blocked ? "Разблокировали" : "Заблокировали"} ${u.name || u.chatId}`, reason);
    notify("Статус блокировки обновлён");
  }
  function onPriceChange(from, to) {
    setPriceHistory((prev) => [{ id: Date.now(), from, to, note: "Изменено вручную из панели", time: "только что", actor: "Вы" }, ...prev]);
    logAction(`Изменили цену Pro: ${from} → ${to} Stars`, "Правка в разделе «Оплата и цены»");
  }

  function onTogglePin(item) {
    setPinned((prev) => {
      if (prev.includes(item.key)) return prev.filter((k) => k !== item.key);
      if (prev.length >= 6) { notify("Можно закрепить не больше 6 разделов"); return prev; }
      return [...prev, item.key];
    });
  }

  function onBroadcastSent(count, text) {
    logAction(`Разослали сообщение ${count} пользователям`, text.slice(0, 80));
  }

  function togglePromo(id) {
    setPromos((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  }
  function deletePromo(id) {
    setPromos((prev) => prev.filter((p) => p.id !== id));
    notify("Промокод удалён");
  }
  function createPromo(data) {
    setPromos((prev) => [{ id: Date.now(), ...data }, ...prev]);
    notify("Промокод создан");
  }

  if (!session) return <LoginGate onSuccess={(s0) => { setSession(s0); setAdminName(s0.name); }} />;
  const role = session.role;

  const navAttentionCount = bugs.filter((b) => b.status !== "resolved").length + unreadChat + (role === "super" ? admins.filter((a) => a.status === "invited").length : 0);
  const guardedScreen = (role === "moderator" && ["payment", "model", "transactions", "revenue", "aiUsage", "flags", "alerts", "referrals", "onboarding", "localization", "snapshots", "secrets", "maintenance", "webhook", "cohorts", "nps", "notes", "widgets", "heatmap", "loginHistory", "roles", "adminRole", "templates", "templateDetail"].includes(screen)) ? "more" : screen;

  return (
    <div style={s.shell} className="fp-shell-root" data-theme={darkMode ? "dark" : "light"}>
      <style>{globalCss}</style>
      <Header title={TITLES[guardedScreen]} onBack={TOP_LEVEL.has(guardedScreen) ? null : back} identity={{ name: adminName, color: adminColor }} onProfileTap={() => push("profile")} darkMode={darkMode} onToggleDark={() => setDarkMode((d) => !d)} />
      <div style={s.page}>
        {guardedScreen === "home" && <HomeScreen unreadChat={unreadChat} onNav={push} widgets={homeWidgets} priceStars={settings.priceStars} pinned={pinned} role={role} adminName={adminName} />}
        {guardedScreen === "users" && <UsersScreen onOpenUser={openUser} />}
        {guardedScreen === "userDetail" && <UserDetailScreen user={selectedUser} onTogglePlan={togglePlan} onToggleBlock={toggleBlock} role={role} isRateLimited={isRateLimited} registerDangerousAction={registerDangerousAction} notify={notify} />}
        {guardedScreen === "promo" && <PromoScreen />}
        {guardedScreen === "payment" && <PaymentScreen settings={settings} setSettings={setSettings} notify={notify} onPriceChange={onPriceChange} isRateLimited={isRateLimited} registerDangerousAction={registerDangerousAction} />}
        {guardedScreen === "model" && <ModelScreen settings={settings} setSettings={setSettings} notify={notify} />}
        {guardedScreen === "bugs" && <BugReports notify={notify} />}
        {guardedScreen === "assistant" && <AssistantChat users={users} promos={promos} bugs={bugs} settings={settings} />}
        {guardedScreen === "more" && <MoreScreen onNav={push} onLogout={logout} role={role} unreadChat={unreadChat} pinned={pinned} onTogglePin={onTogglePin} />}
        {guardedScreen === "profile" && <AdminProfileScreen name={adminName} setName={updateAdminName} color={adminColor} setColor={setAdminColor} role={role} auditLog={auditLog} notify={notify} darkMode={darkMode} onToggleDark={() => setDarkMode((d) => !d)} />}
        {guardedScreen === "teamChat" && <TeamChatScreen />}
        {guardedScreen === "about" && <AboutScreen />}
        {guardedScreen === "audit" && <AuditLogScreen />}
        {guardedScreen === "transactions" && <TransactionsScreen transactions={transactions} />}
        {guardedScreen === "revenue" && <RevenueScreen users={users} priceHistory={priceHistory} priceStars={settings.priceStars} />}
        {guardedScreen === "aiUsage" && <AiUsageScreen />}
        {guardedScreen === "moderation" && <ModerationScreen notify={notify} />}
        {guardedScreen === "metrics" && <MetricsScreen users={users} />}
        {guardedScreen === "broadcast" && <BroadcastScreen users={users} notify={notify} onSent={onBroadcastSent} />}
        {guardedScreen === "flags" && <FeatureFlagsScreen notify={notify} />}
        {guardedScreen === "export" && <ExportScreen users={users} transactions={transactions} promos={promos} notify={notify} />}
        {guardedScreen === "alerts" && <AlertsScreen notify={notify} />}
        {guardedScreen === "referrals" && <ReferralScreen />}
        {guardedScreen === "onboarding" && <OnboardingScreen notify={notify} />}
        {guardedScreen === "localization" && <LocalizationScreen notify={notify} />}
        {guardedScreen === "snapshots" && <SnapshotScreen settings={settings} setSettings={setSettings} notify={notify} />}
        {guardedScreen === "secrets" && <SecretsAgeScreen />}
        {guardedScreen === "maintenance" && <MaintenanceScreen settings={settings} setSettings={setSettings} notify={notify} />}
        {guardedScreen === "webhook" && <WebhookScreen notify={notify} />}
        {guardedScreen === "loginHistory" && <LoginHistoryScreen notify={notify} />}
        {guardedScreen === "cohorts" && <CohortScreen />}
        {guardedScreen === "nps" && <NpsScreen />}
        {guardedScreen === "notes" && <NotesScreen notify={notify} />}
        {guardedScreen === "widgets" && <WidgetsScreen widgets={homeWidgets} setWidgets={setHomeWidgets} notify={notify} />}
        {guardedScreen === "heatmap" && <HeatmapScreen />}
        {guardedScreen === "roles" && <RolesScreen templates={templates} onInvite={inviteAdmin} onManageTemplates={() => push("templates")} />}
        {guardedScreen === "adminRole" && selectedAdminId && (
          <AdminRoleDetailScreen
            admin={admins.find((a) => a.id === selectedAdminId)}
            templates={templates}
            isLastSuperAdmin={admins.filter((a) => matchTemplate(a.permissions, templates) === "super").length <= 1}
            onSave={saveAdminPermissions}
            onRevoke={revokeAdmin}
            isRateLimited={isRateLimited}
            registerDangerousAction={registerDangerousAction}
          />
        )}
        {guardedScreen === "templates" && <TemplatesScreen templates={templates} onOpenTemplate={openTemplateDetail} onCreate={createRoleTemplate} />}
        {guardedScreen === "templateDetail" && selectedTemplateId && (
          <TemplateDetailScreen
            template={templates.find((t) => t.id === selectedTemplateId)}
            usedByCount={admins.filter((a) => matchTemplate(a.permissions, templates) === selectedTemplateId).length}
            onSave={saveRoleTemplate}
            onDelete={deleteRoleTemplate}
          />
        )}
      </div>
      <Toast key={toast} text={toast} />
      {sessionWarning && (
        <div style={s.overlay}>
          <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: AMBER_BG, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <TimerReset size={22} color={AMBER} />
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, marginBottom: 6, textAlign: "center" }}>Сессия скоро завершится</div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 18, lineHeight: 1.5, textAlign: "center" }}>
              Из-за неактивности выход произойдёт через <b style={{ color: DANGER }}>{warningSecondsLeft} сек</b>. Останьтесь в системе, если продолжаете работать.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" className="fp-btn" onClick={logout} style={{ ...s.secondaryPill, flex: 1 }}>Выйти сейчас</button>
              <button type="button" className="fp-btn" onClick={staySignedIn} style={{ ...s.primaryPill, flex: 1 }}>Остаться в системе</button>
            </div>
          </div>
        </div>
      )}
      <div style={s.bottomBar}>
        {TAB_ITEMS.map((n) => {
          const Icon = n.icon;
          const active = screen === n.key || (n.key === "users" && USERS_TAB_SCREENS.has(screen)) || (n.key === "more" && MORE_TAB_SCREENS.has(screen));
          const badge = n.key === "more" ? navAttentionCount : null;
          return (
            <button key={n.key} type="button" className="fp-btn" style={s.bottomBarItem(active)} onClick={() => goTab(n.key)}>
              {badge > 0 && (
                <span style={{ position: "absolute", top: 2, left: "calc(50% + 7px)", minWidth: 15, height: 15, padding: "0 4px", borderRadius: 999, background: DANGER, color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{badge > 9 ? "9+" : badge}</span>
              )}
              <Icon size={20} />
              <span style={s.bottomBarLabel}>{n.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
