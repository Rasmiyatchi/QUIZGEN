/**
 * M0 — AuthContext: JWT bilan xavfsiz autentifikatsiya
 * 
 * S8 fix: TMA initData serverda HMAC tekshiruvi
 * S9 fix: TMA da localStorage eski foydalanuvchi tozalanadi
 * S2 fix: Token httpOnly cookie + Authorization header orqali yuboriladi
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export interface UserSubscription {
  plan: 'free' | 'start' | 'pro' | 'master';
  is_active: boolean;
  expires_at: number;
  days_left: number;
  daily_ai_limit: number;
  ai_tests_today: number;
  ai_tests_remaining: number;
}

export interface AppUser {
  uid: string;
  displayName: string;
  username?: string;
  photoURL?: string;
  authType: 'telegram' | 'tma' | 'demo' | 'widget';
  role?: 'student' | 'teacher' | 'admin' | 'superadmin';
}

interface AuthContextType {
  user: AppUser | null;
  subscription: UserSubscription;
  accessToken: string | null;
  loading: boolean;
  loginWithTelegramWidget: (widgetData: any) => Promise<void>;
  loginWithTelegramTMA: (initData: string) => Promise<void>;
  loginWithTelegramUser: (userData: any) => void;
  loginDemo: (name?: string) => Promise<void>;
  refreshSubscription: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  logout: () => void;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            photo_url?: string;
          };
        };
        ready: () => void;
        expand: () => void;
      };
    };
    onTelegramAuth?: (user: any) => void;
  }
}

const DEFAULT_SUBSCRIPTION: UserSubscription = {
  plan: 'free',
  is_active: false,
  expires_at: 0,
  days_left: 0,
  daily_ai_limit: 3,
  ai_tests_today: 0,
  ai_tests_remaining: 3
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token localStorage kaliti
const ACCESS_TOKEN_KEY = 'quizgen_access_token';
const USER_KEY = 'quizgen_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription>(DEFAULT_SUBSCRIPTION);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // === TOKEN YANGILASH ===
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include' // httpOnly cookie yuboriladi
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.accessToken) {
        setAccessToken(data.accessToken);
        localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
        if (data.subscription) {
          setSubscription(data.subscription);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // === AUTH FETCH: Avtomatik token yangilash ===
  const authFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<Response> => {
    let token = accessToken || localStorage.getItem(ACCESS_TOKEN_KEY);
    
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const makeRequest = (t: string | null) => {
      const headers: Record<string, string> = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...((options.headers as Record<string, string>) || {})
      };

      return fetch(url, {
        ...options,
        credentials: 'include',
        headers
      });
    };

    let res = await makeRequest(token);
    
    // Token muddati tugagan bo'lsa, yangilaymiz
    if (res.status === 401) {
      const refreshed = await refreshToken();
      if (refreshed) {
        token = localStorage.getItem(ACCESS_TOKEN_KEY);
        res = await makeRequest(token);
      }
    }
    
    return res;
  }, [accessToken, refreshToken]);

  // === OBUNA YANGILASH ===
  const refreshSubscription = useCallback(async () => {
    try {
      const res = await authFetch('/api/subscriptions/status');
      const data = await res.json();
      if (data.success && data.subscription) {
        setSubscription(data.subscription);
      }
    } catch (err) {
      console.warn("Obuna holatini yuklashda xatolik:", err);
    }
  }, [authFetch]);

  // === SESSIYANI SAQLASH ===
  const saveSession = (appUser: AppUser, token: string, sub?: UserSubscription) => {
    setUser(appUser);
    setAccessToken(token);
    localStorage.setItem(USER_KEY, JSON.stringify(appUser));
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    if (sub) setSubscription(sub);
  };

  // === BOSHLANG'ICH AUTH TEKSHIRUVI ===
  useEffect(() => {
    async function initAuth() {
      try {
        // 1. TMA (Telegram Mini App) ichida ekanligini tekshirish — S8
        const twa = window.Telegram?.WebApp;
        if (twa?.initData) {
          twa.ready();
          twa.expand();

          const tmaUser = twa.initDataUnsafe?.user;
          
          // S9 — Eski localStorage foydalanuvchisini tekshirish
          const savedRaw = localStorage.getItem(USER_KEY);
          if (savedRaw) {
            const saved = JSON.parse(savedRaw);
            // S9: TMA da boshqa foydalanuvchi bo'lsa, localStorage tozalanadi
            if (tmaUser && saved.uid && saved.uid !== String(tmaUser.id)) {
              console.log("[Auth] TMA foydalanuvchi o'zgargan — localStorage tozalanmoqda");
              localStorage.removeItem(USER_KEY);
              localStorage.removeItem(ACCESS_TOKEN_KEY);
            }
          }

          // S8 — initData ni serverga yuborib tekshiramiz (klient tomonida emas)
          try {
            const res = await fetch('/api/auth/tma', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ initData: twa.initData })
            });
            
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.accessToken) {
                const appUser: AppUser = {
                  uid: data.user.uid,
                  displayName: data.user.displayName,
                  username: data.user.username,
                  photoURL: data.user.photoURL,
                  authType: 'tma',
                  role: data.user.role
                };
                saveSession(appUser, data.accessToken, data.subscription);
                return;
              }
            }
          } catch (tmaErr) {
            console.warn("[Auth] TMA server tekshiruvi xatosi:", tmaErr);
          }
        }

        // 2. Saqlangan access token bilan sessiyani tiklash
        const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);
        
        if (savedToken && savedUser) {
          // Token hali amal qilishini tekshirish
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${savedToken}` },
            credentials: 'include'
          });
          
          if (res.ok) {
            const data = await res.json();
            const parsed = JSON.parse(savedUser);
            if (data.user) {
              parsed.role = data.user.role;
              parsed.displayName = data.user.displayName;
              parsed.username = data.user.username;
              parsed.photoURL = data.user.photoURL;
              localStorage.setItem(USER_KEY, JSON.stringify(parsed));
            }
            setUser(parsed);
            setAccessToken(savedToken);
            if (data.subscription) setSubscription(data.subscription);
            return;
          } else if (res.status === 401) {
            // Token muddati tugagan — refresh urinib ko'ramiz
            const refreshed = await refreshToken();
            if (refreshed && savedUser) {
              const parsed = JSON.parse(savedUser);
              setUser(parsed);
              return;
            }
          }
        }

        // 3. Hech nima topilmadi — foydalanuvchi kirishi kerak
        setUser(null);
        
      } catch (e) {
        console.error("Auth init error:", e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  // === TELEGRAM WIDGET LOGIN ===
  const loginWithTelegramWidget = async (widgetData: any) => {
    try {
      const res = await fetch('/api/auth/telegram-widget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ widgetData })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Telegram orqali kirishda xatolik");

      const appUser: AppUser = {
        uid: data.user.uid,
        displayName: data.user.displayName,
        username: data.user.username,
        photoURL: data.user.photoURL,
        authType: 'widget',
        role: data.user.role
      };
      saveSession(appUser, data.accessToken, data.subscription);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // === TMA LOGIN (serverda tekshiriladi) ===
  const loginWithTelegramTMA = async (initData: string) => {
    try {
      const res = await fetch('/api/auth/tma', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ initData })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Telegram WebApp xatosi");

      const appUser: AppUser = {
        uid: data.user.uid,
        displayName: data.user.displayName,
        username: data.user.username,
        photoURL: data.user.photoURL,
        authType: 'tma',
        role: data.user.role
      };
      saveSession(appUser, data.accessToken, data.subscription);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // === TELEGRAM DEEP-LINK (botdan autorizatsiya) ===
  const loginWithTelegramUser = (userData: any) => {
    // Bu funksiya check-login-code javobidan keyin chaqiriladi
    // userData bu holda allaqachon server tomonida tekshirilgan
    if (userData.user && userData.accessToken) {
      const appUser: AppUser = {
        uid: userData.user.uid,
        displayName: userData.user.displayName,
        username: userData.user.username,
        authType: 'telegram',
        role: userData.user.role
      };
      saveSession(appUser, userData.accessToken, userData.subscription);
    }
  };

  // === DEMO LOGIN (faqat dev muhitida) ===
  const loginDemo = async (customName?: string) => {
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: customName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Demo login imkoni yo'q (production muhiti)");
      
      const appUser: AppUser = {
        uid: data.user.id,
        displayName: customName || 'Demo Foydalanuvchi',
        authType: 'demo'
      };
      saveSession(appUser, data.accessToken);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // === CHIQISH ===
  const logout = () => {
    // Server tomonida refresh token cookie ni tozalash
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    
    setUser(null);
    setAccessToken(null);
    setSubscription(DEFAULT_SUBSCRIPTION);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  };

  return (
    <AuthContext.Provider value={{
      user,
      subscription,
      accessToken,
      loading,
      loginWithTelegramWidget,
      loginWithTelegramTMA,
      loginWithTelegramUser,
      loginDemo,
      refreshSubscription,
      refreshToken,
      logout,
      authFetch
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
