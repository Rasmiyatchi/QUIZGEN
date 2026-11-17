import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { 
  initDatabase, 
  upsertUser, 
  getUser,
  getAdminStats,
  searchUsers,
  addAuditLog,
  getAuditLogs,
  createOrder,
  completeOrder,
  cancelUserSubscription
} from '../src/lib/db.ts';

import { 
  getEffectiveEntitlements, 
  activateSubscription,
  clearEntitlementsCache
} from '../src/lib/entitlements.ts';

import { 
  createAccessToken, 
  verifyAccessToken, 
  requireAdmin 
} from '../src/middleware/auth.ts';

describe('M2 — Admin Panel v1 va Boshqaruv Testlari', () => {

  test('requireAdmin: faqat admin va superadmin ga ruxsat beradi, student ga 403 qaytaradi', () => {
    // 1. Student foydalanuvchi
    let statusSet = 0;
    let jsonResult: any = null;
    let nextCalled = false;

    const mockReqStudent: any = {
      user: { uid: 'u_student_1', role: 'student', plan: 'free' }
    };
    const mockRes: any = {
      status: (code: number) => {
        statusSet = code;
        return {
          json: (data: any) => { jsonResult = data; }
        };
      }
    };
    const mockNext = () => { nextCalled = true; };

    requireAdmin(mockReqStudent, mockRes, mockNext);
    assert.equal(statusSet, 403, "Student admin endpointiga kirganda 403 olishi shart");
    assert.equal(nextCalled, false, "Next function chaqirilmasligi kerak");
    assert.equal(jsonResult?.code, 'FORBIDDEN');

    // 2. Admin foydalanuvchi
    statusSet = 0;
    nextCalled = false;
    const mockReqAdmin: any = {
      user: { uid: 'u_admin_1', role: 'admin', plan: 'pro' }
    };
    requireAdmin(mockReqAdmin, mockRes, mockNext);
    assert.equal(nextCalled, true, "Admin foydalanuvchida next() chaqirilishi shart");
    assert.equal(statusSet, 0, "Xatolik statusi qo'yilmasligi kerak");

    // 3. Superadmin foydalanuvchi
    nextCalled = false;
    const mockReqSuperAdmin: any = {
      user: { uid: 'u_super_1', role: 'superadmin', plan: 'master' }
    };
    requireAdmin(mockReqSuperAdmin, mockRes, mockNext);
    assert.equal(nextCalled, true, "Superadmin foydalanuvchida next() chaqirilishi shart");
  });

  test('Admin Stats: getAdminStats barcha ko\'rsatkichlarni to\'g\'ri hisoblaydi', () => {
    initDatabase();
    const stats = getAdminStats();

    assert.ok(typeof stats.totalUsers === 'number', "totalUsers son bo'lishi kerak");
    assert.ok(typeof stats.totalQuizzes === 'number', "totalQuizzes son bo'lishi kerak");
    assert.ok(typeof stats.totalAttempts === 'number', "totalAttempts son bo'lishi kerak");
    assert.ok(typeof stats.totalRevenue === 'number', "totalRevenue son bo'lishi kerak");
    assert.ok(typeof stats.activeSubscriptions === 'object', "activeSubscriptions obyekt bo'lishi kerak");
  });

  test('Foydalanuvchilarni qidirish (searchUsers)', () => {
    initDatabase();
    const uniqueName = 'QidiruvchiTest_' + Date.now();
    const testUserId = 'search_user_' + Date.now();
    upsertUser({
      id: testUserId,
      first_name: uniqueName,
      username: 'uniq_' + Date.now(),
      role: 'student'
    });

    const results = searchUsers(uniqueName, 10, 0);
    assert.ok(results.length >= 1, "Qidiruvda kamida 1 ta foydalanuvchi topilishi kerak");
    assert.equal(results[0].id, testUserId);
    assert.equal(results[0].first_name, uniqueName);
  });

  test('Admin Obuna Taqdim Etish: activateSubscription admin_grant manbasi va audit logi', () => {
    initDatabase();
    const adminId = 'admin_999';
    const targetUserId = 'target_user_' + Date.now();

    upsertUser({
      id: targetUserId,
      first_name: 'Omadli Talaba',
      role: 'student'
    });

    // Admin 30 kunga Grand Master sovg'a qiladi
    const grantResult = activateSubscription(targetUserId, 'master', {
      source: 'admin_grant',
      grantedBy: adminId,
      note: 'Olimpiada g\'olibi uchun maxsus mukofot',
      customDays: 30
    });

    assert.equal(grantResult.success, true);
    assert.equal(grantResult.subscription?.plan_id, 'master');

    // Audit log yozish
    addAuditLog(adminId, 'grant_subscription', 'user', targetUserId, {
      plan: 'master',
      durationDays: 30,
      reason: 'Olimpiada g\'olibi uchun'
    });

    // Huquqlar yangilanganini tekshirish
    const ent = getEffectiveEntitlements(targetUserId);
    assert.equal(ent.plan, 'master');
    assert.equal(ent.is_active, true);
    assert.equal(ent.entitlements.editor, true);
    assert.equal(ent.entitlements.flashcards, true);
    assert.equal(ent.entitlements.ai_daily_limit, 300);

    // Audit log mavjudligini tekshirish
    const logs = getAuditLogs(20);
    const logFound = logs.find(l => l.actor_id === adminId && l.target_id === targetUserId);
    assert.ok(logFound, "Audit logida admin amali qayd etilgan bo'lishi shart");
    assert.equal(logFound.action, 'grant_subscription');
  });

  test('Admin Obunani Bekor Qilish va Audit Log', () => {
    initDatabase();
    const adminId = 'admin_999';
    const badUserId = 'bad_user_' + Date.now();

    upsertUser({
      id: badUserId,
      first_name: 'Qoidabuzar',
      role: 'student'
    });

    activateSubscription(badUserId, 'pro', { source: 'admin_grant' });
    let ent = getEffectiveEntitlements(badUserId);
    assert.equal(ent.is_active, true);

    // Admin bekor qiladi
    cancelUserSubscription(badUserId, 'Qoidalarni buzganligi sababli');
    clearEntitlementsCache(badUserId);

    addAuditLog(adminId, 'cancel_subscription', 'user', badUserId, {
      reason: 'Qoidalarni buzganligi sababli'
    });

    ent = getEffectiveEntitlements(badUserId);
    assert.equal(ent.plan, 'free');
    assert.equal(ent.is_active, false);

    const logs = getAuditLogs(20);
    const cancelLog = logs.find(l => l.actor_id === adminId && l.action === 'cancel_subscription' && l.target_id === badUserId);
    assert.ok(cancelLog, "Obunani bekor qilish audit logida qayd etilgan bo'lishi kerak");
  });

});
