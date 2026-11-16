import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Loader2, ArrowRight, ArrowLeft, CheckCircle2, XCircle, X, Shuffle, 
  Clock, Flag, LayoutGrid, Check, Sparkles, AlertTriangle, Layers 
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
  userId?: string;
  title: string;
  time_limit_minutes?: number;
  timeLimitMinutes?: number;
  questions: Question[];
  createdAt?: any;
}

export default function Quiz() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [flagged, setFlagged] = useState<boolean[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Rejim: study (o'rganish) vs exam (imtihon)
  const [mode, setMode] = useState<'study' | 'exam'>('study');
  
  // Taymer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [showGridModal, setShowGridModal] = useState(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);

  useEffect(() => {
    async function fetchQuiz() {
      if (!quizId) return;
      try {
        const res = await fetch(`/api/quizzes/${quizId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.quiz) {
            setQuiz(data.quiz);
            setAnswers(new Array(data.quiz.questions.length).fill(-1));
            setFlagged(new Array(data.quiz.questions.length).fill(false));
            
            const limit = data.quiz.time_limit_minutes || data.quiz.timeLimitMinutes || 0;
            if (limit > 0) {
              setTimeLeft(limit * 60);
              setMode('exam');
            }
            setLoading(false);
            return;
          }
        }

        const stored = localStorage.getItem(`quiz_${quizId}`);
        if (stored) {
          const data = JSON.parse(stored) as QuizData;
          setQuiz(data);
          setAnswers(new Array(data.questions.length).fill(-1));
          setFlagged(new Array(data.questions.length).fill(false));
          const limit = data.time_limit_minutes || data.timeLimitMinutes || 0;
          if (limit > 0) {
            setTimeLeft(limit * 60);
            setMode('exam');
          }
        } else {
          setError("Test topilmadi");
        }
      } catch (err: any) {
        console.error(err);
        setError("Testni yuklashda xatolik yuz berdi");
      } finally {
        setLoading(false);
      }
    }
    fetchQuiz();
  }, [quizId]);

  // Taymer hisobi
  useEffect(() => {
    if (loading || !quiz) return;
    const interval = setInterval(() => {
      setTimeSpent(prev => prev + 1);
      setTimeLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          autoSubmitOnTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, quiz]);

  const autoSubmitOnTimeUp = () => {
    alert("Vaqt tugadi! Test avtomatik tarzda yakunlanmoqda.");
    submitQuizInternal();
  };

  const handleSelectOption = (optionIndex: number) => {
    if (mode === 'study' && answers[currentIndex] !== -1) return;

    const newAnswers = [...answers];
    newAnswers[currentIndex] = optionIndex;
    setAnswers(newAnswers);

    // Telegram Haptic
    if (window.Telegram?.WebApp && (window.Telegram.WebApp as any).HapticFeedback) {
      try {
        (window.Telegram.WebApp as any).HapticFeedback.selectionChanged();
      } catch {}
    }
  };

  const toggleFlagCurrent = () => {
    const updated = [...flagged];
    updated[currentIndex] = !updated[currentIndex];
    setFlagged(updated);
  };

  const handleNext = () => {
    if (quiz && currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(curr => curr + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(curr => curr - 1);
    }
  };

  const handleShuffle = () => {
    if (!quiz) return;
    const confirmShuffle = window.confirm("Aralashtirilsa, hozirgi javoblar tozalanadi. Davom etamizmi?");
    if (!confirmShuffle) return;

    const shuffledQuestions = [...quiz.questions];
    for (let i = shuffledQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
    }
    
    shuffledQuestions.forEach(q => {
      const optionsWithRef = q.options.map((opt, index) => ({ text: opt, isCorrect: index === q.correctAnswer }));
      for (let i = optionsWithRef.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionsWithRef[i], optionsWithRef[j]] = [optionsWithRef[j], optionsWithRef[i]];
      }
      q.options = optionsWithRef.map(o => o.text);
      q.correctAnswer = optionsWithRef.findIndex(o => o.isCorrect);
    });

    const newData = { ...quiz, questions: shuffledQuestions };
    setQuiz(newData);
    setAnswers(new Array(shuffledQuestions.length).fill(-1));
    setFlagged(new Array(shuffledQuestions.length).fill(false));
    setCurrentIndex(0);
  };

  const calculateScore = () => {
    if (!quiz) return 0;
    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (answers[i] === q.correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  const submitQuizInternal = async () => {
    if (!quiz || !quizId) return;
    setSubmitting(true);

    try {
      const correctCount = calculateScore();
      const totalCount = quiz.questions.length;
      const percentage = Math.round((correctCount / totalCount) * 100);
      const resultId = Math.random().toString(36).substring(7);

      const attemptPayload = {
        id: resultId,
        userId: user?.uid || 'anonymous',
        quizId: quizId,
        score: correctCount,
        total: totalCount,
        percentage: percentage,
        timeSpentSeconds: timeSpent,
        answersGiven: answers
      };

      try {
        await fetch('/api/attempts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(attemptPayload)
        });
      } catch (beErr) {
        console.warn("Backend save attempt fallback:", beErr);
      }

      localStorage.setItem(`result_${resultId}`, JSON.stringify({
        ...attemptPayload,
        createdAt: new Date().toISOString()
      }));

      if (!localStorage.getItem(`quiz_${quizId}`)) {
        localStorage.setItem(`quiz_${quizId}`, JSON.stringify(quiz));
      }

      navigate(`/result/${resultId}`);
    } catch (err) {
      console.error(err);
      alert("Testni saqlashda xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    const unansweredCount = answers.filter(a => a === -1).length;
    if (unansweredCount > 0) {
      setShowConfirmFinish(true);
    } else {
      submitQuizInternal();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="text-center mt-12 glass-card p-8 rounded-3xl max-w-md mx-auto border border-white/10">
        <h2 className="text-xl font-bold text-red-400 mb-2">{error}</h2>
        <button onClick={() => navigate('/')} className="text-blue-400 font-bold hover:underline">Bosh sahifaga qaytish</button>
      </div>
    );
  }

  const currentQuestion = quiz.questions[currentIndex];
  const isLastQuestion = currentIndex === quiz.questions.length - 1;
  const answeredCount = answers.filter(a => a !== -1).length;
  const flaggedCount = flagged.filter(Boolean).length;
  const progressPercent = Math.round(((currentIndex + 1) / quiz.questions.length) * 100);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-3xl mx-auto w-full h-full flex flex-col pt-3 pb-[90px] md:pb-12 px-4">
      
      {/* 1. Yuqori Navigatsiya Qatori */}
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-full text-xs font-bold border border-white/10"
        >
          <X className="w-3.5 h-3.5" /> Chiqish
        </button>

        <div className="flex items-center gap-2">
          {timeLeft !== null && (
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border",
              timeLeft <= 120 
                ? "bg-red-500/15 text-red-400 border-red-500/40 animate-pulse" 
                : "bg-blue-500/15 text-blue-400 border-blue-500/30 shadow-sm"
            )}>
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(timeLeft)}</span>
            </div>
          )}

          {/* Rejim */}
          <div className="bg-white/5 border border-white/10 p-0.5 rounded-full flex text-[10px] font-black">
            <button 
              onClick={() => setMode('study')}
              className={cn("px-2.5 py-1 rounded-full transition-all", mode === 'study' ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400")}
            >
              O'rganish
            </button>
            <button 
              onClick={() => setMode('exam')}
              className={cn("px-2.5 py-1 rounded-full transition-all", mode === 'exam' ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" : "text-slate-400")}
            >
              Imtihon
            </button>
          </div>

          <button 
            onClick={() => setShowGridModal(true)}
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-full text-xs font-bold text-slate-200"
            title="Savollar xaritasi"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Xarita</span>
          </button>

          <button 
            onClick={handleShuffle}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white"
            title="Savollarni aralashtirish"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 relative" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* 2. Asosiy Test Kartasi */}
      <div className="glass-card rounded-[2.5rem] flex flex-col flex-1 overflow-hidden shadow-2xl mb-4 min-h-[460px] relative border border-white/10">
        
        {/* Header */}
        <div className="p-5 md:p-6 border-b border-white/[0.07] flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">
              SAVOL {currentIndex + 1} / {quiz.questions.length}
            </span>
            <h3 className="text-sm md:text-base font-bold text-white truncate">{quiz.title}</h3>
          </div>

          <button
            onClick={toggleFlagCurrent}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 border",
              flagged[currentIndex]
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20"
                : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
            )}
          >
            <Flag className={cn("w-3.5 h-3.5", flagged[currentIndex] && "fill-current text-amber-400")} />
            <span className="hidden sm:inline">{flagged[currentIndex] ? "Belgilandi" : "Belgilash"}</span>
          </button>
        </div>
        
        {/* Savol va Variantlar */}
        <div className="flex-1 overflow-y-auto p-5 md:p-8 no-scrollbar">
          <h2 className="text-base md:text-xl font-bold mb-6 text-white leading-relaxed">
            {currentQuestion.question}
          </h2>
          
          <div className="grid grid-cols-1 gap-3">
            {currentQuestion.options.map((option, idx) => {
              const hasAnswered = answers[currentIndex] !== -1;
              const isSelected = answers[currentIndex] === idx;
              const isCorrect = currentQuestion.correctAnswer === idx;

              let cardStyle = "border-white/10 bg-white/[0.03] hover:border-blue-500/40 hover:bg-white/[0.06]";
              let letterStyle = "bg-white/5 text-slate-300 border-white/10 group-hover:border-blue-500/40 group-hover:text-blue-400";
              let textStyle = "text-slate-200 group-hover:text-white";

              if (mode === 'study') {
                if (hasAnswered) {
                  if (isCorrect) {
                    cardStyle = "border-emerald-500 bg-emerald-500/15 text-emerald-200 shadow-lg shadow-emerald-500/10";
                    letterStyle = "bg-emerald-500 text-white border-emerald-500";
                    textStyle = "text-emerald-100 font-extrabold";
                  } else if (isSelected) {
                    cardStyle = "border-red-500 bg-red-500/15 text-red-200 shadow-lg shadow-red-500/10";
                    letterStyle = "bg-red-500 text-white border-red-500";
                    textStyle = "text-red-100 font-extrabold";
                  } else {
                    cardStyle = "border-white/5 bg-white/[0.01] opacity-40";
                    letterStyle = "bg-white/5 text-slate-500 border-white/5";
                    textStyle = "text-slate-500";
                  }
                }
              } else {
                if (isSelected) {
                  cardStyle = "border-blue-500 bg-blue-500/20 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-500";
                  letterStyle = "bg-blue-600 text-white border-blue-500";
                  textStyle = "text-white font-extrabold";
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  className={cn(
                    "w-full text-left p-4 text-xs md:text-sm rounded-2xl border-2 transition-all duration-200 flex items-center justify-between group active:scale-[0.99]",
                    cardStyle
                  )}
                >
                  <div className="flex items-center gap-3">
                     <span className={cn(
                       "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-colors border shrink-0",
                       letterStyle
                     )}>
                       {String.fromCharCode(65 + idx)}
                     </span>
                     <span className={cn("font-medium leading-relaxed", textStyle)}>
                       {option}
                     </span>
                  </div>
                  
                  {mode === 'study' && hasAnswered && isCorrect && (
                     <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />
                  )}
                  {mode === 'study' && hasAnswered && isSelected && !isCorrect && (
                     <XCircle className="w-5 h-5 text-red-400 shrink-0 ml-2" />
                  )}
                  {mode === 'exam' && isSelected && (
                     <Check className="w-5 h-5 text-blue-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 md:p-5 border-t border-white/[0.07] bg-[#0c121e]/80 backdrop-blur-xl flex justify-between items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="flex items-center justify-center gap-1.5 px-4 md:px-5 py-3 border border-white/10 rounded-xl text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Oldingisi</span>
          </button>

          <span className="text-xs font-bold text-slate-400">
            {answeredCount} / {quiz.questions.length} javob berildi
          </span>
          
          {!isLastQuestion ? (
            <button
              onClick={handleNext}
              className="flex items-center justify-center gap-1.5 px-5 md:px-6 py-3 bg-white text-slate-900 rounded-xl font-black text-xs hover:bg-slate-100 transition-all uppercase tracking-wider shadow-lg shadow-white/10"
            >
              Keyingisi <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmitClick}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-black text-xs transition-all uppercase tracking-wider shadow-xl shadow-blue-500/30"
            >
              {submitting ? 'Yakunlanmoqda...' : 'Yakunlash'}
            </button>
          )}
        </div>
      </div>

      {/* Savollar Xaritasi Modali */}
      {showGridModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="glass-card rounded-[2.5rem] p-6 max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl border border-white/15 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <div>
                <h3 className="font-black text-white text-base">Savollar xaritasi</h3>
                <p className="text-xs text-slate-400">Istalgan savolga bitta bosishda sakrang</p>
              </div>
              <button 
                onClick={() => setShowGridModal(false)}
                className="p-2 rounded-full hover:bg-white/10 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 mb-4 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span> Javob berilgan ({answeredCount})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-400"></span> Belgilangan ({flaggedCount})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-white/20"></span> Qoldirilgan ({quiz.questions.length - answeredCount})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-5 sm:grid-cols-6 gap-2 p-1 no-scrollbar">
              {quiz.questions.map((_, idx) => {
                const isAns = answers[idx] !== -1;
                const isFlg = flagged[idx];
                const isCurr = currentIndex === idx;

                let bg = "bg-white/5 text-slate-400 hover:bg-white/10 border-white/10";
                if (isAns) bg = "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/30";
                if (isFlg) bg = "bg-amber-400 text-slate-950 border-amber-400 font-black";
                if (isCurr) bg += " ring-2 ring-white ring-offset-2 ring-offset-[#0b0f19]";

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowGridModal(false);
                    }}
                    className={cn(
                      "h-11 rounded-xl text-xs font-bold flex items-center justify-center border transition-all",
                      bg
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-white/10 mt-4">
              <button
                onClick={() => {
                  setShowGridModal(false);
                  handleSubmitClick();
                }}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/25"
              >
                Testni Yakunlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Yakunlash tasdig'i */}
      {showConfirmFinish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="glass-card rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl border border-white/15 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="font-black text-white text-lg mb-1">Testni yakunlaysizmi?</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Siz hali <strong className="text-amber-400 font-bold">{quiz.questions.length - answeredCount} ta</strong> savolga javob bermadingiz. Shunda ham yakunlamoqchimisiz?
            </p>
            <div className="flex gap-2.5">
              <button 
                onClick={() => setShowConfirmFinish(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300"
              >
                Davom etish
              </button>
              <button 
                onClick={() => {
                  setShowConfirmFinish(false);
                  submitQuizInternal();
                }}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-blue-500/25"
              >
                Ha, yakunlash
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
