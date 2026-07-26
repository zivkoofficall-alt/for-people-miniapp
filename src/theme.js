// theme.js — визуальный язык приложения: шрифты, цвета, стили компонентов.
// Один источник правды и для App.jsx, и для лениво подгружаемых модулей.

const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500;1,600&family=Inter:wght@400;500;600;700&display=swap');
  /* Сброс нативных стилей <button>. Без этого некоторые WebView (в т.ч.
     Android-клиент Telegram) рисуют поверх inline-стилей свой системный
     "нажимаемый" вид кнопки — это и есть чёрная квадратная тень под
     круглыми/пилюльными кнопками в шапке. appearance:none убирает этот
     нативный скин, остальное просто снимает юзер-агентные отступы. */
  button {
    all: unset;
    box-sizing: border-box;
    -webkit-appearance: none !important;
    appearance: none !important;
    -webkit-tap-highlight-color: transparent;
    font-family: inherit;
    cursor: pointer;
  }
  @keyframes fpFadeIn { from{opacity:0} to{opacity:1} }
  @keyframes fpSlideUp { from{opacity:0; transform:translateY(26px)} to{opacity:1; transform:translateY(0)} }
  @keyframes fpStepIn { from{opacity:0; transform:translateX(16px)} to{opacity:1; transform:translateX(0)} }
  @keyframes fpCardIn { from{opacity:0; transform:translateY(10px) scale(0.96)} to{opacity:1; transform:translateY(0) scale(1)} }
  @keyframes fpPulse { 0%,100%{opacity:0.55} 50%{opacity:1} }
  .fp-overlay-anim { animation: fpFadeIn .18s ease; }
  .fp-sheet-anim { animation: fpSlideUp .3s cubic-bezier(.2,.8,.2,1); will-change: transform, opacity; }
  .fp-step-anim { animation: fpStepIn .22s ease; will-change: transform, opacity; }
  .fp-slideup { animation: fpSlideUp .25s ease; will-change: transform, opacity; }
  .fp-msg-in { animation: fpSlideUp .22s ease; display:flex; will-change: transform, opacity; }
  .fp-card { transition: transform .15s ease, box-shadow .15s ease; animation: fpCardIn .3s ease both; cursor:pointer; will-change: transform; }
  .fp-card:active { transform: scale(0.96); }
  .fp-btn { transition: transform .12s ease, opacity .12s ease; cursor:pointer; }
  .fp-btn:active { transform: scale(0.94); }
  .fp-fab { transition: transform .15s ease; }
  .fp-fab:active { transform: scale(0.9); }
  .fp-pulse { animation: fpPulse 1.2s ease-in-out infinite; }
  .fp-pair-row { display: flex; gap: 8px; }
  @media (max-width: 380px) {
    .fp-pair-row { flex-direction: column; }
  }
