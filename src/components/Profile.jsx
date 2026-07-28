import React, { useState } from "react";
import { X, User, Check, CreditCard, Sparkles, TrendingUp, Star, Loader2 } from "lucide-react";
import { styles, PURPLE } from "../theme.js";
import { PLAN_FEATURES, PRO_PRICE_LABEL, PRO_PRICE_STARS, PRO_PRICE_STARS_OLD, PAYMENT_METHODS } from "../constants.js";
import { computeContactStats } from "../helpers.js";

export default function Profile({ subscription, contacts, tasks, onClose, onActivateDemoPro, onActivateProViaStars, onDowngradeToFree }) {
  const [paymentMethod, setPaymentMethod] = useState("stars");
  const [payAttempted, setPayAttempted] = useState(false);
  const [starsLoading, setStarsLoading] = useState(false);
  const [starsError, setStarsError] = useState("");
  const [closing, setClosing] = useState(false);
  function handleClose() { setClosing(true); setTimeout(onClose, 180); }

  const starsDiscountPct = Math.round((1 - PRO_PRICE_STARS / PRO_PRICE_STARS_OLD) * 100);

  // Звёзды Telegram — единственный способ оплаты, который реально
  // подключён (см. api/create-stars-invoice.js + api/telegram-webhook.js,
  // оба используют уже настроенный TELEGRAM_BOT_TOKEN). Карта/СБП пока
  // остаются заготовкой интерфейса — см. payDisclaimer ниже.
  async function handleStarsCheckout() {
    setStarsError("");
    const tg = window.Telegram && window.Telegram.WebApp;
    const invoiceUrl = import.meta.env.VITE_CREATE_STARS_INVOICE_URL;
    if (!tg || !tg.initData) {
      setStarsError("Оплата звёздами доступна только внутри Telegram.");
      return;
    }
    if (!invoiceUrl) {
      setStarsError("Оплата звёздами ещё не настроена (нет VITE_CREATE_STARS_INVOICE_URL).");
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
        } else if (status === "failed") {
          setStarsError("Платёж не прошёл. Попробуйте ещё раз.");
        }
        // "cancelled" / "pending" — пользователь сам закрыл счёт, без ошибки
      });
    } catch (e) {
      setStarsLoading(false);
      setStarsError("Не получилось создать счёт. Попробуйте ещё раз.");
    }
  }

  const isPro = subscription.plan === "pro";
  const used = subscription.aiRequestsUsed || 0;
  const limit = subscription.aiRequestsLimit || 20;
  const usagePct = isPro ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const usageColor = usagePct >= 90 ? "#E5484D" : usagePct >= 60 ? "#D98C2B" : "#7C4DFF";
  const stats = computeContactStats(contacts || [], tasks || []);

  return (
    <div className={closing ? "fp-overlay-anim-out" : "fp-overlay-anim"} style={styles.overlay} onClick={handleClose}>
      <div className={closing ? "fp-sheet-anim-out" : "fp-sheet-anim"} style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.sheetHandle} />
        <button className="fp-btn" style={styles.closeBtn} onClick={handleClose}><X size={16} color="#0B0B10" /></button>

        <div style={styles.formTitle}><User size={17} color="#7C4DFF" style={{ marginRight: 6, verticalAlign: -3 }} />Личный кабинет</div>

        <div style={{ marginTop: 14 }}>
          {isPro ? <span style={styles.planBadgePro}><Sparkles size={12} />Pro Networker</span> : <span style={styles.planBadgeFree}>Free Trial</span>}
        </div>

        <div style={styles.sectionLabel}>Статистика</div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statNum}>{stats.total}</div>
            <div style={styles.statLabel}>Контактов всего</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNum}>{stats.addedWeek}</div>
            <div style={styles.statLabel}>Добавлено за 7 дней</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNum}>{stats.addedMonth}</div>
            <div style={styles.statLabel}>Добавлено за 30 дней</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statNum}>{stats.tasksActive}</div>
            <div style={styles.statLabel}>Задач в работе{stats.tasksDone > 0 ? ` · ${stats.tasksDone} готово` : ""}</div>
          </div>
        </div>

        <div style={styles.statChartCard}>
          <div style={styles.statChartTitle}><TrendingUp size={13} color="#7C4DFF" style={{ verticalAlign: -2, marginRight: 5 }} />Новые контакты по месяцам</div>
          <div style={styles.statChartRow}>
            {stats.months.map((m, i) => (
              <div key={i} style={styles.statChartCol}>
                <div style={styles.statChartBarTrack}>
                  <div style={{ ...styles.statChartBarFill, height: `${Math.round((m.count / stats.maxMonthCount) * 100)}%` }} />
                </div>
                <div style={styles.statChartLabel}>{m.label}</div>
              </div>
            ))}
          </div>
          {stats.topCategory && (
            <div style={styles.statTopCategoryRow}>
              <span>Больше всего контактов</span>
              <span style={{ color: "#7C4DFF" }}>{stats.topCategory.name} · {stats.topCategory.count}</span>
            </div>
          )}
        </div>

        {!isPro && (
          <div style={styles.usageCard}>
            <div style={styles.usageRow}><span>AI-запросы в этом месяце</span><span>{used} / {limit}</span></div>
            <div style={styles.usageTrack}><div style={{ ...styles.usageFill, width: `${usagePct}%`, background: usageColor }} /></div>
            <div style={styles.usageHint}>
              {used >= limit
                ? "Лимит бесплатных AI-запросов исчерпан — оформите Pro ниже, чтобы снять ограничение."
                : "Считаются AI-поиск, быстрое добавление через AI и анализ окружения."}
            </div>
          </div>
        )}

        <div style={styles.sectionLabel}>Тарифы</div>

        <div style={styles.planCard}>
          <div style={styles.planCardName}>Free Trial</div>
          <div style={styles.planCardPrice}>Бесплатно</div>
          {PLAN_FEATURES.free.map((f, i) => (
            <div key={i} style={styles.planFeatureRow}><Check size={14} color="#22A37A" style={{ flexShrink: 0, marginTop: 1 }} /><span style={styles.planFeatureText}>{f}</span></div>
          ))}
          {isPro && (
            <button className="fp-btn" style={{ ...styles.secondaryPill, marginTop: 10 }} onClick={onDowngradeToFree}>Вернуться на Free</button>
          )}
        </div>

        <div style={{ ...styles.planCard, ...styles.planCardPro }}>
          <div style={styles.planCardName}>Pro Networker</div>

          {paymentMethod === "stars" ? (
            <div style={styles.planPriceRow}>
              <span style={styles.planPriceNew}>⭐ {PRO_PRICE_STARS}</span>
              <span style={styles.planPriceOld}>⭐ {PRO_PRICE_STARS_OLD}</span>
              <span style={styles.planDiscountBadge}>−{starsDiscountPct}%</span>
            </div>
          ) : (
            <div style={styles.planCardPrice}>{PRO_PRICE_LABEL}</div>
          )}

          {PLAN_FEATURES.pro.map((f, i) => (
            <div key={i} style={styles.planFeatureRow}><Check size={14} color={PURPLE} style={{ flexShrink: 0, marginTop: 1 }} /><span style={styles.planFeatureText}>{f}</span></div>
          ))}

          {!isPro && (
            <>
              <div style={styles.paymentMethodRow}>
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.key}
                    className="fp-btn"
                    style={{ ...styles.paymentMethodChip, ...(paymentMethod === m.key ? styles.paymentMethodChipActive : {}) }}
                    onClick={() => { setPaymentMethod(m.key); setPayAttempted(false); setStarsError(""); }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {paymentMethod === "stars" ? (
                <>
                  <button className="fp-btn" style={{ ...styles.primaryPill, width: "100%", marginTop: 8 }} onClick={handleStarsCheckout} disabled={starsLoading}>
                    {starsLoading ? <Loader2 size={14} className="fp-pulse" /> : <Star size={14} />}
                    {starsLoading ? "Открываем счёт…" : `Оплатить ${PRO_PRICE_STARS} ⭐`}
                  </button>
                  {starsError && <div style={styles.importError}>{starsError}</div>}
                </>
              ) : (
                <>
                  <button className="fp-btn" style={{ ...styles.primaryPill, width: "100%", marginTop: 8 }} onClick={() => setPayAttempted(true)}>
                    <CreditCard size={14} /> Оформить подписку
                  </button>

                  {payAttempted && (
                    <div style={styles.payDisclaimer}>
                      Приём платежей картой/СБП в этом демо-проекте не подключён — это заготовка интерфейса.
                      Для реального приёма оплаты нужна интеграция с платёжным провайдером
                      (ЮKassa, CloudPayments и т.п.) и отдельный backend, который
                      подтверждает оплату и обновляет статус подписки. См. README.
                      <br /><br />
                      <button className="fp-btn" style={styles.demoLink} onClick={onActivateDemoPro}>
                        Включить Pro в демо-режиме (без оплаты, только для теста)
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div style={styles.versionTag}>for people · v1.2.1</div>
      </div>
    </div>
  );
}
