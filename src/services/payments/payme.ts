/**
 * M3 — Payme Merchant API xizmati
 * 
 * Payme JSON-RPC 2.0 protokoli:
 * CheckPerformTransaction, CreateTransaction, PerformTransaction,
 * CancelTransaction, CheckTransaction, GetStatement.
 */
import {
  getOrder,
  completeOrder,
  cancelUserSubscription,
  savePaymeTransaction,
  getPaymeTransaction,
  getPaymeTransactionByOrderId,
  updatePaymeTransaction,
  getPaymeStatements,
  PaymeTxRecord
} from '../../lib/db.ts';

export const PAYME_ERRORS = {
  AUTH_ERROR: { code: -32504, message: "Kirish huquqi yo'q (Avtorizatsiya xatosi)" },
  INTERNAL_ERROR: { code: -32400, message: "Tizim ichki xatosi" },
  INVALID_JSON_RPC: { code: -32600, message: "Noto'g'ri JSON-RPC so'rovi" },
  METHOD_NOT_FOUND: { code: -32601, message: "Bunday metod mavjud emas" },
  ORDER_NOT_FOUND: { code: -31001, message: "Buyurtma topilmadi" },
  INCORRECT_AMOUNT: { code: -31001, message: "Summa noto'g'ri ko'rsatilgan" },
  TRANSACTION_NOT_FOUND: { code: -31003, message: "Tranzaksiya topilmadi" },
  CANT_CANCEL_TRANSACTION: { code: -31007, message: "Tranzaksiyani bekor qilib bo'lmaydi" },
  CANT_PERFORM_TRANSACTION: { code: -31008, message: "Tranzaksiyani bajarib bo'lmaydi" },
  ORDER_ALREADY_PAID: { code: -31008, message: "Buyurtma allaqachon bajarilgan" }
};

// 12 soatlik tranzaksiya amal qilish muddati (millisekundlarda)
const PAYME_TIMEOUT_MS = 12 * 60 * 60 * 1000;

export interface PaymeRpcRequest {
  jsonrpc: string;
  id: number | string;
  method: string;
  params: any;
}

export interface PaymeRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * Payme HTTP Basic Auth tekshirish
 */
export function verifyPaymeAuth(authHeader: string | undefined, paymeKey: string): boolean {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return false;
  }
  const credentials = Buffer.from(authHeader.substring(6), 'base64').toString('utf8');
  const [login, password] = credentials.split(':');
  // Paycom login nomi standart bo'yicha Paycom
  return (login === 'Paycom' || login === 'paycom') && password === paymeKey;
}

/**
 * Payme JSON-RPC so'rovlarini yo'naltirish va qayta ishlash
 */
export async function handlePaymeRpc(req: PaymeRpcRequest): Promise<PaymeRpcResponse> {
  const { id, method, params } = req;

  if (req.jsonrpc !== '2.0') {
    return { jsonrpc: '2.0', id, error: PAYME_ERRORS.INVALID_JSON_RPC };
  }

  try {
    switch (method) {
      case 'CheckPerformTransaction':
        return await handleCheckPerformTransaction(id, params);
      case 'CreateTransaction':
        return await handleCreateTransaction(id, params);
      case 'PerformTransaction':
        return await handlePerformTransaction(id, params);
      case 'CancelTransaction':
        return await handleCancelTransaction(id, params);
      case 'CheckTransaction':
        return await handleCheckTransaction(id, params);
      case 'GetStatement':
        return await handleGetStatement(id, params);
      default:
        return { jsonrpc: '2.0', id, error: PAYME_ERRORS.METHOD_NOT_FOUND };
    }
  } catch (err: any) {
    console.error("Payme RPC Error:", err);
    return { jsonrpc: '2.0', id, error: { ...PAYME_ERRORS.INTERNAL_ERROR, data: err.message } };
  }
}

/**
 * 1. CheckPerformTransaction: Buyurtma holati va summasini tekshirish
 */
async function handleCheckPerformTransaction(id: number | string, params: any): Promise<PaymeRpcResponse> {
  const orderId = params?.account?.order_id;
  const amountTiyin = Number(params?.amount);

  if (!orderId) {
    return { jsonrpc: '2.0', id, error: PAYME_ERRORS.ORDER_NOT_FOUND };
  }

  const order = getOrder(orderId);
  if (!order) {
    return { jsonrpc: '2.0', id, error: PAYME_ERRORS.ORDER_NOT_FOUND };
  }

  if (order.status === 'completed') {
    return { jsonrpc: '2.0', id, error: PAYME_ERRORS.ORDER_ALREADY_PAID };
  }

  if (order.status === 'cancelled') {
    return { jsonrpc: '2.0', id, error: PAYME_ERRORS.CANT_PERFORM_TRANSACTION };
  }

  // Payme summani tiyinda beradi (1 so'm = 100 tiyin)
  const expectedTiyin = order.amount * 100;
  if (amountTiyin !== expectedTiyin) {
    return { jsonrpc: '2.0', id, error: PAYME_ERRORS.INCORRECT_AMOUNT };
  }

  return {
    jsonrpc: '2.0',
    id,
    result: { allow: true }
  };
}

