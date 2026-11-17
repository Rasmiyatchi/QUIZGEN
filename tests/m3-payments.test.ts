import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

import { 
  initDatabase, 
  upsertUser, 
  getOrder,
  createOrder, 
  completeOrder,
  cancelUserSubscription,
  submitOrderProof,
  approveManualOrder,
  rejectManualOrder,
  getPaymeTransaction,
  getClickTransaction
} from '../src/lib/db.ts';

import { 
  getEffectiveEntitlements, 
  clearEntitlementsCache 
} from '../src/lib/entitlements.ts';

import { 
  verifyClickSignature, 
  handleClickPrepare, 
  handleClickComplete, 
  generateClickPaymentUrl,
  CLICK_ERRORS 
} from '../src/services/payments/click.ts';

import { 
  verifyPaymeAuth, 
  handlePaymeRpc, 
  generatePaymePaymentUrl,
  PAYME_ERRORS 
} from '../src/services/payments/payme.ts';

import { 
  handleApproveManualPayment, 
  handleRejectManualPayment 
} from '../src/services/payments/manual.ts';

describe('M3 — To\'lov Tizimlari Testlari (Click, Payme, Manual)', () => {
  const CLICK_SECRET = 'click_test_secret_key_123';
  const PAYME_SECRET = 'payme_test_secret_key_456';

  test('Click: MD5 imzo generatsiyasi va tekshiruvi', () => {
    const clickTransId = '11223344';
    const serviceId = '9999';
    const merchantTransId = 'ORD-CLICK-1';
    const amount = 29999;
    const action = 0;
    const signTime = '2026-11-17 12:00:00';

    // To'g'ri imzo
    const raw = `${clickTransId}${serviceId}${CLICK_SECRET}${merchantTransId}${amount}${action}${signTime}`;
    const validSign = crypto.createHash('md5').update(raw).digest('hex');

    const validBody = {
      click_trans_id: clickTransId,
      service_id: serviceId,
      merchant_trans_id: merchantTransId,
      amount,
      action,
      error: 0,
      sign_time: signTime,
      sign_string: validSign
    };

    assert.equal(verifyClickSignature(validBody, CLICK_SECRET), true, "To'g'ri imzo tasdiqlanishi kerak");

    // Noto'g'ri imzo
    const invalidBody = { ...validBody, sign_string: 'invalid_hash_value' };
    assert.equal(verifyClickSignature(invalidBody, CLICK_SECRET), false, "Soxta imzo rad etilishi kerak");
  });

  test('Click Prepare: muvaffaqiyatli tekshiruv, noto\'g\'ri summa va soxta imzo rad etilishi', () => {
    initDatabase();
    const userId = 'user_click_' + Date.now();
    upsertUser({ id: userId, first_name: 'Click Testchi', role: 'student' });

    // 29 999 so'mlik Pro buyurtma
    const order = createOrder({ userId, plan: 'pro', paymentMethod: 'click' });
    const clickTransId = 'CT_' + Date.now();
    const signTime = '2026-11-17 12:05:00';

    // 1. Soxta imzo bilan so'rov
    const badSignRes = handleClickPrepare({
      click_trans_id: clickTransId,
      service_id: 1234,
      merchant_trans_id: order.id,
      amount: order.amount,
      action: 0,
      error: 0,
      sign_time: signTime,
      sign_string: 'bad_signature'
    }, CLICK_SECRET);
    assert.equal(badSignRes.error, CLICK_ERRORS.SIGN_CHECK_FAILED, "Soxta imzo SIGN_CHECK_FAILED (-1) berishi kerak");

    // 2. Noto'g'ri summa bilan so'rov
    const wrongAmountRaw = `${clickTransId}1234${CLICK_SECRET}${order.id}99990${signTime}`;
    const wrongAmountSign = crypto.createHash('md5').update(wrongAmountRaw).digest('hex');
    const wrongAmountRes = handleClickPrepare({
      click_trans_id: clickTransId,
      service_id: 1234,
      merchant_trans_id: order.id,
      amount: 9999, // Noto'g'ri summa
      action: 0,
      error: 0,
      sign_time: signTime,
      sign_string: wrongAmountSign
    }, CLICK_SECRET);
    assert.equal(wrongAmountRes.error, CLICK_ERRORS.INCORRECT_AMOUNT, "Noto'g'ri summa INCORRECT_AMOUNT (-2) berishi kerak");

    // 3. To'g'ri so'rov
    const correctRaw = `${clickTransId}1234${CLICK_SECRET}${order.id}${order.amount}0${signTime}`;
    const correctSign = crypto.createHash('md5').update(correctRaw).digest('hex');
    const successRes = handleClickPrepare({
      click_trans_id: clickTransId,
      service_id: 1234,
      merchant_trans_id: order.id,
      amount: order.amount,
      action: 0,
      error: 0,
      sign_time: signTime,
      sign_string: correctSign
    }, CLICK_SECRET);

    assert.equal(successRes.error, CLICK_ERRORS.SUCCESS, "To'g'ri so'rovda xato 0 bo'lishi kerak");
    assert.equal(successRes.merchant_trans_id, order.id);
  });

  test('Click Complete: to\'lovni yakunlash, obunani faollashtirish va idempotentlik', () => {
    initDatabase();
    const userId = 'user_click_complete_' + Date.now();
    upsertUser({ id: userId, first_name: 'Click Complete Test', role: 'student' });

    const order = createOrder({ userId, plan: 'pro', paymentMethod: 'click' });
    const clickTransId = 'CT_COMP_' + Date.now();
    const signTime = '2026-11-17 12:10:00';

    const raw = `${clickTransId}1234${CLICK_SECRET}${order.id}${order.amount}1${signTime}`;
    const sign = crypto.createHash('md5').update(raw).digest('hex');

    // Birinchi Complete chaqiruvi
    const completeRes = handleClickComplete({
      click_trans_id: clickTransId,
      service_id: 1234,
      merchant_trans_id: order.id,
      amount: order.amount,
      action: 1,
      error: 0,
      sign_time: signTime,
      sign_string: sign
    }, CLICK_SECRET);

    assert.equal(completeRes.error, CLICK_ERRORS.SUCCESS);

    // Foydalanuvchi obunasi Pro ga o'tganini tekshirish
    const ent = getEffectiveEntitlements(userId);
    assert.equal(ent.plan, 'pro');
    assert.equal(ent.is_active, true);
    assert.equal(ent.entitlements.editor, true);

    // Ikkinchi (idempotent) Complete chaqiruvi — xato bermasdan SUCCESS qaytarishi shart
    const secondCompleteRes = handleClickComplete({
      click_trans_id: clickTransId,
      service_id: 1234,
      merchant_trans_id: order.id,
      amount: order.amount,
      action: 1,
      error: 0,
      sign_time: signTime,
      sign_string: sign
    }, CLICK_SECRET);

    assert.equal(secondCompleteRes.error, CLICK_ERRORS.SUCCESS, "Idempotent chaqiruv muvaffaqiyatli bo'lishi kerak");
  });

  test('Payme: Basic Auth tekshiruvi', () => {
    // To'g'ri auth header: Basic base64(Paycom:PAYME_SECRET)
    const validCredentials = Buffer.from(`Paycom:${PAYME_SECRET}`).toString('base64');
    const validHeader = `Basic ${validCredentials}`;
    assert.equal(verifyPaymeAuth(validHeader, PAYME_SECRET), true);

    // Noto'g'ri parol
    const invalidCredentials = Buffer.from(`Paycom:wrong_secret`).toString('base64');
    assert.equal(verifyPaymeAuth(`Basic ${invalidCredentials}`, PAYME_SECRET), false);

    // Noto'g'ri login
    const wrongUser = Buffer.from(`User:${PAYME_SECRET}`).toString('base64');
    assert.equal(verifyPaymeAuth(`Basic ${wrongUser}`, PAYME_SECRET), false);
  });

  test('Payme RPC: CheckPerformTransaction summani va buyurtmani tekshiradi', async () => {
    initDatabase();
    const userId = 'user_payme_' + Date.now();
    upsertUser({ id: userId, first_name: 'Payme Testchi', role: 'student' });

    // 7 999 so'mlik Start tarifi -> Payme tiyinda: 799900 tiyin
    const order = createOrder({ userId, plan: 'start', paymentMethod: 'payme' });

    // 1. To'g'ri summa (tiyinda)
    const validRes = await handlePaymeRpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'CheckPerformTransaction',
      params: {
        amount: order.amount * 100, // tiyin
        account: { order_id: order.id }
      }
    });
    assert.equal(validRes.result?.allow, true);

    // 2. Noto'g'ri summa
    const wrongRes = await handlePaymeRpc({
      jsonrpc: '2.0',
      id: 2,
      method: 'CheckPerformTransaction',
      params: {
        amount: 500000, // Noto'g'ri summa
        account: { order_id: order.id }
      }
    });
    assert.equal(wrongRes.error?.code, -31001);

    // 3. Mavjud bo'lmagan buyurtma
    const notFoundRes = await handlePaymeRpc({
      jsonrpc: '2.0',
      id: 3,
      method: 'CheckPerformTransaction',
      params: {
        amount: 799900,
        account: { order_id: 'ORD-NOT-EXIST' }
      }
    });
    assert.equal(notFoundRes.error?.code, -31001);
  });

  test('Payme RPC: CreateTransaction va PerformTransaction to\'liq oqimi', async () => {
    initDatabase();
    const userId = 'user_payme_full_' + Date.now();
    upsertUser({ id: userId, first_name: 'Payme Oqim', role: 'student' });

    // 59 900 so'mlik Grand Master buyurtma
    const order = createOrder({ userId, plan: 'master', paymentMethod: 'payme' });
    const paymeTransId = 'payme_tx_' + Date.now();
    const now = Date.now();

    // 1. CreateTransaction
    const createRes = await handlePaymeRpc({
      jsonrpc: '2.0',
      id: 101,
      method: 'CreateTransaction',
      params: {
        id: paymeTransId,
        time: now,
        amount: order.amount * 100,
        account: { order_id: order.id }
      }
    });

    assert.equal(createRes.result?.state, 1, "Yaratilgan tranzaksiya holati 1 bo'lishi kerak");
    assert.equal(createRes.result?.transaction, paymeTransId);

    // 2. PerformTransaction
    const performRes = await handlePaymeRpc({
      jsonrpc: '2.0',
      id: 102,
      method: 'PerformTransaction',
      params: { id: paymeTransId }
    });

    assert.equal(performRes.result?.state, 2, "Bajarilgan tranzaksiya holati 2 bo'lishi kerak");

    // Foydalanuvchi Grand Master bo'lganini tekshirish
    const ent = getEffectiveEntitlements(userId);
    assert.equal(ent.plan, 'master');
    assert.equal(ent.is_active, true);
    assert.equal(ent.entitlements.ai_daily_limit, 300);

    // 3. Idempotent Perform chaqiruvi
    const secondPerform = await handlePaymeRpc({
      jsonrpc: '2.0',
      id: 103,
      method: 'PerformTransaction',
      params: { id: paymeTransId }
    });
    assert.equal(secondPerform.result?.state, 2);
    assert.equal(secondPerform.result?.perform_time, performRes.result?.perform_time);

    // 4. CheckTransaction
    const checkTx = await handlePaymeRpc({
      jsonrpc: '2.0',
      id: 104,
      method: 'CheckTransaction',
      params: { id: paymeTransId }
    });
    assert.equal(checkTx.result?.state, 2);
    assert.equal(checkTx.result?.transaction, paymeTransId);
  });

  test('Qo\'lda to\'lov (Manual Payment): chek yuklash, admin tasdiqlashi va rad etishi', async () => {
    initDatabase();
    const adminId = 'admin_super_1';
    const userId = 'user_manual_' + Date.now();
    upsertUser({ id: userId, first_name: 'Chek Yuklovchi', role: 'student' });

    // 1. Foydalanuvchi buyurtma yaratadi va chek yuklaydi
    const order = createOrder({ userId, plan: 'pro', paymentMethod: 'manual' });
    const proofSubmitted = submitOrderProof(order.id, '/uploads/proofs/test_chek.jpg');
    assert.equal(proofSubmitted, true);

    const updatedOrder = getOrder(order.id);
    assert.equal(updatedOrder?.status, 'pending_review');
    assert.equal(updatedOrder?.proof_image, '/uploads/proofs/test_chek.jpg');

    // 2. Admin tasdiqlaydi (Approve)
    const approveRes = await handleApproveManualPayment(order.id, adminId, "Chekdagi summa mos keldi");
    assert.equal(approveRes.success, true);

    const ent = getEffectiveEntitlements(userId);
    assert.equal(ent.plan, 'pro');
    assert.equal(ent.is_active, true);

    // 3. Rad etish oqimi uchun yangi buyurtma
    const order2 = createOrder({ userId, plan: 'start', paymentMethod: 'manual' });
    submitOrderProof(order2.id, '/uploads/proofs/fake_chek.jpg');

    const rejectRes = await handleRejectManualPayment(order2.id, adminId, "Chek soxta");
    assert.equal(rejectRes.success, true);

    const rejectedOrder = getOrder(order2.id);
    assert.equal(rejectedOrder?.status, 'cancelled');
    assert.equal(rejectedOrder?.admin_note, 'Chek soxta');
  });

  test('To\'lov havolalari (Click va Payme URL) to\'g\'ri generatsiya qilinadi', () => {
    const clickUrl = generateClickPaymentUrl({
      serviceId: '12345',
      merchantId: '67890',
      amount: 29999,
      orderId: 'ORD-999',
      returnUrl: 'https://quizgen.uz/pricing?paid=1'
    });
    assert.ok(clickUrl.includes('https://my.click.uz/services/pay'));
    assert.ok(clickUrl.includes('service_id=12345'));
    assert.ok(clickUrl.includes('transaction_param=ORD-999'));

    const paymeUrl = generatePaymePaymentUrl({
      merchantId: 'pm_merchant_1',
      orderId: 'ORD-888',
      amount: 7999,
      callbackUrl: 'https://quizgen.uz/pricing'
    });
    assert.ok(paymeUrl.startsWith('https://checkout.paycom.uz/'));
    // Base64 parametrini qayta o'qib tekshiramiz
    const encoded = paymeUrl.replace('https://checkout.paycom.uz/', '');
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    assert.ok(decoded.includes('m=pm_merchant_1'));
    assert.ok(decoded.includes('ac.order_id=ORD-888'));
    assert.ok(decoded.includes('a=799900')); // tiyin
  });

});

