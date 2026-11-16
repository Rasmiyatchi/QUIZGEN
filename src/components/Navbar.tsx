import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Flame, Sparkles, Send, ShieldCheck, Zap, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function Navbar() {
  const { user, subscription, logout } = useAuth();

  if (!user) return null;

  const isPro = subscription?.is_active;
  const planName = subscription?.plan === 'master' ? 'Grand Master' : subscription?.plan === 'pro' ? 'Sessiya Pro' : subscription?.plan === 'start' ? 'Talaba Start' : null;

  return (
    <header className="h-[72px] flex items-center justify-between px-4 sm:px-8 z-40 sticky top-0 bg-[#0c121e]/70 backdrop-blur-2xl border-b border-white/[0.07]">
      {/* Profil Ma'lumotlari */}
      <div className="flex items-center gap-3">
        <div className="relative">
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt="Avatar" 
              className="w-10 h-10 rounded-2xl border-2 border-blue-500/40 shadow-lg shadow-blue-500/20 object-cover" 
            />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-sm font-black text-white border border-white/20 shadow-md shadow-blue-500/20">
              {user.displayName ? user.displayName[0].toUpperCase() : 'Q'}
            </div>
          )}
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center border-2 border-[#0c121e] shadow-sm">
            <Send className="w-2 h-2 text-white fill-current" />
          </span>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm text-slate-100 leading-tight">
              {user.displayName || 'Foydalanuvchi'}
            </span>
            {isPro && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase tracking-wider border border-amber-500/30">
                PRO
              </span>
            )}
          </div>
          <span className="text-[11px] text-blue-400 font-bold flex items-center gap-1">
            {user.username ? `@${user.username}` : "Telegram User"}
          </span>
        </div>
      </div>
      
      {/* Badjlar va Chiqish */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Premium / Tariflar tugmasi */}
        <Link 
          to="/pricing"
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all",
            isPro 
              ? "bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25"
              : "bg-gradient-to-r from-blue-600/30 to-purple-600/30 border border-blue-500/40 text-blue-300 hover:scale-105 shadow-sm shadow-blue-500/20"
          )}
        >
          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>{isPro ? planName : '💎 Tariflar'}</span>
        </Link>

        {/* Kunlik Seriya / XP */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black shadow-inner">
          <Flame className="w-3.5 h-3.5 fill-current animate-bounce" />
          <span>1 kun</span>
        </div>

        {/* HEMIS Status */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-extrabold">
          <Zap className="w-3 h-3 fill-current" />
          <span>HEMIS: Bepul</span>
        </div>

        {/* Chiqish */}
        <button 
          onClick={logout}
          className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors p-2.5 rounded-2xl border border-white/5 bg-white/[0.03]"
          title="Tizimdan chiqish"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
