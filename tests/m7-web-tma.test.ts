import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { 
  initDatabase, 
  upsertUser, 
  createQuiz, 
  getQuiz, 
  getUserStats,
  getUser,
  updateUserGamification
} from '../src/lib/db.ts';
import { verifyTelegramWebAppData } from '../src/lib/telegram-auth.ts';
import { QuizCreationService } from '../src/services/quiz-creation.service.ts';
import crypto from 'crypto';

describe('M7 — Veb va Mini App Sayqali Testlari (P1)', () => {

  test('1. QuizCreationService.createFromText: Matndan to\'g\'ri test yaratish va parse hisoboti', async () => {
    initDatabase();
    const userId = 'user_m7_text_' + Date.now();
    upsertUser({ id: userId, first_name: 'Talaba M7', role: 'student' });

    const rawText = `
++++
Informatika fanining predmeti nima?
====
#Axborot va uning xususiyatlari
====
Faqat kompyuterlar
====
Dasturlash tillari
====
Internet tarmoqlari

++++
1 Bayt necha bitga teng?
====
4 bit
====
#8 bit
====
16 bit
====
32 bit
`;

    const result = QuizCreationService.createFromText({
      userId,
      text: rawText,
      title: 'Informatika Asoslari'
    });
    assert.equal(result.success, true);
    assert.ok(result.quiz?.id);
    assert.equal(result.quiz?.total_questions, 2);

    const savedQuiz = getQuiz(result.quiz!.id);
    assert.ok(savedQuiz);
    assert.equal(savedQuiz?.questions.length, 2);
    assert.equal(savedQuiz?.questions[0].correctAnswer, 0);
    assert.equal(savedQuiz?.questions[1].correctAnswer, 1);
  });

  test('2. QuizCreationService.createManual: Qo\'lda savolma-savol tuzish va validatsiya', () => {
    initDatabase();
    const userId = 'user_m7_manual_' + Date.now();
    upsertUser({ id: userId, first_name: 'Muallim M7', role: 'student' });

    const manualQuestions = [
      {
        question: 'O\'zbekiston Konstitutsiyasi qachon qabul qilingan?',
        options: ['1991-yil', '1992-yil 8-dekabr', '1993-yil', '1990-yil'],
        correctAnswer: 1,
        explanation: '1992-yil 8-dekabrda 12-chaqiriq Oliy Kengashda qabul qilingan.'
      },
      {
        question: 'Alisher Navoiy qachon tug\'ilgan?',
        options: ['1441-yil 9-fevral', '1483-yil', '1336-yil', '1501-yil'],
        correctAnswer: 0
      }
    ];

    const result = QuizCreationService.createManual({
      userId,
      title: 'O\'zbekiston Tarixi va Madaniyati',
      questions: manualQuestions as any,
      subject: 'Ijtimoiy fanlar'
    });

    assert.equal(result.success, true);
    assert.ok(result.quiz);
    assert.ok(result.quiz.id);
    assert.equal(result.quiz.title, 'O\'zbekiston Tarixi va Madaniyati');
    assert.equal(result.quiz.total_questions, 2);

    const loaded = getQuiz(result.quiz.id);
    assert.ok(loaded);
    assert.equal(loaded?.questions[0].explanation, '1992-yil 8-dekabrda 12-chaqiriq Oliy Kengashda qabul qilingan.');
  });

  test('3. Foydalanuvchi Profil Statistikasi (getUserStats): Darajalar, XP va Seriyalar hisobi', () => {
    initDatabase();
    const userId = 'user_m7_profile_' + Date.now();
    upsertUser({ id: userId, first_name: 'Grand Champion', role: 'student' });

    // Foydalanuvchi XP sini 1600 ga yetkazamiz
    updateUserGamification(userId, 1600);

    const stats = getUserStats(userId);
    assert.equal(stats.xp, 1600);
    assert.equal(stats.streak_days, 1);
    assert.equal(stats.rank_title, 'Usta (Master)');
    assert.equal(stats.rank_level, 5);
    assert.equal(stats.next_level_xp, 3000);
  });

  test('4. TMA Xavfsizligi: verifyTelegramWebAppData yaroqli va qalbaki hash larni tekshiradi', () => {
    const botToken = '123456789:ABCdefGHIjklMNOpqrSTUvwxyz';
    const authDate = Math.floor(Date.now() / 1000);
    const userJson = JSON.stringify({ id: 987654321, first_name: 'Anvar', username: 'anvar_tma' });

    // To'g'ri hash hisoblaymiz (HMAC-SHA256)
    const dataCheckString = `auth_date=${authDate}\nuser=${userJson}`;
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const validHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const validInitData = `auth_date=${authDate}&user=${encodeURIComponent(userJson)}&hash=${validHash}`;

    // 1. To'g'ri initData tekshiruvdan o'tishi kerak
    const validCheck = verifyTelegramWebAppData(validInitData, botToken);
    assert.equal(validCheck.valid, true);
    assert.equal(validCheck.user?.id, 987654321);
    assert.equal(validCheck.user?.first_name, 'Anvar');

    // 2. Soxtalashtirilgan hash rad etilishi kerak
    const invalidInitData = `auth_date=${authDate}&user=${encodeURIComponent(userJson)}&hash=fake_hash_1234567890`;
    const invalidCheck = verifyTelegramWebAppData(invalidInitData, botToken);
    assert.equal(invalidCheck.valid, false);

    // 3. Muddati o'tgan (24 soatdan eski) initData rad etilishi kerak
    const oldAuthDate = Math.floor(Date.now() / 1000) - (25 * 60 * 60); // 25 soat oldin
    const oldCheckString = `auth_date=${oldAuthDate}\nuser=${userJson}`;
    const oldHash = crypto.createHmac('sha256', secretKey).update(oldCheckString).digest('hex');
    const expiredInitData = `auth_date=${oldAuthDate}&user=${encodeURIComponent(userJson)}&hash=${oldHash}`;
    const expiredCheck = verifyTelegramWebAppData(expiredInitData, botToken);
    assert.equal(expiredCheck.valid, false, '24 soatdan eski initData rad etilishi shart');
  });

});
