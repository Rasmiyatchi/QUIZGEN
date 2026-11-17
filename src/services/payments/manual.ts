/**
 * M3 — Qo'lda to'lov (Karta orqali o'tkazma va chek yuklash)
 */
import { 
  getOrder, 
  getUser, 
  approveManualOrder, 
  rejectManualOrder, 
  submitOrderProof,
  addAuditLog
} from '../../lib/db.ts';
import { PRICING_PLANS } from '../../lib/entitlements.ts';
import { sendTelegramMessage } from '../telegram-bot.ts';

export const MANUAL_PAYMENT_CONFIG = {
  get cardNumber() {
    return process.env.MANUAL_PAYMENT_CARD || '9860 1201 3456 7890';
  },
  get cardHolder() {
    return process.env.MANUAL_PAYMENT_CARD_HOLDER || 'QUIZGEN PLATFORMASI';
  },
  get bankName() {
    return process.env.MANUAL_PAYMENT_BANK || 'TBC Bank / Humo';
  }
};

/**
 * Foydalanuvchi chek yuklaganda adminga bildirishnoma yuborish
 */
export async function notifyAdminsNewPaymentProof(options: {
  orderId: string;
  botToken: string;
  adminIds: string[];
  proofUrl: string;
  appUrl: string;
}) {
  const { orderId, botToken, adminIds, proofUrl, appUrl } = options;
  if (!botToken || adminIds.length === 0) return;

  const order = getOrder(orderId);
  if (!order) return;

  const user = getUser(order.user_id);
  const planInfo = PRICING_PLANS[order.plan];
  const userName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : 'Noma\'lum';
  const username = user?.username ? `@${user.username}` : `ID: ${order.user_id}`;

  const message = `🧾 <b>Yangi to'lov cheki qabul qilindi!</b>\n\n` +
    `📦 Buyurtma: <code>${order.id}</code>\n` +
    `👤 Foydalanuvchi: <b>${userName}</b> (${username})\n` +
    `💎 Tarif: <b>${planInfo?.name || order.plan}</b>\n` +
    `💰 Summa: <b>${order.amount.toLocaleString()} so'm</b>\n\n` +
    `📸 <b>Chek havolasi:</b> <a href="${appUrl}${proofUrl}">Chekni ko'rish</a>\n\n` +
    `Iltimos, bank ilovangiz orqali summani tekshirib, quyidagi tugmalar orqali tasdiqlang:`;

  const inline_keyboard = [
    [
      { text: "✅ Tasdiqlash", callback_data: `approve_order_${order.id}` },
      { text: "❌ Rad etish", callback_data: `reject_order_${order.id}` }
    ],
    [
      { text: "🌐 Veb Admin Panel", url: `${appUrl}/admin` }
    ]
  ];

  for (const adminId of adminIds) {
    try {
      await sendTelegramMessage(botToken, adminId, message, { inline_keyboard });
    } catch (err) {
      console.warn(`Admin ${adminId} ga chek xabarnomasini yuborishda xatolik:`, err);
    }
  }
}

/**
 * Buyurtmani admin tomonidan tasdiqlash va foydalanuvchiga xabar berish
 */
export async function handleApproveManualPayment(
  orderId: string, 
  adminId: string, 
  note?: string,
  botToken?: string
): Promise<{ success: boolean; message?: string }> {
  const order = getOrder(orderId);
  if (!order) return { success: false, message: "Buyurtma topilmadi." };

  const res = approveManualOrder(orderId, adminId, note);
  if (!res.success) return res;

  // Audit log
  addAuditLog(adminId, 'approve_manual_payment', 'order', orderId, { note });

  // Foydalanuvchiga xushxabar yuborish
  if (botToken && !order.user_id.startsWith('demo_')) {
    const planInfo = PRICING_PLANS[order.plan];
    const msg = `🎉 <b>Tabriklaymiz! To'lovingiz muvaffaqiyatli tasdiqlandi!</b> 🚀\n\n` +
      `Sizning <b>${planInfo?.name}</b> obunangiz faollashtirildi.\n` +
      `Barcha professional imkoniyatlar: cheksiz HEMIS testlari, 3D Flashcardlar va Test Muharriri ochildi!\n\n` +
      `QUIZGEN dan foydalanganingiz uchun rahmat! 🌟`;
    try {
      await sendTelegramMessage(botToken, order.user_id, msg);
    } catch (err) {
      console.warn("Foydalanuvchiga tasdiq xabarini yuborishda xatolik:", err);
    }
  }

  return { success: true };
}

/**
 * Buyurtmani rad etish va foydalanuvchiga sababini bildirish
 */
export async function handleRejectManualPayment(
  orderId: string, 
  adminId: string, 
  reason?: string,
  botToken?: string
): Promise<{ success: boolean; message?: string }> {
  const order = getOrder(orderId);
  if (!order) return { success: false, message: "Buyurtma topilmadi." };

  const res = rejectManualOrder(orderId, adminId, reason);
  if (!res.success) return res;

  // Audit log
  addAuditLog(adminId, 'reject_manual_payment', 'order', orderId, { reason });

  // Foydalanuvchiga bildirish
  if (botToken && !order.user_id.startsWith('demo_')) {
    const msg = `⚠️ <b>To'lov cheki qabul qilinmadi</b>\n\n` +
      `Buyurtma: <code>${orderId}</code>\n` +
      `Sabab: ${reason || "Chekdagi summa mos kelmadi yoki to'lov tasdiqlanmadi."}\n\n` +
      `Savollaringiz bo'lsa, qo'llab-quvvatlash xizmati bilan bog'laning.`;
    try {
      await sendTelegramMessage(botToken, order.user_id, msg);
    } catch (err) {
      console.warn("Foydalanuvchiga rad xabarini yuborishda xatolik:", err);
    }
  }

  return { success: true };
}
