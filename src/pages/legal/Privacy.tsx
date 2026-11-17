import React from 'react';
import { Shield, ArrowLeft, Lock, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Privacy() {
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
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Maxfiylik Siyosati</h1>
                <p className="text-xs text-slate-400">Shaxsiy ma'lumotlarni himoya qilish va xavfsizlik kafolati</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">So'nggi yangilanish: 2026-yil 16-noyabr</p>
          </div>

          <section className="space-y-3">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              1. Qanday ma'lumotlarni yig'amiz?
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              QUIZGEN xizmatidan foydalanishda faqat xizmat ko'rsatish uchun eng zarur bo'lgan minimal ma'lumotlar saqlanadi:
            </p>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-5">
              <li>Telegram foydalanuvchi identifikatori (ID), ismi va foydalanuvchi nomi (@username);</li>
              <li>Siz yaratgan testlar, savollar va ularning natijalari;</li>
              <li>Sotib olingan obunalar va buyurtmalar tarixi.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              2. Nimani ASLO yig'maymiz va saqlamaymiz?
            </h2>
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-red-200">
                <EyeOff className="w-4 h-4" /> Bank va karta ma'lumotlari daxlsizligi
              </div>
              <p className="leading-relaxed">
                Biz hech qachon sizning bank karta raqamlaringiz, PIN-kod yoki SMS tasdiqlash kodlaringizni so'ramaymiz va saqlamaymiz. Barcha to'lovlar faqat Click va Payme litsenziyalangan to'lov shlyuzlari orqali amalga oshiriladi.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              3. Ma'lumotlar xavfsizligi
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Barcha tarmoq so'rovlari TLS 1.3 shifrlash protokoli orqali amalga oshiriladi. Avtorizatsiya kriptografik xavfsiz JWT tokenlar va Telegram HMAC-SHA256 imzolari bilan himoyalangan.
            </p>
          </section>

          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-indigo-400 font-bold">
              <Lock className="w-4 h-4" />
              <span>Shifrlangan ma'lumotlar uzatmasi</span>
            </div>
            <div className="flex items-center gap-4 font-bold">
              <Link to="/oferta" className="hover:text-white transition-colors">Ommaviy oferta</Link>
              <Link to="/refund" className="hover:text-white transition-colors">Pulni qaytarish</Link>
              <Link to="/contacts" className="hover:text-white transition-colors">Bog'lanish</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