/**
 * 2. CreateTransaction: Tranzaksiyani yaratish yoki mavjudini qaytarish
 */
async function handleCreateTransaction(id: number | string, params: any): Promise<PaymeRpcResponse> {
  const paymeTransId = String(params?.id);
  const orderId = params?.account?.order_id;
  const amountTiyin = Number(params?.amount);
  const time = Number(params?.time);

  // Avval CheckPerform tekshiruvidan o'tkazamiz
  const checkRes = await handleCheckPerformTransaction(id, params);
  if (checkRes.error) {
    return checkRes;
  }

  const existingTx = getPaymeTransaction(paymeTransId);
  const now = Date.now();

  if (existingTx) {
    // Agar tranzaksiya mavjud bo'lsa
    if (existingTx.state === 1) {
      // Muddati o'tgan bo'lsa (12 soat)
      if (now - existingTx.create_time > PAYME_TIMEOUT_MS) {
        updatePaymeTransaction(paymeTransId, { state: -1, cancel_time: now, reason: 4 });
        return { jsonrpc: '2.0', id, error: { ...PAYME_ERRORS.CANT_PERFORM_TRANSACTION, message: "Tranzaksiya vaqti tugagan" } };
      }
      return {
        jsonrpc: '2.0',
        id,
        result: {
          create_time: existingTx.create_time,
          transaction: existingTx.id,
          state: 1
        }
      };
    }
    return { jsonrpc: '2.0', id, error: PAYME_ERRORS.CANT_PERFORM_TRANSACTION };
  }

  // Ushbu buyurtma bo'yicha boshqa faol tranzaksiya bormi?
  const existingOrderTx = getPaymeTransactionByOrderId(orderId);
  if (existingOrderTx && existingOrderTx.id !== paymeTransId && (existingOrderTx.state === 1 || existingOrderTx.state === 2)) {
    return { jsonrpc: '2.0', id, error: { ...PAYME_ERRORS.CANT_PERFORM_TRANSACTION, message: "Bu buyurtma bo'yicha boshqa tranzaksiya faol" } };
  }

  // Yangi tranzaksiya saqlash
  const newTx: PaymeTxRecord = {
    id: paymeTransId,
    order_id: orderId,
    state: 1, // yaratilgan
    amount: amountTiyin,
    create_time: time || now,
    perform_time: 0,
    cancel_time: 0
  };
  savePaymeTransaction(newTx);

  return {
    jsonrpc: '2.0',
    id,
    result: {
      create_time: newTx.create_time,
      transaction: newTx.id,
      state: 1
    }
  };
}

/**
 * 3. PerformTransaction: To'lovni bajarish va obunani ochish
 */
async function handlePerformTransaction(id: number | string, params: any): Promise<PaymeRpcResponse> {
  const paymeTransId = String(params?.id);
  const tx = getPaymeTransaction(paymeTransId);

  if (!tx) {
    return { jsonrpc: '2.0', id, error: PAYME_ERRORS.TRANSACTION_NOT_FOUND };
  }

  const now = Date.now();

  // Allaqachon bajarilgan bo'lsa (idempotent javob)
  if (tx.state === 2) {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        transaction: tx.id,
        perform_time: tx.perform_time,
        state: 2
      }
    };
  }

  if (tx.state === 1) {
    // 12 soatlik muddat tekshiruvi
    if (now - tx.create_time > PAYME_TIMEOUT_MS) {
      updatePaymeTransaction(paymeTransId, { state: -1, cancel_time: now, reason: 4 });
      return { jsonrpc: '2.0', id, error: PAYME_ERRORS.CANT_PERFORM_TRANSACTION };
    }

    // Buyurtmani bajarish
    const compRes = completeOrder(tx.order_id, 'payme');
    if (!compRes.success) {
      return { jsonrpc: '2.0', id, error: { ...PAYME_ERRORS.CANT_PERFORM_TRANSACTION, message: compRes.message } };
    }

    // Tranzaksiyani yangilash
    const performTime = now;
    updatePaymeTransaction(paymeTransId, { state: 2, perform_time: performTime });

    return {
      jsonrpc: '2.0',
      id,
      result: {
        transaction: tx.id,
        perform_time: performTime,
        state: 2
      }
    };
  }

  return { jsonrpc: '2.0', id, error: PAYME_ERRORS.CANT_PERFORM_TRANSACTION };
}

