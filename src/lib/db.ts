import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { activateSubscription } from './entitlements.ts';

const require = createRequire(import.meta.url);

export interface UserRecord {
  id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  role?: 'student' | 'teacher' | 'admin' | 'superadmin';
  subscription_plan?: 'free' | 'start' | 'pro' | 'master';
  subscription_expires_at?: number; // ms timestamp
  ai_tests_today?: number;
  last_ai_date?: string;
  created_at?: string;
}

export interface OrderRecord {
  id: string;
  user_id: string;
  plan: 'start' | 'pro' | 'master';
  amount: number;
  status: 'pending' | 'pending_review' | 'completed' | 'cancelled';
  payment_method: 'click' | 'payme' | 'telegram' | 'manual' | 'demo';
  proof_image?: string;
  admin_note?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  completed_at?: string;
}

export interface PaymeTxRecord {
  id: string;
  order_id: string;
  state: number; // 1 = created, 2 = performed, -1 = cancelled after created, -2 = cancelled after performed
  amount: number; // tiyin (1 sum = 100 tiyin)
  create_time: number;
  perform_time: number;
  cancel_time: number;
  reason?: number;
  created_at?: string;
}

export interface ClickTxRecord {
  click_trans_id: string;
  service_id: number;
  click_paydoc_id?: string;
  merchant_trans_id: string;
  amount: number;
  action: number;
  error: number;
  error_note?: string;
  sign_time: string;
  status: 'prepare' | 'complete' | 'cancelled';
  created_at?: string;
}

export interface AuthTokenRecord {
  token: string;
  user_id?: string;
  status: 'pending' | 'authorized' | 'expired';
  user_data?: any;
  created_at: number;
  expires_at: number;
}

export interface QuestionRecord {
  id?: string;
  quiz_id?: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  order_num?: number;
}

export interface QuizRecord {
  id: string;
  user_id: string;
  title: string;
  subject?: string;
  source_type: 'hemis' | 'gemini' | 'manual';
  total_questions: number;
  time_limit_minutes: number; // 0 = cheklovsiz
  is_public: number; // 1 = public, 0 = private
  questions?: QuestionRecord[];
  created_at?: string;
}

export interface AttemptRecord {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total: number;
  percentage: number;
  time_spent_seconds: number;
  answers_given: number[];
  completed_at?: string;
  quiz_title?: string;
}

let dbInstance: any = null;
let useJsonFallback = false;

export function getDatabase() {
  return dbInstance;
}

