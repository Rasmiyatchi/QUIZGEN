import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Zap, Crown, Sparkles, Check, ArrowRight, ShieldCheck, 
  CreditCard, Flame, Clock, CheckCircle2, AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

interface PlanDetail {
  id: 'start' | 'pro' | 'master';
  name: string;
  subtitle: string;
  price: number;
  priceFormatted: string;
  durationDays: number;
  dailyAiLimit: number;
  popular?: boolean;
  badge: string;
  features: string[];
}

export default function Pricing() {
  const { user, subscription, refreshSubscription } = useAuth();
  const [plans, setPlans] = useState<Record<string, PlanDetail>>({});
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanDetail | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'click' | 'payme' | 'demo'>('click');

  useEffect(() => {
    fetch('/api/pricing/plans')
      .then(res => res.json())
      .then(data => {
        if (data.plans) {
          setPlans(data.plans);
        }
      })
      .catch(err => console.error("Tariflarni yuklashda xatolik:", err))
      .finally(() => setLoadingPlans(false));
  }, []);

  const handleSelectPlan = async (plan: PlanDetail) => {
    if (!user) {
      alert("Iltimos, avval Telegram orqali tizimga kiring!");
      return;
    }

    setSelectedPlan(plan);
    setPaymentSuccess(false);

    try {
      const res = await fetch('/api/subscriptions/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          plan: plan.id,
          paymentMethod: 'demo'
        })
      });
      const data = await res.json();
      if (data.order) {
        setOrder(data.order);
      }
    } catch (err) {
      console.error("Buyurtma yaratish xatosi:", err);
    }
  };

  const handleConfirmDemoPayment = async () => {
    if (!order?.id) return;
    setPaymentLoading(true);

    try {
      const res = await fetch('/api/subscriptions/pay-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id })
      });
      const data = await res.json();

      if (data.success) {
        setPaymentSuccess(true);
        await refreshSubscription();
      } else {
        alert("To'lovda xatolik yuz berdi: " + (data.error || "Noma'lum"));
      }
    } catch (err: any) {
      alert("Xatolik: " + err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const planList = Object.values(plans) as PlanDetail[];

  return (
    <div className="min-h-screen text-slate-100 mesh-gradient-bg py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Background Orbs */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-black tracking-widest uppercase mb-6 shadow-inner animate-float">
            <Crown className="w-4 h-4 text-amber-400" />
            QUIZGEN RASMIY OBUNA TARIFLARI
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white mb-4 leading-tight">
            Sessiyani a'lo baholarga <br />
            <span className="animated-gradient-text">birinchi urinishdayoq yoping</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto font-medium">
            HEMIS testlarini soniyalarda tahlil qiling, Google Gemini AI orqali erkin konspektlardan test tuzing va 3D Flashcardlarda imtihonga 100% tayyorlaning.
          </p>
        </div>

        {/* Current Active Plan Banner */}
        {subscription.is_active && (
          <div className="mb-12 glass-card p-6 rounded-3xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-4 text-center sm:text-left">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Faol Obuna</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                    {subscription.plan === 'master' ? 'Grand Master' : subscription.plan === 'pro' ? 'Sessiya Pro' : 'Talaba Start'}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">
                  Qolgan muddat: {subscription.days_left} kun
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold text-slate-300">
              <span className="bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                Bugungi AI limit: <strong>{subscription.ai_tests_remaining} / {subscription.daily_ai_limit === 99999 ? 'Cheksiz' : subscription.daily_ai_limit} ta</strong>
              </span>
            </div>
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch mb-16">
          {planList.map((plan) => {
            const isCurrent = subscription.plan === plan.id && subscription.is_active;
            const isPopular = plan.popular;
            const isMaster = plan.id === 'master';

            return (
              <div 
                key={plan.id}
                className={cn(
                  "relative rounded-[2.5rem] p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 border backdrop-blur-xl group hover:scale-[1.02]",
                  isPopular 
                    ? "bg-slate-900/80 border-blue-500/50 shadow-2xl shadow-blue-500/20" 
                    : isMaster
                      ? "bg-slate-900/80 border-amber-500/40 shadow-2xl shadow-amber-500/15"
                      : "bg-slate-900/60 border-white/10 hover:border-white/25"
                )}
              >
                {/* Popular or Master Badge */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-black tracking-widest uppercase shadow-lg shadow-blue-500/30 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    ENG OMMABOP
                  </div>
                )}

                {isMaster && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[11px] font-black tracking-widest uppercase shadow-lg shadow-amber-500/30 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 fill-black" />
                    VIP & O'QITUVCHI
                  </div>
                )}

                {/* Card Top */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={cn(
                      "text-xs font-black uppercase tracking-wider px-3 py-1 rounded-xl border",
                      isMaster 
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : isPopular 
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                          : "bg-white/10 text-slate-300 border-white/10"
                    )}>
                      {plan.badge}
                    </span>

                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {plan.durationDays} kun
                    </span>
                  </div>

                  <h3 className="text-2xl font-black text-white mb-1">{plan.name}</h3>
                  <p className="text-xs text-slate-400 font-medium mb-6">{plan.subtitle}</p>

                  <div className="mb-6 pb-6 border-b border-white/10">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                        {plan.priceFormatted.replace(" so'm", "")}
                      </span>
                      <span className="text-slate-400 font-bold text-sm">so'm</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      bir martalik to'lov / {plan.durationDays} kun
                    </span>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-3 text-xs sm:text-sm text-slate-300 font-medium">
                        <div className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                          isMaster 
                            ? "bg-amber-500/20 text-amber-400" 
                            : isPopular 
                              ? "bg-blue-500/20 text-blue-400"
                              : "bg-white/10 text-slate-300"
                        )}>
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <button
                  onClick={() => handleSelectPlan(plan)}
                  disabled={isCurrent}
                  className={cn(
                    "w-full py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2",
                    isCurrent
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default"
                      : isMaster
                        ? "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-black hover:shadow-xl hover:shadow-amber-500/30 hover:scale-[1.02] active:scale-95"
                        : isPopular
                          ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-95"
                          : "bg-white/10 hover:bg-white/20 text-white border border-white/15 hover:scale-[1.02] active:scale-95"
                  )}
                >
                  {isCurrent ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Amaldagi Tarif
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Tarifni Tanlash
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Trust & Guarantee Banner */}
        <div className="glass-card rounded-[2.5rem] p-8 border border-white/10 max-w-4xl mx-auto text-center relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
                <Zap className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-white mb-1">0 AI Xarajat</h4>
              <p className="text-xs text-slate-400">OTM HEMIS test fayllari doimo 100% bepul tahlil qilinadi.</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-white mb-1">Xavfsiz To'lov</h4>
              <p className="text-xs text-slate-400">Click, Payme va rasmiy Telegram to'lovlari orqali 100% himoyalangan.</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-white mb-1">Avtomatik Faollashuv</h4>
              <p className="text-xs text-slate-400">To'lovdan so'ng darhol hisobingiz barcha imkoniyatlarga ochiladi.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Payment Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-card rounded-[2.5rem] p-7 md:p-8 max-w-md w-full shadow-2xl border border-white/15 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div>
                <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">To'lov Bosqichi</span>
                <h3 className="text-xl font-black text-white">{selectedPlan.name}</h3>
              </div>
              <button 
                onClick={() => setSelectedPlan(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white transition-all"
              >
                ✕
              </button>
            </div>

            {paymentSuccess ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-2xl font-black text-white mb-2">To'lovingiz Qabul Qilindi! 🎉</h4>
                <p className="text-xs text-slate-300 mb-6 font-medium">
                  <strong>{selectedPlan.name}</strong> tarifi <strong>{selectedPlan.durationDays} kunga</strong> muvaffaqiyatli faollashtirildi. Endi siz uchun barcha imkoniyatlar to'liq ochiq!
                </p>
                <button
                  onClick={() => setSelectedPlan(null)}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/30"
                >
                  Boshlash 🚀
                </button>
              </div>
            ) : (
              <div>
                {/* Order Summary */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400">To'lov summasi:</span>
                    <h4 className="text-2xl font-black text-white">{selectedPlan.priceFormatted}</h4>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                    {order?.id || 'Buyurtma'}
                  </span>
                </div>

                {/* Payment Methods */}
                <div className="space-y-3 mb-6">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">To'lov usulini tanlang:</span>
                  
                  {/* Click */}
                  <label 
                    onClick={() => setPaymentMethod('click')}
                    className={cn(
                      "p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all",
                      paymentMethod === 'click' ? "bg-blue-600/20 border-blue-500 shadow-md" : "bg-white/5 border-white/10 hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-black text-xs">
                        C
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-white">Click Up / Karta</h5>
                        <p className="text-[11px] text-slate-400">Uzcard / Humo orqali to'lov</p>
                      </div>
                    </div>
                    <input type="radio" checked={paymentMethod === 'click'} onChange={() => {}} className="accent-blue-500" />
                  </label>

                  {/* Payme */}
                  <label 
                    onClick={() => setPaymentMethod('payme')}
                    className={cn(
                      "p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all",
                      paymentMethod === 'payme' ? "bg-teal-600/20 border-teal-500 shadow-md" : "bg-white/5 border-white/10 hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-black text-xs">
                        P
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-white">Payme</h5>
                        <p className="text-[11px] text-slate-400">Payme ilovasi orqali to'lov</p>
                      </div>
                    </div>
                    <input type="radio" checked={paymentMethod === 'payme'} onChange={() => {}} className="accent-teal-500" />
                  </label>

                  {/* Demo Sinov To'lovi */}
                  <label 
                    onClick={() => setPaymentMethod('demo')}
                    className={cn(
                      "p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all",
                      paymentMethod === 'demo' ? "bg-amber-600/20 border-amber-500 shadow-md" : "bg-white/5 border-white/10 hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs">
                        ⚡
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-white">Tezkor Sinov Rejimi (Demo)</h5>
                        <p className="text-[11px] text-amber-300">Tizimni tekshirish uchun 1 bosishda faollashtirish</p>
                      </div>
                    </div>
                    <input type="radio" checked={paymentMethod === 'demo'} onChange={() => {}} className="accent-amber-500" />
                  </label>
                </div>

                {/* Submit Action */}
                <button
                  onClick={handleConfirmDemoPayment}
                  disabled={paymentLoading}
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  {paymentLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      To'lov tasdiqlanmoqda...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      To'lovni Tasdiqlash ({selectedPlan.priceFormatted})
                    </>
                  )}
                </button>

                <p className="text-[10px] text-center text-slate-400 mt-4">
                  🔒 To'lovlar 256-bit shifrlangan va xavfsiz amalga oshiriladi
                </p>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
