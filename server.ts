/**
 * QUIZGEN v3 — Server (M0 xavfsizlik bosqichi)
 * 
 * M0 da hal qilingan xavfsizlik muammolari:
 * S2  — JWT server sessiyasi (userId hech qachon so'rovdan olinmaydi)
 * S3  — Demo auth faqat ENABLE_DEMO_AUTH=true && NODE_ENV!==production da
 * S4  — pay-demo faqat test muhitida
 * S5  — completeOrder ikki marta chaqirilsa bloklanadi
 * S6  — AI kvota req.user.uid dan (body dan emas)
 * S7  — Kriptorafik xavfsiz login token (crypto.randomBytes)
 * S8  — TMA initData HMAC tekshiruvi serverda
 * S9  — TMA da localStorage eski foydalanuvchi tozalanadi (client tomonda)
 * S10 — To'g'ri javoblar klientga yuborilmaydi (quiz GET da correctAnswer yo'q)
 * S11 — Quiz GET/PUT/DELETE da egalilik tekshiruvi
 * S12 — Telegram xabarlarida HTML escape
 * S13 — helmet, rate-limit, CORS, magic-bytes
 * S14 — Production da express.static faqat dist/ ni ko'rsatadi
 */

import express from 'express';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import mammoth from 'mammoth';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import { parseHemisQuiz } from './src/lib/hemis-parser.ts';
import { verifyTelegramWidgetAuth, verifyTelegramWebAppData } from './src/lib/telegram-auth.ts';
import { 
  initDatabase, 
  upsertUser, 
  createQuiz, 
  getQuiz, 
  getUserQuizzes, 
  getPublicQuizzes, 
  updateQuiz, 
  deleteQuiz, 
  saveAttempt, 
  getAttempt, 
  getUserAttempts,
  createAttempt,
  getActiveAttempt,
  updateAttemptAnswers,
  finishAttempt,
  getUserStats,
  getQuizLeaderboard,
  updateUserGamification,
  getQuizQuestions,
  PRICING_PLANS,
  createOrder,
  getOrder,
  completeOrder,
  getUserOrders,
  getUserSubscription,
  canGenerateAiTest,
  recordAiTest,
  createAuthToken,
  getAuthToken,
  authorizeAuthToken,
  getUser,
  getPlanLevel,
  getAdminStats,
  searchUsers,
  getAllSubscriptions,
  getAllOrders,
  addAuditLog,
  getAuditLogs,
  cancelUserSubscription
} from './src/lib/db.ts';
import { startTelegramBot, sendTelegramMessage } from './src/services/telegram-bot.ts';
import { 
  createAccessToken, 
  createRefreshToken, 
  verifyRefreshToken,
  requireAuth,
  optionalAuth,
  requireAdmin
} from './src/middleware/auth.ts';
import { 
  escapeHtml, 
  generateSecureToken, 
  generateId, 
  checkFileMagicBytes,
  sanitizeString
} from './src/lib/security.ts';
import {
  getEffectiveEntitlements,
  requireFeature,
  requireAiQuota,
  checkAndExpireSubscriptions,
  activateSubscription
} from './src/lib/entitlements.ts';
import { 
  handleClickPrepare, 
  handleClickComplete, 
  generateClickPaymentUrl 
} from './src/services/payments/click.ts';
import { 
  handlePaymeRpc, 
  verifyPaymeAuth, 
  generatePaymePaymentUrl 
} from './src/services/payments/payme.ts';
import { 
  MANUAL_PAYMENT_CONFIG, 
  notifyAdminsNewPaymentProof, 
  handleApproveManualPayment, 
  handleRejectManualPayment 
} from './src/services/payments/manual.ts';
import { submitOrderProof } from './src/lib/db.ts';
import { QuizCreationService } from './src/services/quiz-creation.service.ts';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// S13 — multer: file size limit va storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// === FAYL MATNINI AJRATIB OLISH ===
async function extractTextFromFile(file: Express.Multer.File): Promise<string> {
  // S13 — Magic bytes tekshiruvi
  const ext = file.originalname.split('.').pop() || '';
  const isValidMagic = checkFileMagicBytes(file.buffer, ext);
  if (!isValidMagic) {
    throw new Error(`Fayl turi mos kelmaydi. Faqat .docx, .pdf, .txt fayllar qabul qilinadi.`);
  }

  let text = '';

  if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
    try {
      const pdfParseModule = require('pdf-parse');
      if (typeof pdfParseModule === 'function') {
        const data = await pdfParseModule(file.buffer);
        text = data.text || '';
      } else if (pdfParseModule.PDFParse) {
        const parser = new pdfParseModule.PDFParse({ data: file.buffer });
        const data = await parser.getText();
        text = data.text || '';
      }
    } catch (pdfErr: any) {
      console.warn("PDF parsing failed:", pdfErr.message);
      throw new Error(`PDF faylini o'qishda xatolik: ${pdfErr.message}`);
    }
  } else if (
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
    file.originalname.endsWith('.docx')
  ) {
    const data = await mammoth.extractRawText({ buffer: file.buffer });
    text = data.value || '';
  } else if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
    text = file.buffer.toString('utf8');
  } else {
    throw new Error("Qo'llab-quvvatlanmaydigan fayl formati. Iltimos, Word (.docx), PDF (.pdf) yoki Matn (.txt) fayl yuklang.");
  }

  return text;
}

