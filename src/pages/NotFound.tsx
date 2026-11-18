import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, BookOpen, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900/60 border border-white/10 shadow-2xl backdrop-blur-xl text-center space-y-4">
        <div className="relative inline-block mb-2">
          <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500">
            404
          </div>
          <div className="absolute -inset-2 bg-blue-500/10 blur-xl rounded-full -z-10"></div>
        </div>

        <h2 className="text-xl font-black text-white tracking-tight">
          Sahifa topilmadi
        </h2>

        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          Siz qidirayotgan sahifa ko'chirilgan, o'chirilgan yoki manzili noto'g'ri kiritilgan bo'lishi mumkin.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-3">
          <Link
            to="/"
            className="w-full sm:flex-1 py-2.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Bosh sahifaga qaytish</span>
          </Link>

          <Link
            to="/library"
            className="w-full sm:w-auto py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
          >
            <BookOpen className="w-4 h-4" />
            <span>Kutubxona</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
