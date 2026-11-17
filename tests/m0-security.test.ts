import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// 1. Xavfsizlik funksiyalari testi
import { 
  escapeHtml, 
  generateSecureToken, 
  generateId, 
  checkFileMagicBytes,
  sanitizeString,
  getPlanLevel
} from '../src/lib/security.ts';

// 2. JWT tokenlar testi
import { 
  createAccessToken, 
  verifyAccessToken, 
  createRefreshToken, 
  verifyRefreshToken 
} from '../src/middleware/auth.ts';

// 3. Ma'lumotlar bazasi va to'lov idempotentligi testi
import { 
  initDatabase, 
  createOrder, 
  completeOrder, 
  getOrder,
  createAuthToken,
  getAuthToken,
  getUserSubscription,
  upsertUser
} from '../src/lib/db.ts';

describe('M0 — Xavfsizlik va Poydevor Testlari (S1–S14)', () => {

  test('S12: escapeHtml — HTML inektsiyalarni xavfsiz qiladi', () => {
    const raw = '<script>alert("XSS")</script> & "O\'zbekiston" > 100 < 200';
    const escaped = escapeHtml(raw);
    assert.ok(!escaped.includes('<script>'), 'script tegi xavfsiz qilinmagan');
    assert.ok(escaped.includes('&lt;script&gt;'), '< va > almashtirilmagan');
    assert.ok(escaped.includes('&amp;'), '& belgisi almashtirilmagan');
    assert.ok(escaped.includes('&quot;'), '" belgisi almashtirilmagan');
    assert.ok(escaped.includes('&#x27;'), "' belgisi almashtirilmagan");
  });

  test('S7: generateSecureToken — kriptografik xavfsiz 64 xonali hex token yaratadi', () => {
    const token = generateSecureToken(32);
    assert.equal(token.length, 64, 'Token uzunligi 64 belgi bo\'lishi kerak');
    assert.match(token, /^[0-9a-f]{64}$/, 'Token hex formatda bo\'lishi shart');
  });

  test('S7: generateId — haqiqiy UUID v4 formatida ID yaratadi', () => {
    const id = generateId();
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  test('S13: checkFileMagicBytes — faqat haqiqiy formatlarni tasdiqlaydi', () => {
    // DOCX (ZIP format: PK\x03\x04)
    const docxBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00]);
    assert.equal(checkFileMagicBytes(docxBuffer, 'docx'), true, 'Haqiqiy docx rad etildi');

    // PDF (%PDF)
    const pdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31]);
    assert.equal(checkFileMagicBytes(pdfBuffer, 'pdf'), true, 'Haqiqiy pdf rad etildi');

    // Soxta fayl (EXE yoki zararli fayl DOCX nomi bilan)
    const fakeBuffer = Buffer.from([0x4D, 0x5A, 0x90, 0x00]); // MZ header (EXE)
    assert.equal(checkFileMagicBytes(fakeBuffer, 'docx'), false, 'Soxta DOCX qabul qilindi');
  });

  test('S2: JWT Access Token — yaratish va tekshirish to\'g\'ri ishlaydi', () => {
    const payload = {
      uid: 'user_test_123',
      role: 'student' as const,
      plan: 'pro' as const
    };
    const token = createAccessToken(payload);
    assert.ok(typeof token === 'string' && token.length > 20);

    const verified = verifyAccessToken(token);
    assert.ok(verified !== null);
    assert.equal(verified?.uid, 'user_test_123');
    assert.equal(verified?.role, 'student');
    assert.equal(verified?.plan, 'pro');

    // Noto'g'ri token tekshiruvi
    const invalid = verifyAccessToken('invalid.token.here');
    assert.equal(invalid, null);
  });

  test('S2: JWT Refresh Token — yaratish va tekshirish to\'g\'ri ishlaydi', () => {
    const rToken = createRefreshToken('user_999');
    const verified = verifyRefreshToken(rToken);
    assert.ok(verified !== null);
    assert.equal(verified?.uid, 'user_999');
  });

  test('S5: completeOrder — buyurtmani ikki marta to\'lashdan qat\'iy himoyalangan (idempotent)', () => {
    initDatabase();
    
    // Foydalanuvchi yaratamiz
    const testUser = upsertUser({
      id: 'test_order_user_' + Date.now(),
      first_name: 'Testchi',
      role: 'student'
    });

    // Buyurtma yaratamiz
    const order = createOrder({
      userId: testUser.id,
      plan: 'start',
      paymentMethod: 'demo'
    });

    assert.equal(order.status, 'pending');

    // 1-to'lov — muvaffaqiyatli bo'lishi kerak
    const res1 = completeOrder(order.id, 'demo');
    assert.equal(res1.success, true);
    assert.equal(res1.order?.status, 'completed');

    // 2-to'lov — darhol rad etilishi shart (S5 fix)
    const res2 = completeOrder(order.id, 'demo');
    assert.equal(res2.success, false, 'Ikkinchi to\'lov bloklanmadi!');
    assert.ok(res2.message?.includes('allaqachon bajarilgan'));
  });

  test('Obuna mantiqi: yuqori tarif past tarif sotib olinganda pasayib ketmaydi', () => {
    initDatabase();
    const userId = 'plan_test_user_' + Date.now();
    upsertUser({ id: userId, first_name: 'VIP User', role: 'student' });

    // 1. Foydalanuvchi Grand Master sotib oladi
    const masterOrder = createOrder({ userId, plan: 'master', paymentMethod: 'demo' });
    completeOrder(masterOrder.id, 'demo');

    let sub = getUserSubscription(userId);
    assert.equal(sub.plan, 'master');

    // 2. Foydalanuvchi arzonroq Start tarif sotib oladi
    const startOrder = createOrder({ userId, plan: 'start', paymentMethod: 'demo' });
    completeOrder(startOrder.id, 'demo');

    // Grand Master tarifi saqlanib qolishi shart!
    sub = getUserSubscription(userId);
    assert.equal(sub.plan, 'master', 'Tarif pastga tushib ketdi!');
  });

  test('S7: createAuthToken — 64 xonali xavfsiz token bilan auth token yozadi', () => {
    initDatabase();
    const tokenRec = createAuthToken();
    assert.equal(tokenRec.token.length, 64);
    assert.equal(tokenRec.status, 'pending');
    assert.ok(tokenRec.expires_at > Date.now());

    const retrieved = getAuthToken(tokenRec.token);
    assert.ok(retrieved !== null);
    assert.equal(retrieved?.token, tokenRec.token);
  });
});

