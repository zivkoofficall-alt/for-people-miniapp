// src/adminApi.js
//
// Тонкая обёртка для обращения админ-панели к /api/admin-*.
// Всегда передаёт initData — сырую подписанную строку от Telegram,
// её проверяет сервер (см. api/_lib/telegramAuth.js). Сама initData
// ничего не значит, если её не проверить подписью — но подделать
// проверку снаружи нельзя, поэтому фронту достаточно просто её передать.

function getInitData() {
  return (typeof window !== "undefined" && window.Telegram?.WebApp?.initData) || "";
}

async function callAdmin(route, body) {
  const res = await fetch(`/api/admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, _route: route, initData: getInitData() }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Ошибка ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** Проверить текущую сессию — вызывается при каждом открытии админки. */
export function fetchAdminSession() {
  return callAdmin("admin-session", {});
}

/** Принять приглашение по токену из ссылки. */
export function acceptAdminInvite(token) {
  return callAdmin("admin-invite-accept", { token });
}

/** Создать новую ссылку-приглашение (только для тех, у кого есть право "roles"). */
export function createAdminInvite(role, permissions) {
  return callAdmin("admin-invite-create", { role, permissions });
}

/** Список реальных админов + ещё не принятых приглашений. */
export function fetchAdminList() {
  return callAdmin("admin-list", {});
}

/** Список реальных пользователей аппа (с необязательным поиском). */
export function fetchAdminUsers(search) {
  return callAdmin("admin-users-list", { search });
}

/** Заблокировать / разблокировать пользователя. */
export function setUserBlocked(chatId, blocked) {
  return callAdmin("admin-user-block", { chatId, blocked });
}

/** Изменить набор прав (и опционально роль) администратора по его chatId. */
export function updateAdminPermissions(chatId, permissions, role) {
  return callAdmin("admin-update", { chatId, permissions, role });
}

/** Отозвать доступ администратора по его chatId. */
export function revokeAdminAccess(chatId, reason) {
  return callAdmin("admin-revoke", { chatId, reason });
}

/** Список промокодов. */
export function fetchPromoCodes() {
  return callAdmin("admin-promo-list", {});
}

/** Создать промокод. */
export function createPromoCode({ code, discount, usesLimit, boundChatId, expiresAt }) {
  return callAdmin("admin-promo-create", { code, discount, usesLimit, boundChatId, expiresAt });
}

/** Включить/выключить промокод. */
export function togglePromoCode(id) {
  return callAdmin("admin-promo-toggle", { id, action: "toggle" });
}

/** Удалить промокод. */
export function deletePromoCode(id) {
  return callAdmin("admin-promo-toggle", { id, action: "delete" });
}

/** Список реальных баг-репортов. */
export function fetchBugs() {
  return callAdmin("admin-bugs-list", {});
}

/** Изменить статус / удалить один баг-репорт / очистить отправленные. */
export function updateBug(action, params) {
  return callAdmin("admin-bugs-update", { action, ...params });
}

/** Список реальных транзакций (оплаты звёздами). */
export function fetchTransactions() {
  return callAdmin("admin-transactions-list", {});
}

/** Реальный журнал действий администраторов. */
export function fetchAuditLog() {
  return callAdmin("admin-audit-list", {});
}

/** Сообщения чата команды (заодно отмечает их прочитанными). */
export function fetchTeamChat() {
  return callAdmin("admin-chat-list", {});
}

/** Отправить сообщение в чат команды. */
export function sendTeamChatMessage(text) {
  return callAdmin("admin-chat-send", { text });
}

/** Тепловая карта активности команды по журналу действий. */
export function fetchAdminHeatmap() {
  return callAdmin("admin-heatmap", {});
}

/** Сводная статистика для главного экрана. */
export function fetchHomeStats() {
  return callAdmin("admin-home-stats", {});
}

/** Реальное сохранённое состояние тумблеров на экране "Алерты". */
export function fetchAlertSettings() {
  return callAdmin("admin-alerts-list", {});
}

/** Сохранить вкл/выкл конкретного алерта. */
export function saveAlertSetting(id, enabled) {
  return callAdmin("admin-alerts-save", { id, enabled });
}

/** Отправить реальный тестовый алерт в Telegram (себе). */
export function sendTestAlert(name) {
  return callAdmin("admin-alerts-test", { name });
}

/** Реальные данные по рефералам (кто кого привёл, бонусы) вместо мока. */
export function fetchReferrals() {
  return callAdmin("admin-referrals-list", {});
}

/** Реальная история входов текущего админа (устройство, IP, время) вместо мока. */
export function fetchLoginHistory() {
  return callAdmin("admin-login-history-list", {});
}

/** Удалить запись из истории входов (см. оговорку в admin-login-history-delete.js). */
export function deleteLoginHistoryEntry(id) {
  return callAdmin("admin-login-history-delete", { id });
}

/** Реальный запрос 2FA-кода — уходит в личку в Telegram. */
export function requestTwoFactorCode() {
  return callAdmin("admin-2fa-request", {});
}

/** Реальная проверка 2FA-кода на сервере. */
export function verifyTwoFactorCode(code) {
  return callAdmin("admin-2fa-verify", { code });
}

/** Текущая реальная цена Pro (та же, что видит create-stars-invoice.js). */
export function fetchPricing() {
  return callAdmin("admin-pricing-get", {});
}

/** Сохранить новую цену — сразу влияет на реальные счета. */
export function savePricing(priceStars, priceOld) {
  return callAdmin("admin-pricing-save", { priceStars, priceOld });
}

/** Реально меняет тариф пользователя (было — мутация локального мока). */
export function setUserPlan(chatId, plan, reason) {
  return callAdmin("admin-user-set-plan", { chatId, plan, reason });
}

/** Реальная активность пользователя — баги и рефералы (контакты/задачи/цели сервер не видит). */
export function fetchUserActivity(chatId) {
  return callAdmin("admin-user-activity", { chatId });
}

/** Реальное удаление данных пользователя по праву на забвение. */
export function deleteUserData(chatId, reason) {
  return callAdmin("admin-user-delete-data", { chatId, reason });
}
