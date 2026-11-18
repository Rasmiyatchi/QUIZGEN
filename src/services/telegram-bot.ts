import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { parseHemisQuiz } from '../lib/hemis-parser.ts';
import { 
  upsertUser, 
  createQuiz, 
  PRICING_PLANS, 
  createOrder, 
  completeOrder, 
  getOrder, 
  authorizeAuthToken, 
  getAuthToken, 
  getUserSubscription,
  getAdminStats,
  addAuditLog,
  getDatabase,
  cancelUserSubscription,
  searchPublicQuizzes,
  getQuizBySlug,
  getQuiz
} from '../lib/db.ts';
import { escapeHtml, generateId } from '../lib/security.ts';
import { getEffectiveEntitlements, activateSubscription, clearEntitlementsCache } from '../lib/entitlements.ts';
import { 
  handleApproveManualPayment, 
  handleRejectManualPayment, 
  MANUAL_PAYMENT_CONFIG 
} from './payments/manual.ts';
import { generateClickPaymentUrl } from './payments/click.ts';
import { generatePaymePaymentUrl } from './payments/payme.ts';
import { QuizCreationService } from './quiz-creation.service.ts';

let botPollingActive = false;
let botOffset = 0;

export async function sendTelegramMessage(botToken: string, chatId: number | string, text: string, replyMarkup?: any) {
  if (!botToken) return;
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      })
    });
    const data = await res.json();
    if (!data.ok) {
      console.warn(`[Telegram Error] Chat ${chatId} ga xabar yuborishda xatolik:`, data.description);
    } else {
      console.log(`[Telegram Log] Chat ${chatId} ga xabar yetkazildi.`);
    }
    return data;
  } catch (err: any) {
    console.warn("Telegram sendMessage error:", err.message);
  }
}

export async function answerCallbackQuery(botToken: string, callbackQueryId: string, text?: string, showAlert = false) {
  if (!botToken) return;
  try {
    const url = `https://api.telegram.org/bot${botToken}/answerCallbackQuery`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || '',
        show_alert: showAlert
      })
    });
  } catch (err: any) {
    console.warn("Telegram answerCallbackQuery error:", err.message);
  }
}

export async function answerInlineQuery(botToken: string, inlineQueryId: string, results: any[]) {
  if (!botToken) return;
  try {
    const url = `https://api.telegram.org/bot${botToken}/answerInlineQuery`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inline_query_id: inlineQueryId,
        results,
        cache_time: 10
      })
    });
  } catch (err: any) {
    console.warn("Telegram answerInlineQuery error:", err.message);
  }
}

export async function downloadTelegramFile(botToken: string, fileId: string): Promise<Buffer | null> {
  try {
    const getFileUrl = `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`;
    const res = await fetch(getFileUrl);
    const data = await res.json();
    if (!data.ok || !data.result.file_path) return null;

    const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
    const fileRes = await fetch(downloadUrl);
    const arrayBuf = await fileRes.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (err: any) {
    console.error("downloadTelegramFile error:", err.message);
    return null;
  }
}

export async function startTelegramBot(botToken: string, appUrl: string) {
  if (!botToken || botPollingActive) return;
  botPollingActive = true;
  console.log("Telegram Bot xizmati ishga tushirilmoqda...");

  try {
    // 1. Agar avval webhook o'rnatilgan bo'lsa, deleteWebhook qilib getUpdates ni ochamiz
    const delRes = await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook?drop_pending_updates=false`);
    const delData = await delRes.json();
    console.log("Telegram webhook tozalandi:", delData.description || "OK");

    // 2. Bot buyruqlarini ro'yxatdan o'tkazish (Telegram Menyusi)
    await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Bosh sahifa va menyu' },
          { command: 'premium', description: '💎 Tariflar va Obuna (7 999 so\'mdan)' },
          { command: 'status', description: '👤 Shaxsiy hisob va limitlar' },
          { command: 'help', description: '❓ Yordam va ma\'lumot' }
        ]
      })
    });
    console.log("Telegram menyu buyruqlari o'rnatildi.");
  } catch (initErr: any) {
    console.warn("Telegram bot inicializatsiya ogohlantirish:", initErr.message);
  }

  async function poll() {
    if (!botPollingActive) return;

    try {
      const url = `https://api.telegram.org/bot${botToken}/getUpdates?offset=${botOffset}&timeout=25`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          botOffset = update.update_id + 1;

          if (update.callback_query) {
            console.log(`[Telegram Update] Callback: ${update.callback_query.data} from ${update.callback_query.from?.first_name}`);
            await handleCallbackQuery(botToken, appUrl, update.callback_query);
          } else if (update.inline_query) {
            console.log(`[Telegram Update] Inline query: "${update.inline_query.query}" from ${update.inline_query.from?.first_name}`);
            await handleInlineQuery(botToken, appUrl, update.inline_query);
          } else if (update.message) {
            console.log(`[Telegram Update] Message: "${update.message.text || 'fayl'}" from ${update.message.from?.first_name}`);
            await handleBotMessage(botToken, appUrl, update.message);
          }
        }
      } else if (!data.ok) {
        console.warn("Telegram getUpdates xatosi:", data.description);
        if (data.error_code === 409) {
          // Webhook to'siq bo'lsa darhol tozalash
          await fetch(`https://api.telegram.org/bot${botToken}/deleteWebhook?drop_pending_updates=false`);
        }
      }
    } catch (err: any) {
      await new Promise(r => setTimeout(r, 3000));
    }

    // Keyingi polling
    setTimeout(poll, 500);
  }

  poll();
}