`;

const INK = "#0B0B10";
const MUTED = "rgba(11,11,16,0.55)";
const PURPLE = "#7C4DFF";
const PURPLE_SOFT = "#EDE7FE";
const PURPLE_GRADIENT = "linear-gradient(135deg, #8A63FF 0%, #7C4DFF 60%, #6D3FE0 100%)";
const PURPLE_GRADIENT_SHADOW = "0 8px 20px rgba(124,77,255,0.35)";
const BG = "#FBFAFC";
const CARD_BORDER = "1px solid rgba(11,11,16,0.08)";
const SHEET_BG = "#FFFFFF";
const CARD_SHADOW = "0 4px 18px rgba(20,10,50,0.06)";

const styles = {
  app: { minHeight: "100vh", width: "100%", maxWidth: "100vw", overflowX: "hidden", background: BG, fontFamily: "'Inter', sans-serif", color: INK, position: "relative" },
  shell: { display: "flex", flexDirection: "column", minHeight: "100vh" },
  header: { padding: "18px 16px 0" },
  topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 8 },
  navLeft: { fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: "0.04em", display: "none" },
  navCenterLogo: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 13, letterSpacing: "0.12em", color: INK },
  topActions: { display: "flex", alignItems: "center", gap: 7, marginLeft: "auto", overflowX: "auto", flexShrink: 0, scrollbarWidth: "none" },
  iconBtn: { position: "relative", width: 33, height: 33, borderRadius: 999, background: "#fff", border: CARD_BORDER, display: "flex", alignItems: "center", justifyContent: "center", color: INK, boxShadow: "none" },
  iconBtnBadge: { position: "absolute", top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 999, background: "#E5484D", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" },
  pillBtnGhost: { background: "#fff", border: CARD_BORDER, color: INK, borderRadius: 999, padding: "8px 14px", fontSize: 12, fontWeight: 700, fontFamily: "'Inter', sans-serif", boxShadow: "none" },
  pillBtnGhostActive: { background: INK, color: "#fff", border: `1px solid ${INK}` },
  heroRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 10 },
  // minWidth:0 обязателен на flex-детях с крупным текстом — без него
  // элемент не сжимается меньше своей "естественной" ширины контента
  // (браузерный дефолт min-width:auto) и вылезает за пределы контейнера
  // вместо переноса. Это и есть причина обрезанного "CIRCLE" справа.
  heroTextBlock: { flex: 1, minWidth: 0 },
  heroTextBlockRight: { flex: 1, minWidth: 0, textAlign: "right" },
  heroEyebrow: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontStyle: "italic", fontWeight: 600, fontSize: 15, color: INK, marginBottom: 2, whiteSpace: "nowrap" },
  heroTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: "clamp(26px, 9vw, 38px)", lineHeight: 0.95, margin: 0, color: PURPLE, letterSpacing: "-0.01em", whiteSpace: "nowrap" },
  statsPanel: { display: "flex", alignItems: "center", background: "#fff", border: CARD_BORDER, borderRadius: 20, padding: "14px 10px", marginBottom: 14, boxShadow: CARD_SHADOW },
  heroPanel: { position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #9B7FF3 0%, #7C5CE8 100%)", borderRadius: 28, padding: 18, marginBottom: 14, boxShadow: "0 14px 30px rgba(124,77,255,0.28)" },
  heroPanelGlow1: { position: "absolute", top: -40, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.12)", filter: "blur(10px)" },
  heroPanelGlow2: { position: "absolute", bottom: -50, left: -30, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.08)", filter: "blur(14px)" },
  // Декоративный водяной знак-логотип, чтобы заполнить пустое фиолетовое
  // пространство справа. z-index не задан (т.е. 0/auto) — лежит под
  // heroPanelTop (zIndex:1), поэтому текст и кнопки всегда поверх него.
  // pointerEvents:none — не перехватывает тапы.
  heroPanelLogoMark: { position: "absolute", top: 18, right: -34, width: 210, height: 210, opacity: 0.14, transform: "rotate(-10deg)", pointerEvents: "none", userSelect: "none" },
  // Раньше это был flex-ряд из двух колонок по ~130px каждая — тексту
  // (имя, профессия, подпись "Категории") физически некуда было
  // помещаться, кроме как обрезаться. Ставим вертикальный стек: сначала
  // текстовый блок с кнопкой AI, ниже — статы и карточка контакта на всю
  // ширину панели, где места для текста в разы больше.
  heroPanelTop: { position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 18 },
  heroPanelLeft: { minWidth: 0, display: "flex", flexDirection: "column" },
  heroPanelBadge: { display: "inline-block", alignSelf: "flex-start", fontSize: 10.5, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,0.18)", borderRadius: 999, padding: "4px 10px", marginBottom: 10 },
  heroPanelHeading: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 19, lineHeight: 1.2, color: "#fff", marginBottom: 8 },
  heroPanelDesc: { fontSize: 12, lineHeight: 1.5, color: "rgba(255,255,255,0.85)", marginBottom: 14 },
  exploreBtn: { alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.22)", color: "#fff", border: "1px solid rgba(255,255,255,0.35)", borderRadius: 999, padding: "9px 8px 9px 16px", fontSize: 12.5, fontWeight: 700, fontFamily: "'Inter', sans-serif", marginBottom: 14, backdropFilter: "blur(6px)" },
  circlePillBtn: { alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, background: PURPLE_GRADIENT, color: "#fff", border: "none", borderRadius: 999, padding: "9px 8px 9px 16px", fontSize: 12.5, fontWeight: 700, fontFamily: "'Inter', sans-serif", boxShadow: PURPLE_GRADIENT_SHADOW },
  exploreBtnCircle: { width: 24, height: 24, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" },
  heroPanelRight: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 10 },
  // display:grid с явными равными колонками — в отличие от flex:1 тут
  // ширина каждой колонки жёстко фиксирована и не зависит от длины текста
  // подписи, поэтому "Категории" не может наехать на соседнюю "Теги".
  // Раньше grid из 3 равных колонок растягивал блок на всю ширину и
  // центрировал каждый айтем внутри своей колонки — визуально это выглядело
  // "по центру", а не по левому краю, как остальной контент панели.
  // Теперь это flex-ряд без stretch: элементы стоят по естественной ширине
  // содержимого, прижаты к левому краю, с фиксированным отступом между ними.
  heroStatsRow: { display: "flex", justifyContent: "flex-start", gap: 28 },
  heroStatItem: { flex: "0 0 auto", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 },
  heroStatIconWrap: { width: 26, height: 26, borderRadius: 9, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2 },
  heroStatNum: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 14, color: "#fff" },
  heroStatLabel: { fontSize: 10, lineHeight: 1.2, color: "rgba(255,255,255,0.8)", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" },
  featuredLabel: { fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginTop: 4 },
  featuredCard: { width: "100%", boxSizing: "border-box", background: "#fff", borderRadius: 16, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, boxShadow: "none", border: "none", textAlign: "left" },
  featuredTopRow: { display: "flex", alignItems: "center", gap: 11, width: "100%", minWidth: 0 },
  featuredAvatar: { width: 44, height: 44, borderRadius: 14, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16, color: PURPLE, overflow: "hidden", flexShrink: 0 },
  featuredBody: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 },
  featuredName: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  featuredSub: { fontSize: 12, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  featuredBtn: { width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 999, padding: "10px 0", fontSize: 12.5, fontWeight: 700, color: "#fff", background: PURPLE_GRADIENT, whiteSpace: "nowrap" },
  statItem: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 },
  statIconWrap: { width: 26, height: 26, borderRadius: 9, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 2 },
  statNum: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, color: INK },
  statLabel: { fontSize: 10, color: MUTED, fontWeight: 500 },
  statDivider: { width: 1, height: 30, background: "rgba(11,11,16,0.08)" },
  socialProofRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14 },
  avatarCluster: { display: "flex", alignItems: "center" },
  clusterAvatar: { width: 26, height: 26, borderRadius: "50%", background: PURPLE_SOFT, border: "2px solid #FBFAFC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, color: PURPLE, overflow: "hidden", fontFamily: "'Plus Jakarta Sans', sans-serif" },
  socialProofText: { fontSize: 11.5, color: MUTED, fontWeight: 500 },
  searchBar: { display: "flex", alignItems: "center", gap: 9, background: "#fff", border: CARD_BORDER, borderRadius: 999, padding: "13px 16px", marginBottom: 14, boxShadow: CARD_SHADOW },
  searchInput: { flex: 1, background: "transparent", border: "none", outline: "none", color: INK, fontSize: 14, fontFamily: "'Inter', sans-serif" },
  clearBtn: { background: "none", border: "none", padding: 2 },
  categoryRow: { display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4 },
  categoryChip: { flexShrink: 0, background: "#fff", border: CARD_BORDER, color: MUTED, borderRadius: 999, padding: "7px 14px", fontSize: 12, fontWeight: 600, fontFamily: "'Inter', sans-serif" },
  categoryChipActive: { background: INK, color: "#fff", border: `1px solid ${INK}` },
  main: { flex: 1, padding: "8px 16px 168px" },
  emptyState: { height: "50vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center" },
  emptyIconWrap: { width: 56, height: 56, borderRadius: "50%", background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6 },
  emptyTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: INK },
  emptyHint: { fontSize: 12.5, color: MUTED },
  emptyHintSmall: { fontSize: 11.5, color: MUTED, marginTop: 4 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(155px, 1fr))", gap: 10 },
  card: { position: "relative", background: "#fff", border: CARD_BORDER, borderRadius: 22, padding: 14, textAlign: "left", display: "flex", flexDirection: "column", gap: 7, fontFamily: "'Inter', sans-serif", boxShadow: CARD_SHADOW },
  selectCheck: { position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: "50%", border: "1.5px solid rgba(11,11,16,0.25)", display: "flex", alignItems: "center", justifyContent: "center" },
  selectCheckActive: { background: PURPLE, border: `1.5px solid ${PURPLE}` },
  cardTopRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardIndex: { fontSize: 10.5, color: "rgba(11,11,16,0.35)", fontWeight: 600 },
  avatarBubble: { width: 40, height: 40, borderRadius: 14, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: PURPLE, overflow: "hidden" },
  avatarBubbleSmall: { width: 30, height: 30, borderRadius: 10, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 12, color: PURPLE, overflow: "hidden", marginBottom: 4 },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  cardName: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14.5, lineHeight: 1.2, color: INK },
  cardJob: { fontSize: 10.5, color: MUTED },
  cardPhone: { fontSize: 11.5, color: MUTED },
  cardCategory: { fontSize: 10, fontWeight: 700, color: PURPLE, alignSelf: "flex-start", background: PURPLE_SOFT, borderRadius: 999, padding: "2px 8px" },
  cardBadgeRow: { display: "flex", gap: 5, flexWrap: "wrap" },
  msgBadge: { fontSize: 9.5, fontWeight: 700, padding: "3px 7px", borderRadius: 999 },
  tagBadge: { fontSize: 9.5, fontWeight: 600, padding: "3px 7px", borderRadius: 999, background: "rgba(11,11,16,0.06)", color: MUTED },
  cardActionsRow: { display: "flex", gap: 6, marginTop: "auto", paddingTop: 4 },
  cardActionGhost: { width: 30, height: 30, borderRadius: 10, background: "#F5F3FA", border: CARD_BORDER, display: "flex", alignItems: "center", justifyContent: "center", color: MUTED, flexShrink: 0 },
  cardActionPrimary: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, height: 30, borderRadius: 10, background: PURPLE_GRADIENT, color: "#fff", fontSize: 11.5, fontWeight: 700, textDecoration: "none", boxShadow: PURPLE_GRADIENT_SHADOW },
  cardActionDisabled: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", height: 30, borderRadius: 10, background: "rgba(11,11,16,0.05)", color: "rgba(11,11,16,0.3)", fontSize: 10.5, fontWeight: 600 },
  addCard: { background: "transparent", border: "1.5px dashed rgba(124,77,255,0.35)", borderRadius: 22, minHeight: 150, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 },
  addCardLabel: { fontSize: 11.5, fontWeight: 600, color: PURPLE, textAlign: "center" },
  fab: { position: "fixed", bottom: 78, right: 20, width: 56, height: 56, borderRadius: "50%", background: PURPLE_GRADIENT, border: "none", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 26px rgba(124,77,255,0.4)", zIndex: 40, overflow: "hidden" },
  fabSecondary: { position: "fixed", bottom: 144, right: 24, width: 46, height: 46, borderRadius: "50%", background: PURPLE_GRADIENT, border: "none", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 20px rgba(124,77,255,0.4)", zIndex: 40, overflow: "hidden" },
  // Белый круг-подложка, лежащий поверх фиолетового градиента кнопки.
  // Меняем не background (переход solid<->gradient браузеры не умеют
  // анимировать плавно — цвет просто "скачет"), а opacity этого слоя —
  // это анимируется идеально и даёт эффект мягкого "переливания".
  fabWhiteOverlay: { position: "absolute", inset: 0, borderRadius: "50%", background: "#fff", transition: "opacity .45s cubic-bezier(.4,0,.2,1)", pointerEvents: "none" },
  fabIcon: { position: "relative", zIndex: 1, transition: "color .45s cubic-bezier(.4,0,.2,1)" },
  bottomBar: {
    position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
    background: "#fff", borderTop: CARD_BORDER,
    display: "flex", justifyContent: "space-around", alignItems: "center",
    padding: "8px 4px", paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
    boxShadow: "0 -4px 20px rgba(11,11,16,0.06)",
  },
  bottomBarItem: {
    position: "relative", display: "flex", flexDirection: "column", alignItems: "center",
    gap: 3, background: "none", border: "none", color: MUTED, flex: 1, padding: "4px 0",
  },
  bottomBarLabel: { fontSize: 9.5, fontWeight: 600 },
  bulkBar: { position: "fixed", bottom: 20, left: 16, right: 16, background: INK, borderRadius: 20, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", zIndex: 45, boxShadow: "0 10px 30px rgba(0,0,0,0.25)" },
  bulkCount: { fontSize: 12.5, fontWeight: 700, color: "#fff" },
  bulkActions: { display: "flex", gap: 8 },
  bulkBtn: { display: "flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 999, padding: "7px 11px", fontSize: 11.5, fontWeight: 600, color: "#fff" },
  overlay: { position: "fixed", inset: 0, background: "rgba(11,11,16,0.45)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, overscrollBehavior: "contain", touchAction: "none" },
  popoverSheet: { width: "100%", maxWidth: 480, background: SHEET_BG, borderRadius: "26px 26px 0 0", padding: "22px 20px 26px", border: "1px solid rgba(11,11,16,0.08)", borderBottom: "none", overscrollBehavior: "contain" },
  popoverTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 16, marginBottom: 14, color: INK },
  chipWrap: { display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 },
  pickChip: { background: "#fff", border: CARD_BORDER, color: INK, borderRadius: 999, padding: "8px 14px", fontSize: 12.5, fontWeight: 600 },
  pickChipSmall: { background: "#fff", border: CARD_BORDER, color: INK, borderRadius: 999, padding: "7px 13px", fontSize: 12.5, fontWeight: 600, minWidth: 38 },
  pickChipActive: { background: PURPLE_GRADIENT, color: "#fff", border: "1px solid transparent" },
  inlineAddRow: { display: "flex", gap: 8, marginBottom: 6 },
  inlineAddInput: { flex: 1, background: "#F5F3FA", border: CARD_BORDER, borderRadius: 999, padding: "9px 14px", color: INK, fontSize: 13, outline: "none" },
  inlineAddBtn: { width: 36, height: 36, borderRadius: "50%", background: "#F5F3FA", border: CARD_BORDER, display: "flex", alignItems: "center", justifyContent: "center" },
  confirmSheet: { width: "100%", maxWidth: 480, background: SHEET_BG, borderRadius: "26px 26px 0 0", padding: "24px 20px 26px", border: "1px solid rgba(11,11,16,0.08)", borderBottom: "none", overscrollBehavior: "contain" },
  confirmTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 17, marginBottom: 4, color: INK },
  confirmHint: { fontSize: 12.5, color: MUTED, marginBottom: 18 },
  detailActions: { display: "flex", gap: 10 },
  primaryPill: { flex: 1, background: PURPLE_GRADIENT, color: "#fff", border: "none", borderRadius: 999, padding: "13px 0", fontSize: 14, fontWeight: 700, fontFamily: "'Inter', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, boxShadow: PURPLE_GRADIENT_SHADOW },
  secondaryPill: { flex: 1, background: "#fff", color: INK, border: CARD_BORDER, borderRadius: 999, padding: "13px 0", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'Inter', sans-serif" },
  dangerPill: { flex: 1, background: "#E5484D", color: "#fff", border: "none", borderRadius: 999, padding: "13px 0", fontSize: 14, fontWeight: 700, fontFamily: "'Inter', sans-serif" },
  sheet: { position: "relative", width: "100%", maxWidth: 480, background: SHEET_BG, borderRadius: "28px 28px 0 0", padding: "26px 20px 24px", maxHeight: "88vh", overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", fontFamily: "'Inter', sans-serif", border: "1px solid rgba(11,11,16,0.08)", borderBottom: "none" },
  formSheet: { position: "relative", width: "100%", maxWidth: 480, background: SHEET_BG, borderRadius: "28px 28px 0 0", padding: "26px 20px 24px", maxHeight: "90vh", overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", fontFamily: "'Inter', sans-serif", border: "1px solid rgba(11,11,16,0.08)", borderBottom: "none" },
  sheetHandle: { position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", width: 36, height: 4, borderRadius: 2, background: "rgba(11,11,16,0.15)" },
  closeBtn: { position: "absolute", top: 16, right: 16, background: "#F5F3FA", border: CARD_BORDER, borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center" },
  avatarBubbleBig: { width: 64, height: 64, borderRadius: 20, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 22, color: PURPLE, marginBottom: 10, overflow: "hidden" },
  avatarImgBig: { width: "100%", height: "100%", objectFit: "cover", borderRadius: 20 },
  detailName: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 22, marginBottom: 2, color: INK },
  detailSub: { fontSize: 12.5, color: MUTED, marginBottom: 6 },
  detailCategoryTag: { display: "inline-block", fontSize: 11, fontWeight: 700, color: PURPLE, background: PURPLE_SOFT, borderRadius: 999, padding: "4px 11px", marginBottom: 4 },
  sectionLabel: { fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", color: MUTED, margin: "18px 0 10px" },
  detailFields: { display: "flex", flexDirection: "column", gap: 12 },
  detailField: { display: "flex", alignItems: "center", gap: 10 },
  detailLink: { color: INK, fontSize: 14.5, textDecoration: "none", fontWeight: 500 },
  detailText: { color: INK, fontSize: 14 },
  detailHint: { fontSize: 13, color: MUTED },
  detailNote: { background: "#F5F3FA", border: CARD_BORDER, borderRadius: 16, padding: "12px 14px", fontSize: 13.5, lineHeight: 1.5, color: INK },
  psychBlock: { background: PURPLE_SOFT, border: "1px solid rgba(124,77,255,0.22)", borderRadius: 18, padding: "6px 14px" },
  psychRow: { padding: "10px 0", borderBottom: "1px solid rgba(124,77,255,0.15)" },
  psychLabel: { fontSize: 10.5, fontWeight: 700, color: "#8A6FE0", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.02em" },
  psychValue: { fontSize: 13.5, color: INK, lineHeight: 1.45 },
  psychFormBlock: { background: PURPLE_SOFT, border: "1px solid rgba(124,77,255,0.22)", borderRadius: 18, padding: 14, display: "flex", flexDirection: "column", gap: 12 },
  formHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, gap: 10 },
  formTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 18, display: "flex", alignItems: "center", color: INK, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 },
  stepTabs: { display: "flex", gap: 6, marginTop: 16, marginBottom: 6, overflowX: "auto" },
  stepTab: { flexShrink: 0, background: "#F5F3FA", border: CARD_BORDER, color: MUTED, borderRadius: 999, padding: "7px 13px", fontSize: 11.5, fontWeight: 600 },
  stepTabActive: { background: INK, color: "#fff", border: `1px solid ${INK}` },
  avatarRow: { display: "flex", alignItems: "center", gap: 14, marginTop: 12, marginBottom: 6 },
  avatarPicker: { width: 64, height: 64, borderRadius: 20, background: PURPLE_SOFT, border: "1.5px dashed rgba(124,77,255,0.4)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 },
  avatarHint: { fontSize: 12, color: MUTED, lineHeight: 1.4 },
  formGrid: { display: "flex", flexDirection: "column", gap: 10 },
  fieldWrap: { display: "flex", flexDirection: "column", gap: 5, marginBottom: 4 },
  fieldLabel: { fontSize: 10.5, fontWeight: 700, color: MUTED, letterSpacing: "0.02em" },
  fieldInput: { background: "#F5F3FA", border: CARD_BORDER, borderRadius: 14, padding: "10px 13px", fontSize: 14, color: INK, outline: "none", fontFamily: "'Inter', sans-serif" },
  messengerFieldsRow: { background: "#F5F3FA", borderRadius: 16, padding: 12, marginBottom: 4, marginTop: 10, display: "flex", flexDirection: "column", gap: 8 },
  messengerFieldsLabel: { fontSize: 10.5, color: MUTED, fontWeight: 600 },
  importHint: { fontSize: 12.5, color: MUTED, lineHeight: 1.5, marginBottom: 16, marginTop: 10 },
  uploadZone: { width: "100%", background: PURPLE_SOFT, border: "1.5px dashed rgba(124,77,255,0.4)", borderRadius: 18, padding: "22px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: PURPLE, fontSize: 13, fontWeight: 600 },
  importError: { fontSize: 12.5, color: "#E5484D", marginTop: 12 },
  importFound: { fontSize: 13, fontWeight: 700, marginTop: 16, color: INK },
  quickAddTextarea: { width: "100%", minHeight: 110, background: "#F5F3FA", border: CARD_BORDER, borderRadius: 16, padding: 14, fontSize: 14, color: INK, outline: "none", fontFamily: "'Inter', sans-serif", resize: "none" },
  micRow: { display: "flex", alignItems: "center", gap: 10, marginTop: 10 },
  micBtn: { width: 44, height: 44, borderRadius: "50%", background: PURPLE_SOFT, border: `1px solid rgba(124,77,255,0.3)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  micBtnActive: { background: "#E5484D", border: "1px solid #E5484D" },
  micHint: { fontSize: 11.5, color: MUTED, lineHeight: 1.4 },
  quickAddExample: { fontSize: 11.5, color: MUTED, lineHeight: 1.5, background: "#F5F3FA", borderRadius: 14, padding: 12, marginTop: 10 },
  taskPreviewCard: { background: PURPLE_SOFT, border: "1px solid rgba(124,77,255,0.25)", borderRadius: 16, padding: 14, marginTop: 4, display: "flex", flexDirection: "column", gap: 8 },
  taskPreviewLabel: { fontSize: 10.5, fontWeight: 700, color: "#8A6FE0", textTransform: "uppercase", letterSpacing: "0.03em" },
  aiSheet: { position: "relative", width: "100%", maxWidth: 480, background: SHEET_BG, borderRadius: "28px 28px 0 0", padding: "26px 20px 16px", height: "82vh", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif", border: "1px solid rgba(11,11,16,0.08)", borderBottom: "none", overscrollBehavior: "contain" },
  aiScroll: { flex: 1, overflowY: "auto", marginTop: 12, display: "flex", flexDirection: "column", gap: 12, paddingBottom: 8, overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" },
  aiIntro: { fontSize: 13.5, color: MUTED, lineHeight: 1.6, background: "#F5F3FA", borderRadius: 16, padding: 14 },
  aiMsgRow: { display: "flex" },
  aiBubble: { maxWidth: "85%", borderRadius: 18, padding: "11px 15px", fontSize: 13.5, lineHeight: 1.5 },
  aiBubbleUser: { background: INK, color: "#fff", fontWeight: 500, borderBottomRightRadius: 6 },
  aiBubbleAi: { background: "#F5F3FA", color: INK, border: CARD_BORDER, borderBottomLeftRadius: 6 },
  aiMatchRow: { display: "flex", gap: 8, overflowX: "auto", marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(11,11,16,0.1)" },
  aiMatchCard: { flexShrink: 0, width: 88, background: "#fff", border: CARD_BORDER, borderRadius: 14, padding: 8, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" },
  aiMatchName: { fontSize: 10.5, fontWeight: 700, color: INK, lineHeight: 1.2 },
  aiMatchJob: { fontSize: 9, color: MUTED, marginTop: 2 },
  aiInputRow: { display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid rgba(11,11,16,0.08)" },
  aiInput: { flex: 1, background: "#F5F3FA", border: CARD_BORDER, borderRadius: 999, padding: "11px 16px", color: INK, fontSize: 13.5, outline: "none" },
  aiSendBtn: { width: 40, height: 40, borderRadius: "50%", background: PURPLE_GRADIENT, border: "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: PURPLE_GRADIENT_SHADOW },
  toast: { position: "fixed", bottom: 150, left: "50%", transform: "translateX(-50%)", background: INK, color: "#fff", padding: "10px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.25)", zIndex: 60 },

  // --- Таск-борд (Модуль 3B) ---
  boardOverlay: { position: "fixed", inset: 0, background: BG, zIndex: 55, display: "flex", flexDirection: "column" },
  boardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px 12px", borderBottom: CARD_BORDER, background: "#fff" },
  boardTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 18, color: INK, display: "flex", alignItems: "center", gap: 8 },
  boardAddBtn: { display: "flex", alignItems: "center", gap: 6, background: PURPLE_GRADIENT, color: "#fff", border: "none", borderRadius: 999, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, boxShadow: PURPLE_GRADIENT_SHADOW },
  boardColumns: { flex: 1, display: "flex", gap: 12, overflowX: "auto", padding: "14px 16px 20px", scrollSnapType: "x proximity" },
  boardColumn: { flex: "0 0 84vw", maxWidth: 340, display: "flex", flexDirection: "column", gap: 10, scrollSnapAlign: "start" },
  boardColumnHeader: { display: "flex", alignItems: "center", gap: 8, padding: "2px 4px 6px" },
  boardColumnTitle: { fontSize: 12.5, fontWeight: 700, color: INK, textTransform: "uppercase", letterSpacing: "0.03em" },
  boardColumnCount: { fontSize: 10.5, fontWeight: 700, color: MUTED, background: "rgba(11,11,16,0.06)", borderRadius: 999, padding: "2px 8px" },
  boardColumnBody: { display: "flex", flexDirection: "column", gap: 9, overflowY: "auto", flex: 1, paddingBottom: 8 },
  boardEmptyCol: { fontSize: 12, color: "rgba(11,11,16,0.35)", textAlign: "center", padding: "24px 0", border: "1.5px dashed rgba(11,11,16,0.12)", borderRadius: 16 },
  taskCard: { background: "#fff", border: CARD_BORDER, borderRadius: 18, padding: 13, boxShadow: CARD_SHADOW, display: "flex", flexDirection: "column", gap: 8 },
  taskCardTop: { display: "flex", alignItems: "center", gap: 8 },
  taskCardAvatar: { width: 26, height: 26, borderRadius: 9, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 10.5, color: PURPLE, overflow: "hidden", flexShrink: 0 },
  taskCardContactName: { fontSize: 12, fontWeight: 700, color: INK, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  taskTypeBadge: { fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 999, color: "#fff", flexShrink: 0 },
  taskCardTitle: { fontSize: 13.5, color: INK, lineHeight: 1.4 },
  taskCardFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  taskCardDue: { fontSize: 11, color: MUTED, fontWeight: 600 },
  taskCardDueOverdue: { color: "#E5484D" },
  taskCardActions: { display: "flex", alignItems: "center", gap: 4 },
  taskCardMoveBtn: { width: 24, height: 24, borderRadius: "50%", background: "#F5F3FA", border: CARD_BORDER, display: "flex", alignItems: "center", justifyContent: "center", color: INK },
  taskCardDeleteBtn: { width: 24, height: 24, borderRadius: "50%", background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(11,11,16,0.35)" },
  contactPickList: { display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto", background: "#F5F3FA", borderRadius: 14, padding: 6, marginTop: 4 },
  contactPickRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "transparent", border: "none", textAlign: "left" },
  contactPickRowActive: { background: "#fff", boxShadow: CARD_SHADOW },
  contactPickAvatar: { width: 26, height: 26, borderRadius: 9, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 10.5, color: PURPLE, overflow: "hidden", flexShrink: 0 },
  contactPickName: { fontSize: 13, color: INK, fontWeight: 500 },
  taskDiscardBtn: { fontSize: 11, color: MUTED, background: "none", border: "none", fontWeight: 600 },

  // --- Цели (Модуль 3D) ---
  goalCard: { background: "#fff", border: CARD_BORDER, borderRadius: 18, padding: 14, boxShadow: CARD_SHADOW, marginBottom: 10, cursor: "pointer", textAlign: "left" },
  goalCardTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  goalTitle: { fontSize: 14, fontWeight: 700, color: INK, flex: 1, marginRight: 8 },
  goalDeleteBtn: { width: 26, height: 26, borderRadius: "50%", background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(11,11,16,0.35)", flexShrink: 0 },
  goalMeta: { fontSize: 11, color: MUTED, marginBottom: 8 },
  goalProgressTrack: { height: 8, borderRadius: 999, background: "rgba(11,11,16,0.08)", overflow: "hidden" },
  goalProgressFill: { height: "100%", borderRadius: 999, background: PURPLE, transition: "width .3s ease" },
  goalProgressLabel: { display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: MUTED, fontWeight: 600 },
  goalQualToggle: {
    display: "flex", alignItems: "center", gap: 8, marginTop: 4,
    background: "#F5F3FA", border: "1px solid transparent", borderRadius: 999,
    padding: "9px 14px", cursor: "pointer", width: "100%",
  },
  goalQualToggleDone: { background: "#EAF7F1", border: "1px solid rgba(34,163,122,0.25)" },
  goalEditHint: { fontSize: 10, color: "rgba(11,11,16,0.3)", textAlign: "right", marginTop: 8, fontWeight: 600 },
  goalStripCard: { display: "flex", alignItems: "center", gap: 10, background: "#fff", border: CARD_BORDER, borderRadius: 16, padding: "11px 14px", marginBottom: 14, boxShadow: CARD_SHADOW },
  goalStripIcon: { width: 30, height: 30, borderRadius: 10, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  goalStripBody: { flex: 1, minWidth: 0 },
  goalStripTitle: { fontSize: 12, fontWeight: 700, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  goalStripTrack: { width: "100%", boxSizing: "border-box", height: 5, borderRadius: 999, background: "rgba(11,11,16,0.08)", overflow: "hidden", marginTop: 5 },
  goalStripFill: { height: "100%", borderRadius: 999, background: PURPLE },
  goalStripPct: { fontSize: 12, fontWeight: 700, color: PURPLE, flexShrink: 0, minWidth: 34, textAlign: "right" },

  // --- Личный кабинет / подписка (Модуль 3D) ---
  planBadgeFree: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: MUTED, background: "rgba(11,11,16,0.06)", borderRadius: 999, padding: "5px 12px" },
  planBadgePro: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#fff", background: PURPLE_GRADIENT, borderRadius: 999, padding: "5px 12px" },
  usageCard: { background: "#F5F3FA", borderRadius: 16, padding: 14, marginTop: 14, marginBottom: 6 },
  usageRow: { display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: INK, marginBottom: 8 },
  usageTrack: { height: 8, borderRadius: 999, background: "rgba(11,11,16,0.08)", overflow: "hidden" },
  usageFill: { height: "100%", borderRadius: 999, transition: "width .3s ease" },
  usageHint: { fontSize: 11, color: MUTED, marginTop: 8, lineHeight: 1.4 },
  planCard: { border: CARD_BORDER, borderRadius: 18, padding: 16, marginTop: 12, position: "relative" },
  planCardPro: { border: `1.5px solid ${PURPLE}`, background: PURPLE_SOFT },
  planCardName: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: INK, marginBottom: 2 },
  planCardPrice: { fontSize: 12.5, color: MUTED, marginBottom: 10, fontWeight: 600 },
  planFeatureRow: { display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7 },
  planFeatureText: { fontSize: 12.5, color: INK, lineHeight: 1.4 },
  paymentMethodRow: { display: "flex", gap: 8, marginTop: 12, marginBottom: 4 },
  paymentMethodChip: { flex: 1, textAlign: "center", background: "#F5F3FA", border: CARD_BORDER, borderRadius: 12, padding: "10px 0", fontSize: 12.5, fontWeight: 600, color: INK },
  paymentMethodChipActive: { background: PURPLE_GRADIENT, color: "#fff", border: "1px solid transparent" },
  payDisclaimer: { fontSize: 11, color: MUTED, lineHeight: 1.5, background: "#F5F3FA", borderRadius: 12, padding: 10, marginTop: 12 },
  demoLink: { fontSize: 11, color: PURPLE, fontWeight: 700, background: "none", border: "none", textDecoration: "underline", marginTop: 10 },
  aiBlockedCard: { background: "#FCE9E8", border: "1px solid rgba(229,72,77,0.25)", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" },
  aiBlockedText: { fontSize: 12.5, color: "#B7332F", lineHeight: 1.5 },

  // --- Умный анализ окружения (Модуль 3C) ---
  healthScoreRow: { display: "flex", alignItems: "center", gap: 16, marginTop: 12, marginBottom: 18 },
  healthScoreCircle: { width: 84, height: 84, borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "3px solid" },
  healthScoreNum: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 24, lineHeight: 1 },
  healthScoreMax: { fontSize: 10, fontWeight: 600, opacity: 0.6 },
  healthStatusLabel: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, marginBottom: 3 },
  healthStatusHint: { fontSize: 12, color: MUTED, lineHeight: 1.4 },
  metricRow: { marginBottom: 12 },
  metricRowTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  metricLabel: { fontSize: 12.5, fontWeight: 600, color: INK },
  metricPct: { fontSize: 12, fontWeight: 700, color: MUTED },
  metricTrack: { height: 7, borderRadius: 999, background: "rgba(11,11,16,0.07)", overflow: "hidden" },
  metricFill: { height: "100%", borderRadius: 999 },
  distRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  distName: { fontSize: 12, color: INK, width: 92, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  distTrack: { flex: 1, height: 6, borderRadius: 999, background: "rgba(11,11,16,0.07)", overflow: "hidden" },
  distFill: { height: "100%", borderRadius: 999, background: PURPLE },
  distCount: { fontSize: 11, color: MUTED, width: 26, textAlign: "right", flexShrink: 0 },
  gapChip: { fontSize: 11, fontWeight: 600, color: "#B5722A", background: "#FBEEDD", borderRadius: 999, padding: "4px 10px" },
  staleRow: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 },
  staleChip: { flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: 60 },
  staleAvatar: { width: 34, height: 34, borderRadius: 11, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 12, color: PURPLE, overflow: "hidden" },
  staleName: { fontSize: 9.5, color: MUTED, textAlign: "center", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" },
  recCard: { display: "flex", gap: 10, background: PURPLE_SOFT, border: "1px solid rgba(124,77,255,0.2)", borderRadius: 14, padding: 12, marginBottom: 8 },
  recText: { fontSize: 13, color: INK, lineHeight: 1.5 },
  versionTag: { textAlign: "center", fontSize: 10.5, color: "rgba(11,11,16,0.32)", fontWeight: 500, marginTop: 18 },

  // --- Auth Gate (Фаза C) ---
  authGateWrap: { minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", textAlign: "center" },
  authGateIcon: { width: 64, height: 64, borderRadius: 20, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  authGateTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 20, color: INK, marginBottom: 10 },
  authGateText: { fontSize: 13.5, color: MUTED, lineHeight: 1.6, maxWidth: 320 },
};

export { globalCss, INK, MUTED, PURPLE, PURPLE_SOFT, PURPLE_GRADIENT, PURPLE_GRADIENT_SHADOW, BG, CARD_BORDER, SHEET_BG, CARD_SHADOW, styles };
