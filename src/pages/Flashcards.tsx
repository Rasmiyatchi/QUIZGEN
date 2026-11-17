import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, RotateCw, ChevronLeft, ChevronRight, Shuffle, 
  CheckCircle, HelpCircle, Layers, PlayCircle, Sparkles, Crown, ArrowRight 
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizData {
  id?: string;
  title: string;
  questions: Question[];
}

export default function Flashcards() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user, subscription } = useAuth();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIndexes, setMasteredIndexes] = useState<number[]>([]);

  // M1: Entitlements tekshiruvi (faqat Pro va Master uchun)
  const isProOrMaster = subscription.is_active && (subscription.plan === 'pro' || subscription.plan === 'master');

  useEffect(() => {
    async function loadQuiz() {
      if (!quizId) return;
      try {
        const res = await fetch(`/api/quizzes/${quizId}?mode=study`);
        if (res.ok) {
          const data = await res.json();
          if (data.quiz) {
            setQuiz(data.quiz);
            setLoading(false);
            return;
          }
        }

        const local = localStorage.getItem(`quiz_${quizId}`);
        if (local) {
          setQuiz(JSON.parse(local));
        }
      } catch (e) {
        console.error("Load quiz error:", e);
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [quizId]);

  // Klaviatura strelkalari bilan boshqarish
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, quiz]);

  const handleNext = () => {
    if (!quiz) return;
    setIsFlipped(false);
    setCurrentIndex(curr => (curr < quiz.questions.length - 1 ? curr + 1 : 0));
  };

  const handlePrev = () => {
    if (!quiz) return;
    setIsFlipped(false);
    setCurrentIndex(curr => (curr > 0 ? curr - 1 : quiz.questions.length - 1));
  };

  const handleShuffle = () => {
    if (!quiz) return;
    const shuffled = [...quiz.questions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setQuiz({ ...quiz, questions: shuffled });
    setCurrentIndex(0);
    setIsFlipped(false);
    setMasteredIndexes([]);
  };

  const toggleMastered = () => {
    if (masteredIndexes.includes(currentIndex)) {
      setMasteredIndexes(masteredIndexes.filter(i => i !== currentIndex));
    } else {
      setMasteredIndexes([...masteredIndexes, currentIndex]);
      // Telegram Haptic
      if (window.Telegram?.WebApp && (window.Telegram.WebApp as any).HapticFeedback) {
        try {
          (window.Telegram.WebApp as any).HapticFeedback.notificationOccurred('success');
        } catch {}
      }
    }
  };

  // M1: Paywall ko'rsatish
  if (!isProOrMaster) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center animate-in fade-in duration-300">
        <div className="glass-card rounded-[2.5rem] p-8 md:p-10 border border-amber-500/40 shadow-2xl relative overflow-hidden">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border-2 border-amber-500/50 text-amber-400 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/30">
            <Crown className="w-10 h-10" />
          </div>

          <span className="text-[11px] font-black uppercase text-amber-400 bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/30 mb-4 inline-block">
            PRO TARIF IMKONIYATI
          </span>

          <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
            3D Interaktiv Flashcardlar
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed mb-8 max-w-md mx-auto font-medium">
            Savollarni 3D fazoda aylanuvchi kartochkalar yordamida yodlash va oraliq takrorlash tizimi <strong>Sessiya Pro</strong> va <strong>Grand Master</strong> tariflarida to'liq ochiq.
          </p>

          <button
            onClick={() => navigate('/pricing')}
            className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 mb-4 transition-all hover:scale-[1.02] active:scale-95"
          >
            <span>Tariflarni ko'rish (29 999 so'mdan)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button 
            onClick={() => navigate(-1)}
            className="text-xs font-bold text-slate-400 hover:text-white"
          >
            Orqaga qaytish
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center mt-12 glass-card p-8 rounded-3xl border border-white/10">
        <h3 className="text-lg font-bold text-white mb-2">Test savollari topilmadi</h3>
        <button onClick={() => navigate('/')} className="text-blue-400 font-bold hover:underline">Bosh sahifaga qaytish</button>
      </div>
    );
  }

  const currentQ = quiz.questions[currentIndex];
  const correctAnswerIndex = currentQ.correctAnswer ?? 0;
  const correctAnswerText = currentQ.options[correctAnswerIndex] || '';
  const isMastered = masteredIndexes.includes(currentIndex);
  const progressPercent = Math.round(((currentIndex + 1) / quiz.questions.length) * 100);

  return (
    <div className="max-w-3xl mx-auto w-full pt-4 pb-24 px-4">
      {/* Yuqori boshqaruv */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Orqaga
        </button>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleShuffle}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold transition-colors"
            title="Aralashtirish"
          >
            <Shuffle className="w-3.5 h-3.5" /> Aralashtirish
          </button>
          <Link
            to={`/quiz/${quizId}`}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/25"
          >
            <PlayCircle className="w-3.5 h-3.5" /> Testni topshirish
          </Link>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs font-black text-slate-400 mb-2 uppercase tracking-wider">
          <span className="truncate max-w-xs text-white">{quiz.title}</span>
          <span className="text-blue-400">{currentIndex + 1} / {quiz.questions.length}</span>
        </div>
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      {/* 3D Karta Maydoni */}
      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full h-[380px] sm:h-[420px] cursor-pointer perspective-1000 mb-6 group select-none"
      >
        <div className={cn(
          "w-full h-full relative duration-500 transform-style-3d transition-transform rounded-[2.5rem]",
          isFlipped ? "rotate-y-180" : ""
        )}>
          {/* Old Tomon (Savol) */}
          <div className="absolute inset-0 w-full h-full backface-hidden glass-card rounded-[2.5rem] p-7 md:p-10 flex flex-col justify-between border border-white/15 shadow-2xl group-hover:border-blue-500/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                SAVOL
              </span>
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5" /> Javobni ko'rish uchun bosing
              </span>
            </div>

            <div className="my-auto text-center">
              <h2 className="text-lg sm:text-2xl font-black text-white leading-relaxed">
                {currentQ.question}
              </h2>
            </div>

            <div className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Klaviatura: [Bo'shliq] aylantirish • [→] keyingisi
            </div>
          </div>

          {/* Orqa Tomon (Javob) */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-slate-900/95 via-indigo-950/90 to-blue-950/95 rounded-[2.5rem] p-7 md:p-10 flex flex-col justify-between border-2 border-emerald-500/50 shadow-2xl shadow-emerald-500/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30">
                TO'G'RI JAVOB
              </span>
              <span className="text-[11px] font-bold text-emerald-400">
                ✓ Aniq javob
              </span>
            </div>

            <div className="my-auto text-center">
              <span className="text-3xl font-black text-emerald-400 mb-2 block">
                {String.fromCharCode(65 + correctAnswerIndex)}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white leading-relaxed">
                {correctAnswerText}
              </h3>
            </div>

            <div className="text-center text-xs text-slate-400 font-medium">
              Yodlab olgan bo'lsangiz, quyidagi "Yodlandi" tugmasini bosing
            </div>
          </div>
        </div>
      </div>

      {/* Pastki Navigatsiya Tugmalari */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handlePrev}
          className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all active:scale-95 flex items-center justify-center"
          title="Oldingisi"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={toggleMastered}
          className={cn(
            "flex-1 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95",
            isMastered 
              ? "bg-emerald-500 text-white shadow-emerald-500/30" 
              : "bg-white/10 hover:bg-white/15 text-slate-300 border border-white/10"
          )}
        >
          <CheckCircle className="w-4 h-4" />
          <span>{isMastered ? "Yodlandi ✓" : "Yodlangan deb belgilash"}</span>
        </button>

        <button
          onClick={handleNext}
          className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all active:scale-95 flex items-center justify-center"
          title="Keyingisi"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
