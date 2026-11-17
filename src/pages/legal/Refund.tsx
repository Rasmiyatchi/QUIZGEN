import React from 'react';
import { RefreshCcw, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Refund() {
  return (
    <div className="min-h-screen text-slate-100 mesh-gradient-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link 
          to="/pricing" 
          className="inline-flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Tariflarga qaytish
        </Link>

        <div className="glass-card rounded-[2.5rem] p-6 sm:p-10 border border-white/10 shadow-2xl space-y-8">
          <div className="border-b border-white/10 pb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <RefreshCcw className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">To'lovni Qaytarish Siyosati</h1>
                <p className="text-xs text-slate-400">7 kunlik to'lov kafolati va qaytarish shartlari</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">So'nggi yangilanish: 2026-yil 16-noyabr</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              1. 7 Kunlik Kafolat
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Biz QUIZGEN sifatiga to'liq ishonamiz. Agar siz obunani sotib olganingizdan so'ng servis texnik nosozlik sababli ishlamasa yoki e'lon qilingan asosiy imkoniyatlar ishlamasa, to'lov amalga oshirilgan kundan boshlab 7 (yetti) kalendar kuni ichida arizangizga asosan to'langan summa 100% miqdorda to'liq qaytariladi.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              2. Qaytarish tartibi va arizani topshirish
            </h2>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 text-xs text-slate-300">
              <p className="font-bold text-white">Qaytarish uchun nimalar kerak:</p>
              <ul className="space-y-1.5 list-disc pl-5">
                <li>Buyurtma raqami (masalan: <code>ORD-123456</code>);</li>
                <li>To'lov qilingan telefon raqami yoki chek skrinshoti;</li>
                <li>Qaytarish sababi haqida qisqacha ma'lumot.</li>
              </ul>
              <p className="pt-2">
                Arizani rasmiy Telegram qo'llab-quvvatlash botimizga (<code>@quizgenrobot</code>) yoki administratsiya manziliga yuborishingiz kifoya.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              3. Qaytarish muddati
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Mablag' ariza ma'qullanganidan so'ng 1 dan 3 ish kuni ichida to'lov qilingan bank kartasiga (Click / Payme orqali) avtomatik qaytariladi.
            </p>
          </section>

          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>100% Xavfsiz to'lov va kafolat</span>
            </div>
            <div className="flex items-center gap-4 font-bold">
              <Link to="/oferta" className="hover:text-white transition-colors">Ommaviy oferta</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Maxfiylik siyosati</Link>
              <Link to="/contacts" className="hover:text-white transition-colors">Bog'lanish</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
