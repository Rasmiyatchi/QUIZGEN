import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { 
  initDatabase, 
  upsertUser, 
  createOrder, 
  completeOrder 
} from '../src/lib/db.ts';

import { 
  getEffectiveEntitlements, 
  activateSubscription, 
  checkAndExpireSubscriptions,
  incrementAiUsage,
  getDailyAiUsage,
  clearEntitlementsCache,
  DEFAULT_ENTITLEMENTS
} from '../src/lib/entitlements.ts';

describe('M1 — Obuna Yadrosi va Entitlements Testlari (5.6 Qabul Mezonlari)', () => {

  test('Bepul foydalanuvchi: editor va flashcards false, AI kunlik limit 3 ta', () => {
    initDatabase();
    const freeUserId = 'free_user_' + Date.now();
    upsertUser({ id: freeUserId, first_name: 'Bekorchi', role: 'student' });

    const ent = getEffectiveEntitlements(freeUserId);
    assert.equal(ent.plan, 'free');
    assert.equal(ent.is_active, false);
    assert.equal(ent.entitlements.editor, false);
    assert.equal(ent.entitlements.flashcards, false);
    assert.equal(ent.entitlements.ai_daily_limit, 3);
    assert.equal(ent.ai_remaining, 3);
  });

  test('AI Kvotasi: atomik sarflash va limit tugaganda rad etish', () => {
    initDatabase();
    const quotaUser = 'quota_user_' + Date.now();
    upsertUser({ id: quotaUser, first_name: 'AI Foydalanuvchi', role: 'student' });

    // Bepul foydalanuvchida limit 3 ta
    assert.equal(incrementAiUsage(quotaUser, 3), true); // 1-chi
    assert.equal(incrementAiUsage(quotaUser, 3), true); // 2-chi
    assert.equal(incrementAiUsage(quotaUser, 3), true); // 3-chi
    assert.equal(incrementAiUsage(quotaUser, 3), false); // 4-chi rad etilishi shart!

    const ent = getEffectiveEntitlements(quotaUser);
    assert.equal(ent.ai_today, 3);
    assert.equal(ent.ai_remaining, 0);
  });

  test('activateSubscription: Pro tarifi faollashtirilganda editor va flashcards ochiladi', () => {
    initDatabase();
    const proUser = 'pro_user_' + Date.now();
    upsertUser({ id: proUser, first_name: 'Sessiya Talabasi', role: 'student' });

    const act = activateSubscription(proUser, 'pro', { source: 'payment' });
    assert.equal(act.success, true);
    assert.equal(act.subscription?.status, 'active');

    const ent = getEffectiveEntitlements(proUser);
    assert.equal(ent.plan, 'pro');
    assert.equal(ent.is_active, true);
    assert.equal(ent.entitlements.editor, true);
    assert.equal(ent.entitlements.flashcards, true);
    assert.equal(ent.entitlements.ai_daily_limit, 50);
    assert.ok(ent.days_left >= 29);
  });

  test('Upgrade: Start foydalanuvchisi Pro olsa — bonus kunlar to\'g\'ri hisoblanadi', () => {
    initDatabase();
    const upgradeUser = 'upgrade_user_' + Date.now();
    upsertUser({ id: upgradeUser, first_name: 'O\'suvchi', role: 'student' });

    // 1. Avval Start tarif beramiz (7 kun)
    activateSubscription(upgradeUser, 'start', { source: 'payment', customDays: 7 });
    const startEnt = getEffectiveEntitlements(upgradeUser);
    assert.equal(startEnt.plan, 'start');
    assert.ok(startEnt.days_left >= 6);

    // 2. Pro tarifga upgrade qilamiz (30 kun + bonus)
    const upRes = activateSubscription(upgradeUser, 'pro', { source: 'payment', customDays: 30 });
    assert.equal(upRes.success, true);

    const proEnt = getEffectiveEntitlements(upgradeUser);
    assert.equal(proEnt.plan, 'pro');
    // Startning qolgan kunlari hisobiga 30 kundan ortiq bo'lishi shart!
    assert.ok(proEnt.days_left >= 30, 'Bonus kunlar yangi tarifga qo\'shilmadi');
  });

  test('Downgrade: Faol Master foydalanuvchi Start sotib olsa — scheduled navbatga tushadi', () => {
    initDatabase();
    const masterUser = 'master_user_' + Date.now();
    upsertUser({ id: masterUser, first_name: 'Grand Boss', role: 'student' });

    // 1. Grand Master faollashtiramiz (90 kun)
    activateSubscription(masterUser, 'master', { source: 'payment', customDays: 90 });
    const masterEnt = getEffectiveEntitlements(masterUser);
    assert.equal(masterEnt.plan, 'master');

    // 2. Start sotib oladi (pastroq tarif)
    const downRes = activateSubscription(masterUser, 'start', { source: 'payment', customDays: 7 });
    assert.equal(downRes.success, true);
    assert.equal(downRes.subscription?.status, 'scheduled', 'Pastroq tarif scheduled bo\'lmadi');

    // Joriy tarif hali ham Master bo'lib qolishi shart!
    const currentEnt = getEffectiveEntitlements(masterUser);
    assert.equal(currentEnt.plan, 'master');
    assert.equal(currentEnt.is_active, true);
  });

  test('Cron tekshiruvi: checkAndExpireSubscriptions xatosiz ishlaydi', () => {
    initDatabase();
    const res = checkAndExpireSubscriptions();
    assert.ok(typeof res.expiredCount === 'number');
    assert.ok(typeof res.scheduledActivated === 'number');
  });

});

