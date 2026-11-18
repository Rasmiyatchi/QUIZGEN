import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, Send, Crown, Flame, Zap, ShieldCheck, LogOut, 
  Award, BookOpen, Clock, Layers, Sparkles, TrendingUp, 
  CheckCircle2, AlertCircle, ChevronRight, Settings, Globe
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Profile() {
  const { user, subscription, logout, authFetch } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!user) return;
      try {
        const res = await authFetch('/api/users/me/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats || null);
        }
      } catch (e) {
        console.warn("Stats load error:", e);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [user]);

  if (!user) return null;

  const isPro = subscription?.is_active;
  const planName = subscription?.plan === 'master' ? 'Grand Master' : subscription?.plan === 'pro' ? 'Sessiya Pro' : subscription?.plan === 'start' ? 'Talaba Start' : 'Oddiy (Bepul)';
  const daysLeft = subscription?.days_left || 0;

  const xp = stats?.xp || user.xp || 0;
  const streak = stats?.streak_days || user.streak_days || 1;
  const rankTitle = stats?.rank_title || 'Yangi talaba';
  const rankLevel = stats?.rank_level || 1;
  const nextLevelXp = stats?.next_level_xp || 100;
  const xpPercent = Math.min(100, Math.round((xp / nextLevelXp) * 100));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Profil Header Kartochkasi */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-2xl relative overflow-hidden shadow-2xl flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Avatar"
                className="w-20 h-20 rounded-3xl border-2 border-blue-500/40 shadow-xl shadow-blue-500/20 object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-2xl text-white shadow-xl shadow-blue-500/20">
                {user.displayName ? user.displayName[0].toUpperCase() : 'Q'}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center border-2 border-[#090d16] shadow-sm">
              <Send className="w-3 h-3 text-white fill-current" />
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {user.displayName || 'Foydalanuvchi'}
              </h1>
              {isPro && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                  PRO
                </span>
              )}
            </div>
            <p className="text-xs text-blue-400 font-bold flex items-center justify-center sm:justify-start gap-1">
              {user.username ? `@${user.username}` : `ID: ${user.uid}`}
            </p>
            <p className="text-[11px] text-slate-500">
              Telegram orqali avtorizatsiya qilingan
            </p>
          </div>
        </div>

        {/* Chiqish tugmasi */}
        <button
          onClick={logout}
          className="px-4 py-2 rounded-2xl bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/10 text-slate-400 text-xs font-bold flex items-center gap-1.5 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Chiqish</span>
        </button>
      </div>

      {/* Gamifikatsiya & Daraja */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-xs text-slate-400 font-bold">Daraja va Natijalar</span>
              <h3 className="text-base font-black text-white">{rankTitle} (Lv. {rankLevel})</h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-extrabold">
              <Flame className="w-4 h-4 fill-current animate-bounce" />
              <span>{streak} kun streak</span>
            </div>
            <div className="px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-extrabold">
              <span>{xp} XP</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-slate-400">
            <span>Keyingi darajagacha:</span>
            <span>{xp} / {nextLevelXp} XP ({xpPercent}%)</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-black/40 overflow-hidden border border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>

        {/* Statistika raqamlari */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
            <span className="text-xs text-slate-500 block">Topshirilgan</span>
            <span className="text-lg font-black text-white">{stats?.total_attempts || 0} ta</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
            <span className="text-xs text-slate-500 block">O'rtacha ball</span>
            <span className="text-lg font-black text-emerald-400">{stats?.avg_percentage || 0}%</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
            <span className="text-xs text-slate-500 block">Eng yuqori ball</span>
            <span className="text-lg font-black text-amber-400">{stats?.best_score || 0}%</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
            <span className="text-xs text-slate-500 block">Yaratilgan</span>
            <span className="text-lg font-black text-blue-400">{stats?.total_quizzes_created || 0} ta</span>
          </div>
        </div>
      </div>

      {/* Obuna Kartochkasi */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-2xl border",
              isPro ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-white/5 text-slate-400 border-white/10"
            )}>
              <Crown className="w-6 h-6 fill-current" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold">Obuna Holati</span>
              <h3 className="text-lg font-black text-white">{planName}</h3>
              <p className="text-xs text-slate-400">
                {isPro ? `Amal qilish muddati: ${daysLeft} kun qoldi` : "Bepul cheklangan rejim"}
              </p>
            </div>
          </div>

          <Link
            to="/pricing"
            className={cn(
              "py-2.5 px-5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg",
              isPro
                ? "bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30"
            )}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>{isPro ? "Tarifni uzaytirish" : "Tarifni oshirish"}</span>
          </Link>
        </div>

        {/* Imkoniyatlar ro'yxati */}
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">HEMIS Word/TXT yuklash:</span>
            <span className="font-bold text-emerald-400">Cheksiz (100% Bepul)</span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">Kunlik AI test kvotasi:</span>
            <span className="font-bold text-blue-400">
              {subscription?.ai_today || 0} ta ishlatildi
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">3D Flip Flashcardlar:</span>
            <span className={cn("font-bold", isPro ? "text-emerald-400" : "text-slate-500")}>
              {isPro ? "Ochiq ✅" : "Pro tarifda 🔒"}
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
            <span className="text-slate-400">Test Muharriri (Editor):</span>
            <span className={cn("font-bold", isPro ? "text-emerald-400" : "text-slate-500")}>
              {isPro ? "Ochiq ✅" : "Pro tarifda 🔒"}
            </span>
          </div>
        </div>
      </div>

      {/* Tezkor havolalar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          to="/library"
          className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-blue-500/40 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/20 text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white group-hover:text-blue-300 transition-colors">
                Kutubxonam
              </h4>
              <p className="text-xs text-slate-500">Mening va saqlangan testlarim</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
        </Link>

        <Link
          to="/history"
          className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-blue-500/40 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white group-hover:text-purple-300 transition-colors">
                Urinishlar Tarixi
              </h4>
              <p className="text-xs text-slate-500">Barcha topshirilgan testlar tahlili</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
        </Link>
      </div>
    </div>
  );
}