export function stopTelegramBot() {
  botPollingActive = false;
}

async function handleCallbackQuery(botToken: string, appUrl: string, query: any) {
  const queryId = query.id;
  const data = query.data || '';
  const chatId = query.message?.chat?.id;
  const user = query.from;

  if (!chatId || !user) {
    return answerCallbackQuery(botToken, queryId);
  }

  // 1. Obuna tarifini tanlash
  if (data.startsWith('buy_plan_')) {
    const planKey = data.replace('buy_plan_', '') as 'start' | 'pro' | 'master';
    const planInfo = PRICING_PLANS[planKey];

    if (!planInfo) {
      return answerCallbackQuery(botToken, queryId, "Tarif topilmadi", true);
    }

    const order = createOrder({
      userId: String(user.id),
      plan: planKey,
      paymentMethod: 'pending' as any
    });

    await answerCallbackQuery(botToken, queryId);

    const invoiceText = `🧾 <b>Buyurtma rasmiylashtirildi!</b>\n\n` +
      `🆔 Buyurtma raqami: <code>${order.id}</code>\n` +
      `💎 Tarif: <b>${planInfo.name}</b> (${planInfo.subtitle})\n` +
      `⏳ Muddati: <b>${planInfo.durationDays} kun</b>\n` +
      `💰 To'lov summasi: <b>${planInfo.priceFormatted}</b>\n\n` +
      `📌 <i>Tarif imkoniyatlari:</i>\n` +
      planInfo.features.map(f => `• ${f}`).join('\n') + `\n\n` +
      `Quyidagi to'lov usullaridan birini tanlang:`;

    const paymentButtons: any[] = [];

    // Click to'lov havolasi
    const clickServiceId = process.env.CLICK_SERVICE_ID || '12345';
    const clickMerchantId = process.env.CLICK_MERCHANT_ID || '67890';
    const clickUrl = generateClickPaymentUrl({
      serviceId: clickServiceId,
      merchantId: clickMerchantId,
      amount: planInfo.price,
      orderId: order.id,
      returnUrl: `${appUrl}/pricing?paid=1&order=${order.id}`
    });
    paymentButtons.push([{ text: "💳 Click orqali to'lash", url: clickUrl }]);

    // Payme to'lov havolasi
    const paymeMerchantId = process.env.PAYME_MERCHANT_ID || 'payme_merchant';
    const paymeUrl = generatePaymePaymentUrl({
      merchantId: paymeMerchantId,
      orderId: order.id,
      amount: planInfo.price,
      callbackUrl: `${appUrl}/pricing?paid=1&order=${order.id}`
    });
    paymentButtons.push([{ text: "🅿️ Payme orqali to'lash", url: paymeUrl }]);

    // Karta orqali to'lov (qo'lda)
    paymentButtons.push([{ text: "🏦 Karta orqali o'tkazma (Chek bilan)", callback_data: `manual_pay_${order.id}` }]);

    // Test muhiti uchun Demo to'lov
    if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_DEMO_AUTH === 'true') {
      paymentButtons.push([{ text: "⚡ Tezkor Sinov To'lovi (Dev)", callback_data: `pay_demo_${order.id}` }]);
    }

    paymentButtons.push([{ text: "⬅️ Boshqa tariflar", callback_data: "view_plans" }]);

    return sendTelegramMessage(botToken, chatId, invoiceText, {
      inline_keyboard: paymentButtons
    });
  }

  // 1.1. Karta orqali qo'lda to'lov ma'lumotlari
  if (data.startsWith('manual_pay_')) {
    const orderId = data.replace('manual_pay_', '');
    const order = getOrder(orderId);
    if (!order) return answerCallbackQuery(botToken, queryId, "Buyurtma topilmadi", true);

    await answerCallbackQuery(botToken, queryId);
    const manualMsg = `🏦 <b>Karta orqali to'lov qilish tartibi:</b>\n\n` +
      `📦 Buyurtma: <code>${order.id}</code>\n` +
      `💰 To'lov summasi: <b>${order.amount.toLocaleString()} so'm</b>\n\n` +
      `💳 <b>Karta raqami:</b> <code>${MANUAL_PAYMENT_CONFIG.cardNumber}</code>\n` +
      `👤 <b>Karta egasi:</b> ${MANUAL_PAYMENT_CONFIG.cardHolder}\n` +
      `🏛 <b>Bank:</b> ${MANUAL_PAYMENT_CONFIG.bankName}\n\n` +
      `📌 <b>Ko'rsatma:</b>\n` +
      `1. Yuqoridagi karta raqamiga aynan <b>${order.amount.toLocaleString()} so'm</b> o'tkazing.\n` +
      `2. To'lov chekining skrinshotini (rasmini) saytga (Tariflar sahifasida chek yuklash tugmasi orqali) yoki to'g'ridan-to'g'ri administratorga yuboring.\n` +
      `3. Administrator to'lovni tasdiqlashi bilan obunangiz avtomatik faollashadi! ✨`;

    return sendTelegramMessage(botToken, chatId, manualMsg, {
      inline_keyboard: [
        [{ text: "🌐 Veb saytda chek yuklash", url: `${appUrl}/pricing` }],
        [{ text: "⬅️ Boshqa tariflar", callback_data: "view_plans" }]
      ]
    });
  }

  // 2. Sinov to'lovini tasdiqlash
  if (data.startsWith('pay_demo_')) {
    const orderId = data.replace('pay_demo_', '');
    const res = completeOrder(orderId, 'demo');

    if (!res.success) {
      return answerCallbackQuery(botToken, queryId, res.message || "To'lovda xatolik", true);
    }

    await answerCallbackQuery(botToken, queryId, "🎉 To'lov qabul qilindi!", true);

    const planInfo = PRICING_PLANS[res.order?.plan || 'pro'];

    const successMsg = `🎉 <b>Tabriklaymiz! Obunangiz faollashtirildi!</b> 🚀\n\n` +
      `Tarif: <b>${planInfo.name}</b>\n` +
      `Amal qilish muddati: <b>${planInfo.durationDays} kun</b>\n\n` +
      `Endi siz uchun barcha imkoniyatlar — Gemini AI test generatsiyasi, 3D Flashcardlar va Test Muharriri to'liq ochiq!\n\n` +
      `Menga HEMIS fayl yuborishingiz yoki saytga kirib yangi imkoniyatlardan foydalanishingiz mumkin!`;

    return sendTelegramMessage(botToken, chatId, successMsg, {
      inline_keyboard: [
        [
          { text: "👤 Shaxsiy hisobim", callback_data: "view_status" }
        ],
        [
          { text: "💎 Barcha tariflar", callback_data: "view_plans" }
        ]
      ]
    });
  }

  // 3. Tariflar ro'yxatini ko'rsatish
  if (data === 'view_plans') {
    await answerCallbackQuery(botToken, queryId);
    return sendPricingMenu(botToken, chatId, appUrl);
  }

  // 4. Shaxsiy hisob holatini ko'rsatish
  if (data === 'view_status') {
    await answerCallbackQuery(botToken, queryId);
    return sendStatusMenu(botToken, chatId, user, appUrl);
  }

  // 5. Kirishni tasdiqlash
  if (data.startsWith('auth_confirm_')) {
    const token = data.replace('auth_confirm_', '');
    const success = authorizeAuthToken(token, user);
    if (success) {
      await answerCallbackQuery(botToken, queryId, "Kirish tasdiqlandi!", true);
      return sendTelegramMessage(botToken, chatId, `✅ <b>Muvaffaqiyatli!</b>\n\nBrauzeringizda QUIZGEN profiliga kirildi.`);
    } else {
      return answerCallbackQuery(botToken, queryId, "Token muddati tugagan", true);
    }
  }

  // 6. Admin: Qo'lda to'lov chekini tasdiqlash
  if (data.startsWith('approve_order_')) {
    const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!adminIds.includes(String(user.id))) {
      return answerCallbackQuery(botToken, queryId, "Kirish huquqi yo'q (Faqat adminlar uchun)", true);
    }
    const orderId = data.replace('approve_order_', '');
    const res = await handleApproveManualPayment(orderId, String(user.id), "Telegram bot orqali tasdiqlandi", botToken);
    if (res.success) {
      await answerCallbackQuery(botToken, queryId, "✅ Buyurtma tasdiqlandi!", true);
      return sendTelegramMessage(botToken, chatId, `✅ <b>Buyurtma ${orderId} muvaffaqiyatli tasdiqlandi!</b> Foydalanuvchiga obuna ochildi.`);
    } else {
      return answerCallbackQuery(botToken, queryId, `❌ Xatolik: ${res.message}`, true);
    }
  }

  // 7. Admin: Qo'lda to'lov chekini rad etish
  if (data.startsWith('reject_order_')) {
    const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!adminIds.includes(String(user.id))) {
      return answerCallbackQuery(botToken, queryId, "Kirish huquqi yo'q", true);
    }
    const orderId = data.replace('reject_order_', '');
    const res = await handleRejectManualPayment(orderId, String(user.id), "Chekdagi summa mos kelmadi yoki to'lov tasdiqlanmadi", botToken);
    if (res.success) {
      await answerCallbackQuery(botToken, queryId, "Buyurtma rad etildi", true);
      return sendTelegramMessage(botToken, chatId, `❌ <b>Buyurtma ${orderId} rad etildi.</b> Foydalanuvchiga bildirishnoma yuborildi.`);
    } else {
      return answerCallbackQuery(botToken, queryId, `❌ Xatolik: ${res.message}`, true);
    }
  }

  await answerCallbackQuery(botToken, queryId);
}

