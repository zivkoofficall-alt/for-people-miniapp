// api/admin-promo-create.js
import { requireAdmin, hasPermission } from "../_lib/adminAuth.js";
import { insertRows, selectRows } from "../_lib/supabaseRest.js";
import { logAdminAction } from "../_lib/auditLog.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData, code, discount, usesLimit, boundChatId, expiresAt } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "promo")) return res.status(403).json({ error: "нет прав создавать промокоды" });

  const cleanCode = String(code || "").trim().toUpperCase();
  if (cleanCode.length < 3) return res.status(400).json({ error: "Код должен быть не короче 3 символов" });
  const d = Number(discount);
  if (!Number.isFinite(d) || d < 1 || d > 100) return res.status(400).json({ error: "Скидка должна быть от 1 до 100" });

  const existing = await selectRows("promo_codes", `code=eq.${encodeURIComponent(cleanCode)}&limit=1`);
  if (existing?.[0]) return res.status(409).json({ error: "Такой код уже существует" });

  await insertRows("promo_codes", [{
    code: cleanCode,
    discount_percent: d,
    uses_limit: boundChatId ? 1 : (usesLimit ? Number(usesLimit) : null),
    bound_chat_id: boundChatId || null,
    expires_at: expiresAt || null,
    created_by: auth.admin.chatId,
  }]);
  await logAdminAction(auth.admin, "Создан промокод", `${cleanCode} · скидка ${d}%`);

  return res.status(200).json({ ok: true });
}