/**
 * 4. CancelTransaction: Tranzaksiyani bekor qilish
 */
async function handleCancelTransaction(id: number | string, params: any): Promise<PaymeRpcResponse> {
  const paymeTransId = String(params?.id);
  const reason = Number(params?.reason);
  const tx = getPaymeTransaction(paymeTransId);

  if (!tx) {
    return { jsonrpc: '2.0', id, error: PAYME_ERRORS.TRANSACTION_NOT_FOUND };
  }

  const now = Date.now();

  // Agar allaqachon bekor qilingan bo'lsa (idempotent javob)
  if (tx.state === -1 || tx.state === -2) {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        transaction: tx.id,
        cancel_time: tx.cancel_time,
        state: tx.state
      }
    };
  }

  // Yaratilgan (bajarilmagan) to'lov bekor qilinmoqda
  if (tx.state === 1) {
    updatePaymeTransaction(paymeTransId, { state: -1, cancel_time: now, reason });
    return {
      jsonrpc: '2.0',
      id,
      result: {
        transaction: tx.id,
        cancel_time: now,
        state: -1
      }
    };
  }

  // Bajarilgan to'lov bekor qilinmoqda (refund)
  if (tx.state === 2) {
    updatePaymeTransaction(paymeTransId, { state: -2, cancel_time: now, reason });
    // Foydalanuvchi obunasini bekor qilish
    const order = getOrder(tx.order_id);
    if (order) {
      cancelUserSubscription(order.user_id, `Payme tranzaksiya bekor qilindi (Sabab kodi: ${reason})`);
    }

    return {
      jsonrpc: '2.0',
      id,
      result: {
        transaction: tx.id,
        cancel_time: now,
        state: -2
      }
    };
  }

  return { jsonrpc: '2.0', id, error: PAYME_ERRORS.CANT_CANCEL_TRANSACTION };
}

/**
 * 5. CheckTransaction: Tranzaksiya holatini tekshirish
 */
async function handleCheckTransaction(id: number | string, params: any): Promise<PaymeRpcResponse> {
  const paymeTransId = String(params?.id);
  const tx = getPaymeTransaction(paymeTransId);

  if (!tx) {
    return { jsonrpc: '2.0', id, error: PAYME_ERRORS.TRANSACTION_NOT_FOUND };
  }

  return {
    jsonrpc: '2.0',
    id,
    result: {
      create_time: tx.create_time,
      perform_time: tx.perform_time || 0,
      cancel_time: tx.cancel_time || 0,
      transaction: tx.id,
      state: tx.state,
      reason: tx.reason ?? null
    }
  };
}

/**
 * 6. GetStatement: Tranzaksiyalar ko'chirmasi
 */
async function handleGetStatement(id: number | string, params: any): Promise<PaymeRpcResponse> {
  const from = Number(params?.from);
  const to = Number(params?.to);

  const transactions = getPaymeStatements(from, to);
  return {
    jsonrpc: '2.0',
    id,
    result: {
      transactions: transactions.map(t => ({
        id: t.id,
        time: t.create_time,
        amount: t.amount,
        account: { order_id: t.order_id },
        create_time: t.create_time,
        perform_time: t.perform_time || 0,
        cancel_time: t.cancel_time || 0,
        transaction: t.id,
        state: t.state,
        reason: t.reason ?? null
      }))
    }
  };
}

/**
 * Payme to'lov havolasini generatsiya qilish (Checkout URL)
 */
export function generatePaymePaymentUrl(options: {
  merchantId: string;
  orderId: string;
  amount: number; // so'mda
  callbackUrl?: string;
}): string {
  const { merchantId, orderId, amount, callbackUrl } = options;
  const amountTiyin = amount * 100;
  
  // Format: m=MERCHANT_ID;ac.order_id=ORDER_ID;a=AMOUNT_TIYIN;c=CALLBACK_URL
  let paramStr = `m=${merchantId};ac.order_id=${orderId};a=${amountTiyin}`;
  if (callbackUrl) {
    paramStr += `;c=${callbackUrl}`;
  }

  const encoded = Buffer.from(paramStr).toString('base64');
  return `https://checkout.paycom.uz/${encoded}`;
}

