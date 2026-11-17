/**
 * M4 — Yagona Test Yaratish Servisi (QuizCreationService)
 * 
 * Qoida 5: Web va Telegram bot bitta yagona servis orqali test yaratadi.
 * Kod takrorlanmaydi.
 */
import { createRequire } from 'module';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  createQuiz, 
  QuizRecord, 
  QuestionRecord, 
  generateId 
} from '../lib/db.ts';
import { 
  parseHemisQuizWithReport, 
  preprocessHtmlDocx, 
  ParseReport, 
  HemisQuestion 
} from '../lib/hemis-parser.ts';
import { checkFileMagicBytes } from '../lib/security.ts';
import { 
  getEffectiveEntitlements, 
  incrementAiUsage 
} from '../lib/entitlements.ts';

const require = createRequire(import.meta.url);

export class QuizCreationService {
  /**
   * Fayldan matn ajratib olish (Magic bytes va format tekshiruvi bilan)
   */
  static async extractTextFromFile(buffer: Buffer, fileName: string, mimeType?: string): Promise<string> {
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    
    // S13 — Magic bytes tekshiruvi
    const isValidMagic = checkFileMagicBytes(buffer, ext);
    if (!isValidMagic) {
      throw new Error(`Fayl turi mos kelmaydi yoki buzilgan. Faqat haqiqiy .docx, .pdf, .txt fayllar qabul qilinadi.`);
    }

    let text = '';

    // 1. PDF fayl
    if (ext === 'pdf' || mimeType === 'application/pdf') {
      try {
        const pdfParseModule = require('pdf-parse');
        if (typeof pdfParseModule === 'function') {
          const data = await pdfParseModule(buffer);
          text = data.text || '';
        } else if (pdfParseModule.PDFParse) {
          const parser = new pdfParseModule.PDFParse({ data: buffer });
          const data = await parser.getText();
          text = data.text || '';
        }
      } catch (pdfErr: any) {
        throw new Error(`PDF faylini tahlil qilishda xatolik: ${pdfErr.message}`);
      }
    } 
    // 2. Word (.docx) fayl
    else if (ext === 'docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const mammoth = require('mammoth');
      try {
        // Avval HTML ga o'giramiz (qalin/bold belgilangan to'g'ri javoblarni saqlab qolish uchun)
        const htmlRes = await mammoth.convertToHtml({ buffer });
        if (htmlRes.value && htmlRes.value.length > 50) {
          text = preprocessHtmlDocx(htmlRes.value);
        }
      } catch (htmlErr) {
        // Fallback: oddiy matn chiqarish
        const rawRes = await mammoth.extractRawText({ buffer });
        text = rawRes.value || '';
      }

      if (!text || text.length < 20) {
        const rawRes = await mammoth.extractRawText({ buffer });
        text = rawRes.value || '';
      }
    } 
    // 3. Matn (.txt) fayl
    else if (ext === 'txt' || mimeType === 'text/plain') {
      text = buffer.toString('utf8');
    } else {
      throw new Error("Qo'llab-quvvatlanmaydigan fayl formati. Word (.docx), PDF (.pdf) yoki Matn (.txt) yuboring.");
    }

    return text.trim();
  }

  /**
   * Fayldan test yaratish (HEMIS Parser orqali)
   */
  static async createFromFile(options: {
    buffer: Buffer;
    fileName: string;
    mimeType?: string;
    userId: string;
    title?: string;
    timeLimitMinutes?: number;
  }): Promise<{ success: boolean; quiz?: QuizRecord; report: ParseReport; message?: string }> {
    const text = await this.extractTextFromFile(options.buffer, options.fileName, options.mimeType);
    if (!text) {
      return {
        success: false,
        report: { isHemis: false, totalFound: 0, validQuestions: 0, needsReviewCount: 0, warnings: ["Fayl bo'sh"], questions: [] },
        message: "Fayldan matn ajratib bo'lmadi."
      };
    }

    const title = options.title || options.fileName.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ');
    return this.createFromText({
      text,
      userId: options.userId,
      title,
      timeLimitMinutes: options.timeLimitMinutes,
      sourceType: 'hemis'
    });
  }

  /**
   * Matndan test yaratish (HEMIS Parser orqali)
   */
  static createFromText(options: {
    text: string;
    userId: string;
    title?: string;
    timeLimitMinutes?: number;
    sourceType?: 'hemis' | 'manual';
  }): { success: boolean; quiz?: QuizRecord; report: ParseReport; message?: string } {
    const report = parseHemisQuizWithReport(options.text);

    if (!report.isHemis || report.questions.length === 0) {
      return {
        success: false,
        report,
        message: "HEMIS shabloni aniqlanmadi. Test formati ++++ / ==== yoki 1. A) B) ko'rinishida bo'lishi kerak."
      };
    }

    // Foydalanuvchi tarifi bo'yicha savollar soni cheklovi
    const entitlements = getEffectiveEntitlements(options.userId);
    let maxQuestions = 100; // Free limit
    if (entitlements.plan === 'start') maxQuestions = 150;
    if (entitlements.plan === 'pro') maxQuestions = 300;
    if (entitlements.plan === 'master') maxQuestions = 1000;

    let finalQuestions = report.questions;
    if (finalQuestions.length > maxQuestions) {
      report.warnings.push(`Tarifingiz (${entitlements.plan.toUpperCase()}) bo'yicha maksimal ${maxQuestions} ta savol yuklandi (${report.questions.length} tadan).`);
      finalQuestions = finalQuestions.slice(0, maxQuestions);
    }

    const quizId = generateId();
    const questionRecords: QuestionRecord[] = finalQuestions.map((q, idx) => ({
      id: generateId(),
      quiz_id: quizId,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      order_num: idx
    }));

    // Vaqt chegarasi: agar belgilanmagan bo'lsa, har bir savol uchun 1 daqiqa
    const timeLimit = options.timeLimitMinutes ?? Math.max(5, Math.ceil(finalQuestions.length * 0.8));

    const quizRecord: QuizRecord = {
      id: quizId,
      user_id: options.userId,
      title: options.title || `Test (${finalQuestions.length} ta savol)`,
      subject: 'Umumiy',
      source_type: options.sourceType || 'hemis',
      total_questions: finalQuestions.length,
      time_limit_minutes: timeLimit,
      is_public: 1
    };

    const createdQuiz = createQuiz(quizRecord, questionRecords);

    return {
      success: true,
      quiz: createdQuiz,
      report
    };
  }

