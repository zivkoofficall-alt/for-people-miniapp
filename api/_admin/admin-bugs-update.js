// api/admin-bugs-update.js
//
// action: "setStatus" { id, status: "pending"|"sent" } — вручную пометить
// action: "delete" { id }                              — удалить один репорт
// action: "clearSent" {}                                 — удалить все уже отправленные

import { requireAdmin, hasPermission } from "../_lib/adminAuth.js";
import { updateRows, deleteRows } from "../_lib/supabaseRest.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData, action, id, status } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "bugs")) return res.status(403).json({ error: "нет прав управлять баг-репортами" });

  if (action === "delete") {
    if (!id) return res.status(400).json({ error: "id обязателен" });
    await deleteRows("bug_reports", `id=eq.${id}`);
    return res.status(200).json({ ok: true });
  }
  if (action === "clearSent") {
    await deleteRows("bug_reports", "status=eq.sent");
    return res.status(200).json({ ok: true });
  }
  if (action === "setStatus") {
    if (!id || (status !== "pending" && status !== "sent")) {
      return res.status(400).json({ error: "нужны id и корректный status" });
    }
    await updateRows("bug_reports", `id=eq.${id}`, { status });
    return res.status(200).json({ ok: true });
  }
  return res.status(400).json({ error: "неизвестное действие" });
}
