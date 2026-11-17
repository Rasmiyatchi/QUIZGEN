/**
 * M1 — Obuna Yadrosi va Entitlements Moduli (Yagona Haqiqat Manbai)
 * 
 * Barcha ruxsatlar, limitlar va obuna hayot sikli faqat shu modul orqali boshqariladi.
 */
import { Request, Response, NextFunction } from 'express';
import { 
  getDatabase, 
  getUser, 
  upsertUser, 
  generateId, 
  PRICING_PLANS 
} from './db.ts';

export interface PlanEntitlements {
  hemis_import: boolean;
  ai_daily_limit: number;
  max_quizzes: number;
  max_questions: number;
  editor: boolean;
  flashcards: boolean;
  wrong_only: boolean;
  export_formats: string[];
  share_links: number;
  library_saves: number;
  priority: boolean;
}

export interface EffectiveEntitlements {
  plan: 'free' | 'start' | 'pro' | 'master';
  planName: string;
  is_active: boolean;
  starts_at: number;
  expires_at: number;
  days_left: number;
  entitlements: PlanEntitlements;
  ai_today: number;
  ai_remaining: number;
}

// Boshlang'ich tariflar matritsasi (TZ 5.1 bo'limi)
export const DEFAULT_ENTITLEMENTS: Record<string, PlanEntitlements> = {
  free: {
    hemis_import: true,
    ai_daily_limit: 3,
    max_quizzes: 20,
    max_questions: 300,
    editor: false,
    flashcards: false,
    wrong_only: false,
    export_formats: [],
    share_links: 3,
    library_saves: 20,
    priority: false
  },
  start: {
    hemis_import: true,
    ai_daily_limit: 10,
    max_quizzes: 100,
    max_questions: 300,
    editor: false,
    flashcards: false,
    wrong_only: true,
    export_formats: [],
    share_links: 10,
    library_saves: 100,
    priority: false
  },
  pro: {
    hemis_import: true,
    ai_daily_limit: 50,
    max_quizzes: 500,
    max_questions: 500,
    editor: true,
    flashcards: true,
    wrong_only: true,
    export_formats: ['hemis_txt'],
    share_links: 10,
    library_saves: 500,
    priority: false
  },
  master: {
    hemis_import: true,
    ai_daily_limit: 300,
    max_quizzes: 2000,
    max_questions: 1000,
    editor: true,
    flashcards: true,
    wrong_only: true,
    export_formats: ['hemis_txt', 'docx', 'xlsx', 'pdf', 'json'],
    share_links: 99999,
    library_saves: 99999,
    priority: true
  }
};

// 60 soniyalik kesh
const entitlementsCache = new Map<string, { data: EffectiveEntitlements; cachedAt: number }>();

export function clearEntitlementsCache(userId?: string) {
  if (userId) {
    entitlementsCache.delete(userId);
  } else {
    entitlementsCache.clear();
  }
}

/**
 * Foydalanuvchining bugungi AI ishlatish sonini olish
 */
export function getDailyAiUsage(userId: string): number {
  const db = getDatabase();
  const todayStr = new Date().toISOString().slice(0, 10);
  
  if (!db) {
    const user = getUser(userId);
    return user?.last_ai_date === todayStr ? (user.ai_tests_today || 0) : 0;
  }

  const row = db.prepare(`
    SELECT count FROM usage_counters 
    WHERE user_id = ? AND feature = 'ai_generation' AND day = ?
  `).get(userId, todayStr) as { count: number } | undefined;

  return row ? row.count : 0;
}

/**
 * AI ishlatish sonini 1 taga oshirish (atomik)
 */
export function incrementAiUsage(userId: string, limit: number): boolean {
  const db = getDatabase();
  const todayStr = new Date().toISOString().slice(0, 10);

  if (!db) {
    const user = getUser(userId);
    const current = user?.last_ai_date === todayStr ? (user.ai_tests_today || 0) : 0;
    if (current >= limit) return false;
    if (user) {
      user.ai_tests_today = current + 1;
      user.last_ai_date = todayStr;
    }
    return true;
  }

  const current = getDailyAiUsage(userId);
  if (current >= limit) {
    return false;
  }

  const stmt = db.prepare(`
    INSERT INTO usage_counters (id, user_id, feature, day, count)
    VALUES (?, ?, 'ai_generation', ?, 1)
    ON CONFLICT(user_id, feature, day) DO UPDATE SET count = count + 1
  `);
  stmt.run(generateId(), userId, todayStr);
  
  clearEntitlementsCache(userId);
  return true;
}

/**
 * Foydalanuvchining amaldagi barcha huquq va limitlarini olish
 */
