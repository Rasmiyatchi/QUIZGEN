import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { 
  initDatabase, 
  upsertUser, 
  getUser,
  getUserStats,
  createAttempt,
  getAttempt,
  updateAttemptAnswers,
  finishAttempt,
  updateUserGamification,
  createOrder,
  completeOrder,
  createPromoCode,
  validatePromoCode,
  createLibraryFolder,
  saveQuizToLibrary,
  getUserSavedQuizzes,
  forkQuiz,
  searchPublicQuizzes
} from '../src/lib/db.ts';

import { QuizCreationService } from '../src/services/quiz-creation.service.ts';
import { getEffectiveEntitlements } from '../src/lib/entitlements.ts';
import { createAccessToken, verifyAccessToken } from '../src/middleware/auth.ts';
import { createDatabaseBackup } from '../scripts/backup.ts';

describe('M9 — Ishga Tushirish va E2E To\'liq Tsikl (Release Lifecycle) Testlari', () => {

  test('1. To\'liq Tsikl (E2E): Ro\'yxatdan o\'tish -> HEMIS Test yaratish -> Imtihon topshirish -> Ball va XP olish', () => {
    initDatabase();
    const studentId = 'u_e2e_student_' + Date.now();
    const student = upsertUser({
      id: studentId,
      first_name: 'E2E Student',
      username: 'e2e_student',
      role: 'student',
      subscription_plan: 'free'
    });

    // 1. JWT Sessiya tekshiruvi
    const token = createAccessToken({ uid: student.id, role: student.role, plan: student.subscription_plan });
    const decoded = verifyAccessToken(token);
    assert.ok(decoded);
    assert.equal(decoded.uid, studentId);

    // 2. HEMIS test yaratish (QuizCreationService orqali)
    const hemisRawText = `
++++
Toshkent qaysi davlat poytaxti?
====
#O'zbekiston
====
Qozog'iston
====
Tojikiston
====
Qirg'iziston
++++
2 + 2 nechaga teng?
====
#4
====
3
====
5
====
6
`;

    const createRes = QuizCreationService.createFromText({
      userId: studentId,
      text: hemisRawText,
      title: 'E2E HEMIS Sinov Testi',
      subject: 'Umumiy'
    });

    assert.equal(createRes.success, true);
    assert.ok(createRes.quiz);
    assert.equal(createRes.quiz.total_questions, 2);
    const quizId = createRes.quiz.id;

    // 3. Imtihon urinishini boshlash (createAttempt)
    const attempt = createAttempt({
      user_id: studentId,
      quiz_id: quizId,
      mode: 'exam',
      total: 2
    });
    assert.ok(attempt.id);
    assert.equal(attempt.status, 'in_progress');

    // 4. Javoblarni belgilash (1-savol to'g'ri: 0, 2-savol xato: 1)
    const answers = [0, 1];
    updateAttemptAnswers(attempt.id, answers, 45);

    // 5. Imtihonni yakunlash (finishAttempt)
    const finished = finishAttempt(attempt.id, {
      score: 1,
      total: 2,
      percentage: 50,
      time_spent_seconds: 45,
      answers_given: answers,
      wrong_questions: [{ question_text: '2 + 2 nechaga teng?', given_answer: 1, correct_answer: 0 }],
      status: 'completed'
    });
    assert.ok(finished);
    assert.equal(finished.status, 'completed');
    assert.equal(finished.score, 1); // 2 tadan 1 tasi to'g'ri
    assert.equal(finished.percentage, 50);
    assert.equal(finished.wrong_questions?.length, 1); // 1 ta savol xato qilingan

    // 6. Gamifikatsiya: XP va seriya (Streak) yozilishi
    updateUserGamification(studentId, 50);
    const stats = getUserStats(studentId);
    assert.ok(stats.xp > 0, 'Test topshirilgach XP oshishi shart');
    assert.ok(stats.streak_days >= 1, 'Ketma-ket kunlar kamida 1 bo\'lishi shart');
  });

  test('2. Obunani Promokod bilan yangilash va Huquqlar (Entitlements) tekshiruvi', () => {
    initDatabase();
    const userId = 'u_sub_promo_' + Date.now();
    upsertUser({ id: userId, first_name: 'Sub Buyer', role: 'student', subscription_plan: 'free' });

    // Free tarif huquqlarini tekshiramiz
    const freeEntitlements = getEffectiveEntitlements(userId);
    assert.equal(freeEntitlements.plan, 'free');
    assert.equal(freeEntitlements.entitlements.ai_daily_limit, 3);
    assert.equal(freeEntitlements.entitlements.editor, false);

    // Admin promokod yaratadi (20% chegirma)
    const promoCode = 'RELEASE20_' + Date.now();
    createPromoCode(promoCode, 'percent', 20, 'pro', 10, 7);

    // Promokodni tasdiqlaymiz
    const promoCheck = validatePromoCode(promoCode, 'pro');
    assert.equal(promoCheck.valid, true);
    assert.equal(promoCheck.discountAmount, 6000); // 29,999 dan 20% = 6000

    // Buyurtma yaratamiz
    const order = createOrder({
      userId,
      plan: 'pro',
      paymentMethod: 'click'
    });
    assert.ok(order.id);
    assert.equal(order.status, 'pending');

    // To'lovni tasdiqlaymiz (completeOrder)
    const completed = completeOrder(order.id, 'click_tx_12345');
    assert.equal(completed.success, true);

    // Obuna yangilanganini va huquqlarni tekshiramiz
    const proUser = getUser(userId);
    assert.equal(proUser?.subscription_plan, 'pro');

    const proEntitlements = getEffectiveEntitlements(userId);
    assert.equal(proEntitlements.plan, 'pro');
    assert.equal(proEntitlements.entitlements.ai_daily_limit, 50);
    assert.equal(proEntitlements.entitlements.editor, true);
    assert.equal(proEntitlements.entitlements.flashcards, true);
  });

  test('3. Test Kutubxonasi, Jildlar va Mustaqil Nusxa olish (Fork) oqimi', () => {
    initDatabase();
    const authorId = 'u_author_lib_' + Date.now();
    const readerId = 'u_reader_lib_' + Date.now();
    upsertUser({ id: authorId, first_name: 'Author' });
    upsertUser({ id: readerId, first_name: 'Reader' });

    // Test yaratish
    const createRes = QuizCreationService.createFromText({
      userId: authorId,
      text: `++++\nKutubxona savoli?\n====\n#To'g'ri\n====\nNoto'g'ri`,
      title: 'Ommaviy Fizika Testi',
      subject: 'Aniq fanlar'
    });
    const quizId = createRes.quiz!.id;

    // Reader jild yaratadi va testni saqlaydi
    const folder = createLibraryFolder(readerId, 'Mening imtihonlarim', '#3B82F6');
    assert.ok(folder.id);

    const saved = saveQuizToLibrary(readerId, quizId, folder.id);
    assert.equal(saved.success, true);

    const mySaved = getUserSavedQuizzes(readerId, folder.id);
    assert.equal(mySaved.length, 1);
    assert.equal(mySaved[0].id, quizId);

    // Ommaviy qidiruv tekshiruvi
    const searchRes = searchPublicQuizzes({ q: 'Fizika' });
    const found = searchRes.find((q: any) => q.id === quizId);
    assert.ok(found, 'Ommaviy test qidiruvda topilishi kerak');

    // Reader testdan mustaqil nusxa (Fork) oladi
    const forked = forkQuiz(quizId, readerId);
    assert.ok(forked);
    assert.notEqual(forked.id, quizId);
    assert.equal(forked.user_id, readerId);
    assert.equal(forked.forked_from, quizId);
  });

  test('4. Tizim Zaxirasi va Baza Yaxlitligi (Backup & Integrity Check)', () => {
    const backupRes = createDatabaseBackup('./data/quizgen.db', './data/backups', 7);
    assert.equal(backupRes.success, true);
    assert.equal(backupRes.integrityOk, true);
    assert.ok(backupRes.backupFile);
  });

});