function sendPricingMenu(botToken: string, chatId: number | string, appUrl: string) {
  const text = `💎 <b>QUIZGEN Premium Tariflari</b>\n\n` +
    `Sessiyani a'lo baholarga yopish va testlarga eng qulay tayyorlanish uchun tarifni tanlang:\n\n` +
    `🥉 <b>1. Talaba Start</b> — <b>7 999 so'm</b> (7 kun)\n` +
    `• Oraliq va yakuniy nazorat haftaligi uchun\n` +
    `• Cheksiz HEMIS Word yuklash + Kuniga 10 ta AI test\n\n` +
    `🥈 <b>2. Sessiya Pro</b> — <b>29 999 so'm</b> (30 kun / 1 oy) 🔥\n` +
    `• To'liq sessiya davri uchun eng zo'r tanlov\n` +
    `• Cheksiz HEMIS + Kuniga 50 ta AI test + 3D Flashcards + Test Muharriri (Editor)\n\n` +
    `🥇 <b>3. Grand Master</b> — <b>59 900 so'm</b> (90 kun / 1 semestr) 👑\n` +
    `• Repetitor, o'qituvchi va a'lochi talabalar uchun\n` +
    `• Mutlaqo CHEKSIZ AI testlar + Guruhlarga havola ulashish + Barcha formatda eksport\n\n` +
    `Kerakli tarifni tanlash uchun pastdagi tugmani bosing: 👇`;

  return sendTelegramMessage(botToken, chatId, text, {
    inline_keyboard: [
      [
        { text: "🥉 Talaba Start — 7 999 so'm", callback_data: "buy_plan_start" }
      ],
      [
        { text: "🥈 Sessiya Pro — 29 999 so'm 🔥", callback_data: "buy_plan_pro" }
      ],
      [
        { text: "🥇 Grand Master — 59 900 so'm 👑", callback_data: "buy_plan_master" }
      ],
      [
        { text: "👤 Mening hisobim", callback_data: "view_status" }
      ]
    ]
  });
}

