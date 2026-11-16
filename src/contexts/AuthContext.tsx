import React, { createContext, useContext, useEffect, useState } from 'react';

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
  authType: 'telegram' | 'tma' | 'demo' | 'google';
  email?: string;
  subscription?: UserSubscription;
}

interface AuthContextType {
  user: AppUser | null;
  subscription: UserSubscription;
  loading: boolean;
  loginWithTelegramWidget: (widgetData: any) => Promise<void>;
  loginWithTelegramTMA: (initData: string) => Promise<void>;
  loginWithTelegramUser: (userData: any) => void;
  loginDemo: (name?: string) => Promise<void>;
  refreshSubscription: () => Promise<void>;
  logout: () => void;
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription>({
    plan: 'free',
    is_active: false,
    expires_at: 0,
    days_left: 0,
    daily_ai_limit: 3,
    ai_tests_today: 0,
    ai_tests_remaining: 3
  });
  const [loading, setLoading] = useState(true);

  // Foydalanuvchi obunasini serverdan yangilash
  const refreshSubscription = async () => {
    if (!user?.uid) return;
    try {
      const res = await fetch(`/api/subscriptions/status?userId=${user.uid}`);
      const data = await res.json();
      if (data.success && data.subscription) {
        setSubscription(data.subscription);
      }
    } catch (err) {
      console.warn("Obuna holatini yuklashda xatolik:", err);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      refreshSubscription();
    }
  }, [user?.uid]);

  // Saqlangan sessiyani yuklash yoki Telegram WebApp mavjudligini tekshirish
  useEffect(() => {
    async function initAuth() {
      try {
        // 1. Agar avval keshga saqlangan bo'lsa
        const saved = localStorage.getItem('quizgen_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          setUser(parsed);
          setLoading(false);
          return;
        }

        // 2. Agar ilova Telegram Mini App (TMA) ichida ochilgan bo'lsa
        if (window.Telegram?.WebApp?.initData) {
          const twa = window.Telegram.WebApp;
          twa.ready();
          twa.expand();

          if (twa.initDataUnsafe?.user) {
            const tgUser = twa.initDataUnsafe.user;
            const appUser: AppUser = {
              uid: String(tgUser.id),
              displayName: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' '),
              username: tgUser.username,
              photoURL: tgUser.photo_url,
              authType: 'tma'
            };
            setUser(appUser);
            localStorage.setItem('quizgen_user', JSON.stringify(appUser));
          }
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const loginWithTelegramWidget = async (widgetData: any) => {
    try {
      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ widgetData })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Telegram orqali kirishda xatolik");

      const tgUser = data.user;
      const appUser: AppUser = {
        uid: String(tgUser.id),
        displayName: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username || 'Foydalanuvchi',
        username: tgUser.username,
        photoURL: tgUser.photo_url,
        authType: 'telegram'
      };

      setUser(appUser);
      localStorage.setItem('quizgen_user', JSON.stringify(appUser));
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const loginWithTelegramTMA = async (initData: string) => {
    try {
      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Telegram WebApp xatosi");

      const tgUser = data.user;
      const appUser: AppUser = {
        uid: String(tgUser.id),
        displayName: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || tgUser.username || 'Foydalanuvchi',
        username: tgUser.username,
        photoURL: tgUser.photo_url,
        authType: 'tma'
      };

      setUser(appUser);
      localStorage.setItem('quizgen_user', JSON.stringify(appUser));
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const loginWithTelegramUser = (userData: any) => {
    const appUser: AppUser = {
      uid: String(userData.id),
      displayName: [userData.first_name, userData.last_name].filter(Boolean).join(' ') || userData.username || 'Foydalanuvchi',
      username: userData.username,
      photoURL: userData.photo_url,
      authType: 'telegram'
    };
    setUser(appUser);
    localStorage.setItem('quizgen_user', JSON.stringify(appUser));
  };

  const loginDemo = async (customName?: string) => {
    const demoId = 'user_' + Math.floor(100000 + Math.random() * 900000);
    const appUser: AppUser = {
      uid: demoId,
      displayName: customName || 'Talaba (Telegram Test)',
      username: 'talaba_test',
      authType: 'demo'
    };
    setUser(appUser);
    localStorage.setItem('quizgen_user', JSON.stringify(appUser));
  };

  const logout = () => {
    setUser(null);
    setSubscription({
      plan: 'free',
      is_active: false,
      expires_at: 0,
      days_left: 0,
      daily_ai_limit: 3,
      ai_tests_today: 0,
      ai_tests_remaining: 3
    });
    localStorage.removeItem('quizgen_user');
  };

  return (
    <AuthContext.Provider value={{
      user,
      subscription,
      loading,
      loginWithTelegramWidget,
      loginWithTelegramTMA,
      loginWithTelegramUser,
      loginDemo,
      refreshSubscription,
      logout
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
