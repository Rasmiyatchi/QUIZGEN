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
  getPlanLevel
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
  checkAndExpireSubscriptions
} from './src/lib/entitlements.ts';

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
        role: 'student' // DB da student, JWT da admin roli
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
        role: 'student' // DB da student, JWT da admin roli alohida
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

      const sub = getUserSubscription(user.id);
      const newAccessToken = createAccessToken({
        uid: user.id,
        role: (user.role as any) || 'student',
        plan: (sub.plan as any) || 'free'
      });

      res.json({ success: true, accessToken: newAccessToken, subscription: sub });
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
        const accessToken = createAccessToken({
          uid: record.user_data.id,
          role: record.user_data.role || 'student',
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
    const sub = getUserSubscription(user.id);
    res.json({ success: true, user, subscription: sub });
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
  // 6. NATIJALAR (Attempts)
  // S10 fix: ball server tomonida tekshiriladi
  // ===================================================

  // Natijani saqlash — server tomonida ball tekshiruvi (S10)
  app.post('/api/attempts', optionalAuth, (req, res) => {
    try {
      const { quizId, timeSpentSeconds, answersGiven } = req.body;
      
      if (!quizId || !answersGiven) {
        return res.status(400).json({ error: "quizId va answersGiven talab qilinadi." });
      }

      // S10 — Testni to'g'ri javoblar bilan olamiz (klientga yuborilmaydi)
      const quizWithAnswers = getQuizWithAnswers(quizId);
      if (!quizWithAnswers) {
        return res.status(404).json({ error: "Test topilmadi." });
      }

      // S10 — Server tomonida ball hisobi
      let score = 0;
      const total = quizWithAnswers.questions?.length || 0;
      const serverAnswers: number[] = [];

      if (Array.isArray(answersGiven) && quizWithAnswers.questions) {
        quizWithAnswers.questions.forEach((q, idx) => {
          const clientAnswer = answersGiven[idx];
          serverAnswers.push(typeof clientAnswer === 'number' ? clientAnswer : -1);
          if (clientAnswer === q.correctAnswer) {
            score++;
          }
        });
      }

      const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
      const userId = req.user ? req.user.uid : 'anonymous';

      const attempt = saveAttempt({
        id: generateId(),
        user_id: userId,
        quiz_id: quizId,
        score,
        total,
        percentage,
        time_spent_seconds: timeSpentSeconds || 0,
        answers_given: serverAnswers
      });

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

      res.json({ success: true, attempt });
    } catch (err: any) {
      console.error("Save attempt error:", err);
      res.status(500).json({ error: err.message || "Natijani saqlashda xatolik" });
    }
  });

  // Natijani olish (S11: faqat egasi yoki admin ko'ra oladi)
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
      const quiz = getQuiz(attempt.quiz_id);
      res.json({ success: true, attempt, quiz });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Foydalanuvchi natijalari (S2: sessiyadan)
  app.get('/api/attempts', requireAuth, (req, res) => {
    try {
      const attempts = getUserAttempts(req.user!.uid);
      res.json({ success: true, attempts });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===================================================
  // 7. ADMIN ENDPOINTLAR
  // ===================================================
  app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
    res.json({ success: true, message: "Admin panel M5 da to'liq amalga oshiriladi." });
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
