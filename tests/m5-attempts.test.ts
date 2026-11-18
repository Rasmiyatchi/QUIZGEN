import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { 
  initDatabase, 
  upsertUser, 
  createQuiz, 
  getQuiz,
  createAttempt,
  getAttempt,
  getActiveAttempt,
  updateAttemptAnswers,
  finishAttempt,
  getUserAttempts,
  updateUserGamification,
  getUserStats,
  getQuizLeaderboard
} from '../src/lib/db.ts';

describe('M5 — Server Urinishlari, Yechish Tajribasi va Gamifikatsiya Testlari', () => {

  test('1. Urinish yaratish: to\'g\'ri javoblar tarmoqqa sizmaydi (S10) va deadline to\'g\'ri hisoblanadi', () => {
    initDatabase();
    const userId = 'user_m5_test_' + Date.now();
    upsertUser({ id: userId, first_name: 'Testchi M5', role: 'student' });

    // Test yaratamiz
    const quizId = 'quiz_m5_' + Date.now();
    const sampleQuestions = [
      { id: 'q1', quiz_id: quizId, question: 'O\'zbekiston poytaxti qayer?', options: ['Samarqand', 'Toshkent', 'Buxoro', 'Xiva'], correctAnswer: 1 },
      { id: 'q2', quiz_id: quizId, question: '2 * 3 nechaga teng?', options: ['5', '6', '7', '8'], correctAnswer: 1 }
    ];
    createQuiz({
      id: quizId,
      user_id: userId,
      title: 'Geografiya va Matematika',
      total_questions: 2,
      time_limit_minutes: 10,
      is_public: 1
    }, sampleQuestions as any);

    // Urinish yaratamiz (imtihon rejimi)
    const attempt = createAttempt({
      user_id: userId,
      quiz_id: quizId,
      mode: 'exam',
      total: 2,
      time_limit_minutes: 10
    });

    assert.ok(attempt.id, 'Urinish ID si mavjud bo\'lishi shart');
    assert.equal(attempt.status, 'in_progress');
    assert.equal(attempt.mode, 'exam');
    assert.ok(attempt.deadline_at, 'Vaqt chegarali testda deadline_at bo\'lishi shart');

    // Deadline 10 daqiqa oldinga qo'yilganligini tekshirish
    const deadlineMs = new Date(attempt.deadline_at!).getTime();
    const nowMs = Date.now();
    assert.ok(deadlineMs > nowMs + 9 * 60 * 1000 && deadlineMs <= nowMs + 10 * 60 * 1000 + 2000, 'Deadline 10 daqiqa atrofida bo\'lishi kerak');
  });

  test('2. Oraliq javoblarni saqlash (Batch answers) va Boshqa qurilmadan davom ettirish (Resume)', () => {
    initDatabase();
    const userId = 'user_resume_' + Date.now();
    upsertUser({ id: userId, first_name: 'Resume Foydalanuvchi', role: 'student' });

    const quizId = 'quiz_resume_' + Date.now();
    createQuiz({
      id: quizId,
      user_id: userId,
      title: 'Resume Test',
      total_questions: 3,
      is_public: 1
    }, [
      { id: 'q1', quiz_id: quizId, question: 'Savol 1', options: ['A', 'B'], correctAnswer: 0 },
      { id: 'q2', quiz_id: quizId, question: 'Savol 2', options: ['C', 'D'], correctAnswer: 1 },
      { id: 'q3', quiz_id: quizId, question: 'Savol 3', options: ['E', 'F'], correctAnswer: 0 }
    ] as any);

    // 1-qurilma: Urinish boshlaydi
    const attempt = createAttempt({
      user_id: userId,
      quiz_id: quizId,
      mode: 'exam',
      total: 3
    });

    // 1-qurilma: 1-savolga javob beradi (0) va serverga sinxronlaydi
    const partialAnswers = [0, -1, -1];
    const updated = updateAttemptAnswers(attempt.id, partialAnswers, 35);
    assert.equal(updated, true);

    // 2-qurilma: Foydalanuvchi faol urinishni tekshiradi (Resume)
    const active = getActiveAttempt(userId, quizId);
    assert.ok(active, 'Faol urinish topilishi shart');
    assert.equal(active.id, attempt.id);
    assert.equal(active.status, 'in_progress');
    assert.equal(active.time_spent_seconds, 35);
    assert.deepEqual(active.answers_given, [0, -1, -1]);
  });

  test('3. Urinishni yakunlash (Finish): ball serverda to\'g\'ri hisoblanadi va xatolar ro\'yxati tuziladi', () => {
    initDatabase();
    const userId = 'user_finish_' + Date.now();
    upsertUser({ id: userId, first_name: 'Imtihon topshiruvchi', role: 'student' });

    const quizId = 'quiz_finish_' + Date.now();
    createQuiz({
      id: quizId,
      user_id: userId,
      title: 'Yakunlash Testi',
      total_questions: 4,
      is_public: 1
    }, [
      { id: 'q1', quiz_id: quizId, question: '1+1', options: ['1', '2', '3'], correctAnswer: 1 },
      { id: 'q2', quiz_id: quizId, question: '2+2', options: ['3', '4', '5'], correctAnswer: 1 },
      { id: 'q3', quiz_id: quizId, question: '3+3', options: ['5', '6', '7'], correctAnswer: 1 },
      { id: 'q4', quiz_id: quizId, question: '4+4', options: ['7', '8', '9'], correctAnswer: 1 }
    ] as any);

    const attempt = createAttempt({
      user_id: userId,
      quiz_id: quizId,
      mode: 'exam',
      total: 4
    });

    // Foydalanuvchi javoblari: q1 to'g'ri (1), q2 noto'g'ri (0), q3 to'g'ri (1), q4 noto'g'ri (2)
    const userAnswers = [1, 0, 1, 2];
    const wrongQuestions = [
      { index: 1, question: '2+2', options: ['3', '4', '5'], userAnswer: 0, correctAnswer: 1 },
      { index: 3, question: '4+4', options: ['7', '8', '9'], userAnswer: 2, correctAnswer: 1 }
    ];

    const finished = finishAttempt(attempt.id, {
      score: 2,
      total: 4,
      percentage: 50,
      time_spent_seconds: 120,
      answers_given: userAnswers,
      wrong_questions: wrongQuestions,
      status: 'completed'
    });

    assert.ok(finished);
    assert.equal(finished.status, 'completed');
    assert.equal(finished.score, 2);
    assert.equal(finished.total, 4);
    assert.equal(finished.percentage, 50);
    assert.equal(finished.wrong_questions?.length, 2);

    // Endi getActiveAttempt bu quiz uchun bo'sh bo'lishi kerak (chunki completed bo'ldi)
    const activeAfterFinish = getActiveAttempt(userId, quizId);
    assert.equal(activeAfterFinish, null, 'Yakunlangan urinish active bo\'lmasligi kerak');
  });

  test('4. Haqiqiy Gamifikatsiya: XP oshishi va Streak (Ketma-ket kunlar) hisob-kitobi', () => {
    initDatabase();
    const userId = 'user_gamify_' + Date.now();
    upsertUser({ id: userId, first_name: 'Gamer Talaba', role: 'student', xp: 0, streak_days: 0 });

    // 1-kun faollik: 30 XP beriladi
    const g1 = updateUserGamification(userId, 30);
    assert.equal(g1.streak_days, 1);
    assert.equal(g1.xp, 30);
    assert.equal(g1.streak_extended, true);

    // O'sha kunning o'zida yana 20 XP berilsa, streak oshmaydi lekin XP qo'shiladi
    const g2 = updateUserGamification(userId, 20);
    assert.equal(g2.streak_days, 1);
    assert.equal(g2.xp, 50);
    assert.equal(g2.streak_extended, false);

    // Foydalanuvchi statistikasini olish
    const stats = getUserStats(userId);
    assert.equal(stats.xp, 50);
    assert.equal(stats.streak_days, 1);
    assert.equal(stats.rank_level, 1);
    assert.equal(stats.rank_title, 'Yangi talaba');
  });

  test('5. Xatolar ustida ishlash (retry_wrong) va Test bo\'yicha Leaderboard', () => {
    initDatabase();
    const u1 = 'user_lead_1_' + Date.now();
    const u2 = 'user_lead_2_' + Date.now();
    upsertUser({ id: u1, first_name: 'Alisher A.', role: 'student' });
    upsertUser({ id: u2, first_name: 'Bobur B.', role: 'student' });

    const quizId = 'quiz_lead_' + Date.now();
    createQuiz({
      id: quizId,
      user_id: u1,
      title: 'Leaderboard Test',
      total_questions: 10,
      is_public: 1
    }, [] as any);

    // Alisher 80% to'pladi (80 soniyada)
    const a1 = createAttempt({ user_id: u1, quiz_id: quizId, total: 10 });
    finishAttempt(a1.id, {
      score: 8,
      total: 10,
      percentage: 80,
      time_spent_seconds: 80,
      answers_given: [],
      status: 'completed'
    });

    // Bobur 100% to'pladi (60 soniyada)
    const a2 = createAttempt({ user_id: u2, quiz_id: quizId, total: 10 });
    finishAttempt(a2.id, {
      score: 10,
      total: 10,
      percentage: 100,
      time_spent_seconds: 60,
      answers_given: [],
      status: 'completed'
    });

    // Leaderboard tekshiruvi: 1-o'rinda 100% bilan Bobur bo'lishi kerak
    const board = getQuizLeaderboard(quizId, 10);
    assert.ok(board.length >= 2);
    assert.equal(board[0].user_id, u2);
    assert.equal(board[0].percentage, 100);
    assert.equal(board[1].user_id, u1);
    assert.equal(board[1].percentage, 80);
  });

});
