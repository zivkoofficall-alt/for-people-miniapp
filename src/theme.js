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
  @keyframes fpFadeOut { from{opacity:1} to{opacity:0} }
  @keyframes fpSlideUp { from{opacity:0; transform:translateY(26px)} to{opacity:1; transform:translateY(0)} }
  @keyframes fpSlideDown { from{opacity:1; transform:translateY(0)} to{opacity:0; transform:translateY(26px)} }
  @keyframes fpStepIn { from{opacity:0; transform:translateX(16px)} to{opacity:1; transform:translateX(0)} }
  @keyframes fpCardIn { from{opacity:0; transform:translateY(10px) scale(0.96)} to{opacity:1; transform:translateY(0) scale(1)} }
  @keyframes fpPulse { 0%,100%{opacity:0.55} 50%{opacity:1} }
  .fp-overlay-anim { animation: fpFadeIn .18s ease; }
  .fp-overlay-anim-out { animation: fpFadeOut .16s ease both; pointer-events: none; }
  .fp-sheet-anim { animation: fpSlideUp .3s cubic-bezier(.2,.8,.2,1); will-change: transform, opacity; }
  .fp-sheet-anim-out { animation: fpSlideDown .2s cubic-bezier(.4,0,1,1) both; will-change: transform, opacity; }
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
  .fp-splash-out { animation: fpFadeOut .4s ease both; pointer-events: none; }
  .fp-pair-row { display: flex; gap: 8px; }
  /* Ховер только на устройствах, где он реально означает "курсор навёл"
     (мышь) — на тач-экранах (hover:none) браузеры эмулируют hover после
     тапа, из-за чего кнопка "залипала" бы в ховер-состоянии после нажатия.
     Поэтому не трогаем :active (уже работает везде), добавляем только
     :hover под медиа-запросом. */
  @media (hover: hover) and (pointer: fine) {
    .fp-btn:hover:not(:disabled) { opacity: 0.88; }
    .fp-card:hover { transform: translateY(-2px); }
  }
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
  card: { position: "relative", background: "#fff", border: CARD_BORDER, borderRadius: 20, padding: 12, textAlign: "left", display: "flex", flexDirection: "column", gap: 6, fontFamily: "'Inter', sans-serif", boxShadow: CARD_SHADOW },
  selectCheck: { position: "absolute", top: 10, right: 10, width: 20, height: 20, borderRadius: "50%", border: "1.5px solid rgba(11,11,16,0.25)", display: "flex", alignItems: "center", justifyContent: "center" },
  selectCheckActive: { background: PURPLE, border: `1.5px solid ${PURPLE}` },
  cardTopRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardIndex: { fontSize: 10.5, color: "rgba(11,11,16,0.35)", fontWeight: 600 },
  avatarBubble: { width: 40, height: 40, borderRadius: 14, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: PURPLE, overflow: "hidden", flexShrink: 0 },
  cardHeaderRow: { display: "flex", alignItems: "center", gap: 10 },
  cardInfoCol: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 },
  cardNameCompact: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14.5, lineHeight: 1.2, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  cardSubtitleCompact: { fontSize: 11, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
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
  // Полноэкранный сплэш при начальной загрузке данных (Фаза B, задача 1).
  // zIndex выше всего остального в приложении (максимум был 60 у toast),
  // touchAction/overscrollBehavior — чтобы под сплэшем нельзя было
  // проскроллить или задеть контент, пока данные ещё не готовы.
  splashScreen: { position: "fixed", inset: 0, background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, zIndex: 999, touchAction: "none", overscrollBehavior: "contain" },
  splashLogoWrap: { width: 96, height: 96, borderRadius: 28, background: PURPLE_GRADIENT, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: PURPLE_GRADIENT_SHADOW, overflow: "hidden" },
  splashLogo: { width: 56, height: 56, objectFit: "contain" },
  splashText: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600, fontSize: 13, color: MUTED, letterSpacing: 0.2 },
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
  formHelperText: { fontSize: 12, color: MUTED, lineHeight: 1.45, marginTop: -4, marginBottom: 10 },
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

  // --- Таск-борд (Модуль 3B) — мобильная лента задач ---
  boardOverlay: { position: "fixed", inset: 0, background: BG, zIndex: 55, display: "flex", flexDirection: "column" },
  boardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 16px 12px", borderBottom: CARD_BORDER, background: "#fff", flexShrink: 0, gap: 10 },
  boardTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 18, color: INK, display: "flex", alignItems: "center", gap: 8, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  boardBackBtn: { width: 30, height: 30, borderRadius: "50%", background: "#F5F3FA", border: CARD_BORDER, display: "flex", alignItems: "center", justifyContent: "center", color: INK, flexShrink: 0 },
  boardAddBtn: { display: "flex", alignItems: "center", gap: 6, background: PURPLE_GRADIENT, color: "#fff", border: "none", borderRadius: 999, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, boxShadow: PURPLE_GRADIENT_SHADOW, flexShrink: 0 },
  boardToolbar: { padding: "12px 16px 4px", background: "#fff", borderBottom: CARD_BORDER, display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 },
  boardScroll: { flex: 1, overflowY: "auto", padding: "14px 16px 100px", WebkitOverflowScrolling: "touch" },

  // Сегментированный переключатель "Активные / Готово"
  segControl: { display: "flex", background: "#F5F3FA", borderRadius: 999, padding: 3, gap: 2 },
  segBtn: { flex: 1, textAlign: "center", padding: "9px 0", borderRadius: 999, fontSize: 12.5, fontWeight: 700, color: MUTED },
  segBtnActive: { background: "#fff", color: INK, boxShadow: CARD_SHADOW },

  // Строка фильтров по типу задачи
  boardFilterRow: { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10 },

  // Заголовок группы по срокам (Просрочено / Сегодня / ...)
  sectionGroupLabel: { fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", color: MUTED, margin: "14px 0 8px", display: "flex", alignItems: "center", gap: 6 },
  sectionGroupLabelFirst: { marginTop: 0 },
  sectionGroupCount: { fontSize: 10, fontWeight: 700, color: MUTED, background: "rgba(11,11,16,0.06)", borderRadius: 999, padding: "1px 7px" },

  boardEmptyState: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center", padding: "60px 20px", color: MUTED },
  boardEmptyTitle: { fontSize: 14, fontWeight: 700, color: INK },
  boardEmptyHint: { fontSize: 12.5, color: MUTED, lineHeight: 1.5, maxWidth: 240 },

  // Свайпаемая строка задачи: обёртка задаёт clip, delete-подложка снизу,
  // сама карточка едет поверх неё через transform translateX (инлайново).
  taskRowWrap: { position: "relative", borderRadius: 16, overflow: "hidden", marginBottom: 8, background: "#fff" },
  taskRowDeleteBg: { position: "absolute", inset: 0, background: "#E5484D", display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "0 18px", color: "#fff", fontWeight: 700, fontSize: 12, gap: 6 },
  taskRow: { position: "relative", background: "#fff", borderTop: `3px solid ${PURPLE}`, borderLeft: "1px solid rgba(11,11,16,0.06)", borderRight: "1px solid rgba(11,11,16,0.06)", borderBottom: "1px solid rgba(11,11,16,0.06)", borderRadius: 16, padding: "11px 12px", display: "flex", alignItems: "flex-start", gap: 9, boxShadow: CARD_SHADOW, touchAction: "pan-y" },
  taskRowCheck: { width: 22, height: 22, borderRadius: "50%", border: "2px solid rgba(11,11,16,0.18)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1, background: "#fff" },
  taskRowCheckDone: { background: PURPLE_GRADIENT, border: "2px solid transparent" },
  taskRowAvatar: { width: 26, height: 26, borderRadius: 9, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 10.5, color: PURPLE, overflow: "hidden", flexShrink: 0, marginTop: 1 },
  taskRowBody: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 },
  taskRowTitle: { fontSize: 13.5, fontWeight: 600, color: INK, lineHeight: 1.35, wordBreak: "break-word" },
  taskRowTitleDone: { textDecoration: "line-through", color: MUTED },
  taskRowMeta: { display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: MUTED, flexWrap: "wrap" },
  taskRowTypeDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  taskRowDue: { fontSize: 10.5, color: MUTED, fontWeight: 700 },
  taskRowDueOverdue: { color: "#E5484D" },
  taskRowStar: { width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "rgba(11,11,16,0.22)" },
  taskRowStarActive: { color: "#D98C2B" },
  taskRowEditBtn: { width: 26, height: 26, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: PURPLE_SOFT, color: PURPLE },
  boardManageTypesBtn: { display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", color: PURPLE, fontSize: 11.5, fontWeight: 700, padding: "4px 2px", flexShrink: 0 },
  typeManageRow: { display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid rgba(11,11,16,0.06)" },
  typeManageColorDot: { width: 12, height: 12, borderRadius: "50%", flexShrink: 0 },
  typeManageInput: { flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontSize: 13.5, color: INK, fontFamily: "'Inter', sans-serif", padding: "4px 0" },
  typeManageDelBtn: { width: 26, height: 26, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#FBEAEA", color: "#E5484D" },

  // Форма создания/редактирования — быстрые чипы срока
  quickDateRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 },

  // Переключатель видов "Сегодня / Список / Календарь"
  viewSwitch: { display: "flex", background: "#F5F3FA", borderRadius: 999, padding: 3, gap: 2, marginBottom: 10 },
  viewSwitchBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, textAlign: "center", padding: "9px 0", borderRadius: 999, fontSize: 11.5, fontWeight: 700, color: MUTED },
  viewSwitchBtnActive: { background: "#fff", color: INK, boxShadow: CARD_SHADOW },

  // Вид "Календарь"
  calHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  calMonthLabel: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14.5, color: INK, textTransform: "capitalize" },
  calNavBtn: { width: 28, height: 28, borderRadius: "50%", background: "#F5F3FA", border: CARD_BORDER, display: "flex", alignItems: "center", justifyContent: "center", color: INK, flexShrink: 0 },
  calWeekRow: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 },
  calWeekday: { textAlign: "center", fontSize: 10, fontWeight: 700, color: MUTED, padding: "4px 0" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 },
  calCell: { position: "relative", aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 12, gap: 2, background: "transparent" },
  calCellMuted: { opacity: 0.32 },
  calCellToday: { border: `1.5px solid ${PURPLE}` },
  calCellSelected: { background: PURPLE_GRADIENT },
  calDayNum: { fontSize: 12, fontWeight: 600, color: INK },
  calDayNumSelected: { color: "#fff" },
  calDotsRow: { display: "flex", gap: 2, height: 4, alignItems: "center" },
  calDot: { width: 4, height: 4, borderRadius: "50%" },
  calSelectedLabel: { fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", color: MUTED, margin: "18px 0 10px" },

  // Чек-лист подзадач внутри формы/строки задачи
  subtaskList: { display: "flex", flexDirection: "column", gap: 6, marginTop: 2 },
  subtaskRow: { display: "flex", alignItems: "center", gap: 8, background: "#F5F3FA", borderRadius: 12, padding: "8px 8px 8px 10px" },
  subtaskCheck: { width: 19, height: 19, borderRadius: "50%", border: "2px solid rgba(11,11,16,0.22)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" },
  subtaskCheckDone: { background: PURPLE_GRADIENT, border: "2px solid transparent" },
  subtaskText: { flex: 1, fontSize: 13, color: INK, wordBreak: "break-word" },
  subtaskTextDone: { textDecoration: "line-through", color: MUTED },
  subtaskDelBtn: { width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(11,11,16,0.3)", flexShrink: 0 },
  subtaskAddRow: { display: "flex", gap: 8, marginTop: 4 },
  subtaskAddInput: { flex: 1, background: "#F5F3FA", border: CARD_BORDER, borderRadius: 12, padding: "9px 12px", fontSize: 13, color: INK, outline: "none", fontFamily: "'Inter', sans-serif" },
  subtaskAddBtn: { width: 34, height: 34, borderRadius: 10, background: PURPLE_GRADIENT, border: "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  subtaskProgressPill: { display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: MUTED },

  // Индикаторы напоминания/повтора — и в строке задачи, и в форме
  taskRowIndicator: { display: "inline-flex", alignItems: "center", gap: 2, color: MUTED },
  reminderToggleRow: { display: "flex", alignItems: "center", gap: 10 },
  reminderTimeInput: { background: "#F5F3FA", border: CARD_BORDER, borderRadius: 12, padding: "9px 12px", fontSize: 13.5, color: INK, outline: "none", fontFamily: "'Inter', sans-serif" },

  contactPickList: { display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto", background: "#F5F3FA", borderRadius: 14, padding: 6, marginTop: 4 },
  contactPickRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "transparent", border: "none", textAlign: "left" },
  contactPickRowActive: { background: "#fff", boxShadow: CARD_SHADOW },
  contactPickAvatar: { width: 26, height: 26, borderRadius: 9, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 10.5, color: PURPLE, overflow: "hidden", flexShrink: 0 },
  contactPickName: { fontSize: 13, color: INK, fontWeight: 500 },
  taskDiscardBtn: { fontSize: 11, color: MUTED, background: "none", border: "none", fontWeight: 600 },
  dangerGhostBtn: { width: "100%", textAlign: "center", color: "#E5484D", fontWeight: 700, fontSize: 13, padding: "12px 0", background: "transparent", border: "none", marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center" },

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
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 },
  statCard: { background: "#F5F3FA", borderRadius: 16, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 2 },
  statNum: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 20, color: INK },
  statLabel: { fontSize: 10.5, color: MUTED, fontWeight: 600, lineHeight: 1.3 },
  statChartCard: { background: "#F5F3FA", borderRadius: 16, padding: "14px 14px 10px", marginTop: 8 },
  statChartTitle: { fontSize: 11.5, fontWeight: 700, color: INK, marginBottom: 10 },
  statChartRow: { display: "flex", alignItems: "flex-end", gap: 8, height: 64 },
  statChartCol: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 6, height: "100%" },
  statChartBarTrack: { width: "100%", flex: 1, display: "flex", alignItems: "flex-end", borderRadius: 6, overflow: "hidden", background: "rgba(11,11,16,0.05)" },
  statChartBarFill: { width: "100%", borderRadius: 6, background: PURPLE_GRADIENT, minHeight: 3 },
  statChartLabel: { fontSize: 9.5, color: MUTED, fontWeight: 600 },
  statTopCategoryRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: INK, fontWeight: 600 },
  planCard: { border: CARD_BORDER, borderRadius: 18, padding: 16, marginTop: 12, position: "relative" },
  planCardPro: { border: `1.5px solid ${PURPLE}`, background: PURPLE_SOFT },
  planCardName: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 15, color: INK, marginBottom: 2 },
  planCardPrice: { fontSize: 12.5, color: MUTED, marginBottom: 10, fontWeight: 600 },
  planPriceRow: { display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 },
  planPriceNew: { fontSize: 17, fontWeight: 800, color: INK, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  planPriceOld: { fontSize: 13, color: MUTED, textDecoration: "line-through" },
  planDiscountBadge: { fontSize: 10.5, fontWeight: 700, color: "#fff", background: "#E5484D", borderRadius: 999, padding: "2px 8px" },
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
  healthHero: { position: "relative", overflow: "hidden", background: "linear-gradient(135deg, #9B7FF3 0%, #7C5CE8 100%)", borderRadius: 24, padding: "18px 16px", marginTop: 4, marginBottom: 18, display: "flex", alignItems: "center", gap: 16, boxShadow: "0 14px 30px rgba(124,77,255,0.28)" },
  healthHeroGlow: { position: "absolute", top: -40, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.12)", filter: "blur(10px)" },
  healthRingWrap: { position: "relative", width: 88, height: 88, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 },
  healthRingNum: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 24, lineHeight: 1, color: "#fff" },
  healthRingMax: { fontSize: 9.5, fontWeight: 600, color: "rgba(255,255,255,0.75)" },
  healthHeroBody: { position: "relative", zIndex: 1, minWidth: 0, flex: 1 },
  healthStatusLabel: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14.5, marginBottom: 3, color: "#fff" },
  healthStatusHint: { fontSize: 11.5, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 },

  // Карточки-метрики с мини-кольцами (разнообразие / активность / глубина)
  healthMetricsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 18 },
  healthMetricCard: { background: "#F5F3FA", borderRadius: 16, padding: "12px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textAlign: "center" },
  healthMetricRingWrap: { position: "relative", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center" },
  healthMetricPct: { fontSize: 11.5, fontWeight: 800, color: INK, position: "absolute" },
  healthMetricLabel: { fontSize: 9.5, color: MUTED, fontWeight: 600, lineHeight: 1.25 },

  metricRow: { marginBottom: 12 },
  metricRowTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 },
  metricLabel: { fontSize: 12.5, fontWeight: 600, color: INK },
  metricPct: { fontSize: 12, fontWeight: 700, color: MUTED },
  metricTrack: { height: 7, borderRadius: 999, background: "rgba(11,11,16,0.07)", overflow: "hidden" },
  metricFill: { height: "100%", borderRadius: 999 },

  // Донат-чарт по категориям + легенда
  donutSection: { display: "flex", alignItems: "center", gap: 18, marginBottom: 6 },
  donutWrap: { position: "relative", width: 108, height: 108, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
  donutCenterNum: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 18, color: INK, position: "absolute" },
  donutCenterLabel: { fontSize: 8.5, color: MUTED, fontWeight: 600, position: "absolute", marginTop: 22 },
  donutLegend: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7 },
  donutLegendRow: { display: "flex", alignItems: "center", gap: 8 },
  donutLegendSwatch: { width: 9, height: 9, borderRadius: 3, flexShrink: 0 },
  donutLegendName: { flex: 1, minWidth: 0, fontSize: 12, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  donutLegendCount: { fontSize: 11.5, fontWeight: 700, color: MUTED, flexShrink: 0 },

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
  recGenerateBtn: { width: "100%", boxSizing: "border-box", justifyContent: "center", display: "flex", alignItems: "center", gap: 8, background: PURPLE_GRADIENT, color: "#fff", border: "none", borderRadius: 999, padding: "12px 16px", fontSize: 13, fontWeight: 700, fontFamily: "'Inter', sans-serif", boxShadow: PURPLE_GRADIENT_SHADOW, marginTop: 4 },
  recSkeletonCard: { display: "flex", gap: 10, background: "#F5F3FA", borderRadius: 14, padding: 12, marginBottom: 8 },
  recSkeletonIcon: { width: 16, height: 16, borderRadius: 5, background: "rgba(124,77,255,0.18)", flexShrink: 0 },
  recSkeletonLines: { flex: 1, display: "flex", flexDirection: "column", gap: 6, paddingTop: 2 },
  recSkeletonLine: { height: 9, borderRadius: 5, background: "rgba(11,11,16,0.08)" },
  versionTag: { textAlign: "center", fontSize: 10.5, color: "rgba(11,11,16,0.32)", fontWeight: 500, marginTop: 18 },

  // --- Auth Gate (Фаза C) ---
  authGateWrap: { minHeight: "100vh", background: BG, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", textAlign: "center" },
  authGateIcon: { width: 64, height: 64, borderRadius: 20, background: PURPLE_SOFT, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 },
  authGateTitle: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 20, color: INK, marginBottom: 10 },
  authGateText: { fontSize: 13.5, color: MUTED, lineHeight: 1.6, maxWidth: 320 },
};

export { globalCss, INK, MUTED, PURPLE, PURPLE_SOFT, PURPLE_GRADIENT, PURPLE_GRADIENT_SHADOW, BG, CARD_BORDER, SHEET_BG, CARD_SHADOW, styles };
