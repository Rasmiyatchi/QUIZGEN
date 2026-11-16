import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Loader2, Calendar, ChevronRight, PlayCircle, Award, Layers, 
  Trash2, Edit3, BarChart3, Clock, CheckCircle2, Flame, Sparkles 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

interface AttemptMeta {
  id: string;
  quiz_id?: string;
  quizId?: string;
  quiz_title?: string;
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

export default function History() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'attempts' | 'quizzes'>('attempts');
  const [attempts, setAttempts] = useState<AttemptMeta[]>([]);
  const [quizzes, setQuizzes] = useState<QuizMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        try {
          const aRes = await fetch(`/api/attempts?userId=${user.uid}`);
          if (aRes.ok) {
            const aData = await aRes.json();
            if (aData.attempts) {
              setAttempts(aData.attempts);
            }
          }
        } catch {}

        if (attempts.length === 0) {
          const localAttempts: AttemptMeta[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('result_')) {
              try {
                const r = JSON.parse(localStorage.getItem(key) || '{}');
                if (r.userId === user.uid || !r.userId) {
                  localAttempts.push(r);
                }
              } catch {}
            }
          }
          if (localAttempts.length > 0) {
            setAttempts(localAttempts);
          }
        }

        try {
          const qRes = await fetch(`/api/quizzes?userId=${user.uid}`);
          if (qRes.ok) {
            const qData = await qRes.json();
            if (qData.quizzes) {
              setQuizzes(qData.quizzes);
            }
          }
        } catch {}

        if (quizzes.length === 0) {
          const localQuizzes: QuizMeta[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('quiz_')) {
              try {
                const q = JSON.parse(localStorage.getItem(key) || '{}');
                if (q.userId === user.uid || !q.userId) {
                  localQuizzes.push({
                    id: q.id,
                    title: q.title,
                    total_questions: q.questions ? q.questions.length : 0,
                    created_at: q.createdAt
                  });
                }
              } catch {}
            }
          }
          if (localQuizzes.length > 0) {
            setQuizzes(localQuizzes);
          }
        }

      } catch (err) {
        console.error("History load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleDeleteQuiz = async (quizId: string) => {
    if (!window.confirm("Haqiqatan ham ushbu testni o'chirmoqchimisiz?")) return;
    try {
      await fetch(`/api/quizzes/${quizId}?userId=${user?.uid}`, { method: 'DELETE' });
      localStorage.removeItem(`quiz_${quizId}`);
      setQuizzes(quizzes.filter(q => q.id !== quizId));
    } catch (e) {
      alert("O'chirishda xatolik yuz berdi");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const totalCompleted = attempts.length;
  const avgScore = totalCompleted > 0
    ? Math.round(attempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / totalCompleted)
    : 0;
  const bestScore = totalCompleted > 0
    ? Math.max(...attempts.map(a => a.percentage || 0))
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24 pt-4">
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

      {/* 1-TAB: TOPShIRILGAN TESTLAR */}
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
                        <h4 className="text-sm font-bold text-white leading-tight mb-1">{title}</h4>
                        <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
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
                      onClick={() => handleDeleteQuiz(quiz.id)}
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

    </div>
  );
}