function sendStatusMenu(botToken: string, chatId: number | string, user: any, appUrl: string) {
  const effective = getEffectiveEntitlements(String(user?.id || chatId));
  const planName = effective.plan === 'master' ? '🥇 Grand Master' : effective.plan === 'pro' ? '🥈 Sessiya Pro' : effective.plan === 'start' ? '🥉 Talaba Start' : 'Oddiy (Bepul)';
  const safeFirstName = escapeHtml(user?.first_name || 'Foydalanuvchi');

  const statusText = `👤 <b>Sizning profilingiz:</b>\n\n` +
    `Ism: <b>${safeFirstName}</b>\n` +
    `Telegram ID: <code>${user?.id || chatId}</code>\n` +
    `Tarif: <b>${planName}</b>\n` +
    `Holati: <b>${effective.is_active ? '✅ Faol' : 'Oddiy rejim'}</b>\n` +
    (effective.is_active ? `Qolgan vaqt: <b>${effective.days_left} kun</b>\n` : '') +
    `Bugungi AI testlar: <b>${effective.ai_today} / ${effective.entitlements.ai_daily_limit === 99999 || effective.entitlements.ai_daily_limit === 300 ? 'Cheksiz' : effective.entitlements.ai_daily_limit} ta</b>\n` +
    `Test Muharriri (Editor): <b>${effective.entitlements.editor ? '✅ Ochiq' : '🔒 Pro tarifda'}</b>\n` +
    `3D Flashcardlar: <b>${effective.entitlements.flashcards ? '✅ Ochiq' : '🔒 Pro tarifda'}</b>\n` +
    `HEMIS test yuklash: <b>Cheksiz (100% bepul)</b>\n\n` +
    `Tarifni oshirish yoki faollashtirish uchun pastdagi tugmani bosing:`;

  return sendTelegramMessage(botToken, chatId, statusText, {
    inline_keyboard: [
      [
        { text: "💎 Premium Tariflar (7 999 so'mdan)", callback_data: "view_plans" }
      ]
    ]
  });
}

