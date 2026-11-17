/**
 * M0 — Xavfsizlik: JWT sessiya middleware
 * 
 * S2 ni hal qiladi: Foydalanuvchi identifikatori endi faqat JWT tokendan olinadi,
 * hech qachon so'rov body/query parametridan ishonib olinmaydi.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWT sirlarini .env dan olamiz
export const JWT_SECRET = process.env.JWT_SECRET || 'quizgen_jwt_secret_change_in_production';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'quizgen_refresh_secret_change_in_production';
export const JWT_ACCESS_EXPIRES = '15m';
export const JWT_REFRESH_EXPIRES = '30d';

export interface JwtPayload {
  uid: string;
  role: 'student' | 'teacher' | 'admin' | 'superadmin';
  plan: 'free' | 'start' | 'pro' | 'master';
  iat?: number;
  exp?: number;
}

// Express Request ga user qo'shish
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Access token yaratish (15 daqiqa)
 */
export function createAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES });
}

/**
 * Refresh token yaratish (30 kun)
 */
export function createRefreshToken(uid: string): string {
  return jwt.sign({ uid }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });
}

/**
 * Access token tekshirish
 */
export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Refresh token tekshirish
 */
export function verifyRefreshToken(token: string): { uid: string } | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { uid: string };
  } catch {
    return null;
  }
}

/**
 * Majburiy autentifikatsiya middleware
 * req.user mavjud bo'lmasa 401 qaytaradi
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);

  if (!token) {
    res.status(401).json({ 
      error: "Kirish rad etildi. Iltimos, Telegram orqali kiring.",
      code: 'UNAUTHORIZED'
    });
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ 
      error: "Token yaroqsiz yoki muddati tugagan. Qayta kiring.",
      code: 'TOKEN_EXPIRED'
    });
    return;
  }

  req.user = payload;
  next();
}

/**
 * Ixtiyoriy autentifikatsiya middleware
 * Token bo'lsa req.user ni to'ldiradi, bo'lmasa ham o'tib ketadi
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}

/**
 * Admin roli tekshiruvi (requireAuth dan keyin ishlatiladi)
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "Kirish rad etildi.", code: 'UNAUTHORIZED' });
    return;
  }
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    res.status(403).json({ error: "Bu sahifaga kirish huquqi yo'q.", code: 'FORBIDDEN' });
    return;
  }
  next();
}

/**
 * Authorization header dan Bearer tokenni chiqarib olish
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  // Cookie dan ham tekshiramiz (refresh flow uchun)
  const cookieToken = req.cookies?.access_token;
  if (cookieToken) return cookieToken;
  
  return null;
}

