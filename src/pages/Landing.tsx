import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, FileText, Bot, Zap, ShieldCheck, CheckCircle2, 
  ArrowRight, ChevronDown, Layers, Award, Crown, Compass, 
  ExternalLink, Send, Flame, HelpCircle, Lock
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Landing() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "QUIZGEN qanday fayllarni qo'llab-quvvatlaydi?",
      a: "QUIZGEN HEMIS tizimidagi barcha Word (.docx) va matn (.txt, .pdf) fayllarini to'liq taniydi. Ham '++++ / ====' simvollari, ham '1. ... A) B) C) ... Javob: A)' formatidagi testlarni soniyalarda testga aylantiradi."
    },
    {
      q: "Test yaratish pullikmi?",
      a: "Yo'q! HEMIS Word va matn fayllarini yuklab testga aylantirish, imtihon topshirish va natijalarni ko'rish 100% mutlaqo BEPUL. AI orqali mavzudan test yaratish, 3D Flashcardlar va Test Muharriri uchun arzon qulay tariflar mavjud."
    },
    {
      q: "Telegram bot va sayt bir-biriga bog'langanmi?",
      a: "Ha! Siz saytga ham, botga ham bitta Telegram akkauntingiz orqali kirasiz. Botga yuborgan faylingiz saytda ham darhol ko'rinadi, barcha urinishlar, statistika va obunalar ikkala tomonda avtomatik sinxronlashadi."
    },
    {
      q: "To'lov qanday usullarda amalga oshiriladi?",
      a: "Click, Payme orqali bir zumda onlayn yoki istalgan bank kartasi (Uzcard / Humo) orqali to'lov qilib chek yuklash mumkin. 7 kun ichida to'lovni 100% qaytarib olish kafolati mavjud."
    }
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Yuqori Header */}
      <header className="max-w-6xl w-full mx-auto px-4 sm:px-6 h-20 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center font-black text-xl text-white shadow-lg shadow-blue-500/30">
            Q
          </div>
          <div>
            <span className="text-xl font-black text-white tracking-tight">QUIZGEN</span>
            <span className="text-[10px] ml-1.5 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 font-extrabold">v3</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/library"
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"
          >
            <Compass className="w-4 h-4 text-blue-400" />
            <span>Kutubxona</span>
          </Link>
          <Link
            to="/pricing"
            className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"
          >
            <Crown className="w-4 h-4 text-amber-400" />
            <span>Tariflar</span>
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95"
          >
            <Send className="w-3.5 h-3.5 fill-current" />
            <span>Kirish</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 pb-20 text-center space-y-6 relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-black shadow-inner">
          <Sparkles className="w-3.5 h-3.5" />
          <span>HEMIS va AI Test Platformasi</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] max-w-3xl mx-auto">
          HEMIS testlarini <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400">soniyalarda</span> onlayn testga aylantiring
        </h1>

        <p className="text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          O'qituvchi bergan Word faylini yuklang — soniyalarda interaktiv test, 3D kartochkalar va xatolar tahlili tayyor. Sessiyani 100 ballga yoping!
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            to="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-500/30 transition-all hover:scale-105 active:scale-95"
          >
            <Send className="w-4 h-4 fill-current" />
            <span>Telegram orqali boshlash</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/library"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-200 font-bold text-sm flex items-center justify-center gap-2 backdrop-blur-xl transition-all"
          >
            <Compass className="w-4 h-4 text-blue-400" />
            <span>Ommaviy Kutubxona</span>
          </Link>
        </div>

        {/* 3 ta tezkor qadam */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-16 text-left">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-3 relative overflow-hidden group hover:border-blue-500/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-black text-lg border border-blue-500/30">
              1
            </div>
            <h3 className="font-extrabold text-white text-base">Faylni yuklang</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              HEMIS Word (.docx) yoki (.txt) faylini saytga yoki Telegram botga tashlang.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-3 relative overflow-hidden group hover:border-blue-500/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-black text-lg border border-purple-500/30">
              2
            </div>
            <h3 className="font-extrabold text-white text-base">Testga aylantiring</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Aqlli parser to'g'ri kalitlarni avtomatik aniqlab, interaktiv imtihon tuzadi.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-3 relative overflow-hidden group hover:border-blue-500/40 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-black text-lg border border-emerald-500/30">
              3
            </div>
            <h3 className="font-extrabold text-white text-base">Yeching va o'rganing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              O'rganish yoki imtihon rejimida yeching, faqat xatolar ustida qayta mashq qiling.
            </p>
          </div>
        </div>
      </section>

      {/* Imkoniyatlar */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Nega aynan QUIZGEN?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Talabalar va o'qituvchilar uchun yaratilgan eng mukammal ta'lim ekotizimi
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-blue-500/30 transition-all space-y-2">
            <div className="p-3 rounded-2xl bg-blue-600/20 text-blue-400 w-fit">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-white text-sm">HEMIS: 100% Bepul</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Word va matn fayllardan cheksiz miqdorda test yaratish mutlaqo bepul.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-purple-500/30 transition-all space-y-2">
            <div className="p-3 rounded-2xl bg-purple-600/20 text-purple-400 w-fit">
              <Bot className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-white text-sm">Gemini AI Generatsiya</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Istalgan mavzu yoki darslik konspektidan soniyalarda sifatli testlar tuzadi.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-amber-500/30 transition-all space-y-2">
            <div className="p-3 rounded-2xl bg-amber-600/20 text-amber-400 w-fit">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-white text-sm">3D Flashcardlar</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Murakkab atama va formulalarni oraliq takrorlash orqali tez yodda saqlang.
            </p>
          </div>

          <div className="p-5 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 transition-all space-y-2">
            <div className="p-3 rounded-2xl bg-emerald-600/20 text-emerald-400 w-fit">
              <Flame className="w-5 h-5" />
            </div>
            <h4 className="font-extrabold text-white text-sm">Real Gamifikatsiya</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              XP to'plang, ketma-ketlik (streak) saqlang va talabalar reytingida yetakchi bo'ling.
            </p>
          </div>
        </div>
      </section>

      {/* Tariflar qisqacha ko'rinishi */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-12 text-center space-y-6">
        <div className="space-y-2">
          <span className="text-xs font-black uppercase tracking-wider text-blue-400">Arzon va Qulay</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Har bir talaba uchun mos tarif</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <span className="text-xs font-extrabold text-slate-400">🥉 7 kunlik</span>
              <h3 className="text-lg font-black text-white mt-1">Talaba Start</h3>
              <div className="text-2xl font-black text-white my-3">7 999 so'm</div>
              <ul className="text-xs text-slate-400 space-y-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Cheksiz HEMIS yuklash</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Kuniga 10 ta AI test</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Natijalar tahlili</li>
              </ul>
            </div>
            <Link to="/pricing" className="mt-6 py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white text-center text-xs font-bold border border-white/10 transition-all">
              Tanlash
            </Link>
          </div>

          <div className="p-6 rounded-3xl bg-gradient-to-b from-blue-900/40 to-slate-900/70 border border-blue-500/50 backdrop-blur-xl flex flex-col justify-between relative shadow-xl shadow-blue-500/10">
            <span className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-blue-500 text-white font-black text-[10px] uppercase tracking-wider">
              Eng ommabop
            </span>
            <div>
              <span className="text-xs font-extrabold text-blue-300">🥈 30 kunlik (1 oy)</span>
              <h3 className="text-lg font-black text-white mt-1">Sessiya Pro</h3>
              <div className="text-2xl font-black text-white my-3">29 999 so'm</div>
              <ul className="text-xs text-slate-300 space-y-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Cheksiz HEMIS + 50 AI test/kun</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 3D Flip Flashcardlar</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Test Muharriri (Editor)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Xatolar ustida qayta ishlash</li>
              </ul>
            </div>
            <Link to="/pricing" className="mt-6 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-center text-xs font-black shadow-md shadow-blue-600/30 transition-all">
              Pro ga o'tish
            </Link>
          </div>

          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
            <div>
              <span className="text-xs font-extrabold text-amber-400">🥇 90 kunlik (Semestr)</span>
              <h3 className="text-lg font-black text-white mt-1">Grand Master</h3>
              <div className="text-2xl font-black text-white my-3">59 900 so'm</div>
              <ul className="text-xs text-slate-400 space-y-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> CHEKSIZ AI testlar</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Barcha eksport formatlari</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Ochiq guruh havolalari</li>
              </ul>
            </div>
            <Link to="/pricing" className="mt-6 py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white text-center text-xs font-bold border border-white/10 transition-all">
              Tanlash
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Akordeoni */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-4">
        <h2 className="text-xl sm:text-2xl font-black text-white text-center mb-6">
          Ko'p beriladigan savollar
        </h2>

        {faqs.map((faq, idx) => {
          const isOpen = openFaqIndex === idx;
          return (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 transition-all cursor-pointer"
              onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-extrabold text-sm text-white">{faq.q}</span>
                <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
              </div>
              {isOpen && (
                <p className="text-xs text-slate-400 mt-2.5 pt-2 border-t border-white/5 leading-relaxed">
                  {faq.a}
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/40 py-8 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <span className="font-bold text-slate-300">QUIZGEN v3</span> — O'zbekistondagi talabalar uchun ta'lim platformasi.
            <p className="mt-1">© 2026 Barcha huquqlar himoyalangan.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400 font-bold">
            <Link to="/oferta" className="hover:text-white transition-colors">Oferta</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Maxfiylik</Link>
            <Link to="/refund" className="hover:text-white transition-colors">Qaytarish</Link>
            <Link to="/contacts" className="hover:text-white transition-colors">Aloqa</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
