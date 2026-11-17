/**
 * M3 — Click Shop API xizmati
 * 
 * Click orqali to'lovlarni qabul qilish, MD5 imzosini tekshirish,
 * Prepare va Complete so'rovlarini qayta ishlash.
 */
import crypto from 'crypto';
import { 
  getOrder, 
  completeOrder, 
  saveClickTransaction, 
  getClickTransaction,
  updateClickTransaction,
  OrderRecord
} from '../../lib/db.ts';

export const CLICK_ERRORS = {
  SUCCESS: 0,
  SIGN_CHECK_FAILED: -1,
  INCORRECT_AMOUNT: -2,
  ACTION_NOT_FOUND: -3,
  ALREADY_PAID: -4,
  ORDER_NOT_FOUND: -5,
  TRANSACTION_NOT_FOUND: -6,
  UPDATE_FAILED: -7,
  ERROR_IN_REQUEST: -8,
  TRANSACTION_CANCELLED: -9
};

export interface ClickRequestBody {
  click_trans_id: string | number;
  service_id: string | number;
  click_paydoc_id?: string | number;
  merchant_trans_id: string;
  merchant_prepare_id?: string | number;
  amount: number | string;
  action: number | string;
  error: number | string;
  error_note?: string;
  sign_time: string;
  sign_string: string;
}

export interface ClickResponse {
  click_trans_id: string | number;
  merchant_trans_id: string;
  merchant_prepare_id?: string | number;
  merchant_confirm_id?: string | number;
  error: number;
  error_note: string;
}

/**
 * Click MD5 imzosini tekshirish
 */
export function verifyClickSignature(body: ClickRequestBody, secretKey: string): boolean {
  const {
    click_trans_id,
    service_id,
    merchant_trans_id,
    merchant_prepare_id,
    amount,
    action,
    sign_time,
    sign_string
  } = body;

  const actionNum = Number(action);

  // Prepare: md5(click_trans_id + service_id + secret_key + merchant_trans_id + amount + action + sign_time)
  // Complete: md5(click_trans_id + service_id + secret_key + merchant_trans_id + (merchant_prepare_id || '') + amount + action + sign_time)
  let rawString = `${click_trans_id}${service_id}${secretKey}${merchant_trans_id}`;
  if (actionNum === 1 && merchant_prepare_id !== undefined && merchant_prepare_id !== null && merchant_prepare_id !== '') {
    rawString += `${merchant_prepare_id}`;
  }
  rawString += `${amount}${action}${sign_time}`;

  const expectedHash = crypto.createHash('md5').update(rawString).digest('hex').toLowerCase();
  
  // Ba'zi hollarda merchant_prepare_id siz ham kelishi mumkin
  if (expectedHash === sign_string?.toLowerCase()) {
    return true;
  }

  // Muqobil tekshiruv (agar complete da merchant_prepare_id qo'shilmagan bo'lsa)
  if (actionNum === 1) {
    const fallbackRaw = `${click_trans_id}${service_id}${secretKey}${merchant_trans_id}${amount}${action}${sign_time}`;
    const fallbackHash = crypto.createHash('md5').update(fallbackRaw).digest('hex').toLowerCase();
    if (fallbackHash === sign_string?.toLowerCase()) {
      return true;
    }
  }

  return false;
}

/**
 * Click Prepare so'rovini qayta ishlash (action = 0)
 */
export function handleClickPrepare(body: ClickRequestBody, secretKey: string): ClickResponse {
  const { click_trans_id, merchant_trans_id, amount, action, error } = body;

  // 1. Click tomonidan kelgan xatolik bormi?
  if (Number(error) < 0) {
    return {
      click_trans_id,
      merchant_trans_id,
      error: Number(error),
      error_note: body.error_note || "Click tizimida xatolik"
    };
  }

  // 2. Imzoni tekshirish
  if (!verifyClickSignature(body, secretKey)) {
    return {
      click_trans_id,
      merchant_trans_id,
      error: CLICK_ERRORS.SIGN_CHECK_FAILED,
      error_note: "Imzo mos kelmadi (Sign check failed)"
    };
  }

  // 3. Buyurtma mavjudligini tekshirish
  const order = getOrder(merchant_trans_id);
  if (!order) {
    return {
      click_trans_id,
      merchant_trans_id,
      error: CLICK_ERRORS.ORDER_NOT_FOUND,
      error_note: "Buyurtma topilmadi"
    };
  }

  // 4. Buyurtma holati tekshiruvi (Idempotentlik: agar allaqachon to'langan bo'lsa)
  if (order.status === 'completed') {
    return {
      click_trans_id,
      merchant_trans_id,
      merchant_prepare_id: click_trans_id,
      error: CLICK_ERRORS.ALREADY_PAID,
      error_note: "Buyurtma allaqachon to'langan"
    };
  }

  if (order.status === 'cancelled') {
    return {
      click_trans_id,
      merchant_trans_id,
      error: CLICK_ERRORS.TRANSACTION_CANCELLED,
      error_note: "Buyurtma bekor qilingan"
    };
  }

  // 5. Narx (summa) to'g'riligini tekshirish
  const orderAmount = Number(order.amount);
  const clickAmount = Number(amount);
  if (Math.abs(orderAmount - clickAmount) > 0.01) {
    return {
      click_trans_id,
      merchant_trans_id,
      error: CLICK_ERRORS.INCORRECT_AMOUNT,
      error_note: `Summa mos kelmadi. Kutilgan: ${orderAmount}, Kelgan: ${clickAmount}`
    };
  }

  // 6. Tranzaksiyani saqlash
  saveClickTransaction({
    click_trans_id: String(click_trans_id),
    service_id: Number(body.service_id),
    click_paydoc_id: body.click_paydoc_id ? String(body.click_paydoc_id) : undefined,
    merchant_trans_id,
    amount: clickAmount,
    action: 0,
    error: 0,
    sign_time: body.sign_time,
    status: 'prepare'
  });

  return {
    click_trans_id,
    merchant_trans_id,
    merchant_prepare_id: click_trans_id,
    error: CLICK_ERRORS.SUCCESS,
    error_note: "Success"
  };
}

