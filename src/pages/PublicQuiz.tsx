import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  PlayCircle, Layers, Share2, Copy, Trophy, CheckCircle2, 
  ArrowLeft, Eye, Calendar, Sparkles, BookOpen, AlertCircle, ExternalLink 
} from 'lucide-react';
import { cn } from '../lib/utils';

interface PublicQuizData {
  id: string;
  title: string;
  category: string;
  visibility: 'public' | 'private' | 'unlisted';
  status: string;
  slug?: string;
  questions_count?: number;
  views_count?: number;
  creator_name?: string;
  creator_username?: string;
  created_at?: string;
}

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  username?: string;
  score: number;
  total: number;
  percentage: number;
  time_spent_seconds?: number;
  completed_at: string;
}

export default function PublicQuiz() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [quiz, setQuiz] = useState<PublicQuizData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadQuiz() {
      if (!slug) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/quizzes/slug/${encodeURIComponent(slug)}`);
        const data = await res.json();

        if (res.ok && data.quiz) {
          setQuiz(data.quiz);

          // Leaderboard yuklash
          try {
            const lbRes = await fetch(`/api/quizzes/${data.quiz.id}/leaderboard?limit=5`);
            if (lbRes.ok) {
              const lbData = await lbRes.json();
              setLeaderboard(lbData.leaderboard || []);
            }
          } catch (_) {}
        } else {
          setError(data.message || "Test topilmadi yoki yopiq holatda");
        }
      } catch (err: any) {
        setError("Server bilan ulanishda xatolik yuz berdi");
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [slug]);

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function getTelegramShareUrl() {
    if (!quiz) return '';
    const text = `🎯 QUIZGEN test: "${quiz.title}"\nSavollar: ${quiz.questions_count || 0} ta\nBu yerda yeching:`;
    return `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`;
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
        <p className="text-xs uppercase tracking-widest font-bold">Test yuklanmoqda...</p>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="p-4 rounded-3xl bg-red-600/10 border border-red-500/20 text-red-400 inline-flex mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-white mb-2">Test topilmadi</h2>
        <p className="text-xs sm:text-sm text-slate-400 mb-6">
          {error || "Ushbu havola eskirgan yoki test muallifi tomonidan o'chirilgan bo'lishi mumkin."}
        </p>
        <Link
          to="/library"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all"
        >
          <BookOpen className="w-4 h-4" />
          <span>Kutubxonaga qaytish</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Orqaga qaytish */}
      <Link 
        to="/library" 
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Kutubxonaga qaytish</span>
      </Link>

      {/* Asosiy Kartochka */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-2xl relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                {quiz.category || 'Umumiy'}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> {quiz.views_count || 0} marta ko'rilgan
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
              {quiz.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <span className="font-bold text-slate-300">
                ❓ {quiz.questions_count || 0} ta savol
              </span>
              <span>•</span>
              <span>
                Muallif: <b className="text-slate-200">{quiz.creator_name || 'HEMIS'}</b>
              </span>
              {quiz.created_at && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(quiz.created_at).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Harakatlar */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto">
            <button
              onClick={() => navigate(`/quiz/${quiz.id}`)}
              className="py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-600/30 hover:scale-105 active:scale-95"
            >
              <PlayCircle className="w-5 h-5" />
              <span>Testni Boshlash</span>
            </button>

            <button
              onClick={() => navigate(`/flashcards/${quiz.id}`)}
              className="py-2.5 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Layers className="w-4 h-4" />
              <span>3D Flashcardlar</span>
            </button>
          </div>
        </div>

        {/* Ulashish qatori */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-400">
            Ushbu testni do'stlaringiz bilan ulashing:
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Nusxalandi!" : "Havolani nusxalash"}</span>
            </button>
            <a
              href={getTelegramShareUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-1.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Telegram</span>
            </a>
          </div>
        </div>
      </div>

      {/* Leaderboard (Peshqadamlar) */}
      {leaderboard.length > 0 && (
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-black text-white">Eng yaxshi natijalar (Top 5)</h2>
            </div>
          </div>

          <div className="space-y-2">
            {leaderboard.map((entry) => (
              <div
                key={entry.rank}
                className={cn(
                  "p-3 rounded-2xl border flex items-center justify-between transition-all",
                  entry.rank === 1 && "bg-amber-500/10 border-amber-500/30 text-amber-300",
                  entry.rank === 2 && "bg-slate-300/10 border-slate-300/20 text-slate-200",
                  entry.rank === 3 && "bg-amber-700/10 border-amber-700/20 text-amber-600",
                  entry.rank > 3 && "bg-white/[0.02] border-white/5 text-slate-400"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-black text-sm">
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                  </span>
                  <div>
                    <span className="font-extrabold text-sm text-white">
                      {entry.display_name}
                    </span>
                    {entry.username && (
                      <span className="text-[11px] text-slate-500 ml-1.5">
                        @{entry.username}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-black text-sm text-emerald-400">
                    {entry.percentage}%
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    ({entry.score}/{entry.total})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
