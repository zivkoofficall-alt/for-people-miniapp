// api/admin-transactions-list.js
import { requireAdmin, hasPermission } from "./_lib/adminAuth.js";
import { selectRows } from "./_lib/supabaseRest.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { initData } = req.body || {};
  const auth = await requireAdmin(initData);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.reason });
  if (!hasPermission(auth.admin, "transactions")) return res.status(403).json({ error: "нет прав смотреть транзакции" });

  const rows = await selectRows("transactions", "order=created_at.desc&limit=200");
  return res.status(200).json({
    transactions: (rows || []).map((t) => ({
      id: t.id,
      chatId: t.chat_id,
      amountStars: t.amount_stars,
      promoCode: t.promo_code,
      createdAt: t.created_at,
    })),
  });
}
