// components/Onboarding.jsx
//
// Онбординг первого запуска (~30 секунд): приветствие/ценность → добавление
// первого контакта → симулированный AI-поиск (aha-moment) → пейволл Pro
// с прогресс-баром и pop-up удержания при попытке закрыть.
//
// Компонент НЕ хранит бизнес-логику подписки/контактов сам — он получает
// готовые колбэки из App.jsx (тот же паттерн, что уже используется для
// Profile.jsx: onActivateProViaStars/onActivateDemoPro), и просто вызывает их.
// Это значит, что реальная оплата (Telegram Stars) и реальное сохранение
// контакта работают ровно так же, как и в остальном приложении — никакого
// параллельного, "ненастоящего" пути данных здесь нет.
//
// Единственное, что здесь по-настоящему "симулировано" — сам AI-поиск на
// шаге 3: это заглушка (не ходит в api/ai-proxy.js), чтобы aha-moment
// показывался мгновенно и одинаково для 100% новых пользователей, а не
// зависел от реального ответа модели за 1-2 секунды до того, как человек
// вообще понял ценность продукта.

import React, { useState, useRef, useEffect } from "react";
import { X, Lock, UserPlus, Send, Sparkles, Search, Star, Loader2, Gift, CheckCircle2 } from "lucide-react";
import { styles, PURPLE } from "../theme.js";
import { PLAN_FEATURES, PRO_PRICE_STARS, PRO_PRICE_STARS_OLD, AI_SUGGESTIONS } from "../constants.js";
import { formatRuPhone } from "../helpers.js";
import { Field } from "./Ui.jsx";

const TOTAL_STEPS = 4;

function haptic(style) {
  const tg = window.Telegram && window.Telegram.WebApp;
  try { tg && tg.HapticFeedback && tg.HapticFeedback.impactOccurred(style || "light"); } catch (e) {}
}

// Один и тот же запрос, что в примере ТЗ ("почини машину") — если он есть
// в AI_SUGGESTIONS, берём оттуда, чтобы не дублировать строку в двух местах;
// иначе — резервный текст на случай, если список когда-нибудь изменят.
const DEMO_QUERY = AI_SUGGESTIONS.find((s) => /машин/i.test(s)) || AI_SUGGESTIONS[0] || "Почини машину";

