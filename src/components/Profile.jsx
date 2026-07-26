import React, { useState } from "react";
import { X, User, Check, CreditCard, Sparkles } from "lucide-react";
import { styles } from "../theme.js";
import { PLAN_FEATURES, PRO_PRICE_LABEL, PAYMENT_METHODS } from "../constants.js";

export default function Profile({ subscription, onClose, onActivateDemoPro, onDowngradeToFree }) {
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [payAttempted, setPayAttempted] = useState(false);

  const isPro = subscription.plan === "pro";
  const used = subscription.aiRequestsUsed || 0;
  const limit = subscription.aiRequestsLimit || 20;
  const usagePct = isPro ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const usageColor = usagePct >= 90 ? "#E5484D" : usagePct >= 60 ? "#D98C2B" : "#7C4DFF";

  return (
    <div className="fp-overlay-anim" style={styles.overlay} onClick={onClose}>
      <div className="fp-sheet-anim" style={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.sheetHandle} />
        <button className="fp-btn" style={styles.closeBtn} onClick={onClose}><X size={16} color="#0B0B10" /></button>

        <div style={styles.formTitle}><User size={17} color="#7C4DFF" style={{ marginRight: 6, verticalAlign: -3 }} />Личный кабинет</div>

        <div style={{ marginTop: 14 }}>
          {isPro ? <span style={styles.planBadgePro}><Sparkles size={12} />Pro Networker</span> : <span style={styles.planBadgeFree}>Free Trial</span>}
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
          <div style={styles.planCardPrice}>{PRO_PRICE_LABEL}</div>
          {PLAN_FEATURES.pro.map((f, i) => (
            <div key={i} style={styles.planFeatureRow}><Check size={14} color="#fff" style={{ flexShrink: 0, marginTop: 1 }} /><span style={styles.planFeatureText}>{f}</span></div>
          ))}

          {!isPro && (
            <>
              <div style={styles.paymentMethodRow}>
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.key}
                    className="fp-btn"
                    style={{ ...styles.paymentMethodChip, ...(paymentMethod === m.key ? styles.paymentMethodChipActive : {}) }}
                    onClick={() => setPaymentMethod(m.key)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <button className="fp-btn" style={{ ...styles.primaryPill, width: "100%", marginTop: 8 }} onClick={() => setPayAttempted(true)}>
                <CreditCard size={14} /> Оформить подписку
              </button>

              {payAttempted && (
                <div style={styles.payDisclaimer}>
                  Приём платежей в этом демо-проекте не подключён — это заготовка интерфейса.
                  Для реального приёма оплаты нужна интеграция с платёжным провайдером
                  (ЮKassa, CloudPayments, Stripe и т.п.) и отдельный backend, который
                  подтверждает оплату и обновляет статус подписки. См. README.
                  <br /><br />
                  <button className="fp-btn" style={styles.demoLink} onClick={onActivateDemoPro}>
                    Включить Pro в демо-режиме (без оплаты, только для теста)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div style={styles.versionTag}>for people · v1.2.1</div>
      </div>
    </div>
  );
}