export function getEffectiveEntitlements(userId: string): EffectiveEntitlements {
  const now = Date.now();
  const cached = entitlementsCache.get(userId);
  if (cached && (now - cached.cachedAt) < 60_000) {
    // Keshdagi kundalik kvotani yangilab qaytaramiz
    const todayAi = getDailyAiUsage(userId);
    const limit = cached.data.entitlements.ai_daily_limit;
    return {
      ...cached.data,
      ai_today: todayAi,
      ai_remaining: Math.max(0, limit - todayAi)
    };
  }

  const db = getDatabase();
  let activeSub: any = null;

  if (db) {
    activeSub = db.prepare(`
      SELECT * FROM subscriptions 
      WHERE user_id = ? AND status = 'active' AND expires_at > ?
      ORDER BY expires_at DESC LIMIT 1
    `).get(userId, now);
  }

  // Agar subscriptions jadvalida topilmasa, users jadvalidagi fallback obunani tekshiramiz
  const user = getUser(userId);
  let planKey: 'free' | 'start' | 'pro' | 'master' = 'free';
  let startsAt = 0;
  let expiresAt = 0;
  let isActive = false;

  if (activeSub) {
    planKey = activeSub.plan_id;
    startsAt = activeSub.starts_at;
    expiresAt = activeSub.expires_at;
    isActive = true;
  } else if (user && user.subscription_plan && user.subscription_plan !== 'free') {
    const userExp = Number(user.subscription_expires_at) || 0;
    if (userExp > now) {
      planKey = user.subscription_plan as any;
      expiresAt = userExp;
      isActive = true;
    }
  }

  const entitlements = DEFAULT_ENTITLEMENTS[planKey] || DEFAULT_ENTITLEMENTS.free;
  const daysLeft = isActive ? Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))) : 0;
  const todayAi = getDailyAiUsage(userId);
  const remainingAi = Math.max(0, entitlements.ai_daily_limit - todayAi);

  const planNames: Record<string, string> = {
    free: 'Oddiy (Bepul)',
    start: 'Talaba Start',
    pro: 'Sessiya Pro',
    master: 'Grand Master'
  };

  const result: EffectiveEntitlements = {
    plan: planKey,
    planName: planNames[planKey] || planKey,
    is_active: isActive,
    starts_at: startsAt,
    expires_at: expiresAt,
    days_left: daysLeft,
    entitlements,
    ai_today: todayAi,
    ai_remaining: remainingAi
  };

  entitlementsCache.set(userId, { data: result, cachedAt: now });
  return result;
}

/**
 * Obunani faollashtirish (Barcha to'lov, admin grant va promo uchun yagona markaz)
 * TZ 5.3 hayot sikli qoidalari bo'yicha to'liq amalga oshirilgan
 */
