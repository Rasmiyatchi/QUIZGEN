import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Loader2, Calendar, ChevronRight, PlayCircle, Award, Layers, 
  Trash2, Edit3, BarChart3, Clock, CheckCircle2, Flame, Sparkles, AlertTriangle, X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface AttemptMeta {
  id: string;
  quiz_id?: string;
  quizId?: string;
  quiz_title?: string;
  mode?: string;
  score: number;
  total: number;
  percentage: number;
  completed_at?: string;
  time_spent_seconds?: number;
}

interface QuizMeta {
  id: string;
  title: string;
  total_questions?: number;
  totalQuestions?: number;
  source_type?: string;
  created_at?: string;
  createdAt?: string;
}

interface UserStatsData {
  total_attempts: number;
  total_quizzes_created: number;
  avg_percentage: number;
  best_score: number;
  streak_days: number;
  xp: number;
  rank_title: string;
  rank_level: number;
  next_level_xp: number;
}

export default function History() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'attempts' | 'quizzes'>('attempts');
  const [attempts, setAttempts] = useState<AttemptMeta[]>([]);
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([]);
  const [stats, setStats] = useState<UserStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  // O'chirish modal holati (Rule 8: alert/confirm ishlatilmaydi)
  const [deleteConfirmQuiz, setDeleteConfirmQuiz] = useState<QuizMeta | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        // 1. Urinishlarni yuklash (Server API)
        try {
          const aRes = await authFetch('/api/attempts');
          if (aRes.ok) {
            const aData = await aRes.json();
            if (aData.attempts) {
              setAttempts(aData.attempts);
            }
          }
        } catch (e) {
          console.warn("Attempts API xatosi:", e);
        }

        // 2. Testlarni yuklash
        try {
          const qRes = await authFetch('/api/quizzes');
          if (qRes.ok) {
            const qData = await qRes.json();
            if (qData.quizzes) {
              setQuizzes(qData.quizzes);
            }
          }
        } catch (e) {
          console.warn("Quizzes API xatosi:", e);
        }

        // 3. Foydalanuvchi statistika va gamifikatsiya ma'lumotlari
        try {
          const sRes = await authFetch('/api/users/me/stats');
          if (sRes.ok) {
            const sData = await sRes.json();
            if (sData.stats) {
              setStats(sData.stats);
            }
          }
        } catch (e) {
          console.warn("Stats API xatosi:", e);
        }

      } catch (err) {
        console.error("History load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const confirmDelete = async () => {
    if (!deleteConfirmQuiz) return;
    setDeleting(true);
    try {
      const res = await authFetch(`/api/quizzes/${deleteConfirmQuiz.id}`, { method: 'DELETE' });
      if (res.ok) {
        setQuizzes(quizzes.filter(q => q.id !== deleteConfirmQuiz.id));
        setDeleteConfirmQuiz(null);
      }
    } catch (e) {
      console.error("Delete quiz error:", e);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const totalCompleted = stats?.total_attempts ?? attempts.length;
  const avgScore = stats?.avg_percentage ?? (totalCompleted > 0
    ? Math.round(attempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / totalCompleted)
    : 0);
  const bestScore = stats?.best_score ?? (totalCompleted > 0
    ? Math.max(...attempts.map(a => a.percentage || 0))
    : 0);

  const streakDays = stats?.streak_days ?? user?.streak_days ?? 1;
  const xp = stats?.xp ?? user?.xp ?? 0;
  const rankTitle = stats?.rank_title || 'Yangi talaba';

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24 pt-4">
      {/* Profil Gamifikatsiya Bar */}
      <div className="glass-card rounded-[2rem] p-5 border border-white/10 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-orange-500/20">
            <Flame className="w-8 h-8 fill-current animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">{user?.displayName || 'Talaba'}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-extrabold text-[11px] border border-blue-500/30">
                {rankTitle}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Daraja: <b className="text-amber-400">{stats?.rank_level || 1}</b> • Jami tajriba: <b className="text-amber-400">{xp} XP</b>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-center px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/25">
            <span className="text-xs text-amber-400 font-bold block uppercase tracking-wider">Seriya</span>
            <span className="text-xl font-black text-white flex items-center justify-center gap-1">
              <Flame className="w-4 h-4 text-amber-400 fill-current" /> {streakDays} kun
            </span>
          </div>

          <div className="text-center px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/25">
            <span className="text-xs text-blue-400 font-bold block uppercase tracking-wider">Testlar</span>
            <span className="text-xl font-black text-white">{stats?.total_quizzes_created ?? quizzes.length} ta</span>
          </div>
        </div>
      </div>

      {/* 3 ta Katta Statistika Kartasi */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-8">
        <div className="glass-card rounded-[2rem] p-5 border border-blue-500/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-white block leading-tight">{totalCompleted}</span>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Topshirilgan testlar</span>
          </div>
        </div>

        <div className="glass-card rounded-[2rem] p-5 border border-emerald-500/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-emerald-400 block leading-tight">{avgScore}%</span>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">O'rtacha natija</span>
          </div>
        </div>

        <div className="glass-card rounded-[2rem] p-5 border border-amber-500/20 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-black text-amber-400 block leading-tight">{bestScore}%</span>
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Eng yuqori ball</span>
          </div>
        </div>
      </div>

      {/* Tablar */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('attempts')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'attempts' ? "bg-white text-slate-900 shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          Topshirilgan Imtihonlar ({attempts.length})
        </button>

        <button
          onClick={() => setActiveTab('quizzes')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
            activeTab === 'quizzes' ? "bg-white text-slate-900 shadow-lg" : "text-slate-400 hover:text-white"
          )}
        >
          Mening Testlarim ({quizzes.length})
        </button>
      </div>

      {/* 1-TAB: TOPSHIRILGAN TESTLAR */}
      {activeTab === 'attempts' && (
        <div>
          {attempts.length === 0 ? (
            <div className="glass-card rounded-[2.5rem] p-12 text-center border border-white/10">
               <div className="w-14 h-14 bg-white/5 text-slate-400 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/10">
                 <Calendar className="w-6 h-6" />
               </div>
               <h3 className="text-base font-bold text-white mb-1">Hali testlar topshirilmagan</h3>
               <p className="text-xs text-slate-400 mb-6">Birinchi testni boshlash uchun fayl yuklang.</p>
               <Link to="/" className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25">
                 Yangi Test Yaratish
               </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.map((attempt) => {
                const percent = attempt.percentage || 0;
                const isPassing = percent >= 60;
                const title = attempt.quiz_title || 'Nomsiz test';
                const dateStr = attempt.completed_at ? new Date(attempt.completed_at).toLocaleDateString() : 'Yaqinda';

                return (
                  <div key={attempt.id} className="glass-card p-5 rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 border",
                        isPassing ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-red-500/15 text-red-400 border-red-500/30"
                      )}>
                        {percent}%
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white leading-tight">{title}</h4>
                          {attempt.mode === 'retry_wrong' && (
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                              Xatolar
                            </span>
                          )}
                          {attempt.mode === 'study' && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                              O'rganish
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium mt-1">
                          <span>{attempt.score} / {attempt.total} to'g'ri</span>
                          <span>•</span>
                          <span>{dateStr}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Link 
                        to={`/result/${attempt.id}`}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl border border-white/10 transition-colors"
                      >
                        Tahlil
                      </Link>
                      <Link 
                        to={`/quiz/${attempt.quiz_id || attempt.quizId}`}
                        className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl transition-colors border border-blue-500/30"
                        title="Qaytadan topshirish"
                      >
                        <PlayCircle className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2-TAB: MENING TESTLARIM */}
      {activeTab === 'quizzes' && (
        <div>
          {quizzes.length === 0 ? (
            <div className="glass-card rounded-[2.5rem] p-12 text-center border border-white/10">
               <h3 className="text-base font-bold text-white mb-1">Sizda hali saqlangan testlar yo'q</h3>
               <p className="text-xs text-slate-400 mb-6">HEMIS yoki matn fayl yuklab yangi test yarating.</p>
               <Link to="/" className="inline-block bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25">
                 Test Yaratish
               </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="glass-card p-5 rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/20 transition-all">
                  <div>
                    <h4 className="text-sm font-bold text-white leading-tight mb-1">{quiz.title}</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                      <span>{quiz.total_questions || quiz.totalQuestions || 0} ta savol</span>
                      <span>•</span>
                      <span className="uppercase text-emerald-400 font-extrabold">{quiz.source_type || 'HEMIS'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                    <Link
                      to={`/flashcards/${quiz.id}`}
                      className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-bold rounded-xl border border-emerald-500/30 transition-colors flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" /> Kartochkalar
                    </Link>

                    <Link
                      to={`/editor/${quiz.id}`}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl border border-white/10 transition-colors flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Tahrirlash
                    </Link>

                    <Link
                      to={`/quiz/${quiz.id}`}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                      <PlayCircle className="w-3.5 h-3.5" /> Ishlash
                    </Link>

                    <button
                      onClick={() => setDeleteConfirmQuiz(quiz)}
                      className="p-2 text-slate-500 hover:text-red-400 rounded-xl hover:bg-red-500/10 transition-colors"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* O'chirishni tasdiqlash modali (Rule 8: Glass Modal) */}
      {deleteConfirmQuiz && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl border border-white/15 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setDeleteConfirmQuiz(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4 border border-red-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white mb-2">Testni o'chirish</h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Haqiqatan ham <b className="text-white">"{deleteConfirmQuiz.title}"</b> testini butunlay o'chirmoqchimisiz? Ushbu amalni bekor qilib bo'lmaydi.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmQuiz(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/15 text-slate-300 text-xs font-bold hover:bg-white/5"
              >
                Bekor qilish
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-red-600/30 disabled:opacity-50"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