export function generateId(): string {
  return crypto.randomUUID();
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const JSON_DB_FILE = path.join(DATA_DIR, 'quizgen_store.json');
const SQLITE_DB_FILE = path.join(DATA_DIR, 'quizgen.db');

interface JsonStore {
  users: Record<string, UserRecord>;
  quizzes: Record<string, QuizRecord>;
  questions: Record<string, QuestionRecord[]>;
  attempts: Record<string, AttemptRecord>;
  orders: Record<string, OrderRecord>;
  authTokens: Record<string, AuthTokenRecord>;
}

let memoryStore: JsonStore = {
  users: {},
  quizzes: {},
  questions: {},
  attempts: {},
  orders: {},
  authTokens: {}
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadJsonStore() {
  try {
    ensureDataDir();
    if (fs.existsSync(JSON_DB_FILE)) {
      const content = fs.readFileSync(JSON_DB_FILE, 'utf8');
      memoryStore = JSON.parse(content);
    }
  } catch (err) {
    console.warn("JSON store load error:", err);
  }
}

function saveJsonStore() {
  try {
    ensureDataDir();
    fs.writeFileSync(JSON_DB_FILE, JSON.stringify(memoryStore, null, 2), 'utf8');
  } catch (err) {
    console.warn("JSON store save error:", err);
  }
}

// Database inicializatsiyasi
export function initDatabase() {
  ensureDataDir();

  try {
    const { DatabaseSync } = require('node:sqlite');
    dbInstance = new DatabaseSync(SQLITE_DB_FILE);

    // WAL rejimi va busy_timeout bir nechta ulanishlar bloklanishini oldini oladi
    dbInstance.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
    `);

    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT,
        username TEXT,
        photo_url TEXT,
        role TEXT DEFAULT 'student',
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        subject TEXT DEFAULT 'Umumiy',
        source_type TEXT DEFAULT 'hemis',
        total_questions INTEGER DEFAULT 0,
        time_limit_minutes INTEGER DEFAULT 0,
        is_public INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS questions (
        id TEXT PRIMARY KEY,
        quiz_id TEXT NOT NULL,
        question_text TEXT NOT NULL,
        options TEXT NOT NULL,
        correct_answer INTEGER NOT NULL,
        explanation TEXT,
        order_num INTEGER DEFAULT 0,
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        quiz_id TEXT NOT NULL,
        score INTEGER NOT NULL,
        total INTEGER NOT NULL,
        percentage REAL NOT NULL,
        time_spent_seconds INTEGER DEFAULT 0,
        answers_given TEXT NOT NULL,
        completed_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan TEXT NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        payment_method TEXT NOT NULL DEFAULT 'demo',
        created_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS auth_tokens (
        token TEXT PRIMARY KEY,
        user_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        user_data TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price_tiyin INTEGER NOT NULL,
        duration_days INTEGER NOT NULL,
        entitlements TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        is_public INTEGER DEFAULT 1,
        sort INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        starts_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        source TEXT NOT NULL DEFAULT 'payment',
        order_id TEXT,
        granted_by TEXT,
        note TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS usage_counters (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        feature TEXT NOT NULL,
        day TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        UNIQUE(user_id, feature, day)
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        actor_id TEXT,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        details TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS payme_transactions (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        state INTEGER NOT NULL DEFAULT 1,
        amount INTEGER NOT NULL,
        create_time INTEGER NOT NULL,
        perform_time INTEGER DEFAULT 0,
        cancel_time INTEGER DEFAULT 0,
        reason INTEGER,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (order_id) REFERENCES orders(id)
      );

      CREATE TABLE IF NOT EXISTS click_transactions (
        click_trans_id TEXT PRIMARY KEY,
        service_id INTEGER NOT NULL,
        click_paydoc_id TEXT,
        merchant_trans_id TEXT NOT NULL,
        amount REAL NOT NULL,
        action INTEGER NOT NULL,
        error INTEGER DEFAULT 0,
        error_note TEXT,
        sign_time TEXT,
        status TEXT NOT NULL DEFAULT 'prepare',
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    // Foydalanuvchilar jadvaliga obuna ustunlarini qo'shish (agar bo'lmasa)
    const userCols = [
      'subscription_plan TEXT DEFAULT "free"',
      'subscription_expires_at INTEGER DEFAULT 0',
      'ai_tests_today INTEGER DEFAULT 0',
      'last_ai_date TEXT DEFAULT ""'
    ];
    for (const col of userCols) {
      try {
        dbInstance.exec(`ALTER TABLE users ADD COLUMN ${col}`);
      } catch (e) {
        // Ustun allaqachon mavjud bo'lsa xatolik e'tiborga olinmaydi
      }
    }

    // Buyurtmalar jadvaliga chek/moderatsiya ustunlarini qo'shish (agar bo'lmasa)
    const orderCols = [
      'proof_image TEXT DEFAULT NULL',
      'admin_note TEXT DEFAULT NULL',
      'reviewed_by TEXT DEFAULT NULL',
      'reviewed_at TEXT DEFAULT NULL'
    ];
    for (const col of orderCols) {
      try {
        dbInstance.exec(`ALTER TABLE orders ADD COLUMN ${col}`);
      } catch (e) {}
    }

    console.log("SQLite ma'lumotlar bazasi muvaffaqiyatli ulandi: " + SQLITE_DB_FILE);
  } catch (err) {
    console.warn("node:sqlite xatosi, JSON fallback faollashtirildi:", err);
    useJsonFallback = true;
    loadJsonStore();
  }
}

// 1. FOYDALANUVCHILAR (Users)
export function upsertUser(user: UserRecord): UserRecord {
  if (useJsonFallback || !dbInstance) {
    const existing: Partial<UserRecord> = memoryStore.users[user.id] || {};
    const updated: UserRecord = {
      ...existing,
      ...user,
      created_at: existing.created_at || new Date().toISOString()
    };
    memoryStore.users[user.id] = updated;
    saveJsonStore();
    return updated;
  }

  const stmt = dbInstance.prepare(`
    INSERT INTO users (id, first_name, last_name, username, photo_url, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      username = excluded.username,
      photo_url = excluded.photo_url
  `);
  stmt.run(
    user.id,
    user.first_name,
    user.last_name || null,
    user.username || null,
    user.photo_url || null,
    user.role || 'student'
  );

  return getUser(user.id) || user;
}

export function getUser(id: string): UserRecord | null {
  if (useJsonFallback || !dbInstance) {
    return memoryStore.users[id] || null;
  }
  const row = dbInstance.prepare('SELECT * FROM users WHERE id = ?').get(id);
  return (row as UserRecord) || null;
}

// 2. TESTLAR (Quizzes)
export function createQuiz(quiz: QuizRecord, questions: QuestionRecord[]): QuizRecord {
  const quizId = quiz.id || Math.random().toString(36).substring(7);
  const now = new Date().toISOString();

  if (useJsonFallback || !dbInstance) {
    const record: QuizRecord = {
      ...quiz,
      id: quizId,
      total_questions: questions.length,
      created_at: now
    };
    memoryStore.quizzes[quizId] = record;
    memoryStore.questions[quizId] = questions.map((q, idx) => ({
      ...q,
      order_num: idx,
      quiz_id: quizId
    }));
    saveJsonStore();
    return { ...record, questions };
  }

  const insertQuiz = dbInstance.prepare(`
    INSERT INTO quizzes (id, user_id, title, subject, source_type, total_questions, time_limit_minutes, is_public, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  insertQuiz.run(
    quizId,
    quiz.user_id,
    quiz.title,
    quiz.subject || 'Umumiy',
    quiz.source_type || 'hemis',
    questions.length,
    quiz.time_limit_minutes || 0,
    quiz.is_public !== undefined ? quiz.is_public : 1
  );

  const insertQuestion = dbInstance.prepare(`
    INSERT INTO questions (id, quiz_id, question_text, options, correct_answer, explanation, order_num)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  questions.forEach((q, idx) => {
    const qId = q.id || `${quizId}_q${idx + 1}`;
    insertQuestion.run(
      qId,
      quizId,
      q.question,
      JSON.stringify(q.options),
      q.correctAnswer,
      q.explanation || null,
      idx
    );
  });

  return getQuiz(quizId) || quiz;
}

export function getQuiz(id: string): QuizRecord | null {
  if (useJsonFallback || !dbInstance) {
    const q = memoryStore.quizzes[id];
    if (!q) return null;
    return {
      ...q,
      questions: memoryStore.questions[id] || []
    };
  }

  const quiz = dbInstance.prepare('SELECT * FROM quizzes WHERE id = ?').get(id) as QuizRecord;
  if (!quiz) return null;

  const rows = dbInstance.prepare('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_num ASC').all(id) as any[];
  const questions: QuestionRecord[] = rows.map(r => ({
    id: r.id,
    quiz_id: r.quiz_id,
    question: r.question_text,
    options: typeof r.options === 'string' ? JSON.parse(r.options) : r.options,
    correctAnswer: r.correct_answer,
    explanation: r.explanation,
    order_num: r.order_num
  }));

  return {
    ...quiz,
    questions
  };
}

export function getUserQuizzes(userId: string): QuizRecord[] {
  if (useJsonFallback || !dbInstance) {
    return Object.values(memoryStore.quizzes)
      .filter(q => q.user_id === userId)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  const rows = dbInstance.prepare('SELECT * FROM quizzes WHERE user_id = ? ORDER BY created_at DESC').all(userId) as QuizRecord[];
  return rows;
}

export function getPublicQuizzes(limit = 20): QuizRecord[] {
  if (useJsonFallback || !dbInstance) {
    return Object.values(memoryStore.quizzes)
      .filter(q => q.is_public === 1)
      .slice(0, limit);
  }

  const rows = dbInstance.prepare('SELECT * FROM quizzes WHERE is_public = 1 ORDER BY created_at DESC LIMIT ?').all(limit) as QuizRecord[];
  return rows;
}

export function updateQuiz(id: string, quizData: Partial<QuizRecord>, questions?: QuestionRecord[]): QuizRecord | null {
  const existing = getQuiz(id);
  if (!existing) return null;

  if (useJsonFallback || !dbInstance) {
    memoryStore.quizzes[id] = {
      ...existing,
      ...quizData,
      total_questions: questions ? questions.length : existing.total_questions
    };
    if (questions) {
      memoryStore.questions[id] = questions;
    }
    saveJsonStore();
    return getQuiz(id);
  }

  if (quizData.title || quizData.subject || quizData.time_limit_minutes !== undefined) {
    dbInstance.prepare(`
      UPDATE quizzes SET
        title = COALESCE(?, title),
        subject = COALESCE(?, subject),
        time_limit_minutes = COALESCE(?, time_limit_minutes),
        is_public = COALESCE(?, is_public),
        total_questions = ?
      WHERE id = ?
    `).run(
      quizData.title || null,
      quizData.subject || null,
      quizData.time_limit_minutes !== undefined ? quizData.time_limit_minutes : null,
      quizData.is_public !== undefined ? quizData.is_public : null,
      questions ? questions.length : existing.total_questions,
      id
    );
  }

  if (questions) {
    dbInstance.prepare('DELETE FROM questions WHERE quiz_id = ?').run(id);
    const insertQuestion = dbInstance.prepare(`
      INSERT INTO questions (id, quiz_id, question_text, options, correct_answer, explanation, order_num)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    questions.forEach((q, idx) => {
      insertQuestion.run(
        q.id || `${id}_q${idx + 1}`,
        id,
        q.question,
        JSON.stringify(q.options),
        q.correctAnswer,
        q.explanation || null,
        idx
      );
    });
  }

  return getQuiz(id);
}

export function deleteQuiz(id: string, userId: string): boolean {
  if (useJsonFallback || !dbInstance) {
    const q = memoryStore.quizzes[id];
    if (q && q.user_id === userId) {
      delete memoryStore.quizzes[id];
      delete memoryStore.questions[id];
      saveJsonStore();
      return true;
    }
    return false;
  }

  const result = dbInstance.prepare('DELETE FROM quizzes WHERE id = ? AND user_id = ?').run(id, userId);
  dbInstance.prepare('DELETE FROM questions WHERE quiz_id = ?').run(id);
  return result.changes > 0;
}

// 3. NATIJALAR / URINISHLAR (Attempts)
export function saveAttempt(attempt: AttemptRecord): AttemptRecord {
  const attemptId = attempt.id || Math.random().toString(36).substring(7);

  if (useJsonFallback || !dbInstance) {
    const q = memoryStore.quizzes[attempt.quiz_id];
    const record = {
      ...attempt,
      id: attemptId,
      quiz_title: q ? q.title : undefined,
      completed_at: new Date().toISOString()
    };
    memoryStore.attempts[attemptId] = record;
    saveJsonStore();
    return record;
  }

  const stmt = dbInstance.prepare(`
    INSERT INTO attempts (id, user_id, quiz_id, score, total, percentage, time_spent_seconds, answers_given, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  stmt.run(
    attemptId,
    attempt.user_id,
    attempt.quiz_id,
    attempt.score,
    attempt.total,
    attempt.percentage,
    attempt.time_spent_seconds || 0,
    JSON.stringify(attempt.answers_given)
  );

  return getAttempt(attemptId) || attempt;
}

export function getAttempt(id: string): AttemptRecord | null {
  if (useJsonFallback || !dbInstance) {
    return memoryStore.attempts[id] || null;
  }

  const row = dbInstance.prepare(`
    SELECT a.*, q.title as quiz_title
    FROM attempts a
    LEFT JOIN quizzes q ON a.quiz_id = q.id
    WHERE a.id = ?
  `).get(id) as any;

  if (!row) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    quiz_id: row.quiz_id,
    score: row.score,
    total: row.total,
    percentage: row.percentage,
    time_spent_seconds: row.time_spent_seconds,
    answers_given: typeof row.answers_given === 'string' ? JSON.parse(row.answers_given) : row.answers_given,
    completed_at: row.completed_at,
    quiz_title: row.quiz_title
  };
}

export function getUserAttempts(userId: string): AttemptRecord[] {
  if (useJsonFallback || !dbInstance) {
    return Object.values(memoryStore.attempts)
      .filter(a => a.user_id === userId)
      .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || ''));
  }

  const rows = dbInstance.prepare(`
    SELECT a.*, q.title as quiz_title
    FROM attempts a
    LEFT JOIN quizzes q ON a.quiz_id = q.id
    WHERE a.user_id = ?
    ORDER BY a.completed_at DESC
  `).all(userId) as any[];

  return rows.map(r => ({
    id: r.id,
    user_id: r.user_id,
    quiz_id: r.quiz_id,
    score: r.score,
    total: r.total,
    percentage: r.percentage,
    time_spent_seconds: r.time_spent_seconds,
    answers_given: typeof r.answers_given === 'string' ? JSON.parse(r.answers_given) : r.answers_given,
    completed_at: r.completed_at,
    quiz_title: r.quiz_title
  }));
}

// 4. OBUNA VA TARIFLAR TIZIMI (Subscriptions & Plans)
export const PRICING_PLANS = {
  start: {
    id: 'start',
    name: 'Talaba Start',
    subtitle: 'Ekspress tayyorgarlik',
    price: 7999,
    priceFormatted: "7 999 so'm",
    durationDays: 7,
    dailyAiLimit: 10,
    features: [
      "7 kunlik to'liq kirish",
      "Cheksiz HEMIS Word (.docx) test yuklash",
      "Kuniga 10 tagacha Gemini AI test",
      "Natijalar va xatoliklar tahlili",
      "Mobil va Telegram TMA qulayligi"
    ],
    badge: "Tezkor"
  },
  pro: {
    id: 'pro',
    name: 'Sessiya Pro',
    subtitle: 'Butun sessiya uchun a\'lo',
    price: 29999,
    priceFormatted: "29 999 so'm",
    durationDays: 30,
    dailyAiLimit: 50,
    popular: true,
    features: [
      "30 kunlik (1 oy) to'liq obuna",
      "Cheksiz HEMIS test yuklash (Tezkor)",
      "Kuniga 50 tagacha Gemini AI test",
      "3D Interaktiv Flashcardlar",
      "Test Muharriri (Editor) & HEMIS .txt eksport",
      "Faqat xatolar ustida qayta ishlash",
      "Guruhlarga 10 tagacha test ulashish"
    ],
    badge: "Eng Ommabop"
  },
  master: {
    id: 'master',
    name: 'Grand Master',
    subtitle: 'VIP va Cheksiz Imkoniyat',
    price: 59900,
    priceFormatted: "59 900 so'm",
    durationDays: 90,
    dailyAiLimit: 99999,
    features: [
      "90 kunlik (1 semestr) to'liq obuna",
      "CHEKSIZ Gemini AI test generatsiyasi",
      "CHEKSIZ HEMIS va erkin matn yuklash",
      "Barcha formatlarda eksport (HEMIS, Word, Excel)",
      "Cheksiz ochiq guruh havolalari",
      "VIP ustuvor server tezligi",
      "24/7 Shaxsiy Telegram yordam"
    ],
    badge: "VIP & Cheksiz"
  }
};

export function updateUserSubscription(userId: string, plan: 'start' | 'pro' | 'master', durationDays: number): UserRecord | null {
  let user = getUser(userId);
  if (!user) {
    user = upsertUser({
      id: userId,
      first_name: 'Foydalanuvchi',
      role: 'student'
    });
  }

  const now = Date.now();
  const currentExpiry = Number(user.subscription_expires_at) || 0;
  // Agar foydalanuvchida hali muddati tugamagan obuna bo'lsa, ustiga qo'shiladi
  const baseTime = currentExpiry > now ? currentExpiry : now;
  const newExpiry = baseTime + (durationDays * 24 * 60 * 60 * 1000);

  if (useJsonFallback || !dbInstance) {
    if (memoryStore.users[userId]) {
      memoryStore.users[userId].subscription_plan = plan;
      memoryStore.users[userId].subscription_expires_at = newExpiry;
      saveJsonStore();
      return memoryStore.users[userId];
    }
    return null;
  }

  const stmt = dbInstance.prepare(`
    UPDATE users 
    SET subscription_plan = ?, subscription_expires_at = ?
    WHERE id = ?
  `);
  stmt.run(plan, newExpiry, userId);

  return getUser(userId);
}

export function getUserSubscription(userId: string) {
  const user = getUser(userId);
  if (!user) {
    return {
      plan: 'free',
      is_active: false,
      expires_at: 0,
      days_left: 0,
      daily_ai_limit: 3,
      ai_tests_today: 0,
      ai_tests_remaining: 3
    };
  }

  const now = Date.now();
  const expiresAt = Number(user.subscription_expires_at) || 0;
  const isActive = expiresAt > now && Boolean(user.subscription_plan) && user.subscription_plan !== 'free';
  const plan = isActive ? (user.subscription_plan as 'start' | 'pro' | 'master') : 'free';
  const daysLeft = isActive ? Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24)) : 0;

  // AI kunlik limit hisobi
  const todayStr = new Date().toISOString().slice(0, 10);
  const testsToday = user.last_ai_date === todayStr ? (user.ai_tests_today || 0) : 0;
  const limit = plan === 'master' ? 99999 : plan === 'pro' ? 50 : plan === 'start' ? 10 : 3;
  const remaining = Math.max(0, limit - testsToday);

  return {
    plan,
    is_active: isActive,
    expires_at: expiresAt,
    days_left: daysLeft,
    daily_ai_limit: limit,
    ai_tests_today: testsToday,
    ai_tests_remaining: remaining
  };
}

export function canGenerateAiTest(userId: string): { allowed: boolean; reason?: string; remaining: number } {
  const status = getUserSubscription(userId);
  if (status.ai_tests_remaining <= 0) {
    return {
      allowed: false,
      reason: `Bugungi AI test generatsiya limitingiz (${status.daily_ai_limit} ta) tugadi. Qo'shimcha testlar uchun obuna tarifini oshiring yoki HEMIS testlaridan mutlaqo BEPUL foydalaning!`,
      remaining: 0
    };
  }
  return {
    allowed: true,
    remaining: status.ai_tests_remaining
  };
}

export function cancelUserSubscription(userId: string, reason: string = 'Admin tomonidan bekor qilindi'): boolean {
  if (useJsonFallback || !dbInstance) {
    if (memoryStore.users[userId]) {
      memoryStore.users[userId].subscription_plan = 'free';
      memoryStore.users[userId].subscription_expires_at = 0;
      saveJsonStore();
    }
    return true;
  }

  dbInstance.prepare(`
    UPDATE subscriptions 
    SET status = 'cancelled', note = ? 
    WHERE user_id = ? AND status = 'active'
  `).run(reason, userId);

  dbInstance.prepare(`
    UPDATE users 
    SET subscription_plan = 'free', subscription_expires_at = 0 
    WHERE id = ?
  `).run(userId);

  return true;
}

export function recordAiTest(userId: string) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const user = getUser(userId);
  if (!user) return;

  const currentToday = user.last_ai_date === todayStr ? (user.ai_tests_today || 0) + 1 : 1;

  if (useJsonFallback || !dbInstance) {
    if (memoryStore.users[userId]) {
      memoryStore.users[userId].ai_tests_today = currentToday;
      memoryStore.users[userId].last_ai_date = todayStr;
      saveJsonStore();
    }
    return;
  }

  const stmt = dbInstance.prepare(`
    UPDATE users 
    SET ai_tests_today = ?, last_ai_date = ?
    WHERE id = ?
  `);
  stmt.run(currentToday, todayStr, userId);
}

// 5. TO'LOV VA BUYURTMALAR (Orders)
export function createOrder(data: {
  userId: string;
  plan: 'start' | 'pro' | 'master';
  paymentMethod?: 'click' | 'payme' | 'telegram' | 'demo';
}): OrderRecord {
  const planInfo = PRICING_PLANS[data.plan];
  const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
  const now = new Date().toISOString();

  const record: OrderRecord = {
    id: orderId,
    user_id: data.userId,
    plan: data.plan,
    amount: planInfo.price,
    status: 'pending',
    payment_method: data.paymentMethod || 'demo',
    created_at: now
  };

  if (useJsonFallback || !dbInstance) {
    memoryStore.orders[orderId] = record;
    saveJsonStore();
    return record;
  }

  const stmt = dbInstance.prepare(`
    INSERT INTO orders (id, user_id, plan, amount, status, payment_method, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  stmt.run(orderId, data.userId, data.plan, planInfo.price, 'pending', data.paymentMethod || 'demo');

  return record;
}

export function getOrder(orderId: string): OrderRecord | null {
  if (useJsonFallback || !dbInstance) {
    return memoryStore.orders[orderId] || null;
  }
  const row = dbInstance.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  return (row as OrderRecord) || null;
}

export function completeOrder(orderId: string, paymentMethod?: 'click' | 'payme' | 'telegram' | 'demo'): { success: boolean; user?: UserRecord; order?: OrderRecord; message?: string } {
  const order = getOrder(orderId);
  if (!order) {
    return { success: false, message: "Buyurtma topilmadi" };
  }

  // S5 fix — Allaqachon bajarilgan buyurtmani qayta bajartirish mumkin emas
  if (order.status === 'completed') {
    return { success: false, message: "Bu buyurtma allaqachon bajarilgan. Ikki marta to'lov mumkin emas." };
  }

  if (order.status === 'cancelled') {
    return { success: false, message: "Bekor qilingan buyurtmani bajarib bo'lmaydi." };
  }

  const planInfo = PRICING_PLANS[order.plan];
  if (!planInfo) {
    return { success: false, message: "Tarif ma'lumoti xato" };
  }

  // Foydalanuvchi obunasini yangilaymiz (M1: activateSubscription orqali)
  const actRes = activateSubscription(order.user_id, order.plan, {
    source: 'payment',
    orderId
  });
  const updatedUser = getUser(order.user_id);

  const completedAt = new Date().toISOString();

  if (useJsonFallback || !dbInstance) {
    if (memoryStore.orders[orderId]) {
      memoryStore.orders[orderId].status = 'completed';
      memoryStore.orders[orderId].payment_method = paymentMethod || order.payment_method;
      memoryStore.orders[orderId].completed_at = completedAt;
      saveJsonStore();
    }
  } else {
    const stmt = dbInstance.prepare(`
      UPDATE orders 
      SET status = 'completed', payment_method = ?, completed_at = datetime('now')
      WHERE id = ?
    `);
    stmt.run(paymentMethod || order.payment_method, orderId);
  }

  const updatedOrder = getOrder(orderId);
  return {
    success: true,
    user: updatedUser || undefined,
    order: updatedOrder || undefined
  };
}

export function getUserOrders(userId: string): OrderRecord[] {
  if (useJsonFallback || !dbInstance) {
    return Object.values(memoryStore.orders)
      .filter(o => o.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const rows = dbInstance.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  return (rows as OrderRecord[]) || [];
}

// ===================================================
// PAYME, CLICK VA MANUAL TO'LOV HELPERLARI
// ===================================================

export function savePaymeTransaction(tx: PaymeTxRecord) {
  if (useJsonFallback || !dbInstance) return;
  const stmt = dbInstance.prepare(`
    INSERT INTO payme_transactions (id, order_id, state, amount, create_time, perform_time, cancel_time, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(tx.id, tx.order_id, tx.state, tx.amount, tx.create_time, tx.perform_time || 0, tx.cancel_time || 0, tx.reason || null);
}

export function getPaymeTransaction(id: string): PaymeTxRecord | null {
  if (useJsonFallback || !dbInstance) return null;
  const row = dbInstance.prepare('SELECT * FROM payme_transactions WHERE id = ?').get(id);
  return (row as PaymeTxRecord) || null;
}

export function getPaymeTransactionByOrderId(orderId: string): PaymeTxRecord | null {
  if (useJsonFallback || !dbInstance) return null;
  const row = dbInstance.prepare('SELECT * FROM payme_transactions WHERE order_id = ?').get(orderId);
  return (row as PaymeTxRecord) || null;
}

export function updatePaymeTransaction(id: string, updates: Partial<PaymeTxRecord>) {
  if (useJsonFallback || !dbInstance) return;
  const fields: string[] = [];
  const values: any[] = [];
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  if (fields.length === 0) return;
  values.push(id);
  dbInstance.prepare(`UPDATE payme_transactions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function getPaymeStatements(from: number, to: number): PaymeTxRecord[] {
  if (useJsonFallback || !dbInstance) return [];
  const rows = dbInstance.prepare('SELECT * FROM payme_transactions WHERE create_time >= ? AND create_time <= ?').all(from, to);
  return (rows as PaymeTxRecord[]) || [];
}

export function saveClickTransaction(tx: ClickTxRecord) {
  if (useJsonFallback || !dbInstance) return;
  const stmt = dbInstance.prepare(`
    INSERT OR REPLACE INTO click_transactions (click_trans_id, service_id, click_paydoc_id, merchant_trans_id, amount, action, error, error_note, sign_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    String(tx.click_trans_id),
    tx.service_id,
    tx.click_paydoc_id ? String(tx.click_paydoc_id) : null,
    tx.merchant_trans_id,
    tx.amount,
    tx.action,
    tx.error || 0,
    tx.error_note || null,
    tx.sign_time,
    tx.status || 'prepare'
  );
}

export function getClickTransaction(clickTransId: string): ClickTxRecord | null {
  if (useJsonFallback || !dbInstance) return null;
  const row = dbInstance.prepare('SELECT * FROM click_transactions WHERE click_trans_id = ?').get(String(clickTransId));
  return (row as ClickTxRecord) || null;
}

export function getClickTransactionByOrderId(orderId: string): ClickTxRecord | null {
  if (useJsonFallback || !dbInstance) return null;
  const row = dbInstance.prepare('SELECT * FROM click_transactions WHERE merchant_trans_id = ?').get(orderId);
  return (row as ClickTxRecord) || null;
}

export function updateClickTransaction(clickTransId: string, updates: Partial<ClickTxRecord>) {
  if (useJsonFallback || !dbInstance) return;
  const fields: string[] = [];
  const values: any[] = [];
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }
  if (fields.length === 0) return;
  values.push(String(clickTransId));
  dbInstance.prepare(`UPDATE click_transactions SET ${fields.join(', ')} WHERE click_trans_id = ?`).run(...values);
}

export function submitOrderProof(orderId: string, proofUrl: string): boolean {
  if (useJsonFallback || !dbInstance) {
    if (memoryStore.orders[orderId]) {
      memoryStore.orders[orderId].status = 'pending_review';
      memoryStore.orders[orderId].payment_method = 'manual';
      memoryStore.orders[orderId].proof_image = proofUrl;
      saveJsonStore();
      return true;
    }
    return false;
  }
  const res = dbInstance.prepare(`
    UPDATE orders 
    SET status = 'pending_review', payment_method = 'manual', proof_image = ?
    WHERE id = ? AND status = 'pending'
  `).run(proofUrl, orderId);
  return res.changes > 0;
}

export function approveManualOrder(orderId: string, adminId: string, note?: string): { success: boolean; message?: string } {
  const order = getOrder(orderId);
  if (!order) return { success: false, message: "Buyurtma topilmadi." };
  if (order.status === 'completed') return { success: false, message: "Buyurtma allaqachon bajarilgan." };

  const comp = completeOrder(orderId, 'manual');
  if (!comp.success) return comp;

  if (dbInstance) {
    dbInstance.prepare(`
      UPDATE orders 
      SET reviewed_by = ?, reviewed_at = datetime('now'), admin_note = ?
      WHERE id = ?
    `).run(adminId, note || null, orderId);
  }
  return { success: true };
}

export function rejectManualOrder(orderId: string, adminId: string, reason?: string): { success: boolean; message?: string } {
  const order = getOrder(orderId);
  if (!order) return { success: false, message: "Buyurtma topilmadi." };
  if (order.status === 'completed') return { success: false, message: "Bajarilgan buyurtmani rad etib bo'lmaydi." };

  if (useJsonFallback || !dbInstance) {
    if (memoryStore.orders[orderId]) {
      memoryStore.orders[orderId].status = 'cancelled';
      memoryStore.orders[orderId].admin_note = reason;
      saveJsonStore();
    }
    return { success: true };
  }
  dbInstance.prepare(`
    UPDATE orders 
    SET status = 'cancelled', reviewed_by = ?, reviewed_at = datetime('now'), admin_note = ?
    WHERE id = ?
  `).run(adminId, reason || null, orderId);
  return { success: true };
}

// Tarif darajasi (taqqoslash uchun)
export function getPlanLevel(plan: string): number {
  const levels: Record<string, number> = { free: 0, start: 1, pro: 2, master: 3 };
  return levels[plan] ?? 0;
}

// 6. TELEGRAM BROWSER AUTH TOKENS (Qat'iy Telegram orqali xavfsiz kirish)
// S7 fix: Math.random() o'rniga crypto.randomBytes
import crypto from 'crypto';

export function createAuthToken(): AuthTokenRecord {
  // S7 — Kriptorafik xavfsiz 32-bayt hex token
  const code = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + (10 * 60 * 1000); // 10 daqiqa amal qiladi

  const record: AuthTokenRecord = {
    token: code,
    status: 'pending',
    created_at: now,
    expires_at: expiresAt
  };

  if (useJsonFallback || !dbInstance) {
    memoryStore.authTokens[code] = record;
    saveJsonStore();
    return record;
  }

  const stmt = dbInstance.prepare(`
    INSERT INTO auth_tokens (token, status, created_at, expires_at)
    VALUES (?, 'pending', ?, ?)
  `);
  stmt.run(code, now, expiresAt);

  return record;
}

export function getAuthToken(token: string): AuthTokenRecord | null {
  if (useJsonFallback || !dbInstance) {
    return memoryStore.authTokens[token] || null;
  }
  const row = dbInstance.prepare('SELECT * FROM auth_tokens WHERE token = ?').get(token) as any;
  if (!row) return null;
  return {
    token: row.token,
    user_id: row.user_id,
    status: row.status,
    user_data: row.user_data ? JSON.parse(row.user_data) : undefined,
    created_at: row.created_at,
    expires_at: row.expires_at
  };
}

export function authorizeAuthToken(token: string, userData: any): boolean {
  const tokenRec = getAuthToken(token);
  if (!tokenRec || tokenRec.status !== 'pending' || tokenRec.expires_at < Date.now()) {
    return false;
  }

  // Foydalanuvchini bazada saqlaymiz yoki yangilaymiz
  const savedUser = upsertUser({
    id: String(userData.id),
    first_name: userData.first_name || 'Foydalanuvchi',
    last_name: userData.last_name,
    username: userData.username,
    photo_url: userData.photo_url
  });

  const userDataJson = JSON.stringify(savedUser);

  if (useJsonFallback || !dbInstance) {
    if (memoryStore.authTokens[token]) {
      memoryStore.authTokens[token].status = 'authorized';
      memoryStore.authTokens[token].user_id = String(userData.id);
      memoryStore.authTokens[token].user_data = savedUser;
      saveJsonStore();
    }
    return true;
  }

  const stmt = dbInstance.prepare(`
    UPDATE auth_tokens 
    SET status = 'authorized', user_id = ?, user_data = ?
    WHERE token = ?
  `);
  stmt.run(String(userData.id), userDataJson, token);
  return true;
}

// ===================================================
// 7. ADMIN PANEL BAZA FUNKSIYALARI (M2)
// ===================================================

export function addAuditLog(actorId: string, action: string, targetType: string, targetId: string, details?: any) {
  if (!dbInstance) return;
  try {
    const stmt = dbInstance.prepare(`
      INSERT INTO audit_log (id, actor_id, action, target_type, target_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    stmt.run(
      generateId(),
      actorId,
      action,
      targetType,
      targetId,
      details ? JSON.stringify(details) : null
    );
  } catch (err: any) {
    console.warn("addAuditLog xatosi:", err.message);
  }
}

export function getAuditLogs(limit = 50, offset = 0) {
  if (!dbInstance) return [];
  try {
    const rows = dbInstance.prepare(`
      SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset);
    return rows.map((r: any) => ({
      ...r,
      details: r.details ? JSON.parse(r.details) : null
    }));
  } catch {
    return [];
  }
}

export function getAdminStats() {
  if (!dbInstance) {
    return {
      totalUsers: 0,
      totalQuizzes: 0,
      totalAttempts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      activeSubscriptions: { free: 0, start: 0, pro: 0, master: 0 }
    };
  }

  try {
    const userCount = (dbInstance.prepare('SELECT count(*) as count FROM users').get() as any)?.count || 0;
    const quizCount = (dbInstance.prepare('SELECT count(*) as count FROM quizzes').get() as any)?.count || 0;
    const attemptCount = (dbInstance.prepare('SELECT count(*) as count FROM attempts').get() as any)?.count || 0;
    const orderCount = (dbInstance.prepare('SELECT count(*) as count FROM orders').get() as any)?.count || 0;
    const revenueSum = (dbInstance.prepare("SELECT sum(amount) as sum FROM orders WHERE status = 'completed'").get() as any)?.sum || 0;

    const now = Date.now();
    const subRows = dbInstance.prepare(`
      SELECT plan_id, count(*) as count FROM subscriptions 
      WHERE status = 'active' AND expires_at > ?
      GROUP BY plan_id
    `).all(now) as any[];

    const activeSubs: Record<string, number> = { free: 0, start: 0, pro: 0, master: 0 };
    for (const r of subRows) {
      if (r.plan_id in activeSubs) {
        activeSubs[r.plan_id] = r.count;
      }
    }

    return {
      totalUsers: userCount,
      totalQuizzes: quizCount,
      totalAttempts: attemptCount,
      totalOrders: orderCount,
      totalRevenue: revenueSum,
      activeSubscriptions: activeSubs
    };
  } catch (err: any) {
    console.warn("getAdminStats xatosi:", err.message);
    return {
      totalUsers: 0,
      totalQuizzes: 0,
      totalAttempts: 0,
      totalOrders: 0,
      totalRevenue: 0,
      activeSubscriptions: { free: 0, start: 0, pro: 0, master: 0 }
    };
  }
}

export function searchUsers(q = '', limit = 30, offset = 0) {
  if (!dbInstance) return [];
  try {
    const queryTerm = `%${q.trim()}%`;
    const rows = dbInstance.prepare(`
      SELECT id, first_name, last_name, username, photo_url, role, subscription_plan, subscription_expires_at, created_at
      FROM users
      WHERE id LIKE ? OR first_name LIKE ? OR username LIKE ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(queryTerm, queryTerm, queryTerm, limit, offset);
    return rows;
  } catch {
    return [];
  }
}

export function getAllSubscriptions(status = '', limit = 50, offset = 0) {
  if (!dbInstance) return [];
  try {
    let sql = `
      SELECT s.*, u.first_name, u.username 
      FROM subscriptions s
      LEFT JOIN users u ON s.user_id = u.id
    `;
    const params: any[] = [];
    if (status) {
      sql += ' WHERE s.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return dbInstance.prepare(sql).all(...params);
  } catch {
    return [];
  }
}

export function getAllOrders(status = '', limit = 50, offset = 0) {
  if (!dbInstance) return [];
  try {
    let sql = `
      SELECT o.*, u.first_name, u.username
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
    `;
    const params: any[] = [];
    if (status) {
      sql += ' WHERE o.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return dbInstance.prepare(sql).all(...params);
  } catch {
    return [];
  }
}