  /**
   * Gemini AI yordamida mavzu yoki matn bo'yicha test yaratish
   */
  static async createFromAi(options: {
    prompt: string;
    userId: string;
    count?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    subject?: string;
    apiKey?: string;
  }): Promise<{ success: boolean; quiz?: QuizRecord; remainingQuota?: number; message?: string }> {
    const entitlements = getEffectiveEntitlements(options.userId);
    const limit = entitlements.entitlements.ai_daily_limit;

    // AI kvotasini atomik tekshirish va oshirish
    const quotaAllowed = incrementAiUsage(options.userId, limit);
    if (!quotaAllowed) {
      return {
        success: false,
        message: `Bugungi kunlik AI generatsiya limitingiz (${limit} ta) tugadi. Qo'shimcha limit uchun tarifni oshiring yoki HEMIS testlaridan mutlaqo BEPUL foydalaning!`
      };
    }

    const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { success: false, message: "GEMINI_API_KEY serverda sozlanmagan." };
    }

    const ai = new GoogleGenAI({ apiKey });
    const count = Math.min(Math.max(options.count || 10, 5), 30);
    const difficultyUz = options.difficulty === 'hard' ? 'murakkab' : options.difficulty === 'medium' ? "o'rtacha" : 'oson';

    const systemPrompt = `Siz professional test tuzuvchi O'zbekiston Oliy ta'lim tizimi mutaxassisisiz.
Foydalanuvchi taqdim etgan mavzu yoki matn asosida aynan ${count} ta test savolini tuzing.
Qiyinlik darajasi: ${difficultyUz}.

Har bir savolda:
- question: savol matni
- options: kamida 4 ta variant (aniq va tushunarli)
- correctAnswer: to'g'ri javobning 0 dan boshlanuvchi indeksi (0 = A, 1 = B, 2 = C, 3 = D)
- explanation: to'g'ri javob nega to'g'riligi haqida qisqacha tushuntirish

Faqat ko'rsatilgan JSON formatida javob bering, ortiqcha matn qo'shmang.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `Mavzu/Matn: ${options.prompt}` }] }
      ],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              correctAnswer: { type: Type.INTEGER },
              explanation: { type: Type.STRING }
            },
            required: ['question', 'options', 'correctAnswer']
          }
        }
      }
    });

    const parsedJson = JSON.parse(response.text || '[]');
    if (!Array.isArray(parsedJson) || parsedJson.length === 0) {
      return { success: false, message: "AI dan savollar olinmadi." };
    }

    const quizId = generateId();
    const questions: QuestionRecord[] = parsedJson.map((q: any, idx: number) => ({
      id: generateId(),
      quiz_id: quizId,
      question: q.question,
      options: q.options,
      correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
      explanation: q.explanation || '',
      order_num: idx
    }));

    const quizRecord: QuizRecord = {
      id: quizId,
      user_id: options.userId,
      title: options.subject || options.prompt.substring(0, 40) + '...',
      subject: options.subject || 'AI Test',
      source_type: 'gemini',
      total_questions: questions.length,
      time_limit_minutes: Math.max(5, questions.length),
      is_public: 1
    };

    const createdQuiz = createQuiz(quizRecord, questions);
    const updatedEnt = getEffectiveEntitlements(options.userId);

    return {
      success: true,
      quiz: createdQuiz,
      remainingQuota: updatedEnt.ai_remaining
    };
  }

  /**
   * Qo'lda savolma-savol test yaratish
   */
  static createManual(options: {
    userId: string;
    title: string;
    subject?: string;
    timeLimitMinutes?: number;
    questions: QuestionRecord[];
  }): { success: boolean; quiz: QuizRecord } {
    const quizId = generateId();
    const questionRecords: QuestionRecord[] = options.questions.map((q, idx) => ({
      ...q,
      id: q.id || generateId(),
      quiz_id: quizId,
      order_num: idx
    }));

    const quizRecord: QuizRecord = {
      id: quizId,
      user_id: options.userId,
      title: options.title,
      subject: options.subject || 'Umumiy',
      source_type: 'manual',
      total_questions: questionRecords.length,
      time_limit_minutes: options.timeLimitMinutes || Math.max(5, questionRecords.length),
      is_public: 1
    };

    const createdQuiz = createQuiz(quizRecord, questionRecords);
    return { success: true, quiz: createdQuiz };
  }
}