// === SERVER ISHGA TUSHIRISH ===
async function startServer() {
  // Ma'lumotlar bazasini ishga tushirish
  initDatabase();

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
  const isDev = process.env.NODE_ENV !== 'production';

  // === S13 — Helmet (HTTP xavfsizlik sarlavhalari) ===
  app.use(helmet({
    contentSecurityPolicy: isDev ? false : {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://telegram.org"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://api.telegram.org"],
        frameSrc: ["'none'"],
      }
    },
    crossOriginEmbedderPolicy: false,
  }));

  // === S13 — CORS ===
  app.use((req, res, next) => {
    const allowedOrigins = [
      `http://localhost:${PORT}`,
      APP_URL,
      'https://telegram.org'
    ];
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else if (isDev) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // === S13 — Rate Limiting ===
  const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 soat
    max: 20,
    message: { error: "Juda ko'p urinish. 1 soatdan keyin qayta urinib ko'ring." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 daqiqa
    max: 5,
    message: { error: "Juda ko'p AI so'rov. Biroz kuting." },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.uid || req.ip || 'unknown',
  });

  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/', generalLimiter);

  // === Gemini AI ===
  let geminiAi: GoogleGenAI | null = null;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    geminiAi = new GoogleGenAI({ apiKey: geminiApiKey });
    console.log("Google Gemini API muvaffaqiyatli ulandi.");
  } else {
    console.warn("GEMINI_API_KEY topilmadi. HEMIS testlari ishlashda davom etadi.");
  }

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const telegramBotUsername = process.env.TELEGRAM_BOT_USERNAME || 'quizgenrobot';
  const adminIds = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').filter(Boolean);

  // Telegram Bot ishga tushirish
  if (telegramBotToken) {
    startTelegramBot(telegramBotToken, APP_URL);
  }

  // ===================================================
  // 1. TIZIM KONFIGURATSIYASI (ochiq endpoint)
  // ===================================================
  app.get('/api/config', (req, res) => {
    res.json({
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      hasTelegramBot: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      telegramBotUsername,
      appUrl: APP_URL
    });
  });

  // ===================================================
  // 2. AUTENTIFIKATSIYA (Auth)
  // ===================================================

  // 2.1 — TMA initData server tekshiruvi (S8 fix)
  app.post('/api/auth/tma', authLimiter, async (req, res) => {
    try {
      const { initData } = req.body;
      if (!initData || typeof initData !== 'string') {
        return res.status(400).json({ error: "initData talab qilinadi." });
      }

      if (!telegramBotToken) {
        return res.status(503).json({ error: "Bot sozlanmagan." });
      }

      // S8 — Serverda HMAC tekshiruvi
      const verification = verifyTelegramWebAppData(initData, telegramBotToken);
      if (!verification.valid || !verification.user) {
        return res.status(401).json({ error: "Telegram WebApp ma'lumotlari haqiqiy emas." });
      }

      // auth_date tekshiruvi (24 soatdan eski bo'lmasin) — S8
      const urlParams = new URLSearchParams(initData);
      const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
      const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
      if (ageSeconds > 86400) {
        return res.status(401).json({ error: "Telegram sessiyasi eskirgan. Telegram ilovasini qayta oching." });
      }

      const tgUser = verification.user;
      const isAdmin = adminIds.includes(String(tgUser.id));

      const user = upsertUser({
        id: String(tgUser.id),
        first_name: tgUser.first_name,
        last_name: tgUser.last_name,
        username: tgUser.username,
        photo_url: tgUser.photo_url,
        role: isAdmin ? 'admin' : 'student'
      });

      const sub = getUserSubscription(String(tgUser.id));
      const accessToken = createAccessToken({
        uid: user.id,
        role: isAdmin ? 'admin' : 'student',
        plan: (sub.plan as any) || 'free'
      });
      const refreshToken = createRefreshToken(user.id);

      // S2 — Refresh token httpOnly cookie da saqlanadi
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: !isDev,
        sameSite: isDev ? 'lax' : 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 kun
      });

      return res.json({ 
        success: true, 
        user: {
          uid: user.id,
          displayName: [user.first_name, user.last_name].filter(Boolean).join(' '),
          username: user.username,
          photoURL: user.photo_url,
          role: isAdmin ? 'admin' : (user.role || 'student'),
          streak_days: user.streak_days || 0,
          xp: user.xp || 0,
          authType: 'tma'
        },
        accessToken,
        subscription: sub
      });
    } catch (err: any) {
      console.error("TMA auth error:", err);
      res.status(500).json({ error: err.message || "TMA autentifikatsiyada xatolik" });
    }
  });

  // 2.2 — Telegram Widget auth
  app.post('/api/auth/telegram-widget', authLimiter, (req, res) => {
    try {
      const { widgetData } = req.body;
      if (!widgetData) {
        return res.status(400).json({ error: "widgetData talab qilinadi." });
      }

      if (telegramBotToken) {
        const isValid = verifyTelegramWidgetAuth(widgetData, telegramBotToken);
        if (!isValid) {
          return res.status(401).json({ error: "Telegram widget imzosi mos kelmadi." });
        }
      }

      const isAdmin = adminIds.includes(String(widgetData.id));
      const user = upsertUser({
        id: String(widgetData.id),
        first_name: widgetData.first_name,
        last_name: widgetData.last_name,
        username: widgetData.username,
        photo_url: widgetData.photo_url,
        role: isAdmin ? 'admin' : 'student'
      });

      const sub = getUserSubscription(user.id);
      const accessToken = createAccessToken({
        uid: user.id,
        role: isAdmin ? 'admin' : 'student',
        plan: (sub.plan as any) || 'free'
      });
      const refreshToken = createRefreshToken(user.id);

      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: !isDev,
        sameSite: isDev ? 'lax' : 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      return res.json({ 
        success: true,
        user: {
          uid: user.id,
          displayName: [user.first_name, user.last_name].filter(Boolean).join(' '),
          username: user.username,
          photoURL: user.photo_url,
          role: isAdmin ? 'admin' : (user.role || 'student'),
          streak_days: user.streak_days || 0,
          xp: user.xp || 0,
          authType: 'widget'
        },
        accessToken,
        subscription: sub
      });
    } catch (err: any) {
      console.error("Widget auth error:", err);
      res.status(500).json({ error: err.message || "Autentifikatsiyada xatolik" });
    }
  });

  // 2.3 — Token yangilash (Refresh)
  app.post('/api/auth/refresh', (req, res) => {
    try {
      const refreshToken = req.cookies?.refresh_token;
      if (!refreshToken) {
        return res.status(401).json({ error: "Refresh token topilmadi." });
      }

      const payload = verifyRefreshToken(refreshToken);
      if (!payload) {
        res.clearCookie('refresh_token');
        return res.status(401).json({ error: "Refresh token yaroqsiz." });
      }

      const user = getUser(payload.uid);
      if (!user) {
        res.clearCookie('refresh_token');
        return res.status(401).json({ error: "Foydalanuvchi topilmadi." });
      }

      const isAdmin = adminIds.includes(String(user.id));
      const role = isAdmin ? 'admin' : ((user.role as any) || 'student');
      const sub = getUserSubscription(user.id);
      const newAccessToken = createAccessToken({
        uid: user.id,
        role,
        plan: (sub.plan as any) || 'free'
      });

      res.json({ success: true, accessToken: newAccessToken, subscription: sub, role });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2.4 — Chiqish (Logout)
  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('refresh_token');
    res.json({ success: true });
  });

  // 2.5 — Demo auth (S3 fix — faqat test muhitida)
  if (isDev && process.env.ENABLE_DEMO_AUTH === 'true') {
    app.post('/api/auth/demo', authLimiter, (req, res) => {
      const demoId = 'demo_' + generateId().substring(0, 8);
      const user = upsertUser({
        id: demoId,
        first_name: 'Demo Foydalanuvchi',
        role: 'student'
      });
      const accessToken = createAccessToken({ uid: demoId, role: 'student', plan: 'free' });
      res.json({ success: true, user, accessToken });
    });
  }

  // 2.6 — Telegram orqali brauzerga kirish kodi yaratish (S7 fix)
  app.post('/api/auth/telegram-code', authLimiter, (req, res) => {
    try {
      // S7 — Kriptorafik xavfsiz 32-bayt token
      const tokenRec = createAuthToken();
      const botUrl = `https://t.me/${telegramBotUsername}?start=login_${tokenRec.token}`;
      res.json({
        success: true,
        token: tokenRec.token,
        botUrl,
        expiresAt: tokenRec.expires_at
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2.7 — Brauzer login holatini tekshirish (polling)
  app.get('/api/auth/check-login-code', authLimiter, (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token || !/^[0-9a-f]{64}$/.test(token)) {
        return res.status(400).json({ error: "Token noto'g'ri formatda." });
      }
      const record = getAuthToken(token);
      if (!record) {
        return res.json({ authorized: false, status: 'not_found' });
      }
      if (record.status === 'authorized' && record.user_data) {
        const sub = getUserSubscription(record.user_data.id);
        const isAdmin = adminIds.includes(String(record.user_data.id));
        const role = isAdmin ? 'admin' : (record.user_data.role || 'student');
        const accessToken = createAccessToken({
          uid: record.user_data.id,
          role,
          plan: (sub.plan as any) || 'free'
        });
        const refreshToken = createRefreshToken(record.user_data.id);
        res.cookie('refresh_token', refreshToken, {
          httpOnly: true,
          secure: !isDev,
          sameSite: isDev ? 'lax' : 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000
        });
        return res.json({
          authorized: true,
          status: 'authorized',
          user: {
            uid: record.user_data.id,
            displayName: [record.user_data.first_name, record.user_data.last_name].filter(Boolean).join(' '),
            username: record.user_data.username,
            role,
            authType: 'telegram'
          },
          accessToken,
          subscription: sub
        });
      }
      res.json({ authorized: false, status: record.status });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2.8 — Joriy foydalanuvchi ma'lumotlari (sessiyadagi)
  app.get('/api/auth/me', requireAuth, (req, res) => {
    const user = getUser(req.user!.uid);
    if (!user) {
      return res.status(404).json({ error: "Foydalanuvchi topilmadi." });
    }
    const isAdmin = adminIds.includes(String(user.id));
    const role = isAdmin ? 'admin' : (user.role || 'student');
    const sub = getUserSubscription(user.id);
    res.json({
      success: true,
      user: {
        uid: user.id,
        displayName: [user.first_name, user.last_name].filter(Boolean).join(' '),
        username: user.username,
        photoURL: user.photo_url,
        role,
        streak_days: user.streak_days || 0,
        xp: user.xp || 0,
        authType: 'telegram'
      },
      subscription: sub
    });
  });

  // ===================================================
  // 3. TARIFLAR VA OBUNA
  // ===================================================

  // Tariflar ro'yxati (ochiq)
  app.get('/api/pricing/plans', (req, res) => {
    res.json({ success: true, plans: PRICING_PLANS });
  });

  // M1: Foydalanuvchining to'liq huquq va limitlari (entitlements)
  app.get('/api/me/entitlements', requireAuth, (req, res) => {
    try {
      const entitlements = getEffectiveEntitlements(req.user!.uid);
      res.json({ success: true, entitlements });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Joriy foydalanuvchi obuna holati (S2: req.user dan)
  app.get('/api/subscriptions/status', requireAuth, (req, res) => {
    try {
      const status = getUserSubscription(req.user!.uid);
      const effective = getEffectiveEntitlements(req.user!.uid);
      res.json({ success: true, subscription: status, entitlements: effective });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Yangi buyurtma yaratish (S2: userId req.user dan)
  app.post('/api/subscriptions/order', requireAuth, (req, res) => {
    try {
      const { plan, paymentMethod } = req.body;
      if (!plan || !['start', 'pro', 'master'].includes(plan)) {
        return res.status(400).json({ error: "To'g'ri tarif tanlang: start, pro, yoki master." });
      }
      const order = createOrder({
        userId: req.user!.uid,
        plan,
        paymentMethod: paymentMethod || 'pending'
      });
      res.json({ success: true, order });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // S4/S5 fix — Demo to'lov faqat test muhitida + qayta to'lov bloklanadi
  if (isDev && process.env.ENABLE_DEMO_AUTH === 'true') {
    app.post('/api/subscriptions/pay-demo', requireAuth, (req, res) => {
      try {
        const { orderId } = req.body;
        if (!orderId) {
          return res.status(400).json({ error: "orderId talab qilinadi." });
        }
        // S5 — Buyurtma egasini tekshirish
        const order = getOrder(orderId);
        if (!order) {
          return res.status(404).json({ error: "Buyurtma topilmadi." });
        }
        if (order.user_id !== req.user!.uid) {
          return res.status(403).json({ error: "Bu buyurtma sizniki emas." });
        }
        // S5 — Allaqachon bajarilgan buyurtmani qayta bajartirish mumkin emas
        if (order.status === 'completed') {
          return res.status(400).json({ error: "Bu buyurtma allaqachon bajarilgan." });
        }
        const result = completeOrder(orderId, 'demo');
        if (!result.success) {
          return res.status(400).json({ error: result.message || "To'lov amalga oshmadi." });
        }
        res.json({ success: true, user: result.user, order: result.order });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });
  }

  // Foydalanuvchi buyurtmalari tarixi
  app.get('/api/subscriptions/orders', requireAuth, (req, res) => {
    try {
      const orders = getUserOrders(req.user!.uid);
      res.json({ success: true, orders });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===================================================
  // 3.1. TO'LOV TIZIMLARI (Click, Payme, Manual) — M3
  // ===================================================

  // To'lov konfiguratsiyasi (ochiq)
  app.get('/api/payments/config', (req, res) => {
    res.json({
      success: true,
      click: Boolean(process.env.CLICK_SERVICE_ID && process.env.CLICK_SECRET_KEY),
      payme: Boolean(process.env.PAYME_KEY),
      manual: true,
      manualConfig: {
        cardNumber: MANUAL_PAYMENT_CONFIG.cardNumber,
        cardHolder: MANUAL_PAYMENT_CONFIG.cardHolder,
        bankName: MANUAL_PAYMENT_CONFIG.bankName
      }
    });
  });

  // Click Checkout havolasini olish
  app.post('/api/payments/checkout/click', requireAuth, (req, res) => {
    try {
      const { orderId } = req.body;
      const order = getOrder(orderId);
      if (!order) return res.status(404).json({ error: "Buyurtma topilmadi." });
      if (order.user_id !== req.user!.uid) return res.status(403).json({ error: "Ruxsat yo'q." });
      if (order.status === 'completed') return res.status(400).json({ error: "Buyurtma allaqachon to'langan." });

      const serviceId = process.env.CLICK_SERVICE_ID || '12345';
      const merchantId = process.env.CLICK_MERCHANT_ID || '67890';
      const returnUrl = `${APP_URL}/pricing?paid=1&order=${order.id}`;

      const redirectUrl = generateClickPaymentUrl({
        serviceId,
        merchantId,
        amount: order.amount,
        orderId: order.id,
        returnUrl
      });

      res.json({ success: true, redirectUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Payme Checkout havolasini olish
  app.post('/api/payments/checkout/payme', requireAuth, (req, res) => {
    try {
      const { orderId } = req.body;
      const order = getOrder(orderId);
      if (!order) return res.status(404).json({ error: "Buyurtma topilmadi." });
      if (order.user_id !== req.user!.uid) return res.status(403).json({ error: "Ruxsat yo'q." });
      if (order.status === 'completed') return res.status(400).json({ error: "Buyurtma allaqachon to'langan." });

      const merchantId = process.env.PAYME_MERCHANT_ID || 'payme_merchant_id';
      const callbackUrl = `${APP_URL}/pricing?paid=1&order=${order.id}`;

      const redirectUrl = generatePaymePaymentUrl({
        merchantId,
        orderId: order.id,
        amount: order.amount,
        callbackUrl
      });

      res.json({ success: true, redirectUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Click Webhook (Prepare & Complete)
  const clickWebhookHandler = (req: any, res: any) => {
    const secretKey = process.env.CLICK_SECRET_KEY || 'click_test_secret';
    const action = Number(req.body?.action);

    if (action === 0) {
      const result = handleClickPrepare(req.body, secretKey);
      return res.json(result);
    } else if (action === 1) {
      const result = handleClickComplete(req.body, secretKey);
      return res.json(result);
    } else {
      return res.json({
        click_trans_id: req.body?.click_trans_id,
        merchant_trans_id: req.body?.merchant_trans_id,
        error: -3,
        error_note: "Noma'lum amal (action)"
      });
    }
  };

  app.post('/api/payments/click', express.urlencoded({ extended: true }), express.json(), clickWebhookHandler);
  app.post('/api/payments/click/prepare', express.urlencoded({ extended: true }), express.json(), (req, res) => {
    const secretKey = process.env.CLICK_SECRET_KEY || 'click_test_secret';
    res.json(handleClickPrepare(req.body, secretKey));
  });
  app.post('/api/payments/click/complete', express.urlencoded({ extended: true }), express.json(), (req, res) => {
    const secretKey = process.env.CLICK_SECRET_KEY || 'click_test_secret';
    res.json(handleClickComplete(req.body, secretKey));
  });

  // Payme Webhook (JSON-RPC 2.0)
  app.post('/api/payments/payme', async (req, res) => {
    const paymeKey = process.env.PAYME_KEY || 'payme_test_key';
    const authHeader = req.headers.authorization;

    if (!verifyPaymeAuth(authHeader, paymeKey)) {
      return res.json({
        jsonrpc: '2.0',
        id: req.body?.id || null,
        error: { code: -32504, message: "Kirish huquqi yo'q (Avtorizatsiya xatosi)" }
      });
    }

    const response = await handlePaymeRpc(req.body);
    res.json(response);
  });

  // Qo'lda to'lov chekini yuklash (Proof image upload)
  app.post('/api/orders/:id/proof', requireAuth, upload.single('proof'), async (req, res) => {
    try {
      const orderId = req.params.id;
      const order = getOrder(orderId);
      if (!order) return res.status(404).json({ error: "Buyurtma topilmadi." });
      if (order.user_id !== req.user!.uid) return res.status(403).json({ error: "Bu buyurtma sizniki emas." });
      if (order.status === 'completed') return res.status(400).json({ error: "Buyurtma allaqachon to'langan." });

      const file = req.file;
      if (!file) return res.status(400).json({ error: "Chek rasmi yuklanmadi." });

      const ext = (file.originalname.split('.').pop() || 'jpg').toLowerCase();
      if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
        return res.status(400).json({ error: "Faqat rasm fayllar (.jpg, .png, .webp) qabul qilinadi." });
      }

      if (!checkFileMagicBytes(file.buffer, ext)) {
        return res.status(400).json({ error: "Rasm formati mos kelmadi." });
      }

      const proofsDir = path.join(process.cwd(), 'data', 'proofs');
      if (!fs.existsSync(proofsDir)) {
        fs.mkdirSync(proofsDir, { recursive: true });
      }

      const fileName = `proof_${orderId}_${Date.now()}.${ext}`;
      const filePath = path.join(proofsDir, fileName);
      fs.writeFileSync(filePath, file.buffer);

      const proofUrl = `/api/proofs/${fileName}`;
      submitOrderProof(orderId, proofUrl);

      // Adminga bildirishnoma yuborish
      notifyAdminsNewPaymentProof({
        orderId,
        botToken: telegramBotToken,
        adminIds,
        proofUrl,
        appUrl: APP_URL
      });

      res.json({ success: true, message: "Chek qabul qilindi. Tez orada administrator tomonidan tasdiqlanadi." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Chek rasmini ko'rsatish
  app.get('/api/proofs/:filename', (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(process.cwd(), 'data', 'proofs', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Rasm topilmadi." });
    }
    res.sendFile(filePath);
  });

  // Admin chekni tasdiqlashi (Approve)
  app.post('/api/admin/orders/:id/approve', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { note } = req.body;
      const result = await handleApproveManualPayment(req.params.id, req.user!.uid, note, telegramBotToken);
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      res.json({ success: true, message: "To'lov tasdiqlandi va obuna faollashtirildi." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin chekni rad etishi (Reject)
  app.post('/api/admin/orders/:id/reject', requireAuth, requireAdmin, async (req, res) => {
    try {
      const { reason } = req.body;
      const result = await handleRejectManualPayment(req.params.id, req.user!.uid, reason, telegramBotToken);
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      res.json({ success: true, message: "Buyurtma rad etildi." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===================================================
  // 4. TEST GENERATSIYA (AI + HEMIS)
  // ===================================================
  app.post('/api/generate-quiz', optionalAuth, aiLimiter, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Hech qanday fayl yuklanmadi." });
      }

      const text = await extractTextFromFile(req.file);

      if (!text || !text.trim()) {
        return res.status(400).json({ error: "Hujjatdan matn ajratib bo'lmadi. Fayl bo'sh emasligiga ishonch hosil qiling." });
      }

      // 1-QADAM: HEMIS formatini tekshirish (bepul, auth talab qilmaydi)
      const hemisResult = parseHemisQuiz(text);
      if (hemisResult.isHemis && hemisResult.questions.length > 0) {
        // S10: HEMIS da to'g'ri javoblar ichki indeks sifatida qaytariladi (ular zararli emas chunki HEMIS format ochiq)
        return res.json({
          questions: hemisResult.questions,
          source: 'hemis',
          formatType: hemisResult.formatType,
          total: hemisResult.questions.length,
          title: sanitizeString(req.file.originalname.replace(/\.[^/.]+$/, ""), 200),
          message: `HEMIS shabloni muvaffaqiyatli aniqlandi! ${hemisResult.questions.length} ta savol sun'iy intellektsiz, 100% aniqlik bilan testga aylantirildi.`
        });
      }

      // 2-QADAM: Gemini Free API — foydalanuvchi kirgan bo'lishi shart (S6 fix)
      if (!req.user) {
        return res.status(401).json({
          error: "Gemini AI test generatsiyasi uchun Telegram orqali kirishingiz kerak.",
          code: 'UNAUTHORIZED'
        });
      }

      // S6 — AI kvota req.user.uid dan (hech qachon body dan emas)
      const aiQuota = canGenerateAiTest(req.user.uid);
      if (!aiQuota.allowed) {
        return res.status(403).json({
          error: aiQuota.reason,
          isLimitReached: true
        });
      }

      if (!geminiAi) {
        return res.status(400).json({
          error: "Hujjatda HEMIS formati aniqlanmadi. Erkin matndan test tuzish uchun GEMINI_API_KEY talab qilinadi."
        });
      }

      const prompt = `Sen professional o'qituvchi va malakali test tuzuvchisan. Quyidagi matn asosida O'ZBEK TILIDA mantiqiy, sifatli 4 variantli test savollarini tuz.
Matndan eng muhim faktlarni ajratib ol. Variantlar ishonarli va chalg'ituvchi bo'lsin.
Savollar soni matn hajmiga qarab maksimal qamrab ol (kamida 5 ta, ko'pi bilan 60 tagacha).
correctAnswer - bu to'g'ri javobning options massividagi 0 dan boshlanuvchi indeksi (0, 1, 2 yoki 3). Variantlar doim 4 ta bo'lsin.`;

      const response = await geminiAi.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `${prompt}\n\nMATN:\n${text.substring(0, 100000)}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.INTEGER }
                  },
                  required: ['question', 'options', 'correctAnswer']
                }
              }
            },
            required: ['questions']
          }
        }
      });

      const responseText = response.text || '';
      const quizData = JSON.parse(responseText);

      if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
        return res.status(400).json({ error: "Hujjatdan yetarlicha ma'lumot topilmadi." });
      }

      // S6 — Foydalanuvchi uid dan (body dan emas)
      recordAiTest(req.user.uid);

      return res.json({
        questions: quizData.questions,
        source: 'gemini',
        total: quizData.questions.length,
        title: sanitizeString(req.file.originalname.replace(/\.[^/.]+$/, ""), 200)
      });

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Testni qayta ishlashda xatolik yuz berdi." });
    }
  });

  // 4.1. Fayldan test yaratish (HEMIS & Docx parser) — M4
  app.post('/api/quizzes/from-file', requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Fayl yuklanmadi." });
      const result = await QuizCreationService.createFromFile({
        buffer: req.file.buffer,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        userId: req.user!.uid,
        title: req.body?.title,
        timeLimitMinutes: req.body?.timeLimitMinutes ? parseInt(req.body.timeLimitMinutes) : undefined
      });
      if (!result.success) {
        return res.status(400).json({ error: result.message, report: result.report });
      }
      res.json({ success: true, quiz: result.quiz, report: result.report });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4.2. Matndan test yaratish
  app.post('/api/quizzes/from-text', requireAuth, (req, res) => {
    try {
      const { text, title, timeLimitMinutes } = req.body;
      if (!text || !text.trim()) return res.status(400).json({ error: "Matn kiritilmadi." });
      const result = QuizCreationService.createFromText({
        text,
        userId: req.user!.uid,
        title,
        timeLimitMinutes: timeLimitMinutes ? parseInt(timeLimitMinutes) : undefined
      });
      if (!result.success) {
        return res.status(400).json({ error: result.message, report: result.report });
      }
      res.json({ success: true, quiz: result.quiz, report: result.report });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4.3. AI orqali test yaratish
  app.post('/api/quizzes/from-ai', requireAuth, aiLimiter, async (req, res) => {
    try {
      const { prompt, count, difficulty, subject } = req.body;
      if (!prompt || !prompt.trim()) return res.status(400).json({ error: "Mavzu yoki matn kiritilmadi." });
      const result = await QuizCreationService.createFromAi({
        prompt,
        userId: req.user!.uid,
        count: count ? parseInt(count) : 10,
        difficulty,
        subject
      });
      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }
      res.json({ success: true, quiz: result.quiz, remainingQuota: result.remainingQuota });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4.4. Qo'lda savolma-savol test yaratish
  app.post('/api/quizzes/manual', requireAuth, (req, res) => {
    try {
      const { title, subject, timeLimitMinutes, questions } = req.body;
      if (!title) return res.status(400).json({ error: "Test nomi kiritilmadi." });
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: "Kamida bitta savol kiritilishi kerak." });
      }
      const result = QuizCreationService.createManual({
        userId: req.user!.uid,
        title,
        subject,
        timeLimitMinutes: timeLimitMinutes ? parseInt(timeLimitMinutes) : undefined,
        questions
      });
      res.json({ success: true, quiz: result.quiz });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===================================================
  // 5. TESTLAR BOSHQARUVI (CRUD)
  // ===================================================

  // Test yaratish — foydalanuvchi kirgan bo'lishi shart
  app.post('/api/quizzes', requireAuth, (req, res) => {
    try {
      const { title, subject, sourceType, questions, timeLimitMinutes, isPublic } = req.body;
      if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: "Test nomi va kamida bitta savol kiritilishi shart." });
      }

      const saved = createQuiz({
        id: generateId(), // S7: Math.random emas, UUID
        user_id: req.user!.uid, // S2: req.body.userId emas, sessiyadan
        title: sanitizeString(title, 300),
        subject: sanitizeString(subject || 'Umumiy', 100),
        source_type: sourceType || 'hemis',
        total_questions: questions.length,
        time_limit_minutes: timeLimitMinutes || 0,
        is_public: isPublic !== undefined ? isPublic : 1
      }, questions);

      res.json({ success: true, quiz: saved });
    } catch (err: any) {
      console.error("Create quiz error:", err);
      res.status(500).json({ error: err.message || "Testni saqlashda xatolik" });
    }
  });

  // Testni olish — S10: Imtihon rejimida correctAnswer yashiriladi
  // S11: Yopiq testlar faqat egasiga ko'rinadi
  app.get('/api/quizzes/:id', optionalAuth, (req, res) => {
    try {
      const quiz = getQuiz(req.params.id);
      if (!quiz) {
        return res.status(404).json({ error: "Test topilmadi." });
      }

      // S11 — Yopiq testni faqat egasi ko'ra oladi
      if (!quiz.is_public && quiz.user_id !== req.user?.uid) {
        return res.status(403).json({ error: "Bu test yopiq. Faqat egasi ko'ra oladi." });
      }

      const isStudyMode = req.query.mode === 'study';
      const isOwner = Boolean(req.user && quiz.user_id === req.user.uid);

      // S10 — Imtihon rejimida to'g'ri javoblar klientga yuborilmaydi
      const sanitizedQuiz = {
        ...quiz,
        questions: quiz.questions?.map(q => ({
          id: q.id,
          quiz_id: q.quiz_id,
          question: q.question,
          options: q.options,
          explanation: q.explanation,
          order_num: q.order_num,
          // Faqat o'rganish rejimida yoki test egasiga to'g'ri javob ko'rinadi
          ...(isStudyMode || isOwner ? { correctAnswer: q.correctAnswer } : {})
        }))
      };

      res.json({ success: true, quiz: sanitizedQuiz });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Foydalanuvchining testlari ro'yxati (S2: query userId emas, sessiyadan)
  app.get('/api/quizzes', optionalAuth, (req, res) => {
    try {
      if (req.user) {
        const quizzes = getUserQuizzes(req.user.uid);
        return res.json({ success: true, quizzes });
      }
      const publicQuizzes = getPublicQuizzes();
      res.json({ success: true, quizzes: publicQuizzes });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Testni yangilash / Tahrirlash (S11: faqat egasi, M1: Pro+ Editor huquqi talab qilinadi)
  app.put('/api/quizzes/:id', requireAuth, requireFeature('editor'), (req, res) => {
    try {
      const quiz = getQuiz(req.params.id);
      if (!quiz) {
        return res.status(404).json({ error: "Test topilmadi." });
      }
      // S11 — Egalilik tekshiruvi
      if (quiz.user_id !== req.user!.uid && req.user!.role !== 'admin' && req.user!.role !== 'superadmin') {
        return res.status(403).json({ error: "Siz bu testni tahrirlash huquqiga ega emassiz." });
      }

      const { title, subject, timeLimitMinutes, isPublic, questions } = req.body;
      const updated = updateQuiz(req.params.id, {
        title: sanitizeString(title, 300),
        subject: sanitizeString(subject, 100),
        time_limit_minutes: timeLimitMinutes,
        is_public: isPublic
      }, questions);

      if (!updated) {
        return res.status(404).json({ error: "Test topilmadi." });
      }
      res.json({ success: true, quiz: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // M1: 3D Flashcards ma'lumotlari (Faqat Pro+ obunachilar uchun)
  app.get('/api/quizzes/:id/flashcards', requireAuth, requireFeature('flashcards'), (req, res) => {
    try {
      const quiz = getQuiz(req.params.id);
      if (!quiz) {
        return res.status(404).json({ error: "Test topilmadi." });
      }
      res.json({ success: true, quiz });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Testni o'chirish (S11: faqat egasi)
  app.delete('/api/quizzes/:id', requireAuth, (req, res) => {
    try {
      const quiz = getQuiz(req.params.id);
      if (!quiz) {
        return res.status(404).json({ error: "Test topilmadi." });
      }
      // S11 — Egalilik tekshiruvi
      if (quiz.user_id !== req.user!.uid && req.user!.role !== 'admin' && req.user!.role !== 'superadmin') {
        return res.status(403).json({ error: "Siz bu testni o'chirish huquqiga ega emassiz." });
      }
      const ok = deleteQuiz(req.params.id, req.user!.uid);
      if (!ok) {
        return res.status(400).json({ error: "Test o'chirilmadi." });
      }
      res.json({ success: true, message: "Test muvaffaqiyatli o'chirildi." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===================================================
  // 6. NATIJALAR VA SERVER URINISHLARI (M5 — Attempts & Test Taking)
  // S10: ball serverda hisoblanadi, to'g'ri javoblar tarmoqqa sizmaydi
  // 8.5: server urinishlari (create, active, batch answers, study answer, finish)
  // ===================================================

  // 6.1. Urinish yaratish yoki tugallangan natijani saqlash (POST /api/attempts)
  app.post('/api/attempts', optionalAuth, (req, res) => {
    try {
      const { quizId, mode, retryWrongFromAttemptId, timeSpentSeconds, answersGiven } = req.body;

      if (!quizId) {
        return res.status(400).json({ error: "quizId talab qilinadi." });
      }

      const userId = req.user ? req.user.uid : 'anonymous';

      // Qadimgi v2 format bilan moslik: agar bevosita answersGiven yuborilgan bo'lsa
      if (Array.isArray(answersGiven)) {
        const quizWithAnswers = getQuizWithAnswers(quizId);
        if (!quizWithAnswers) {
          return res.status(404).json({ error: "Test topilmadi." });
        }

        let score = 0;
        const total = quizWithAnswers.questions?.length || 0;
        const serverAnswers: number[] = [];
        const wrongQuestionsList: any[] = [];

        if (quizWithAnswers.questions) {
          quizWithAnswers.questions.forEach((q, idx) => {
            const clientAnswer = answersGiven[idx];
            serverAnswers.push(typeof clientAnswer === 'number' ? clientAnswer : -1);
            if (clientAnswer === q.correctAnswer) {
              score++;
            } else {
              wrongQuestionsList.push({
                index: idx,
                question: q.question,
                options: q.options,
                userAnswer: clientAnswer,
                correctAnswer: q.correctAnswer,
                explanation: q.explanation
              });
            }
          });
        }

        const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
        const attempt = saveAttempt({
          id: generateId(),
          user_id: userId,
          quiz_id: quizId,
          mode: mode || 'exam',
          status: 'completed',
          score,
          total,
          percentage,
          time_spent_seconds: timeSpentSeconds || 0,
          answers_given: serverAnswers,
          wrong_questions: wrongQuestionsList
        });

        // Gamifikatsiya (XP va streak) yangilash
        let gamification = null;
        if (req.user && !req.user.uid.startsWith('demo_') && !req.user.uid.startsWith('guest_')) {
          const xpEarned = 15 + (score * 5) + (percentage >= 80 ? 15 : 0) + (percentage === 100 ? 30 : 0);
          gamification = updateUserGamification(userId, xpEarned);
        }

        // Telegram xabar (S12: HTML escape)
        if (telegramBotToken && req.user && !req.user.uid.startsWith('demo_') && !req.user.uid.startsWith('guest_')) {
          const quizTitle = escapeHtml(quizWithAnswers.title || 'Test');
          const mins = Math.floor((timeSpentSeconds || 0) / 60);
          const secs = (timeSpentSeconds || 0) % 60;
          const msg = `📊 <b>Yangi Test Natijasi!</b>\n\n` +
            `📖 <b>Test:</b> ${quizTitle}\n` +
            `🎯 <b>Natija:</b> ${score} / ${total} (${percentage}%)\n` +
            `⏱ <b>Sarflangan vaqt:</b> ${mins}m ${secs}s\n\n` +
            `${percentage >= 60 ? "🎉 Tabriklaymiz, muvaffaqiyatli topshirdingiz!" : "📚 Ko'proq shug'ullanish tavsiya etiladi."}`;
          sendTelegramMessage(telegramBotToken, req.user.uid, msg);
        }

        return res.json({ success: true, attempt, gamification });
      }

      // Yangi v3 formati: Server nazoratidagi urinishni boshlash (Section 8.5)
      const attemptMode = mode === 'study' ? 'study' : mode === 'retry_wrong' ? 'retry_wrong' : 'exam';
      let questionsToUse: any[] = [];
      let quizTitle = 'Test';
      let timeLimit = 0;

      // Agar xatolarni qayta ishlash rejimi bo'lsa
      if (attemptMode === 'retry_wrong') {
        let prevAttempt = null;
        if (retryWrongFromAttemptId) {
          prevAttempt = getAttempt(retryWrongFromAttemptId);
        } else {
          // Oxirgi yakunlangan urinishdan olish
          const userAttempts = getUserAttempts(userId);
          prevAttempt = userAttempts.find(a => a.quiz_id === quizId && a.wrong_questions && a.wrong_questions.length > 0);
        }

        if (prevAttempt && prevAttempt.wrong_questions && prevAttempt.wrong_questions.length > 0) {
          questionsToUse = prevAttempt.wrong_questions.map((wq: any, idx: number) => ({
            id: `retry_q_${idx}`,
            quiz_id: quizId,
            question: wq.question,
            options: wq.options,
            order_num: idx
          }));
          quizTitle = (prevAttempt.quiz_title || 'Test') + " (Xatolar ustida ishlash)";
        }
      }

      // Agar oddiy rejim bo'lsa yoki xatolar topilmagan bo'lsa, asosiy testni yuklaymiz
      if (questionsToUse.length === 0) {
        const fullQuiz = getQuizWithAnswers(quizId);
        if (!fullQuiz) {
          return res.status(404).json({ error: "Test topilmadi." });
        }
        if (!fullQuiz.is_public && fullQuiz.user_id !== userId && req.user?.role !== 'admin' && req.user?.role !== 'superadmin') {
          return res.status(403).json({ error: "Bu test yopiq." });
        }
        quizTitle = fullQuiz.title;
        timeLimit = fullQuiz.time_limit_minutes || 0;
        // Savollar to'g'ri javoblarsiz tozalanadi (S10)
        questionsToUse = (fullQuiz.questions || []).map(q => ({
          id: q.id,
          quiz_id: q.quiz_id,
          question: q.question,
          options: q.options,
          order_num: q.order_num
        }));
      }

      const total = questionsToUse.length;
      if (total === 0) {
        return res.status(400).json({ error: "Testda savollar mavjud emas." });
      }

      const questionOrder = questionsToUse.map((_, idx) => idx);
      const attempt = createAttempt({
        user_id: userId,
        quiz_id: quizId,
        mode: attemptMode,
        total,
        time_limit_minutes: timeLimit,
        question_order: questionOrder
      });

      res.json({
        success: true,
        attempt: {
          id: attempt.id,
          quiz_id: attempt.quiz_id,
          mode: attempt.mode,
          status: attempt.status,
          started_at: attempt.started_at,
          deadline_at: attempt.deadline_at,
          total: attempt.total,
          time_limit_minutes: timeLimit,
          quiz_title: quizTitle
        },
        questions: questionsToUse
      });
    } catch (err: any) {
      console.error("Create attempt error:", err);
      res.status(500).json({ error: err.message || "Urinish yaratishda xatolik" });
    }
  });

  // 6.2. Faol (davom etayotgan) urinishni tekshirish (Resume imkoniyati)
  app.get('/api/attempts/active/:quizId', requireAuth, (req, res) => {
    try {
      const active = getActiveAttempt(req.user!.uid, req.params.quizId);
      if (!active) {
        return res.json({ success: true, hasActive: false });
      }

      // Agar vaqti tugagan bo'lsa avtomatik expired deb belgilash
      if (active.deadline_at && new Date(active.deadline_at).getTime() < Date.now()) {
        finishAttempt(active.id, {
          score: active.score,
          total: active.total,
          percentage: active.percentage,
          time_spent_seconds: active.time_spent_seconds,
          answers_given: active.answers_given,
          status: 'expired'
        });
        return res.json({ success: true, hasActive: false, message: "Avvalgi urinish vaqti tugagan." });
      }

      // To'g'ri javoblarsiz savollarni olamiz
      const fullQuiz = getQuizWithAnswers(active.quiz_id);
      const sanitizedQuestions = (fullQuiz?.questions || []).map(q => ({
        id: q.id,
        quiz_id: q.quiz_id,
        question: q.question,
        options: q.options,
        order_num: q.order_num
      }));

      res.json({
        success: true,
        hasActive: true,
        attempt: active,
        questions: sanitizedQuestions
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6.3. Javoblarni oraliq saqlash (Batch answers — progress yo'qolmasligi uchun)
  app.put('/api/attempts/:id/answers', optionalAuth, (req, res) => {
    try {
      const attempt = getAttempt(req.params.id);
      if (!attempt) {
        return res.status(404).json({ error: "Urinish topilmadi." });
      }

      if (req.user && attempt.user_id !== 'anonymous' && attempt.user_id !== req.user.uid) {
        return res.status(403).json({ error: "Ruxsat berilmagan." });
      }

      const { answersGiven, timeSpentSeconds } = req.body;
      if (!Array.isArray(answersGiven)) {
        return res.status(400).json({ error: "answersGiven massiv bo'lishi kerak." });
      }

      updateAttemptAnswers(attempt.id, answersGiven, timeSpentSeconds);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6.4. O'rganish rejimida har bir savolga darhol javob olish (Study mode answer)
  app.post('/api/attempts/:id/answer', optionalAuth, (req, res) => {
    try {
      const attempt = getAttempt(req.params.id);
      if (!attempt) {
        return res.status(404).json({ error: "Urinish topilmadi." });
      }

      const { questionIndex, chosenOption } = req.body;
      if (typeof questionIndex !== 'number' || typeof chosenOption !== 'number') {
        return res.status(400).json({ error: "questionIndex va chosenOption talab qilinadi." });
      }

      const fullQuiz = getQuizWithAnswers(attempt.quiz_id);
      if (!fullQuiz || !fullQuiz.questions || !fullQuiz.questions[questionIndex]) {
        return res.status(404).json({ error: "Savol topilmadi." });
      }

      const targetQuestion = fullQuiz.questions[questionIndex];
      const isCorrect = targetQuestion.correctAnswer === chosenOption;

      // Urinish javobini yangilash
      const updatedAnswers = [...attempt.answers_given];
      updatedAnswers[questionIndex] = chosenOption;
      updateAttemptAnswers(attempt.id, updatedAnswers);

      res.json({
        success: true,
        isCorrect,
        correctAnswer: targetQuestion.correctAnswer,
        explanation: targetQuestion.explanation || (isCorrect ? "To'g'ri javob!" : "Noto'g'ri javob.")
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6.5. Urinishni yakunlash va baholash (POST /api/attempts/:id/finish)
  app.post('/api/attempts/:id/finish', optionalAuth, (req, res) => {
    try {
      const attempt = getAttempt(req.params.id);
      if (!attempt) {
        return res.status(404).json({ error: "Urinish topilmadi." });
      }

      const { answersGiven, timeSpentSeconds } = req.body;
      const finalAnswers = Array.isArray(answersGiven) ? answersGiven : attempt.answers_given;
      const finalTime = typeof timeSpentSeconds === 'number' ? timeSpentSeconds : attempt.time_spent_seconds;

      const fullQuiz = getQuizWithAnswers(attempt.quiz_id);
      if (!fullQuiz || !fullQuiz.questions) {
        return res.status(404).json({ error: "Test savollari topilmadi." });
      }

      let score = 0;
      const total = fullQuiz.questions.length;
      const wrongQuestionsList: any[] = [];

      fullQuiz.questions.forEach((q, idx) => {
        const userChoice = finalAnswers[idx];
        if (userChoice === q.correctAnswer) {
          score++;
        } else {
          wrongQuestionsList.push({
            index: idx,
            question: q.question,
            options: q.options,
            userAnswer: typeof userChoice === 'number' ? userChoice : -1,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation
          });
        }
      });

      const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
      const completed = finishAttempt(attempt.id, {
        score,
        total,
        percentage,
        time_spent_seconds: finalTime,
        answers_given: finalAnswers,
        wrong_questions: wrongQuestionsList,
        status: 'completed'
      });

      // Gamifikatsiya (XP va streak)
      let gamification = null;
      const userId = attempt.user_id;
      if (userId && userId !== 'anonymous' && !userId.startsWith('demo_') && !userId.startsWith('guest_')) {
        const xpEarned = 15 + (score * 5) + (percentage >= 80 ? 15 : 0) + (percentage === 100 ? 30 : 0);
        gamification = updateUserGamification(userId, xpEarned);
      }

      // Telegram xabar (S12: HTML escape)
      if (telegramBotToken && userId && !userId.startsWith('demo_') && !userId.startsWith('guest_')) {
        const quizTitle = escapeHtml(fullQuiz.title || 'Test');
        const mins = Math.floor(finalTime / 60);
        const secs = finalTime % 60;
        const msg = `📊 <b>Test Yakunlandi!</b>\n\n` +
          `📖 <b>Test:</b> ${quizTitle}\n` +
          `🎯 <b>Natija:</b> ${score} / ${total} (${percentage}%)\n` +
          `⏱ <b>Vaqt:</b> ${mins}m ${secs}s\n` +
          `⭐ <b>XP:</b> +${15 + (score * 5)} ball\n\n` +
          `${percentage >= 60 ? "🎉 Ajoyib natija!" : "📚 Xatolar ustida ishlab, qayta urinib ko'ring."}`;
        sendTelegramMessage(telegramBotToken, userId, msg);
      }

      res.json({
        success: true,
        attempt: completed,
        wrong_questions: wrongQuestionsList,
        gamification
      });
    } catch (err: any) {
      console.error("Finish attempt error:", err);
      res.status(500).json({ error: err.message || "Urinishni yakunlashda xatolik" });
    }
  });

  // 6.6. Natijani olish (S11: faqat egasi yoki admin ko'ra oladi)
  app.get('/api/attempts/:id', optionalAuth, (req, res) => {
    try {
      const attempt = getAttempt(req.params.id);
      if (!attempt) {
        return res.status(404).json({ error: "Natija topilmadi." });
      }

      // S11 — Egalik tekshiruvi
      if (attempt.user_id && attempt.user_id !== 'anonymous' && req.user) {
        if (attempt.user_id !== req.user.uid && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
          return res.status(403).json({ error: "Bu natijani ko'rish huquqingiz yo'q." });
        }
      }

      const fullQuiz = getQuizWithAnswers(attempt.quiz_id);

      // Agar urinish hali yakunlanmagan bo'lsa (in_progress), to'g'ri javoblarsiz qaytaramiz (S10)
      if (attempt.status === 'in_progress') {
        const sanitizedQuiz = fullQuiz ? {
          ...fullQuiz,
          questions: fullQuiz.questions?.map(q => ({
            id: q.id,
            quiz_id: q.quiz_id,
            question: q.question,
            options: q.options,
            order_num: q.order_num
          }))
        } : null;
        return res.json({ success: true, attempt, quiz: sanitizedQuiz });
      }

      // Tugallangan urinishda to'liq quiz qaytariladi
      res.json({ success: true, attempt, quiz: fullQuiz });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6.7. Foydalanuvchi barcha urinishlari (Tarix)
  app.get('/api/attempts', requireAuth, (req, res) => {
    try {
      const attempts = getUserAttempts(req.user!.uid);
      res.json({ success: true, attempts });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6.8. Shaxsiy statistika va gamifikatsiya (GET /api/users/me/stats)
  app.get('/api/users/me/stats', requireAuth, (req, res) => {
    try {
      const stats = getUserStats(req.user!.uid);
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6.9. Test bo'yicha reyting (Leaderboard)
  app.get('/api/quizzes/:id/leaderboard', (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const leaderboard = getQuizLeaderboard(req.params.id, limit);
      res.json({ success: true, leaderboard });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===================================================
  // 7. ADMIN ENDPOINTLAR (M2: Barchasi requireAdmin va audit bilan)
  // ===================================================

  // 7.1. Dashboard ko'rsatkichlari
  app.get('/api/admin/stats', requireAuth, requireAdmin, (req, res) => {
    try {
      const stats = getAdminStats();
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7.2. Foydalanuvchilar ro'yxati va qidiruv
  app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
    try {
      const q = (req.query.q as string) || '';
      const limit = parseInt(req.query.limit as string) || 30;
      const offset = parseInt(req.query.offset as string) || 0;
      const users = searchUsers(q, limit, offset);
      res.json({ success: true, users });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7.3. Foydalanuvchi profilini olish
  app.get('/api/admin/users/:id', requireAuth, requireAdmin, (req, res) => {
    try {
      const user = getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "Foydalanuvchi topilmadi." });
      }
      const entitlements = getEffectiveEntitlements(user.id);
      const orders = getUserOrders(user.id);
      const quizzes = getUserQuizzes(user.id);
      const attempts = getUserAttempts(user.id);

      res.json({
        success: true,
        user,
        entitlements,
        orders,
        quizzes,
        attempts
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7.4. Foydalanuvchiga obuna berish / uzaytirish (TZ 6.3 oqimi)
  app.post('/api/admin/users/:id/subscription', requireAuth, requireAdmin, (req, res) => {
    try {
      const { plan, durationDays, reason, notifyUser } = req.body;
      if (!plan || !['start', 'pro', 'master'].includes(plan)) {
        return res.status(400).json({ error: "To'g'ri tarif tanlang: start, pro, yoki master." });
      }

      const days = parseInt(durationDays) || PRICING_PLANS[plan as 'start' | 'pro' | 'master'].durationDays;
      const actRes = activateSubscription(req.params.id, plan, {
        source: 'admin_grant',
        grantedBy: req.user!.uid,
        note: reason || "Admin tomonidan taqdim etildi",
        customDays: days
      });

      if (!actRes.success) {
        return res.status(400).json({ error: actRes.message || "Obuna berishda xatolik" });
      }

      // Audit log yozish
      addAuditLog(req.user!.uid, 'grant_subscription', 'user', req.params.id, {
        plan,
        durationDays: days,
        reason: reason || ''
      });

      // Foydalanuvchiga Telegramda bildirishnoma yuborish
      if (notifyUser !== false && telegramBotToken && !req.params.id.startsWith('demo_')) {
        const planName = PRICING_PLANS[plan as 'start' | 'pro' | 'master'].name;
        const msg = `🎁 <b>Xushxabar! Sizga maxsus obuna taqdim etildi!</b> 🚀\n\n` +
          `Administrator tomonidan hisobingizga <b>${planName}</b> tarifi <b>${days} kunga</b> faollashtirildi!\n\n` +
          `Barcha testlar, 3D Flashcardlar va Test Muharriri siz uchun to'liq ochiq. O'qishlaringizda omad tilaymiz! 🌟`;
        sendTelegramMessage(telegramBotToken, req.params.id, msg);
      }

      const updatedEnt = getEffectiveEntitlements(req.params.id);
      res.json({ success: true, entitlements: updatedEnt, message: "Obuna muvaffaqiyatli berildi." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7.5. Foydalanuvchi obunasini bekor qilish
  app.post('/api/admin/users/:id/cancel-subscription', requireAuth, requireAdmin, (req, res) => {
    try {
      const { reason } = req.body;
      cancelUserSubscription(req.params.id, reason || "Admin tomonidan bekor qilindi");
      addAuditLog(req.user!.uid, 'cancel_subscription', 'user', req.params.id, { reason });
      clearEntitlementsCache(req.params.id);

      res.json({ success: true, message: "Obuna bekor qilindi." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7.6. Barcha obunalar ro'yxati
  app.get('/api/admin/subscriptions', requireAuth, requireAdmin, (req, res) => {
    try {
      const status = (req.query.status as string) || '';
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const subs = getAllSubscriptions(status, limit, offset);
      res.json({ success: true, subscriptions: subs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7.7. Barcha buyurtmalar ro'yxati
  app.get('/api/admin/orders', requireAuth, requireAdmin, (req, res) => {
    try {
      const status = (req.query.status as string) || '';
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const orders = getAllOrders(status, limit, offset);
      res.json({ success: true, orders });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7.8. Audit log jurnali
  app.get('/api/admin/audit', requireAuth, requireAdmin, (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const logs = getAuditLogs(limit, offset);
      res.json({ success: true, logs });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7.9. Foydalanuvchiga to'g'ridan-to'g'ri Telegram xabar yuborish
  app.post('/api/admin/users/:id/message', requireAuth, requireAdmin, (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: "Xabar matni talab qilinadi." });

      if (telegramBotToken) {
        sendTelegramMessage(telegramBotToken, req.params.id, escapeHtml(text));
        addAuditLog(req.user!.uid, 'send_message', 'user', req.params.id, { text });
      }
      res.json({ success: true, message: "Xabar yuborildi." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===================================================
  // 8. FRONTEND SPA
  // S14 fix: production da faqat dist/ ko'rsatiladi
  // ===================================================
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // S14 — Faqat dist/ papkasi, boshqa hech narsa emas
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  // Global xato handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api/')) {
       console.error("API Error:", err.message);
       res.status(500).json({ error: "Ichki server xatoligi." });
       return;
    }
    next(err);
  });

  // M1: Obunalarning muddatini har 1 soatda tekshirish cron vazifasi
  setInterval(() => {
    try {
      const stats = checkAndExpireSubscriptions();
      if (stats.expiredCount > 0 || stats.scheduledActivated > 0) {
        console.log(`[Subscription Cron] Tugagan obunalar: ${stats.expiredCount}, Faollashtirilgan: ${stats.scheduledActivated}`);
      }
    } catch (e: any) {
      console.warn("[Subscription Cron Error]:", e.message);
    }
  }, 60 * 60 * 1000);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Muhit: ${isDev ? 'development' : 'production'}`);
  });
}

// S10 uchun: to'liq quiz (correctAnswer bilan) — faqat server ichida ishlatiladi
function getQuizWithAnswers(quizId: string) {
  return getQuiz(quizId); // DB dan to'g'ri javoblar bilan olinadi (klientga yuborilmaydi)
}

startServer();