export default function Onboarding({
  tgFirstName,           // имя из Telegram (initDataUnsafe.user.first_name), для персонализации приветствия
  effectiveAiLimit,      // лимит бесплатных AI-запросов — для прогресс-бара на пейволле
  aiRequestsUsed,        // сколько уже потрачено (после демо-поиска будет +1)
  onAddContact,          // (contactDraft) => Promise<contact> — реально сохраняет контакт через persistContacts в App.jsx
  onRecordAiUsage,       // () => Promise<void> — списывает 1 демо-запрос из общего лимита (тот же счётчик, что и в Profile)
  onActivateProViaStars, // уже существующий обработчик успешной оплаты звёздами (App.jsx)
  onActivateDemoPro,     // фоллбек вне Telegram / для теста без оплаты (тот же, что в Profile.jsx)
  onClaimTrialWeek,      // () => Promise<void> — выдаёт 7 дней Pro (retention pop-up)
  onFinish,              // () => void — онбординг завершён (в любом исходе), скрыть компонент
}) {
  const [step, setStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [addedContact, setAddedContact] = useState(null);

  const [aiPhase, setAiPhase] = useState("idle"); // idle -> thinking -> done
  const aiTimerRef = useRef(null);
  // Если компонент размонтируется, пока идёт "AI изучает окружение…"
  // (например, оплата звёздами прилетела и onFinish() убрал онбординг
  // раньше, чем сработал таймер), сам таймер иначе продолжит жить и
  // попытается setState на уже размонтированном компоненте.
  useEffect(() => () => clearTimeout(aiTimerRef.current), []);

  const [starsLoading, setStarsLoading] = useState(false);
  const [starsError, setStarsError] = useState("");
  const [showExitPopup, setShowExitPopup] = useState(false);
  const [claimingTrial, setClaimingTrial] = useState(false);

  function goTo(next) {
    haptic("light");
    setStep(next);
  }

  // --- Шаг 2: добавление первого контакта ---
  async function handleAddContact() {
    if (!firstName.trim()) return;
    setSavingContact(true);
    try {
      const contact = await onAddContact({ firstName: firstName.trim(), phone });
      setAddedContact(contact || { firstName: firstName.trim() });
      haptic("medium");
      goTo(2);
    } finally {
      setSavingContact(false);
    }
  }

  // Технически WebApp API не даёт мини-аппам выбрать произвольный контакт
  // из адресной книги Telegram (это было бы утечкой чужих данных без их
  // согласия) — requestContact делится только СВОИМИ данными пользователя.
  // Поэтому это честно подписано как "быстрое заполнение", а не "импорт
  // друга", и остаётся опциональным рядом с обычными полями.
  function handleFillFromTelegram() {
    const tg = window.Telegram && window.Telegram.WebApp;
    if (!tg || !tg.requestContact) return;
    tg.requestContact((ok, result) => {
      if (!ok) return;
      const c = result && result.responseUnsafe && result.responseUnsafe.contact;
      if (!c) return;
      setFirstName(c.first_name || firstName);
      if (c.phone_number) setPhone(formatRuPhone(c.phone_number));
      haptic("light");
    });
  }

  // --- Шаг 3: симулированный AI-поиск (aha-moment) ---
  function runDemoSearch() {
    if (aiPhase !== "idle") return;
    setAiPhase("thinking");
    haptic("light");
    aiTimerRef.current = setTimeout(() => {
      setAiPhase("done");
      haptic("medium");
      if (onRecordAiUsage) onRecordAiUsage(); // тот же счётчик, что и в реальном AI-поиске — пейволл ниже покажет честную цифру
    }, 1400);
  }

  const contactName = (addedContact && addedContact.firstName) || firstName.trim() || "Ваш контакт";

  // --- Шаг 4: пейволл ---
  const limit = effectiveAiLimit || 10;
  const used = Math.min(limit, aiRequestsUsed || 0);
  const usagePct = Math.min(100, Math.round((used / limit) * 100));
  const starsDiscountPct = Math.round((1 - PRO_PRICE_STARS / PRO_PRICE_STARS_OLD) * 100);

  async function handleStarsCheckout() {
    setStarsError("");
    const tg = window.Telegram && window.Telegram.WebApp;
    const invoiceUrl = import.meta.env.VITE_CREATE_STARS_INVOICE_URL;
    if (!tg || !tg.initData) {
      // Вне Telegram (например, при локальной разработке) — включаем демо-режим,
      // чтобы флоу можно было пройти целиком и без настоящего бота.
      if (onActivateDemoPro) { await onActivateDemoPro(); onFinish(); }
      return;
    }
    if (!invoiceUrl) {
      setStarsError("Оплата звёздами пока не настроена. Попробуйте позже из личного кабинета.");
      return;
    }
    setStarsLoading(true);
    try {
      const response = await fetch(invoiceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: tg.initData }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "invoice error");

      tg.openInvoice(data.link, (status) => {
        setStarsLoading(false);
        if (status === "paid") {
          onActivateProViaStars();
          onFinish();
        } else if (status === "failed") {
          setStarsError("Платёж не прошёл. Попробуйте ещё раз.");
        }
        // "cancelled"/"pending" — тихо остаёмся на пейволле, без ошибки
      });
    } catch (e) {
      setStarsLoading(false);
      setStarsError("Не получилось создать счёт. Попробуйте ещё раз.");
    }
  }

  // Попытка закрыть/пропустить пейволл — вместо немедленного выхода
  // показываем удерживающий pop-up. Пройти его насквозь всё равно можно
  // (кнопка "Нет, спасибо"), просто не с первого тапа.
  function handleTryClose() {
    haptic("light");
    setShowExitPopup(true);
  }

  async function handleClaimTrial() {
    setClaimingTrial(true);
    try {
      if (onClaimTrialWeek) await onClaimTrialWeek();
      haptic("medium");
    } finally {
      setClaimingTrial(false);
      setShowExitPopup(false);
      onFinish();
    }
  }

  function handleDeclineTrial() {
    setShowExitPopup(false);
    onFinish();
  }

  return (
    <div style={styles.onboardWrap}>
      <div style={styles.onboardTop}>
        <div style={styles.onboardDots}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div key={i} style={{ ...styles.onboardDot, ...(i <= step ? styles.onboardDotActive : {}) }} />
          ))}
        </div>
        {/* Пропуск на шагах 0-2 просто идёт дальше по шагам — "закрытием" в
           смысле удержания считается только уход именно с пейволла (шаг 3).
           (Раньше здесь был тернарник вида "step===2 && aiPhase!=='done' ? 3
           : min(step+1,3)" — при пошаговом разборе он в обеих ветках всегда
           давал ровно step+1, просто более запутанно.) */}
        {step < 3 ? (
          <button className="fp-btn" style={styles.onboardSkip} onClick={() => goTo(step + 1)}>
            Пропустить
          </button>
        ) : (
          <button className="fp-btn" style={styles.onboardSkip} onClick={handleTryClose} aria-label="Закрыть">
            <X size={18} color="rgba(11,11,16,0.55)" />
          </button>
        )}
      </div>

      <div className="fp-step-anim" key={step} style={styles.onboardBody}>
        {/* --- Шаг 0: приветствие + ценность + безопасность --- */}
        {step === 0 && (
          <>
            <div style={styles.onboardIconRing}><Sparkles size={28} color="#fff" /></div>
            <h1 style={styles.onboardTitle}>
              {tgFirstName ? `Привет, ${tgFirstName}!` : "Привет!"}<br />Это People Circle
            </h1>
            <p style={styles.onboardSubtitle}>
              Personal CRM для вашего окружения: держите связи в порядке и
              находите нужного человека среди своих контактов одним запросом
              к AI — «нужен юрист», «кто разбирается в маркетинге» и так далее.
            </p>
            <div style={styles.onboardSecurityRow}>
              <Lock size={18} color={PURPLE} style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={styles.onboardSecurityText}>
                People Circle не хранит ваши данные на своих серверах — всё
                защищено на уровне Telegram (Cloud Storage вашего аккаунта).
              </div>
            </div>
          </>
        )}

        {/* --- Шаг 1: добавление первого контакта --- */}
        {step === 1 && (
          <>
            <h1 style={{ ...styles.onboardTitle, fontSize: 21 }}>Добавьте первого человека</h1>
            <p style={styles.onboardSubtitle}>Займёт 10 секунд — просто имя и (по желанию) телефон.</p>

            {window.Telegram?.WebApp?.requestContact && (
              <>
                <button className="fp-btn" style={styles.onboardTgFillBtn} onClick={handleFillFromTelegram}>
                  <Send size={15} /> Заполнить моими данными из Telegram
                </button>
                <div style={styles.onboardDivider}>
                  <div style={styles.onboardDividerLine} /><span>или вручную</span><div style={styles.onboardDividerLine} />
                </div>
              </>
            )}

            {/* Переиспользуем общий Field вместо ручной разметки — так поле
               телефона бесплатно получает существующий фикс для вставки
               номера через буфер обмена (см. Ui.jsx), который пришлось бы
               иначе дублировать здесь и держать в синхроне с оригиналом. */}
            <Field label="Имя" value={firstName} onChange={setFirstName} placeholder="Например, Ирина" />
            <div style={{ marginTop: 10 }}>
              <Field label="Телефон (необязательно)" value={phone} onChange={setPhone} placeholder="+7 (___) ___-__-__" phoneMask />
            </div>
          </>
        )}

        {/* --- Шаг 2: симулированный AI-поиск (aha-moment) --- */}
        {step === 2 && (
          <>
            <h1 style={{ ...styles.onboardTitle, fontSize: 21 }}>А теперь — магия</h1>
            <p style={styles.onboardSubtitle}>Так выглядит AI-поиск по вашему окружению. Попробуйте прямо сейчас:</p>

            <div style={styles.onboardSearchBar}>
              <Search size={16} color={PURPLE} />
              <span>{DEMO_QUERY}</span>
            </div>

            {aiPhase === "idle" && (
              // flexGrow/flexShrink: 0 обязательны — primaryPill сам по себе
              // содержит flex:1 (рассчитан на пару кнопок в flex-row), а
              // onboardBody это flex-column: без сброса кнопка растянулась бы
              // на всю оставшуюся высоту экрана вместо обычной высоты пилюли.
              <button className="fp-btn" style={{ ...styles.primaryPill, width: "100%", flexGrow: 0, flexShrink: 0 }} onClick={runDemoSearch}>
                <Sparkles size={14} /> Найти в моём окружении
              </button>
            )}

            {aiPhase === "thinking" && (
              <div style={styles.onboardThinkingRow}>
                <span className="fp-onboard-dot" style={{ animationDelay: "0s" }} />
                <span className="fp-onboard-dot" style={{ animationDelay: "0.15s" }} />
                <span className="fp-onboard-dot" style={{ animationDelay: "0.3s" }} />
                <span>AI изучает ваше окружение…</span>
              </div>
            )}

            {aiPhase === "done" && (
              // fpCardIn — существующий keyframe в theme.js, но выделенного
              // класса под него нет (.fp-card тянет за собой ещё и
              // cursor:pointer/hover-подъём, что не нужно для некликабельной
              // карточки-результата) — поэтому анимация задаётся инлайном.
              <div style={{ ...styles.onboardResultCard, animation: "fpCardIn .3s ease both" }}>
                <span style={styles.onboardResultMatch}>92% совпадение</span>
                <div style={styles.onboardResultName}>{contactName}</div>
                <div style={styles.onboardResultReason}>
                  Разбирается в теме и недавно был на связи — стоит написать
                  первым, а не ждать, пока вспомнится случайно.
                </div>
              </div>
            )}

            {aiPhase === "done" && (
              <button className="fp-btn" style={{ ...styles.primaryPill, width: "100%", marginTop: 16, flexGrow: 0, flexShrink: 0 }} onClick={() => goTo(3)}>
                Хочу безлимитный AI-поиск
              </button>
            )}
          </>
        )}

        {/* --- Шаг 3: пейволл --- */}
        {step === 3 && (
          <>
            <h1 style={{ ...styles.onboardTitle, fontSize: 21 }}>Откройте Pro Networker</h1>
            <p style={styles.onboardSubtitle}>Безлимитный AI-поиск и добавление контактов голосом — без ограничений.</p>

            <div style={styles.onboardProgressWrap}>
              <div style={styles.usageRow}><span>Бесплатные AI-запросы</span><span>{used} / {limit}</span></div>
              <div style={styles.usageTrack}><div style={{ ...styles.usageFill, width: `${usagePct}%`, background: PURPLE }} /></div>
              <div style={styles.usageHint}>Только что потратили один на демо-поиск выше — на реальные вопросы останется меньше.</div>
            </div>

            <div style={{ ...styles.planCard, ...styles.planCardPro, marginTop: 14 }}>
              <div style={styles.planCardName}>Pro Networker</div>
              <div style={styles.planPriceRow}>
                <span style={styles.planPriceNew}><Star size={14} color={PURPLE} fill={PURPLE} style={{ verticalAlign: -2, marginRight: 2 }} /> {PRO_PRICE_STARS}</span>
                <span style={styles.planPriceOld}><Star size={12} color={PURPLE} fill={PURPLE} style={{ verticalAlign: -1, marginRight: 2 }} /> {PRO_PRICE_STARS_OLD}</span>
                <span style={styles.planDiscountBadge}>−{starsDiscountPct}%</span>
              </div>
              {PLAN_FEATURES.pro.map((f, i) => (
                <div key={i} style={styles.planFeatureRow}><CheckCircle2 size={14} color={PURPLE} style={{ flexShrink: 0, marginTop: 1 }} /><span style={styles.planFeatureText}>{f}</span></div>
              ))}

              <button className="fp-btn" style={{ ...styles.primaryPill, width: "100%", marginTop: 10 }} onClick={handleStarsCheckout} disabled={starsLoading}>
                {starsLoading ? <Loader2 size={14} className="fp-pulse" /> : <Star size={14} fill="currentColor" />}
                {starsLoading ? "Открываем счёт…" : `Оформить за ${PRO_PRICE_STARS} ⭐`}
              </button>
              {starsError && <div style={styles.importError}>{starsError}</div>}
            </div>

            <button className="fp-btn" style={{ ...styles.onboardSkip, marginTop: 16, alignSelf: "center" }} onClick={handleTryClose}>
              Продолжить бесплатно
            </button>
          </>
        )}
      </div>

      {/* На шагах 2-3 CTA уже внутри onboardBody (там своя логика показа
         кнопки в зависимости от aiPhase/оплаты) — рендерить здесь пустой
         onboardFooter не нужно: он всё равно не flex, но лишние 26px
         паддинга снизу создавали заметный пустой зазор под контентом. */}
      {(step === 0 || step === 1) && (
        <div style={styles.onboardFooter}>
          {step === 0 && (
            <button className="fp-btn" style={{ ...styles.primaryPill, width: "100%" }} onClick={() => goTo(1)}>
              Начать <UserPlus size={15} />
            </button>
          )}
          {step === 1 && (
            <button className="fp-btn" style={{ ...styles.primaryPill, width: "100%" }} onClick={handleAddContact} disabled={!firstName.trim() || savingContact}>
              {savingContact ? <Loader2 size={14} className="fp-pulse" /> : <UserPlus size={15} />}
              {savingContact ? "Добавляем…" : "Добавить и продолжить"}
            </button>
          )}
        </div>
      )}

      {/* --- Pop-up удержания: попытка закрыть/пропустить пейволл --- */}
      {showExitPopup && (
        // Тап по фону закрывает только сам pop-up (человек возвращается на
        // пейволл) — на Free его переводит исключительно осознанный тап по
        // "Нет, спасибо". Раньше случайный тап мимо кнопок сразу же и
        // необратимо завершал весь онбординг.
        <div className="fp-overlay-anim" style={styles.onboardExitOverlay} onClick={() => setShowExitPopup(false)}>
          <div className="fp-sheet-anim" style={styles.onboardExitCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.onboardExitGiftRing}><Gift size={24} color={PURPLE} /></div>
            <div style={styles.onboardExitTitle}>Куда же вы?</div>
            <div style={styles.onboardExitText}>
              Останьтесь сейчас — и мы подарим 7 дней Pro Networker бесплатно,
              без привязки карты.
            </div>
            <button className="fp-btn" style={{ ...styles.primaryPill, width: "100%", marginBottom: 10 }} onClick={handleClaimTrial} disabled={claimingTrial}>
              {claimingTrial ? <Loader2 size={14} className="fp-pulse" /> : <Gift size={14} />}
              {claimingTrial ? "Активируем…" : "Забрать неделю бесплатно"}
            </button>
            <button className="fp-btn" style={styles.secondaryPill} onClick={handleDeclineTrial}>Нет, спасибо</button>
          </div>
        </div>
      )}
    </div>
  );
}
