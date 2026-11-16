import express from 'express';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import mammoth from 'mammoth';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
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
  getAuthToken
} from './src/lib/db.ts';
import { startTelegramBot, sendTelegramMessage } from './src/services/telegram-bot.ts';

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

async function extractTextFromFile(file: Express.Multer.File): Promise<string> {
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

async function startServer() {
  // Ma'lumotlar bazasini ishga tushirish (SQLite)
  initDatabase();

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

  app.use(express.json({ limit: '10mb' }));

  // Gemini AI inicializatsiyasi
  let geminiAi: GoogleGenAI | null = null;
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    geminiAi = new GoogleGenAI({ apiKey: geminiApiKey });
    console.log("Google Gemini API muvaffaqiyatli ulandi.");
  } else {
    console.warn("GEMINI_API_KEY topilmadi. HEMIS testlari ishlashda davom etadi, erkin matnlar uchun kalit talab qilinadi.");
  }

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
  const telegramBotUsername = process.env.TELEGRAM_BOT_USERNAME || 'QuizGenUzBot';

  // Telegram Bot xizmatini ishga tushirish
  if (telegramBotToken) {
    startTelegramBot(telegramBotToken, APP_URL);
  }

  // --- API MARSHRUTLARI ---

  // 1. Tizim konfiguratsiyasi
  app.get('/api/config', (req, res) => {
    res.json({
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      hasTelegramBot: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      telegramBotUsername,
      appUrl: APP_URL
    });
  });

  // 2. Telegram Auth
  app.post('/api/auth/telegram', (req, res) => {
    try {
      const { initData, widgetData, demoUser } = req.body;

      if (demoUser) {
        const user = upsertUser({
          id: demoUser.id || 'demo_' + Math.random().toString(36).substring(7),
          first_name: demoUser.first_name || 'Talaba (Test)',
          username: demoUser.username || 'talaba_demo',
          photo_url: demoUser.photo_url || '',
          role: 'student'
        });
        return res.json({ success: true, user: { ...user, authType: 'demo' }, token: 'demo_token_' + user.id });
      }

      if (initData) {
        if (telegramBotToken) {
          const verification = verifyTelegramWebAppData(initData, telegramBotToken);
          if (!verification.valid || !verification.user) {
            return res.status(401).json({ error: "Telegram WebApp ma'lumotlari haqiqiy emas." });
          }
          const user = upsertUser({
            id: String(verification.user.id),
            first_name: verification.user.first_name,
            last_name: verification.user.last_name,
            username: verification.user.username,
            photo_url: verification.user.photo_url,
            role: 'student'
          });
          return res.json({ success: true, user: { ...user, authType: 'tma' }, token: 'tma_token_' + user.id });
        } else {
          const urlParams = new URLSearchParams(initData);
          const userRaw = urlParams.get('user');
          const tgU = userRaw ? JSON.parse(userRaw) : { id: 12345, first_name: 'Telegram User' };
          const user = upsertUser({
            id: String(tgU.id),
            first_name: tgU.first_name || 'Foydalanuvchi',
            username: tgU.username,
            role: 'student'
          });
          return res.json({ success: true, user: { ...user, authType: 'tma_dev' }, token: 'dev_token_' + user.id });
        }
      }

      if (widgetData) {
        if (telegramBotToken) {
          const isValid = verifyTelegramWidgetAuth(widgetData, telegramBotToken);
          if (!isValid) {
            return res.status(401).json({ error: "Telegram widget imzosi mos kelmadi." });
          }
        }
        const user = upsertUser({
          id: String(widgetData.id),
          first_name: widgetData.first_name,
          last_name: widgetData.last_name,
          username: widgetData.username,
          photo_url: widgetData.photo_url,
          role: 'student'
        });
        return res.json({ success: true, user: { ...user, authType: 'widget' }, token: 'widget_token_' + user.id });
      }

      return res.status(400).json({ error: "Kirish ma'lumotlari topilmadi." });
    } catch (err: any) {
      console.error("Auth error:", err);
      res.status(500).json({ error: err.message || "Autentifikatsiyada xatolik" });
    }
  });

  // 2.1. Qat'iy Telegram orqali 1-bosishda kirish tokenini yaratish
  app.post('/api/auth/telegram-code', (req, res) => {
    try {
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

  // 2.2. Kirish holatini tekshirish (polling)
  app.get('/api/auth/check-login-code', (req, res) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ error: "Token talab qilinadi" });
      }
      const record = getAuthToken(token);
      if (!record) {
        return res.json({ authorized: false, status: 'not_found' });
      }
      if (record.status === 'authorized' && record.user_data) {
        return res.json({
          authorized: true,
          status: 'authorized',
          user: record.user_data,
          token: 'auth_' + record.token
        });
      }
      res.json({ authorized: false, status: record.status });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2.3. Tariflar ro'yxati
  app.get('/api/pricing/plans', (req, res) => {
    res.json({
      success: true,
      plans: PRICING_PLANS
    });
  });

  // 2.4. Foydalanuvchining obuna holati
  app.get('/api/subscriptions/status', (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId talab qilinadi" });
      }
      const status = getUserSubscription(userId);
      res.json({ success: true, subscription: status });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2.5. Yangi buyurtma yaratish
  app.post('/api/subscriptions/order', (req, res) => {
    try {
      const { userId, plan, paymentMethod } = req.body;
      if (!userId || !plan) {
        return res.status(400).json({ error: "userId va plan talab qilinadi" });
      }
      const order = createOrder({
        userId,
        plan,
        paymentMethod: paymentMethod || 'demo'
      });
      res.json({ success: true, order });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2.6. Sinov to'lovini yakunlash (Demo to'lov)
  app.post('/api/subscriptions/pay-demo', (req, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: "orderId talab qilinadi" });
      }
      const result = completeOrder(orderId, 'demo');
      if (!result.success) {
        return res.status(400).json({ error: result.message || "To'lov amalga oshmadi" });
      }

      // Agar Telegram Bot ulangan bo'lsa, xabar yuborish
      if (telegramBotToken && result.order?.user_id && !result.order.user_id.startsWith('demo_')) {
        const planInfo = PRICING_PLANS[result.order.plan];
        const msg = `🎉 <b>Tabriklaymiz! Obunangiz faollashtirildi!</b> 🚀\n\n` +
          `Siz muvaffaqiyatli <b>${planInfo.name}</b> tarifiga o'tdingiz!\n` +
          `Amal qilish muddati: <b>${planInfo.durationDays} kun</b>.\n\n` +
          `Endi barcha imkoniyatlar — AI testlar va 3D Flashcardlar siz uchun to'liq ochiq!`;
        sendTelegramMessage(telegramBotToken, result.order.user_id, msg);
      }

      res.json({ success: true, user: result.user, order: result.order });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2.7. Foydalanuvchining to'lovlar tarixi
  app.get('/api/subscriptions/orders', (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId talab qilinadi" });
      }
      const orders = getUserOrders(userId);
      res.json({ success: true, orders });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Test generatsiya qilish (HEMIS Parser + Gemini Free API)
  app.post('/api/generate-quiz', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Hech qanday fayl yuklanmadi." });
      }

      const text = await extractTextFromFile(req.file);

      if (!text || !text.trim()) {
        return res.status(400).json({ error: "Hujjatdan matn ajratib bo'lmadi. Fayl bo'sh emasligiga ishonch hosil qiling." });
      }

      // 1-QADAM: HEMIS formatini tekshirish
      const hemisResult = parseHemisQuiz(text);
      if (hemisResult.isHemis && hemisResult.questions.length > 0) {
        return res.json({
          questions: hemisResult.questions,
          source: 'hemis',
          formatType: hemisResult.formatType,
          total: hemisResult.questions.length,
          title: req.file.originalname.replace(/\.[^/.]+$/, ""),
          message: `HEMIS shabloni muvaffaqiyatli aniqlandi! ${hemisResult.questions.length} ta savol sun'iy intellektsiz, 100% aniqlik bilan testga aylantirildi.`
        });
      }

      // 2-QADAM: Gemini Free API
      const userId = (req.body.userId as string) || (req.query.userId as string) || 'anonymous';
      const aiQuota = canGenerateAiTest(userId);
      if (!aiQuota.allowed) {
        return res.status(403).json({
          error: aiQuota.reason,
          isLimitReached: true
        });
      }

      if (!geminiAi) {
        return res.status(400).json({
          error: "Hujjatda HEMIS formati (++++ / ==== yoki 1. A) B) C)) aniqlanmadi. Erkin matndan test tuzish uchun bepul GEMINI_API_KEY talab qilinadi. Iltimos, .env fayliga GEMINI_API_KEY kiriting yoki faylni HEMIS formatida yuklang."
        });
      }

      try {
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
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                      },
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

        recordAiTest(userId);

        return res.json({
          questions: quizData.questions,
          source: 'gemini',
          total: quizData.questions.length,
          title: req.file.originalname.replace(/\.[^/.]+$/, "")
        });

      } catch (aiErr: any) {
        console.error("Gemini Error:", aiErr);
        return res.status(500).json({ error: aiErr.message || "Gemini orqali test tuzishda xatolik yuz berdi." });
      }

    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Testni qayta ishlashda xatolik yuz berdi." });
    }
  });

  // 4. Testlarni boshqarish (CRUD)
  // Test yaratish / saqlash
  app.post('/api/quizzes', (req, res) => {
    try {
      const { id, userId, title, subject, sourceType, questions, timeLimitMinutes, isPublic } = req.body;
      if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: "Test nomi va kamida bitta savol kiritilishi shart." });
      }

      const saved = createQuiz({
        id: id || Math.random().toString(36).substring(7),
        user_id: userId || 'anonymous',
        title,
        subject: subject || 'Umumiy',
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

  // Testni olish (barcha savollari bilan)
  app.get('/api/quizzes/:id', (req, res) => {
    try {
      const quiz = getQuiz(req.params.id);
      if (!quiz) {
        return res.status(404).json({ error: "Test topilmadi" });
      }
      res.json({ success: true, quiz });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Foydalanuvchining testlari ro'yxati
  app.get('/api/quizzes', (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (userId) {
        const quizzes = getUserQuizzes(userId);
        return res.json({ success: true, quizzes });
      }
      const publicQuizzes = getPublicQuizzes();
      res.json({ success: true, quizzes: publicQuizzes });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Testni yangilash / tahrirlash (Quiz Editor)
  app.put('/api/quizzes/:id', (req, res) => {
    try {
      const { title, subject, timeLimitMinutes, isPublic, questions } = req.body;
      const updated = updateQuiz(req.params.id, {
        title,
        subject,
        time_limit_minutes: timeLimitMinutes,
        is_public: isPublic
      }, questions);

      if (!updated) {
        return res.status(404).json({ error: "Test topilmadi" });
      }
      res.json({ success: true, quiz: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Testni o'chirish
  app.delete('/api/quizzes/:id', (req, res) => {
    try {
      const userId = (req.query.userId as string) || (req.body.userId as string) || '';
      const ok = deleteQuiz(req.params.id, userId);
      if (!ok) {
        return res.status(400).json({ error: "Test o'chirilmadi yoki sizda huquq yo'q" });
      }
      res.json({ success: true, message: "Test muvaffaqiyatli o'chirildi" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Natijalar / Urinishlar (Attempts)
  app.post('/api/attempts', (req, res) => {
    try {
      const { id, userId, quizId, score, total, percentage, timeSpentSeconds, answersGiven } = req.body;
      if (!userId || !quizId || score === undefined || total === undefined) {
        return res.status(400).json({ error: "Natija ma'lumotlari to'liq emas" });
      }

      const attempt = saveAttempt({
        id: id || Math.random().toString(36).substring(7),
        user_id: userId,
        quiz_id: quizId,
        score,
        total,
        percentage: percentage !== undefined ? percentage : Math.round((score / total) * 100),
        time_spent_seconds: timeSpentSeconds || 0,
        answers_given: answersGiven || []
      });

      // Agar Telegram ulanishi bo'lsa, foydalanuvchiga Telegram orqali natija xabari yuborish
      if (telegramBotToken && userId && !userId.startsWith('demo_')) {
        const quiz = getQuiz(quizId);
        const mins = Math.floor((timeSpentSeconds || 0) / 60);
        const secs = (timeSpentSeconds || 0) % 60;
        const timeStr = `${mins}m ${secs}s`;

        const msg = `📊 <b>Yangi Test Natijasi!</b>\n\n` +
          `📖 <b>Test:</b> ${quiz?.title || 'Test'}\n` +
          `🎯 <b>Natija:</b> ${score} / ${total} (${attempt.percentage}%)\n` +
          `⏱ <b>Sarflangan vaqt:</b> ${timeStr}\n\n` +
          `${attempt.percentage >= 60 ? "🎉 Tabriklaymiz, muvaffaqiyatli topshirdingiz!" : "📚 Ko'proq shug'ullanish tavsiya etiladi."}`;

        sendTelegramMessage(telegramBotToken, userId, msg);
      }

      res.json({ success: true, attempt });
    } catch (err: any) {
      console.error("Save attempt error:", err);
      res.status(500).json({ error: err.message || "Natijani saqlashda xatolik" });
    }
  });

  // Natijani olish
  app.get('/api/attempts/:id', (req, res) => {
    try {
      const attempt = getAttempt(req.params.id);
      if (!attempt) {
        return res.status(404).json({ error: "Natija topilmadi" });
      }
      const quiz = getQuiz(attempt.quiz_id);
      res.json({ success: true, attempt, quiz });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Foydalanuvchining barcha natijalari (Tarix)
  app.get('/api/attempts', (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId talab qilinadi" });
      }
      const attempts = getUserAttempts(userId);
      res.json({ success: true, attempts });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Frontend SPA xizmati
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const indexHtmlPath = path.join(__dirname, 'index.html');
    app.use(express.static(__dirname));
    app.get('*', (req, res) => {
      res.sendFile(indexHtmlPath);
    });
  }

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api/')) {
       console.error("API Error Response:", err);
       res.status(500).json({ error: err.message || "Ichki server xatoligi" });
       return;
    }
    next(err);
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
