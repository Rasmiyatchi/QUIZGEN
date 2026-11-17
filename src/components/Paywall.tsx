import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Crown, Sparkles, Lock, ArrowRight, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface PaywallProps {
  feature: 'editor' | 'flashcards' | 'export_formats' | 'wrong_only' | 'priority';
  requiredPlan?: 'pro' | 'master';
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function Paywall({
  feature,
  requiredPlan = 'pro',
  title,
  description,
  children
}: PaywallProps) {
  const { subscription } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const planLevels: Record<string, number> = { free: 0, start: 1, pro: 2, master: 3 };
  const currentLevel = planLevels[subscription.plan] || 0;
  const requiredLevel = planLevels[requiredPlan] || 2;
  const hasAccess = subscription.is_active && currentLevel >= requiredLevel;

  if (hasAccess) {
    return <>{children}</>;
  }

  const defaultTitles: Record<string, string> = {
    editor: "Test Muharriri (Editor)",
    flashcards: "3D Interaktiv Flashcardlar",
    export_formats: "Barcha Formatlarda Eksport",
    wrong_only: "Faqat Xatolar Ustida Ishlash",
    priority: "VIP Ustuvor Tezlik"
  };

  const defaultDescriptions: Record<string, string> = {
    editor: "Savollarni tahrirlash, qo'shish va HEMIS shablonida yuklab olish uchun Sessiya Pro tarifi talab etiladi.",
    flashcards: "Savollarni 3D interaktiv yodlash kartochkalariga aylantirish Sessiya Pro tarifida mavjud.",
    export_formats: "Word (.docx), Excel (.xlsx) va PDF formatlarida yuklab olish Grand Master tarifida mavjud.",
    wrong_only: "Faqat xato javob berilgan savollarni qayta ishlash pullik tariflarda ochiq.",
    priority: "AI serverlarida 1-o'rindagi tezlik va 24/7 yordam Grand Master tarifida ochiq."
  };

  return (
    <>
      <div 
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setShowModal(true);
        }}
        className="relative group cursor-pointer"
        title="Ushbu imkoniyat pullik tarifda ochiq"
      >
        <div className="pointer-events-none opacity-60 filter blur-[0.5px]">
          {children}
        </div>
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] rounded-2xl flex items-center justify-center border border-amber-500/30 shadow-lg group-hover:bg-slate-950/50 transition-all">
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-lg">
            <Lock className="w-3.5 h-3.5 stroke-[3]" />
            <span>{requiredPlan.toUpperCase()} TALAB ETILADI</span>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-card rounded-[2.5rem] p-7 md:p-8 max-w-sm w-full shadow-2xl border border-amber-500/40 text-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border-2 border-amber-500/50 text-amber-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Crown className="w-8 h-8" />
            </div>

            <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30 mb-3 inline-block">
              {requiredPlan.toUpperCase()} TARIF IMKONIYATI
            </span>

            <h3 className="text-xl font-black text-white mb-2">
              {title || defaultTitles[feature] || "Maxsus Imkoniyat"}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed mb-6 font-medium">
              {description || defaultDescriptions[feature]}
            </p>

            <button
              onClick={() => {
                setShowModal(false);
                navigate('/pricing');
              }}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 mb-3 transition-all hover:scale-[1.02] active:scale-95"
            >
              <span>Tariflarni Ko'rish (7 999 so'mdan)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowModal(false)}
              className="text-xs font-bold text-slate-400 hover:text-white"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </>
  );
}