async function handleInlineQuery(botToken: string, appUrl: string, inlineQuery: any) {
  const query = (inlineQuery.query || '').trim();
  const results = searchPublicQuizzes({ q: query, limit: 10 });
  const articles = results.map((quiz: any) => ({
    type: 'article',
    id: quiz.id,
    title: quiz.title,
    description: `${quiz.questions_count || 0} ta savol • ${quiz.category || 'Umumiy'} • ${quiz.views_count || 0} ko'rish`,
    input_message_content: {
      message_text: `📚 <b>${escapeHtml(quiz.title)}</b>\n\n` +
        `📂 Kategoriya: <b>${escapeHtml(quiz.category || 'Umumiy')}</b>\n` +
        `❓ Savollar soni: <b>${quiz.questions_count || 0} ta</b>\n` +
        `👁 Ko'rishlar: <b>${quiz.views_count || 0}</b>\n\n` +
        `Testni yechish uchun quyidagi tugmani bosing:`,
      parse_mode: 'HTML'
    },
    reply_markup: {
      inline_keyboard: [
        [
          { text: "▶️ Testni boshlash", url: `${appUrl}/quiz/${quiz.id}` }
        ]
      ]
    }
  }));

  await answerInlineQuery(botToken, inlineQuery.id, articles);
}

