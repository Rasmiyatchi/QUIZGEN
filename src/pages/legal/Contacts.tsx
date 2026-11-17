import React from 'react';
import { Mail, Send, MapPin, Clock, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Contacts() {
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
              <div className="p-2.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Bog'lanish va Rekvizitlar</h1>
                <p className="text-xs text-slate-400">QUIZGEN qo'llab-quvvatlash xizmati va rasmiy ma'lumotlar</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-3xl bg-white/5 border border-white/10 flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1">Telegram Bot</h3>
                <p className="text-xs text-slate-400 mb-2">Asosiy bot va savollar uchun</p>
                <a 
                  href="https://t.me/quizgenrobot" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-sm font-bold text-blue-400 hover:underline"
                >
                  @quizgenrobot
                </a>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white/5 border border-white/10 flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1">Elektron Pochta</h3>
                <p className="text-xs text-slate-400 mb-2">Rasmiy murojaatlar uchun</p>
                <a 
                  href="mailto:support@quizgen.uz" 
                  className="text-sm font-bold text-purple-400 hover:underline"
                >
                  support@quizgen.uz
                </a>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white/5 border border-white/10 flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1">Ish Vaqti</h3>
                <p className="text-xs text-slate-400 mb-2">Onlayn avtomatlashgan tizim</p>
                <span className="text-sm font-bold text-amber-400">24/7 (Dam olish kunlarisiz)</span>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-white/5 border border-white/10 flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider mb-1">Manzil</h3>
                <p className="text-xs text-slate-400 mb-2">O'zbekiston Respublikasi</p>
                <span className="text-sm font-bold text-emerald-400">Toshkent shahri</span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-blue-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Tezkor texnik yordam</span>
            </div>
            <div className="flex items-center gap-4 font-bold">
              <Link to="/oferta" className="hover:text-white transition-colors">Ommaviy oferta</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Maxfiylik siyosati</Link>
              <Link to="/refund" className="hover:text-white transition-colors">Pulni qaytarish</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
