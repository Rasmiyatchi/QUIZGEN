import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Loader2, ArrowRight, ArrowLeft, CheckCircle2, XCircle, X, Shuffle, 
  Clock, Flag, LayoutGrid, Check, AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Question {
  question: string;
  options: string[];
  correctAnswer?: number;
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
  const [searchParams] = useSearchParams();
  const urlMode = searchParams.get('mode');
  const urlAttemptId = searchParams.get('attemptId');

  const navigate = useNavigate();
  const { user, authFetch } = useAuth();
  
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [flagged, setFlagged] = useState<boolean[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Rejim: study (o'rganish) vs exam (imtihon) vs retry_wrong (xatolar)
  const [mode, setMode] = useState<'study' | 'exam' | 'retry_wrong'>(
    urlMode === 'study' ? 'study' : urlMode === 'retry_wrong' ? 'retry_wrong' : 'exam'
  );

  // M5 — Server nazoratidagi faol urinish ID si
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(urlAttemptId || null);
  // O'rganish rejimida savollar bo'yicha server tekshiruv natijasi
  const [studyFeedback, setStudyFeedback] = useState<Record<number, { isCorrect: boolean; correctAnswer: number; explanation?: string }>>({});
  
  // Taymer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);

  // Modallar (TZ qoidasi 8: alert/confirm ishlatilmaydi)
  const [showGridModal, setShowGridModal] = useState(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [showConfirmShuffle, setShowConfirmShuffle] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);

  // Stale closure xatosini bartaraf qilish uchun ref'lar
  const answersRef = useRef<number[]>([]);
  answersRef.current = answers;

  const timeSpentRef = useRef<number>(0);
  timeSpentRef.current = timeSpent;

  const quizRef = useRef<QuizData | null>(null);
  quizRef.current = quiz;

  useEffect(() => {
    async function fetchQuiz() {
      if (!quizId) return;
      try {
        // 1. Agar URL da aniq attemptId berilgan bo'lsa (masalan, retry_wrong yoki qayta tiklash)
        if (urlAttemptId) {
          const aRes = await authFetch(`/api/attempts/${urlAttemptId}`);
          if (aRes.ok) {
            const aData = await aRes.json();
            if (aData.attempt) {
              setCurrentAttemptId(aData.attempt.id);
              if (aData.attempt.mode) setMode(aData.attempt.mode);
              if (aData.attempt.time_spent_seconds) setTimeSpent(aData.attempt.time_spent_seconds);
              
              if (aData.quiz) {
                setQuiz(aData.quiz);
                const qCount = aData.quiz.questions.length;
                const loadedAnswers = aData.attempt.answers_given || new Array(qCount).fill(-1);
                setAnswers(loadedAnswers);
                setFlagged(new Array(qCount).fill(false));

                if (aData.attempt.deadline_at) {
                  const msLeft = new Date(aData.attempt.deadline_at).getTime() - Date.now();
                  if (msLeft > 0) setTimeLeft(Math.floor(msLeft / 1000));
                }
                setLoading(false);
                return;
              }
            }
          }
        }

        // 2. Serverda faol urinish bormi? (Resume oqimi — Section 8.5)
        if (user) {
          try {
            const activeRes = await authFetch(`/api/attempts/active/${quizId}`);
            if (activeRes.ok) {
              const activeData = await activeRes.json();
              if (activeData.hasActive && activeData.attempt) {
                setCurrentAttemptId(activeData.attempt.id);
                if (activeData.attempt.mode) setMode(activeData.attempt.mode);
                if (activeData.attempt.time_spent_seconds) setTimeSpent(activeData.attempt.time_spent_seconds);

                if (activeData.questions) {
                  const resumedQuiz: QuizData = {
                    title: activeData.attempt.quiz_title || 'Test',
                    questions: activeData.questions
                  };
                  setQuiz(resumedQuiz);
                  setAnswers(activeData.attempt.answers_given || new Array(activeData.questions.length).fill(-1));
                  setFlagged(new Array(activeData.questions.length).fill(false));

                  if (activeData.attempt.deadline_at) {
                    const msLeft = new Date(activeData.attempt.deadline_at).getTime() - Date.now();
                    if (msLeft > 0) setTimeLeft(Math.floor(msLeft / 1000));
                  }
                  setLoading(false);
                  return;
                }
              }
            }
          } catch (e) {
            console.warn("Active attempt check fallback:", e);
          }
        }

        // 3. Yangi server urinishi yaratish (Section 8.5: serverda savollar aralashmasi va deadline belgilanadi)
        const initialMode = urlMode === 'study' ? 'study' : urlMode === 'retry_wrong' ? 'retry_wrong' : 'exam';
        try {
          const createRes = await authFetch('/api/attempts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quizId, mode: initialMode })
          });
          if (createRes.ok) {
            const createData = await createRes.json();
            if (createData.attempt && createData.questions) {
              setCurrentAttemptId(createData.attempt.id);
              setMode(createData.attempt.mode || initialMode);
              const newQuiz: QuizData = {
                title: createData.attempt.quiz_title || 'Test',
                time_limit_minutes: createData.attempt.time_limit_minutes,
                questions: createData.questions
              };
              setQuiz(newQuiz);
              setAnswers(new Array(createData.questions.length).fill(-1));
              setFlagged(new Array(createData.questions.length).fill(false));

              if (createData.attempt.deadline_at) {
                const msLeft = new Date(createData.attempt.deadline_at).getTime() - Date.now();
                if (msLeft > 0) setTimeLeft(Math.floor(msLeft / 1000));
              } else if (createData.attempt.time_limit_minutes > 0) {
                setTimeLeft(createData.attempt.time_limit_minutes * 60);
              }
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn("Server attempt creation fallback to legacy getQuiz:", e);
        }

        // 4. Standart / fallback yuklash
        const queryParam = initialMode === 'study' ? '?mode=study' : '';
        const res = await fetch(`/api/quizzes/${quizId}${queryParam}`);
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
  }, [quizId, mode]);

  // Taymer hisobi — stale closure xatosi bartaraf etilgan
  useEffect(() => {
    if (loading || !quiz) return;
    const interval = setInterval(() => {
      setTimeSpent(prev => prev + 1);
      setTimeLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(interval);
          setShowTimeUpModal(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [loading, quiz]);

  const handleSelectOption = async (optionIndex: number) => {
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

    // O'rganish rejimida serverdan darhol javob va tushuntirish tekshiruvi (Section 8.5)
    if (mode === 'study' && currentAttemptId) {
      try {
        const res = await authFetch(`/api/attempts/${currentAttemptId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionIndex: currentIndex, chosenOption: optionIndex })
        });
        if (res.ok) {
          const data = await res.json();
          setStudyFeedback(prev => ({
            ...prev,
            [currentIndex]: {
              isCorrect: data.isCorrect,
              correctAnswer: data.correctAnswer,
              explanation: data.explanation
            }
          }));
        }
      } catch (e) {
        console.warn("Study mode answer check fallback:", e);
      }
    }

    // Serverga oraliq saqlash (batch/progress saqlash — Section 8.5)
    if (currentAttemptId) {
      authFetch(`/api/attempts/${currentAttemptId}/answers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answersGiven: newAnswers,
          timeSpentSeconds: timeSpentRef.current
        })
      }).catch(() => {});
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

  const executeShuffle = () => {
    if (!quiz) return;
    const shuffledQuestions = [...quiz.questions];
    for (let i = shuffledQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
    }
    
    shuffledQuestions.forEach(q => {
      const optionsWithRef = q.options.map((opt, index) => ({ 
        text: opt, 
        isCorrect: q.correctAnswer !== undefined ? index === q.correctAnswer : false 
      }));
      for (let i = optionsWithRef.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [optionsWithRef[i], optionsWithRef[j]] = [optionsWithRef[j], optionsWithRef[i]];
      }
      q.options = optionsWithRef.map(o => o.text);
      if (q.correctAnswer !== undefined) {
        q.correctAnswer = optionsWithRef.findIndex(o => o.isCorrect);
      }
    });

    const newData = { ...quiz, questions: shuffledQuestions };
    setQuiz(newData);
    setAnswers(new Array(shuffledQuestions.length).fill(-1));
    setFlagged(new Array(shuffledQuestions.length).fill(false));
    setCurrentIndex(0);
    setShowConfirmShuffle(false);
  };

  // Testni serverga yuborish (S10: ball serverda hisoblanadi, Section 8.5: finishAttempt)
  const submitQuizInternal = async () => {
    const currentQuiz = quizRef.current;
    if (!currentQuiz || !quizId) return;
    setSubmitting(true);

    try {
      const currentAnswers = answersRef.current;
      const currentTimeSpent = timeSpentRef.current;

      let resultId = currentAttemptId || '';

      // Agar server urinishi mavjud bo'lsa, finish endpointini chaqiramiz
      if (currentAttemptId) {
        try {
          const res = await authFetch(`/api/attempts/${currentAttemptId}/finish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              answersGiven: currentAnswers,
              timeSpentSeconds: currentTimeSpent
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.attempt?.id) {
              resultId = data.attempt.id;
            }
          }
        } catch (beErr) {
          console.warn("Backend finish attempt error:", beErr);
        }
      }

      // Agar urinish hali yaratilmagan bo'lsa (masalan offline fallback), eski POST /api/attempts orqali yuboramiz
      if (!resultId) {
        try {
          const res = await authFetch('/api/attempts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              quizId,
              timeSpentSeconds: currentTimeSpent,
              answersGiven: currentAnswers
            })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.attempt?.id) {
              resultId = data.attempt.id;
            }
          }
        } catch (beErr) {
          console.warn("Legacy save attempt fallback:", beErr);
        }
      }

      // Offline / LocalStorage fallback
      if (!resultId) {
        resultId = 'local_' + Math.random().toString(36).substring(7);
      }

      localStorage.setItem(`result_${resultId}`, JSON.stringify({
        id: resultId,
        quizId: quizId,
        userId: user?.uid || 'anonymous',
        answersGiven: currentAnswers,
        timeSpentSeconds: currentTimeSpent,
        createdAt: new Date().toISOString()
      }));

      if (!localStorage.getItem(`quiz_${quizId}`)) {
        localStorage.setItem(`quiz_${quizId}`, JSON.stringify(currentQuiz));
      }

      navigate(`/result/${resultId}`);
    } catch (err: any) {
      console.error(err);
      setError("Test natijasini saqlashda xatolik yuz berdi");
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
        <h2 className="text-xl font-bold text-red-400 mb-2">{error || "Test topilmadi"}</h2>
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
            onClick={() => setShowConfirmShuffle(true)}
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
              const feedback = studyFeedback[currentIndex];
              const effectiveCorrect = feedback ? feedback.correctAnswer : currentQuestion.correctAnswer;
              const isCorrect = effectiveCorrect !== undefined && effectiveCorrect === idx;

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

          {/* O'rganish rejimida tushuntirish va izoh (Section 8.5) */}
          {mode === 'study' && answers[currentIndex] !== -1 && studyFeedback[currentIndex]?.explanation && (
            <div className="mt-5 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-200 leading-relaxed animate-in fade-in duration-200">
              <strong className="text-blue-300 font-bold block mb-1">💡 Tushuntirish:</strong>
              {studyFeedback[currentIndex].explanation}
            </div>
          )}
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

      {/* Savollarni Aralashtirish Tasdig'i (Rule 8: No window.confirm) */}
      {showConfirmShuffle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="glass-card rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl border border-white/15 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-3xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto mb-4">
              <Shuffle className="w-7 h-7" />
            </div>
            <h3 className="font-black text-white text-lg mb-1">Savollarni aralashtirish</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Aralashtirish natijasida hozirgi belgilangan javoblar tozalanadi. Davom etasizmi?
            </p>
            <div className="flex gap-2.5">
              <button 
                onClick={() => setShowConfirmShuffle(false)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300"
              >
                Bekor qilish
              </button>
              <button 
                onClick={executeShuffle}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-blue-500/25"
              >
                Ha, aralashtir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vaqt Tugadi Modali (Rule 8: No alert) */}
      {showTimeUpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-card rounded-[2.5rem] p-7 max-w-sm w-full shadow-2xl border border-red-500/40 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-red-500/20 border-2 border-red-500/50 text-red-400 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="font-black text-white text-xl mb-2">Vaqt tugadi!</h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Imtihon vaqti yakunlandi. Javoblaringiz hisoblanmoqda va test avtomatik ravishda yakunlanadi.
            </p>
            <button 
              onClick={() => {
                setShowTimeUpModal(false);
                submitQuizInternal();
              }}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/30"
            >
              Natijani ko'rish
            </button>
          </div>
        </div>
      )}

      {/* Yakunlash tasdig'i */}
      {showConfirmFinish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
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