async function handleBotMessage(botToken: string, appUrl: string, msg: any) {
  const chatId = msg.chat?.id;
  if (!chatId) return;

  const user = msg.from;
  if (user) {
    upsertUser({
      id: String(user.id),
      first_name: user.first_name || 'Foydalanuvchi',
      last_name: user.last_name,
      username: user.username,
      role: 'student'
    });
  }

  const rawText = (msg.text || '').trim();

  // 1. SAYTGA KIRISH TOKENINI ANIQLASH:
  // Foydalanuvchi quyidagilardan birini yuborgan bo'lishi mumkin:
  // a) /start login_ABCDEFGH
  // b) login_ABCDEFGH
  // c) ABCDEFGH (saytda ko'rsatilgan 8 xonali kod)
  // d) /login ABCDEFGH
  let tokenCandidate = '';
  if (rawText.startsWith('/start login_')) {
    tokenCandidate = rawText.replace('/start login_', '').trim();
  } else if (rawText.startsWith('login_')) {
    tokenCandidate = rawText.replace('login_', '').trim();
  } else if (rawText.startsWith('/login ')) {
    tokenCandidate = rawText.replace('/login ', '').trim();
  } else if (/^[A-Z0-9]{8}$/i.test(rawText)) {
    tokenCandidate = rawText.toUpperCase();
  }

  if (tokenCandidate) {
    const success = authorizeAuthToken(tokenCandidate, user);
    if (success) {
      console.log(`[Telegram Auth] Token tasdiqlandi (User: ${user?.first_name}, ID: ${user?.id})`);
      // S12 — HTML escape
      const safeName = escapeHtml(user?.first_name || 'Foydalanuvchi');
      const confirmMsg = `✅ <b>Kirish muvaffaqiyatli tasdiqlandi!</b>\n\n` +
        `Hurmatli <b>${safeName}</b>, brauzeringizdagi QUIZGEN saytiga kirish tasdiqlandi.\n\n` +
        `Brauzer oynasiga qaytishingiz mumkin! Sayt avtomatik ravishda ochiladi. 🚀`;

      return sendTelegramMessage(botToken, chatId, confirmMsg);
    } else {
      return sendTelegramMessage(
        botToken, 
        chatId, 
        `⚠️ <b>Kirish kodi yaroqsiz yoki muddati tugagan.</b>\n\nIltimos, saytdan yangi kirish tugmasini bosing va yangi kodni yuboring.`
      );
    }
  }

  // 2. Quiz Deep-link: /start quiz_<slugOrId> yoki /start q_<slugOrId>
  if (rawText.startsWith('/start quiz_') || rawText.startsWith('/start q_')) {
    const param = rawText.replace(/^\/start\s+(quiz_|q_)/, '').trim();
    const quiz = getQuizBySlug(param) || getQuiz(param);
    if (quiz) {
      const safeTitle = escapeHtml(quiz.title);
      const cat = escapeHtml(quiz.category || 'Umumiy');
      const qCount = quiz.questions_count || 0;
      const isHttps = appUrl.startsWith('https://');
      const keyboard: any[] = [];
      if (isHttps) {
        keyboard.push([{ text: "▶️ Testni boshlash (TMA)", web_app: { url: `${appUrl}/quiz/${quiz.id}` } }]);
      } else {
        keyboard.push([{ text: "▶️ Testni boshlash", url: `${appUrl}/quiz/${quiz.id}` }]);
      }
      keyboard.push([{ text: "🎴 Flashcardlar", url: `${appUrl}/flashcards/${quiz.id}` }]);

      return sendTelegramMessage(botToken, chatId,
        `📚 <b>${safeTitle}</b>\n\n` +
        `📂 Kategoriya: <b>${cat}</b>\n` +
        `❓ Savollar soni: <b>${qCount} ta</b>\n` +
        `👁 Ko'rishlar: <b>${quiz.views_count || 0}</b>\n\n` +
        `Testni yechish uchun pastdagi tugmani bosing:`,
        { inline_keyboard: keyboard }
      );
    } else {
      return sendTelegramMessage(botToken, chatId, "⚠️ Kechirasiz, bunday test topilmadi yoki u o'chirilgan.");
    }
  }

  // 3. /start buyrug'i (oddiy)
  if (rawText === '/start' || rawText.startsWith('/start')) {
    // S12 — HTML escape
    const safeName = escapeHtml(user?.first_name || 'Hurmatli foydalanuvchi');
    const welcome = `Assalomu alaykum, <b>${safeName}</b>! 👋\n\n` +
      `<b>QUIZGEN — HEMIS va AI Test Platformasi</b>ga xush kelibsiz!\n\n` +
      `📌 <b>Asosiy buyruqlar va imkoniyatlar:</b>\n` +
      `• 💎 /premium — Obuna tariflari (7 999 so'mdan)\n` +
      `• 👤 /status — Profilingiz va kunlik limitlar\n` +
      `• 📄 Menga HEMIS Word (<b>.docx</b>) yoki (<b>.txt</b>) test faylini yuboring — soniyalarda bepul testga aylantiraman!\n\n` +
      `Kerakli bo'limni tanlang: 👇`;

    const isHttps = appUrl.startsWith('https://');
    const buttons: any[] = [
      [
        { text: "💎 Premium Tariflar (7 999 so'mdan)", callback_data: "view_plans" }
      ],
      [
        { text: "👤 Mening Hisobim va Limitlar", callback_data: "view_status" }
      ]
    ];

    if (isHttps) {
      buttons.unshift([
        { text: "🎮 Ilovani Ochish (TMA)", web_app: { url: appUrl } }
      ]);
    }

    return sendTelegramMessage(botToken, chatId, welcome, {
      inline_keyboard: buttons
    });
  }

  // 3. /premium yoki /tariflar buyrug'i
  if (rawText.startsWith('/premium') || rawText.startsWith('/tariflar') || rawText === '💎 Premium') {
    return sendPricingMenu(botToken, chatId, appUrl);
  }

  // 4. /status yoki /profil buyrug'i
  if (rawText.startsWith('/status') || rawText.startsWith('/profil')) {
    return sendStatusMenu(botToken, chatId, user, appUrl);
  }

  // 4.1. Admin buyruqlari (/admin, /stats, /grant, /revoke)
  const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(s => s.trim()).filter(Boolean);
  const isAdmin = adminIds.includes(String(user?.id || chatId));

  if (isAdmin) {
    if (rawText === '/admin') {
      const adminText = `👑 <b>QUIZGEN Administrator Paneli</b>\n\n` +
        `Siz tizim administratori sifatida tanildingiz.\n\n` +
        `Mavjud buyruqlar:\n` +
        `• /stats — Umumiy platforma statistikasi\n` +
        `• /grant &lt;userId&gt; &lt;start|pro|master&gt; [kun] — Obuna berish\n` +
        `• /revoke &lt;userId&gt; — Obunani bekor qilish`;
      return sendTelegramMessage(botToken, chatId, adminText, {
        inline_keyboard: [
          [{ text: "📊 Statistikani ko'rish", callback_data: "admin_stats" }],
          [{ text: "🌐 Veb Admin Panel", url: `${appUrl}/admin` }]
        ]
      });
    }

    if (rawText === '/stats') {
      const stats = getAdminStats();
      const statsMsg = `📊 <b>QUIZGEN Tizim Statistikasi:</b>\n\n` +
        `👥 Foydalanuvchilar: <b>${stats.totalUsers} ta</b>\n` +
        `📖 Yaratilgan testlar: <b>${stats.totalQuizzes} ta</b>\n` +
        `🎯 Urinishlar soni: <b>${stats.totalAttempts} ta</b>\n` +
        `🧾 Buyurtmalar: <b>${stats.totalOrders} ta</b>\n` +
        `💰 Jami daromad: <b>${stats.totalRevenue.toLocaleString()} so'm</b>\n\n` +
        `💎 <b>Faol obunalar:</b>\n` +
        `• Start: <b>${stats.activeSubscriptions.start} ta</b>\n` +
        `• Pro: <b>${stats.activeSubscriptions.pro} ta</b>\n` +
        `• Master: <b>${stats.activeSubscriptions.master} ta</b>`;
      return sendTelegramMessage(botToken, chatId, statsMsg);
    }

    if (rawText.startsWith('/grant')) {
      const parts = rawText.split(/\s+/);
      const targetUserId = parts[1];
      const targetPlan = (parts[2] || 'pro').toLowerCase() as 'start' | 'pro' | 'master';
      const days = parseInt(parts[3]) || (PRICING_PLANS[targetPlan]?.durationDays || 30);

      if (!targetUserId || !['start', 'pro', 'master'].includes(targetPlan)) {
        return sendTelegramMessage(botToken, chatId, "⚠️ Noto'g'ri format. Namunalar:\n<code>/grant 123456789 pro 30</code>\n<code>/grant 123456789 master 90</code>");
      }

      const res = activateSubscription(targetUserId, targetPlan, {
        source: 'admin_grant',
        grantedBy: String(user?.id || chatId),
        customDays: days
      });

      if (res.success) {
        addAuditLog(String(user?.id || chatId), 'grant_via_bot', 'user', targetUserId, { plan: targetPlan, days });
        const planName = PRICING_PLANS[targetPlan].name;
        sendTelegramMessage(botToken, targetUserId, `🎁 <b>Xushxabar!</b> Administrator sizga <b>${planName}</b> tarifini <b>${days} kunga</b> taqdim etdi!`);
        return sendTelegramMessage(botToken, chatId, `✅ <b>Muvaffaqiyatli!</b>\nFoydalanuvchi <code>${targetUserId}</code> ga <b>${planName}</b> tarifi (${days} kun) berildi.`);
      } else {
        return sendTelegramMessage(botToken, chatId, `❌ Xatolik: ${res.message}`);
      }
    }

    if (rawText.startsWith('/revoke')) {
      const parts = rawText.split(/\s+/);
      const targetUserId = parts[1];
      if (!targetUserId) {
        return sendTelegramMessage(botToken, chatId, "⚠️ Format: <code>/revoke 123456789</code>");
      }
      cancelUserSubscription(targetUserId, "Bot orqali admin bekor qildi");
      clearEntitlementsCache(targetUserId);
      addAuditLog(String(user?.id || chatId), 'revoke_via_bot', 'user', targetUserId);
      return sendTelegramMessage(botToken, chatId, `✅ Foydalanuvchi <code>${targetUserId}</code> obunasi bekor qilindi.`);
    }
  }

  // 5. Foydalanuvchi hujjat (fayl) yuborganida — M4: Yagona QuizCreationService
  if (msg.document) {
    const doc = msg.document;
    const fileName = doc.file_name || 'hujjat';
    const ext = (fileName.split('.').pop() || '').toLowerCase();

    if (!['docx', 'pdf', 'txt'].includes(ext)) {
      return sendTelegramMessage(
        botToken,
        chatId,
        `⚠️ Kechirasiz, faqat Word (<b>.docx</b>), PDF (<b>.pdf</b>) yoki Matn (<b>.txt</b>) formatidagi test fayllarini qabul qila olaman.`
      );
    }

    await sendTelegramMessage(botToken, chatId, `⏳ <i>"${escapeHtml(fileName)}"</i> fayli qabul qilindi, tahlil qilinmoqda...`);

    const fileBuf = await downloadTelegramFile(botToken, doc.file_id);
    if (!fileBuf) {
      return sendTelegramMessage(botToken, chatId, `❌ Faylni yuklab olishda xatolik yuz berdi.`);
    }

    try {
      const result = await QuizCreationService.createFromFile({
        buffer: fileBuf,
        fileName,
        userId: String(user?.id || chatId)
      });

      if (result.success && result.quiz) {
        const quiz = result.quiz;
        const report = result.report;
        const quizUrl = `${appUrl}/quiz/${quiz.id}`;
        const editorUrl = `${appUrl}/editor/${quiz.id}`;
        const flashcardUrl = `${appUrl}/flashcards/${quiz.id}`;

        let reply = `✅ <b>HEMIS Test Muvaffaqiyatli Tayyorlandi!</b> 🎯\n\n` +
          `📖 <b>Mavzu:</b> ${escapeHtml(quiz.title)}\n` +
          `❓ <b>Savollar soni:</b> ${quiz.total_questions} ta\n` +
          `⏱ <b>Tavsiya etilgan vaqt:</b> ${quiz.time_limit_minutes} daqiqa\n` +
          `⚙️ <b>Tahlil turi:</b> ${report.formatType?.toUpperCase() || 'HEMIS'} (0 AI sarfi, 100% aniq)\n`;

        if (report.needsReviewCount > 0) {
          reply += `\n⚠️ <i>Eslatma: ${report.needsReviewCount} ta savolda to'g'ri javob belgisi noaniq bo'lgani sababli birinchi variant olindi.</i>\n`;
        }

        reply += `\nQuyidagi tugmalar orqali darhol testni yechishni boshlang: 👇`;

        return sendTelegramMessage(botToken, chatId, reply, {
          inline_keyboard: [
            [
              { text: "▶️ Testni Yechish", web_app: { url: quizUrl } }
            ],
            [
              { text: "🃏 3D Flashcardlar", web_app: { url: flashcardUrl } },
              { text: "✏️ Muharrir", web_app: { url: editorUrl } }
            ],
            [
              { text: "💎 Premium Tariflar", callback_data: "view_plans" },
              { text: "👤 Profilim", callback_data: "view_status" }
            ]
          ]
        });
      } else {
        return sendTelegramMessage(
          botToken,
          chatId,
          `⚠️ ${result.message || "Hujjatda HEMIS test shabloni topilmadi."}\n\n` +
          `Iltimos, fayl <code>++++</code> va <code>====</code> yoki <code>1. Savol... A) B) C)</code> formatida ekanligiga ishonch hosil qiling.`
        );
      }
    } catch (createErr: any) {
      return sendTelegramMessage(botToken, chatId, `❌ Faylni tahlil qilishda xatolik: ${escapeHtml(createErr.message)}`);
    }
  }

  // 5.1. Foydalanuvchi matn orqali HEMIS test yuborgan bo'lsa
  if (rawText && (rawText.includes('++++') || (/(?:^\s*\d+[\.\)]|^\s*\d+\-savol)/m.test(rawText) && /^[#*+]?[A-DА-Д][\.\)]\s+/m.test(rawText)))) {
    const textResult = QuizCreationService.createFromText({
      text: rawText,
      userId: String(user?.id || chatId),
      title: "Telegram Matn Testi"
    });

    if (textResult.success && textResult.quiz) {
      const quiz = textResult.quiz;
      const quizUrl = `${appUrl}/quiz/${quiz.id}`;
      const reply = `✅ <b>Matndan ${quiz.total_questions} ta savolli test yaratildi!</b> 🎯\n\n` +
        `Quyidagi tugma orqali darhol boshlashingiz mumkin:`;
      return sendTelegramMessage(botToken, chatId, reply, {
        inline_keyboard: [
          [{ text: "▶️ Testni Yechish (TMA)", web_app: { url: quizUrl } }]
        ]
      });
    }
  }

  // 6. Yordam xabari
  sendTelegramMessage(
    botToken,
    chatId,
    `Savollaringiz bormi? Quyidagi buyruqlardan foydalaning:\n` +
    `• /start — Bosh menyu\n` +
    `• /premium — Tariflar va obuna\n` +
    `• /status — Shaxsiy hisob holati\n\n` +
    `Yoki HEMIS test Word (<b>.docx</b>) faylini shu yerga yuboring!`
  );
}