export function activateSubscription(
  userId: string,
  planId: 'start' | 'pro' | 'master',
  options: {
    source?: 'payment' | 'admin_grant' | 'promo' | 'trial' | 'referral';
    orderId?: string;
    grantedBy?: string;
    note?: string;
    customDays?: number;
  } = {}
): { success: boolean; subscription?: any; message?: string } {
  const db = getDatabase();
  const now = Date.now();
  const planInfo = PRICING_PLANS[planId];
  if (!planInfo) {
    return { success: false, message: "Tarif ma'lumoti topilmadi." };
  }

  const durationDays = options.customDays || planInfo.durationDays;
  const durationMs = durationDays * 24 * 60 * 60 * 1000;

  // Foydalanuvchini bazada tekshirish/yaratish
  let user = getUser(userId);
  if (!user) {
    user = upsertUser({
      id: userId,
      first_name: 'Foydalanuvchi',
      role: 'student'
    });
  }

  const currentEntitlements = getEffectiveEntitlements(userId);
  const planLevels: Record<string, number> = { free: 0, start: 1, pro: 2, master: 3 };
  const currentLevel = planLevels[currentEntitlements.plan] || 0;
  const newLevel = planLevels[planId] || 0;

  let newStartsAt = now;
  let newExpiresAt = now + durationMs;
  let status: 'active' | 'scheduled' = 'active';

  if (currentEntitlements.is_active) {
    if (newLevel === currentLevel) {
      // Bir xil tarif: muddat mavjud expires_at dan boshlab qo'shiladi
      newStartsAt = currentEntitlements.starts_at || now;
      newExpiresAt = Math.max(now, currentEntitlements.expires_at) + durationMs;
      status = 'active';
    } else if (newLevel > currentLevel) {
      // Upgrade: eski tarifning qolgan qiymati yangi tarifga bonus kun sifatida qo'shiladi
      const remainingDays = currentEntitlements.days_left;
      const oldDailyPrice = (PRICING_PLANS[currentEntitlements.plan]?.price || 0) / (PRICING_PLANS[currentEntitlements.plan]?.durationDays || 1);
      const newDailyPrice = planInfo.price / planInfo.durationDays;
      const bonusDays = Math.floor((remainingDays * oldDailyPrice) / (newDailyPrice || 1));
      
      newStartsAt = now;
      newExpiresAt = now + durationMs + (bonusDays * 24 * 60 * 60 * 1000);
      status = 'active';

      // Eski obunani 'cancelled' qilamiz
      if (db) {
        db.prepare(`
          UPDATE subscriptions 
          SET status = 'cancelled', note = 'Upgraded to ' || ?
          WHERE user_id = ? AND status = 'active'
        `).run(planId, userId);
      }
    } else {
      // Downgrade: faol yuqori tarif tugagandan keyin navbatga qo'yiladi (scheduled)
      newStartsAt = currentEntitlements.expires_at;
      newExpiresAt = currentEntitlements.expires_at + durationMs;
      status = 'scheduled';
    }
  }

  const subId = generateId();

  if (db) {
    const stmt = db.prepare(`
      INSERT INTO subscriptions (
        id, user_id, plan_id, starts_at, expires_at, status, source, order_id, granted_by, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      subId,
      userId,
      planId,
      newStartsAt,
      newExpiresAt,
      status,
      options.source || 'payment',
      options.orderId || null,
      options.grantedBy || null,
      options.note || null
    );

    // Agar darhol faol bo'lsa, users jadvalini ham yangilaymiz
    if (status === 'active') {
      db.prepare(`
        UPDATE users 
        SET subscription_plan = ?, subscription_expires_at = ?
        WHERE id = ?
      `).run(planId, newExpiresAt, userId);
    }
  } else {
    // Memory fallback
    if (status === 'active' && user) {
      user.subscription_plan = planId;
      user.subscription_expires_at = newExpiresAt;
    }
  }

  clearEntitlementsCache(userId);

  return {
    success: true,
    subscription: {
      id: subId,
      user_id: userId,
      plan_id: planId,
      starts_at: newStartsAt,
      expires_at: newExpiresAt,
      status
    }
  };
}

/**
 * Obuna muddati tugaganlarni yangilash cron vazifasi
 */
export function checkAndExpireSubscriptions(): { expiredCount: number; scheduledActivated: number } {
  const db = getDatabase();
  if (!db) return { expiredCount: 0, scheduledActivated: 0 };

  const now = Date.now();

  // 1. Muddati o'tgan faol obunalarni 'expired' qilish
  const expireStmt = db.prepare(`
    UPDATE subscriptions 
    SET status = 'expired'
    WHERE status = 'active' AND expires_at <= ?
  `);
  const expireRes = expireStmt.run(now);

  // 2. Navbatda turgan ('scheduled') obunani faollashtirish
  const activateStmt = db.prepare(`
    UPDATE subscriptions 
    SET status = 'active'
    WHERE status = 'scheduled' AND starts_at <= ? AND expires_at > ?
  `);
  const activateRes = activateStmt.run(now, now);

  clearEntitlementsCache();

  return {
    expiredCount: expireRes.changes,
    scheduledActivated: activateRes.changes
  };
}

/**
 * Express Middleware: Maxsus imkoniyatni tekshirish (paywall)
 * Ruxsat bo'lmasa HTTP 402 qaytaradi
 */
export function requireFeature(feature: keyof PlanEntitlements, requiredPlan = 'pro') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user?.uid) {
      res.status(401).json({ error: "Avval tizimga kiring.", code: 'UNAUTHORIZED' });
      return;
    }

    const effective = getEffectiveEntitlements(req.user.uid);
    const hasAccess = Boolean(effective.entitlements[feature]);

    if (!hasAccess) {
      res.status(402).json({
        error: `Ushbu imkoniyat (${String(feature)}) dan foydalanish uchun ${requiredPlan.toUpperCase()} tarifiga obuna bo'lish lozim.`,
        code: 'FEATURE_LOCKED',
        feature,
        requiredPlan,
        currentPlan: effective.plan
      });
      return;
    }

    next();
  };
}

/**
 * Express Middleware: AI kvotasi tekshiruvi (atomik sarflash)
 */
export function requireAiQuota(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.uid) {
    res.status(401).json({ error: "AI test yaratish uchun avval tizimga kiring.", code: 'UNAUTHORIZED' });
    return;
  }

  const effective = getEffectiveEntitlements(req.user.uid);
  const limit = effective.entitlements.ai_daily_limit;

  const allowed = incrementAiUsage(req.user.uid, limit);
  if (!allowed) {
    res.status(402).json({
      error: `Bugungi AI test tuzish limitingiz (${limit} ta) tugadi. Tarifingizni oshiring yoki HEMIS testlaridan bepul foydalaning!`,
      code: 'QUOTA_EXCEEDED',
      feature: 'ai_generation',
      limit,
      used: effective.ai_today,
      currentPlan: effective.plan
    });
    return;
  }

  next();
}
