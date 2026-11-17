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
  getUserSubscription 
} from '../lib/db.ts';
import { escapeHtml, generateId } from '../lib/security.ts';
import { getEffectiveEntitlements } from '../lib/entitlements.ts';

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
      paymentMethod: 'demo'
    });

    await answerCallbackQuery(botToken, queryId);

    const invoiceText = `🧾 <b>Buyurtma rasmiylashtirildi!</b>\n\n` +
      `🆔 Buyurtma raqami: <code>${order.id}</code>\n` +
      `💎 Tarif: <b>${planInfo.name}</b> (${planInfo.subtitle})\n` +
      `⏳ Muddati: <b>${planInfo.durationDays} kun</b>\n` +
      `💰 To'lov summasi: <b>${planInfo.priceFormatted}</b>\n\n` +
      `📌 <i>Tarif imkoniyatlari:</i>\n` +
      planInfo.features.map(f => `• ${f}`).join('\n') + `\n\n` +
      `To'lovni amalga oshirish uchun quyidagi tugmani bosing:`;

    return sendTelegramMessage(botToken, chatId, invoiceText, {
      inline_keyboard: [
        [
          { text: "⚡ To'lovni Tasdiqlash (Faollashtirish)", callback_data: `pay_demo_${order.id}` }
        ],
        [
          { text: "⬅️ Boshqa tariflar", callback_data: "view_plans" }
        ]
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

  // 2. /start buyrug'i (oddiy)
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

  // 5. Foydalanuvchi hujjat (fayl) yuborganida
  if (msg.document) {
    const doc = msg.document;
    const fileName = doc.file_name || 'hujjat';
    const isDocx = fileName.endsWith('.docx');
    const isTxt = fileName.endsWith('.txt');

    if (!isDocx && !isTxt) {
      return sendTelegramMessage(
        botToken,
        chatId,
        `⚠️ Kechirasiz, faqat Word (<b>.docx</b>) yoki Matn (<b>.txt</b>) formatidagi test fayllarini qabul qila olaman.`
      );
    }

    await sendTelegramMessage(botToken, chatId, `⏳ <i>"${fileName}"</i> fayli qabul qilindi, tahlil qilinmoqda...`);

    const fileBuf = await downloadTelegramFile(botToken, doc.file_id);
    if (!fileBuf) {
      return sendTelegramMessage(botToken, chatId, `❌ Faylni yuklab olishda xatolik yuz berdi.`);
    }

    let extractedText = '';
    if (isDocx) {
      const data = await mammoth.extractRawText({ buffer: fileBuf });
      extractedText = data.value || '';
    } else {
      extractedText = fileBuf.toString('utf8');
    }

    const hemisResult = parseHemisQuiz(extractedText);

    if (hemisResult.isHemis && hemisResult.questions.length > 0) {
      // S7 — UUID ishlatamiz (Math.random emas)
      const quizId = generateId();
      const safeTitle = escapeHtml(fileName.replace(/\.[^/.]+$/, ""));
      const newQuiz = createQuiz({
        id: quizId,
        user_id: String(user?.id || chatId),
        title: safeTitle,
        source_type: 'hemis',
        total_questions: hemisResult.questions.length,
        time_limit_minutes: 0,
        is_public: 1
      }, hemisResult.questions);

      const reply = `✅ <b>HEMIS Test Muvaffaqiyatli Tayyorlandi!</b>\n\n` +
        `📖 <b>Mavzu:</b> ${newQuiz.title}\n` +
        `❓ <b>Savollar soni:</b> ${hemisResult.questions.length} ta\n` +
        `⚙️ <b>Tahlil turi:</b> HEMIS shabloni (0 AI sarfi, 100% aniq)\n\n` +
        `Test tizimda saqlandi. Saytga kiring va testni ishlang!`;

      return sendTelegramMessage(botToken, chatId, reply, {
        inline_keyboard: [
          [
            { text: "💎 Premium Tariflar", callback_data: "view_plans" }
          ],
          [
            { text: "👤 Shaxsiy hisob", callback_data: "view_status" }
          ]
        ]
      });
    } else {
      return sendTelegramMessage(
        botToken,
        chatId,
        `⚠️ Hujjatda HEMIS test shabloni topilmadi.\n` +
        `Iltimos, fayl <code>++++</code> va <code>====</code> yoki <code>1. Savol... A) B) C)</code> formatida ekanligiga ishonch hosil qiling.`
      );
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
