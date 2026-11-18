import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { 
  initDatabase, 
  upsertUser, 
  getUser,
  createQuiz,
  reportQuiz,
  getReportedQuizzes,
  resolveReport,
  featureQuiz,
  hideQuiz,
  banUser,
  unbanUser,
  bulkGrantSubscriptions,
  createBroadcast,
  getBroadcasts,
  createPromoCode,
  getPromoCodes,
  validatePromoCode,
  deletePromoCode,
  exportUsersCsv,
  exportQuizzesCsv,
  getAuditLogs
} from '../src/lib/db.ts';

describe('M8 — Admin v2 va O\'sish Moduli Testlari', () => {

  test('bulkGrantSubscriptions: bir nechta foydalanuvchiga obunani ommaviy beradi va audit yozadi', () => {
    initDatabase();
    const admin = upsertUser({ id: 'u_admin_m8_1', first_name: 'Admin', role: 'admin' });
    const user1 = upsertUser({ id: 'u_bulk_1', first_name: 'Student 1', username: 'student_one', role: 'student', subscription_plan: 'free' });
    const user2 = upsertUser({ id: 'u_bulk_2', first_name: 'Student 2', username: 'student_two', role: 'student', subscription_plan: 'free' });

    const res = bulkGrantSubscriptions(
      ['student_one', 'u_bulk_2', 'non_existing_user_xyz'],
      'pro',
      30,
      admin.id,
      'Sessiya aksiyasi'
    );

    assert.equal(res.successCount, 2, '2 ta foydalanuvchiga muvaffaqiyatli berilishi kerak');
    assert.equal(res.failureCount, 1, '1 ta topilmagan foydalanuvchi xato deb qayd etilishi kerak');

    const updated1 = getUser('u_bulk_1');
    const updated2 = getUser('u_bulk_2');
    assert.equal(updated1?.subscription_plan, 'pro');
    assert.equal(updated2?.subscription_plan, 'pro');
    assert.ok(updated1 && updated1.subscription_expires_at > Date.now());

    // Audit log tekshiruvi
    const logs = getAuditLogs(10);
    const bulkLogs = logs.filter(l => l.action === 'bulk_grant');
    assert.ok(bulkLogs.length >= 2, 'Bulk grant audit log yozilgan bo\'lishi kerak');
  });

  test('banUser va unbanUser: foydalanuvchini bloklaydi va blokdan chiqaradi', () => {
    initDatabase();
    const admin = upsertUser({ id: 'u_admin_m8_2', first_name: 'Admin 2', role: 'admin' });
    const user = upsertUser({ id: 'u_ban_test', first_name: 'Spammer', role: 'student' });

    assert.equal(user.is_banned, 0);

    // Bloklash
    const banned = banUser('u_ban_test', 'Spam yuborgani uchun', admin.id);
    assert.equal(banned, true);

    const bannedUser = getUser('u_ban_test');
    assert.equal(bannedUser?.is_banned, 1);
    assert.equal(bannedUser?.ban_reason, 'Spam yuborgani uchun');

    // Blokdan chiqarish
    const unbanned = unbanUser('u_ban_test', admin.id);
    assert.equal(unbanned, true);

    const unbannedUser = getUser('u_ban_test');
    assert.equal(unbannedUser?.is_banned, 0);
    assert.equal(unbannedUser?.ban_reason, null);
  });

  test('createBroadcast va getBroadcasts: xabar yuborish tarixini saqlaydi', () => {
    initDatabase();
    const admin = upsertUser({ id: 'u_admin_m8_3', first_name: 'Admin 3', role: 'admin' });

    const broadcast = createBroadcast(
      admin.id,
      'Ertaga soat 10:00 da yangi testlar yuklanadi!',
      'pro',
      150
    );

    assert.ok(broadcast.id);
    assert.equal(broadcast.segment, 'pro');
    assert.equal(broadcast.total_count, 150);

    const list = getBroadcasts(10);
    assert.ok(list.length > 0);
    const found = list.find(b => b.id === broadcast.id);
    assert.ok(found);
    assert.equal(found.message, 'Ertaga soat 10:00 da yangi testlar yuklanadi!');
  });

  test('Promokodlar tizimi: foiz, qat\'iy chegirma, bepul kunlar va limitlar tekshiruvi', () => {
    initDatabase();
    
    // 1. Foiz chegirma (20%)
    const p1 = createPromoCode('SALE20', 'percent', 20, undefined, 50, 10);
    assert.ok(p1.id);
    assert.equal(p1.code, 'SALE20');

    // Sessiya Pro tarifi (29,999 so'm) uchun hisoblaymiz: 20% = 6000
    const val1 = validatePromoCode('sale20', 'pro');
    assert.equal(val1.valid, true);
    assert.equal(val1.discountAmount, 6000);

    // 2. Qat'iy chegirma (10,000 so'm)
    createPromoCode('DISCOUNT10K', 'fixed', 10000, 'master', 10, 5);
    const val2Valid = validatePromoCode('DISCOUNT10K', 'master');
    assert.equal(val2Valid.valid, true);
    assert.equal(val2Valid.discountAmount, 10000);

    // Boshqa tarifga urinish - rad etilishi kerak
    const val2WrongPlan = validatePromoCode('DISCOUNT10K', 'start');
    assert.equal(val2WrongPlan.valid, false);

    // 3. Bepul kunlar (7 kun)
    createPromoCode('FREEWEEK', 'free_days', 7, undefined, 100, 30);
    const val3 = validatePromoCode('FREEWEEK', 'pro');
    assert.equal(val3.valid, true);
    assert.equal(val3.freeDays, 7);

    // 4. Ro'yxatdan o'chirish
    const codes = getPromoCodes();
    assert.ok(codes.length >= 3);
    const deleted = deletePromoCode(p1.id);
    assert.equal(deleted, true);
  });

  test('resolveReport, featureQuiz va hideQuiz: shikoyatlar moderatsiyasi va test holati', () => {
    initDatabase();
    const admin = upsertUser({ id: 'u_admin_m8_4', first_name: 'Moderator', role: 'admin' });
    const author = upsertUser({ id: 'u_author_m8', first_name: 'Test Author', role: 'student' });
    const reporter = upsertUser({ id: 'u_reporter_m8', first_name: 'Reporter', role: 'student' });
    const quizId = 'quiz_m8_mod_' + Date.now();

    const q = createQuiz(
      {
        id: quizId,
        user_id: author.id,
        title: 'Shikoyat qilingan test',
        subject: 'Fizika',
        is_public: 1
      },
      [
        {
          id: quizId + '_q1',
          quiz_id: quizId,
          question: 'Savol 1',
          options: ['A', 'B'],
          correctAnswer: 0
        }
      ]
    );

    // Shikoyat yuborish
    reportQuiz(q.id, reporter.id, 'Noto\'g\'ri javoblar va xato savol');
    const reports = getReportedQuizzes(10);
    assert.ok(reports.length > 0);
    const reportItem = reports.find(r => r.quiz_id === q.id);
    assert.ok(reportItem);

    // Moderatsiyada testni yashirish (hide)
    const resolvedHide = resolveReport(reportItem.report_id, 'hide', admin.id);
    assert.equal(resolvedHide, true);

    // Feature qilish
    featureQuiz(q.id, true);

    // O'chirib yuborish (delete)
    reportQuiz(q.id, reporter.id, 'Juda qo\'pol xato');
    const newReports = getReportedQuizzes(10);
    const newReportItem = newReports.find(r => r.quiz_id === q.id);
    assert.ok(newReportItem);
    const resolvedDelete = resolveReport(newReportItem.report_id, 'delete', admin.id);
    assert.equal(resolvedDelete, true);
  });

  test('exportUsersCsv va exportQuizzesCsv: RFC 4180 ga mos CSV qaytaradi', () => {
    initDatabase();
    const usersCsv = exportUsersCsv();
    assert.ok(typeof usersCsv === 'string');
    assert.ok(usersCsv.startsWith('id,first_name,username,role,subscription_plan,created_at'));

    const quizzesCsv = exportQuizzesCsv();
    assert.ok(typeof quizzesCsv === 'string');
    assert.ok(quizzesCsv.startsWith('id,title,category,total_questions,visibility,status,views_count,created_at'));
  });

});