/**
 * Click Complete so'rovini qayta ishlash (action = 1)
 */
export function handleClickComplete(body: ClickRequestBody, secretKey: string): ClickResponse {
  const { click_trans_id, merchant_trans_id, merchant_prepare_id, amount, error } = body;

  // 1. Click xatoligi tekshiruvi
  if (Number(error) < 0) {
    // Agar to'lov bekor qilingan bo'lsa
    updateClickTransaction(String(click_trans_id), { status: 'cancelled', error: Number(error), error_note: body.error_note });
    return {
      click_trans_id,
      merchant_trans_id,
      error: Number(error),
      error_note: body.error_note || "To'lov rad etildi"
    };
  }

  // 2. Imzoni tekshirish
  if (!verifyClickSignature(body, secretKey)) {
    return {
      click_trans_id,
      merchant_trans_id,
      error: CLICK_ERRORS.SIGN_CHECK_FAILED,
      error_note: "Imzo mos kelmadi (Sign check failed)"
    };
  }

  // 3. Buyurtma mavjudligi
  const order = getOrder(merchant_trans_id);
  if (!order) {
    return {
      click_trans_id,
      merchant_trans_id,
      error: CLICK_ERRORS.ORDER_NOT_FOUND,
      error_note: "Buyurtma topilmadi"
    };
  }

  // 4. Idempotentlik tekshiruvi: Agar allaqachon to'langan bo'lsa muvaffaqiyatli deb qaytaramiz
  if (order.status === 'completed') {
    return {
      click_trans_id,
      merchant_trans_id,
      merchant_confirm_id: click_trans_id,
      error: CLICK_ERRORS.SUCCESS,
      error_note: "Already completed"
    };
  }

  // 5. Summani tekshirish
  const orderAmount = Number(order.amount);
  const clickAmount = Number(amount);
  if (Math.abs(orderAmount - clickAmount) > 0.01) {
    return {
      click_trans_id,
      merchant_trans_id,
      error: CLICK_ERRORS.INCORRECT_AMOUNT,
      error_note: "Summa mos kelmadi"
    };
  }

  // 6. Buyurtmani bajarish va obunani faollashtirish
  const compResult = completeOrder(merchant_trans_id, 'click');
  if (!compResult.success) {
    return {
      click_trans_id,
      merchant_trans_id,
      error: CLICK_ERRORS.UPDATE_FAILED,
      error_note: compResult.message || "Buyurtmani yangilashda xatolik"
    };
  }

  // 7. Click tranzaksiya holatini yangilash
  saveClickTransaction({
    click_trans_id: String(click_trans_id),
    service_id: Number(body.service_id),
    click_paydoc_id: body.click_paydoc_id ? String(body.click_paydoc_id) : undefined,
    merchant_trans_id,
    amount: clickAmount,
    action: 1,
    error: 0,
    sign_time: body.sign_time,
    status: 'complete'
  });

  return {
    click_trans_id,
    merchant_trans_id,
    merchant_confirm_id: click_trans_id,
    error: CLICK_ERRORS.SUCCESS,
    error_note: "Success"
  };
}

/**
 * Click to'lov havolasini generatsiya qilish
 */
export function generateClickPaymentUrl(options: {
  serviceId: string | number;
  merchantId: string | number;
  amount: number;
  orderId: string;
  returnUrl?: string;
}): string {
  const { serviceId, merchantId, amount, orderId, returnUrl } = options;
  const url = new URL('https://my.click.uz/services/pay');
  url.searchParams.set('service_id', String(serviceId));
  url.searchParams.set('merchant_id', String(merchantId));
  url.searchParams.set('amount', String(amount));
  url.searchParams.set('transaction_param', orderId);
  if (returnUrl) {
    url.searchParams.set('return_url', returnUrl);
  }
  return url.toString();
}

