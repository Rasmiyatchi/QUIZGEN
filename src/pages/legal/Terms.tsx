import React from 'react';
import { ShieldCheck, ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Terms() {
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
              <div className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Ommaviy Oferta</h1>
                <p className="text-xs text-slate-400">QUIZGEN platformasidan foydalanish bo'yicha rasmiy shartnoma</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">So'nggi yangilanish: 2026-yil 16-noyabr</p>
          </div>

          {/* 1. Umumiy qoidalar */}
          <section className="space-y-3">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              1. Umumiy Qoidalar
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              1.1. Mazkur hujjat «QUIZGEN» elektron ta'lim xizmati (bundan buyon «Ijrochi») tomonidan O'zbekiston Respublikasi Fuqarolik Kodeksining 367 va 369-moddalariga muvofiq rasmiy ommaviy oferta hisoblanadi.
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              1.2. Foydalanuvchi tomonidan xizmatdan ro'yxatdan o'tish, obunani tanlash yoki to'lovni amalga oshirish mazkur Oferta shartlarini to'liq va so'zsiz qabul qilish (aksept) deb hisoblanadi.
            </p>
          </section>

          {/* 2. Xizmat tavsifi */}
          <section className="space-y-3">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              2. Xizmat Tavsifi va Imkoniyatlari
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              2.1. QUIZGEN — talabalar, repetitorlar va o'qituvchilar uchun mo'ljallangan intellektual test platformasi bo'lib, quyidagi xizmatlarni taqdim etadi:
            </p>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc pl-5">
              <li>HEMIS test shablonlarini tahlil qilish (parsing) va raqamlashtirish;</li>
              <li>O'rganish va imtihon rejimlarida test yechish, xatolar tahlili;</li>
              <li>3D Flashcardlar orqali yod olish tizimi;</li>
              <li>Test muharriri orqali savollarni tahrirlash va HEMIS formatida eksport qilish;</li>
              <li>Sun'iy intellekt (Gemini AI) yordamida matn va mavzulardan test yaratish.</li>
            </ul>
          </section>

          {/* 3. To'lov shartlari */}
          <section className="space-y-3">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              3. Obuna Tariflari va To'lov Tartibi
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              3.1. Xizmatlar bepul (Free) va pullik (Talaba Start, Sessiya Pro, Grand Master) tarif rejalari asosida ko'rsatiladi. Tariflar narxi va muddatlari «Tariflar» sahifasida ko'rsatilgan.
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              3.2. To'lovlar O'zbekiston Respublikasining qonuniy to'lov tizimlari (Click, Payme, Uzum Bank) yoki rasmiy bank kartalari orqali O'zbekiston so'mida amalga oshiriladi.
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              3.3. Foydalanuvchining bank kartasi yoki to'lov ma'lumotlari QUIZGEN serverlarida saqlanmaydi — barcha to'lov amallari litsenziyalangan to'lov operatorlari orqali xavfsiz amalga oshiriladi.
            </p>
          </section>

          {/* 4. Qaytarish siyosati */}
          <section className="space-y-3">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              4. To'lovni Qaytarish va Kafolat
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              4.1. Agar platforma jiddiy texnik nosozlik tufayli o'z vazifasini bajara olmasa, foydalanuvchi to'lov qilingan kundan boshlab 7 (yetti) kalendar kuni ichida mablag'ni qaytarishni so'rashga haqlidir. Batafsil shartlar «Qaytarish siyosati» sahifasida bayon etilgan.
            </p>
          </section>

          {/* 5. Intellektual mulk */}
          <section className="space-y-3">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              5. Intellektual Mulk va Mas'uliyat
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              5.1. Foydalanuvchi platformaga yuklayotgan test va hujjatlarning qonuniyligi va mualliflik huquqlariga rioya etilishi uchun shaxsan o'zi javobgardir.
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              5.2. QUIZGEN dasturiy kodi, dizayni va savdo belgisi himoyalangan intellektual mulk hisoblanadi.
            </p>
          </section>

          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>O'zbekiston Respublikasi qonunchiligiga to'liq mos</span>
            </div>
            <div className="flex items-center gap-4 font-bold">
              <Link to="/privacy" className="hover:text-white transition-colors">Maxfiylik siyosati</Link>
              <Link to="/refund" className="hover:text-white transition-colors">Pulni qaytarish</Link>
              <Link to="/contacts" className="hover:text-white transition-colors">Bog'lanish</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
