import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, RotateCw, ChevronLeft, ChevronRight, Shuffle, CheckCircle, HelpCircle, Layers, PlayCircle, Sparkles } from 'lucide-react';
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
  const { user } = useAuth();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredIndexes, setMasteredIndexes] = useState<number[]>([]);

  useEffect(() => {
    async function loadQuiz() {
      if (!quizId) return;
      try {
        const res = await fetch(`/api/quizzes/${quizId}`);
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
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleNext = () => {
    if (!quiz) return;
    setIsFlipped(false);
    setCurrentIndex(prev => (prev < quiz.questions.length - 1 ? prev + 1 : 0));
  };

  const handlePrev = () => {
    if (!quiz) return;
    setIsFlipped(false);
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : quiz.questions.length - 1));
  };

  const handleShuffle = () => {
    if (!quiz) return;
    const shuffled = [...quiz.questions].sort(() => Math.random() - 0.5);
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
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 font-bold">
        Yuklanmoqda...
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
  const correctAnswerText = currentQ.options[currentQ.correctAnswer] || '';
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

      {/* 3D Flip Card */}
      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full min-h-[380px] md:min-h-[420px] cursor-pointer perspective-[1000px] select-none my-4"
      >
        <div className={cn(
          "w-full h-full min-h-[380px] md:min-h-[420px] rounded-[2.5rem] p-8 md:p-12 transition-all duration-500 transform-style-3d relative flex flex-col justify-between shadow-2xl border",
          !isFlipped 
            ? "glass-card border-white/15 text-white shadow-blue-900/20" 
            : "bg-gradient-to-tr from-emerald-600/90 to-teal-800/90 border-emerald-400/50 text-white shadow-emerald-900/30 rotate-y-180"
        )}>
          {/* Card Head */}
          <div className="flex items-center justify-between">
            <span className={cn(
              "px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
              !isFlipped ? "bg-blue-500/15 border-blue-500/30 text-blue-400" : "bg-white/20 border-white/30 text-white"
            )}>
              {!isFlipped ? "Savol (Oldi)" : "To'g'ri Javob (Orqasi)"}
            </span>

            <button 
              onClick={(e) => { e.stopPropagation(); toggleMastered(); }}
              className={cn(
                "p-2 rounded-full transition-colors",
                isMastered 
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30" 
                  : !isFlipped ? "text-slate-500 hover:text-white" : "text-white/60 hover:text-white"
              )}
              title={isMastered ? "O'zlashtirilgan" : "O'zlashtirildi deb belgilash"}
            >
              <CheckCircle className="w-6 h-6 fill-current" />
            </button>
          </div>

          {/* Card Body */}
          <div className="my-auto py-6">
            {!isFlipped ? (
              <div>
                <h3 className="text-xl md:text-2xl font-bold leading-relaxed text-white text-center">
                  {currentQ.question}
                </h3>
              </div>
            ) : (
              <div className="text-center">
                <span className="text-emerald-200 text-xs uppercase font-black tracking-widest block mb-3">To'g'ri javob</span>
                <p className="text-2xl md:text-3xl font-black leading-snug text-white">
                  {correctAnswerText}
                </p>
                {currentQ.explanation && (
                  <p className="mt-4 text-xs text-emerald-100/90 max-w-md mx-auto italic">
                    {currentQ.explanation}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Card Footer Hint */}
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-400">
            <RotateCw className="w-3.5 h-3.5" />
            <span>Javobni ko'rish uchun kartochkani bosing (yoki Probel)</span>
          </div>
        </div>
      </div>

      {/* Navigatsiya tugmalari */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handlePrev}
          className="flex-1 py-4 px-6 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-2xl border border-white/10 flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" /> Oldingisi
        </button>

        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="py-4 px-6 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-black text-xs uppercase tracking-wider rounded-2xl border border-blue-500/30 transition-all flex items-center gap-2 active:scale-95"
        >
          <RotateCw className="w-4 h-4" /> Aylantirish
        </button>

        <button
          onClick={handleNext}
          className="flex-1 py-4 px-6 bg-white hover:bg-slate-100 text-slate-900 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          Keyingisi <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
