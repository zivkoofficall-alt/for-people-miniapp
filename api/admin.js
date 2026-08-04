// api/admin.js
//
// Единая точка входа для всей админки. Раньше каждый /api/admin-* был
// отдельной serverless-функцией — на бесплатном плане Vercel лимит 12
// функций, а их набралось 19. Теперь все они лежат в api/_admin/ (папки
// и файлы с "_" Vercel не публикует как функции) и вызываются отсюда
// через один POST с полем "action" в теле запроса.
//
// Тело запроса: { action: "bugs-list", initData, ...остальные поля }
// Внутренние хендлеры не менялись — каждый по-прежнему сам читает
// req.body и сам возвращает ответ через res.status(...).json(...).

import adminSession from "./_admin/admin-session.js";
import adminInviteAccept from "./_admin/admin-invite-accept.js";
import adminInviteCreate from "./_admin/admin-invite-create.js";
import adminList from "./_admin/admin-list.js";
import adminUsersList from "./_admin/admin-users-list.js";
import adminUserBlock from "./_admin/admin-user-block.js";
import adminUpdate from "./_admin/admin-update.js";
import adminRevoke from "./_admin/admin-revoke.js";
import adminPromoList from "./_admin/admin-promo-list.js";
import adminPromoCreate from "./_admin/admin-promo-create.js";
import adminPromoToggle from "./_admin/admin-promo-toggle.js";
import adminBugsList from "./_admin/admin-bugs-list.js";
import adminBugsUpdate from "./_admin/admin-bugs-update.js";
import adminTransactionsList from "./_admin/admin-transactions-list.js";
import adminAuditList from "./_admin/admin-audit-list.js";
import adminChatList from "./_admin/admin-chat-list.js";
import adminChatSend from "./_admin/admin-chat-send.js";
import adminHeatmap from "./_admin/admin-heatmap.js";
import adminHomeStats from "./_admin/admin-home-stats.js";
import adminAlertsList from "./_admin/admin-alerts-list.js";
import adminAlertsSave from "./_admin/admin-alerts-save.js";
import adminAlertsTest from "./_admin/admin-alerts-test.js";

const routes = {
  "admin-session": adminSession,
  "admin-invite-accept": adminInviteAccept,
  "admin-invite-create": adminInviteCreate,
  "admin-list": adminList,
  "admin-users-list": adminUsersList,
  "admin-user-block": adminUserBlock,
  "admin-update": adminUpdate,
  "admin-revoke": adminRevoke,
  "admin-promo-list": adminPromoList,
  "admin-promo-create": adminPromoCreate,
  "admin-promo-toggle": adminPromoToggle,
  "admin-bugs-list": adminBugsList,
  "admin-bugs-update": adminBugsUpdate,
  "admin-transactions-list": adminTransactionsList,
  "admin-audit-list": adminAuditList,
  "admin-chat-list": adminChatList,
  "admin-chat-send": adminChatSend,
  "admin-heatmap": adminHeatmap,
  "admin-home-stats": adminHomeStats,
  "admin-alerts-list": adminAlertsList,
  "admin-alerts-save": adminAlertsSave,
  "admin-alerts-test": adminAlertsTest,
};

export default async function handler(req, res) {
  const route = req.method === "GET" ? req.query._route : (req.body || {})._route;
  const target = routes[route];

  if (!target) {
    return res.status(400).json({ error: `Неизвестный маршрут: ${route || "(пусто)"}` });
  }

  return target(req, res);
}
