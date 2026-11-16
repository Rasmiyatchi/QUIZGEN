import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Loader2, ArrowLeft, CheckCircle2, XCircle, RotateCcw, Share2, 
  Printer, Layers, Clock, Award, HelpCircle, Check, Copy, Sparkles, Flame 
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ResultData {
  id?: string;
  userId: string;
  quizId: string;
  score: number;
  total?: number;
  percentage?: number;
  timeSpentSeconds?: number;
  time_spent_seconds?: number;
  answersGiven?: number[];
  answers?: number[];
  createdAt?: any;
}

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

export default function Result() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [result, setResult] = useState<ResultData | null>(null);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function fetchData() {
      if (!resultId) return;
      try {
        const res = await fetch(`/api/attempts/${resultId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.attempt) {
            setResult(data.attempt);
            if (data.quiz) {
              setQuiz(data.quiz);
              setLoading(false);
              return;
            }
          }
        }

        const resultStored = localStorage.getItem(`result_${resultId}`);
        if (!resultStored) throw new Error("Natija topilmadi");
        
        const rData = JSON.parse(resultStored) as ResultData;
        setResult(rData);

        const quizStored = localStorage.getItem(`quiz_${rData.quizId}`);
        if (quizStored) {
          setQuiz(JSON.parse(quizStored) as QuizData);
        } else {
          const qRes = await fetch(`/api/quizzes/${rData.quizId}`);
          if (qRes.ok) {
            const qData = await qRes.json();
            setQuiz(qData.quiz);
          }
        }
      } catch (err: any) {
        setError(err.message || "Natijani yuklashda xatolik yuz berdi");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [resultId]);

  // Bayram konfettisi (Pure Canvas Confetti - 0 dependency!)
  useEffect(() => {
    if (!result || loading) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      vRot: number;
    }> = [];

    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];

    for (let i = 0; i < 75; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.35,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 12 - 4,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 10
      });
    }

    let animId: number;
    let frames = 0;

    function render() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frames++;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25; // gravity
        p.vx *= 0.99; // drag
        p.rotation += p.vRot;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      if (frames < 140) {
        animId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    render();

    return () => cancelAnimationFrame(animId);
  }, [result, loading]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !result || !quiz) {
    return (
      <div className="text-center mt-12 glass-card p-8 rounded-3xl max-w-md mx-auto border border-white/10">
        <h2 className="text-xl font-bold text-red-400 mb-2">{error || "Natija topilmadi"}</h2>
        <button onClick={() => navigate('/')} className="text-blue-400 font-bold hover:underline">Bosh sahifaga qaytish</button>
      </div>
    );
  }

  const rawAnswers = result.answersGiven || result.answers || [];
  const scorePercent = result.percentage !== undefined ? result.percentage : Math.round((result.score / quiz.questions.length) * 100);
  const isPassing = scorePercent >= 60;
  
  const correctCount = result.score;
  const totalCount = quiz.questions.length;
  const incorrectCount = rawAnswers.filter((a, idx) => a !== -1 && a !== quiz.questions[idx]?.correctAnswer).length;
  const skippedCount = totalCount - (correctCount + incorrectCount);

  const timeSeconds = result.timeSpentSeconds || result.time_spent_seconds || 0;
  const timeStr = `${Math.floor(timeSeconds / 60)} daq ${timeSeconds % 60} son`;

  // Daraja medali
  const getRankBadge = () => {
    if (scorePercent >= 90) return { title: "OLTIN DARAJA 🏆", color: "from-amber-400 to-yellow-500", text: "Mukammal natija!" };
    if (scorePercent >= 75) return { title: "KUMUSH DARAJA 🥈", color: "from-slate-200 to-slate-400", text: "A'lo darajada!" };
    if (scorePercent >= 60) return { title: "BRONZA DARAJA 🥉", color: "from-amber-600 to-amber-700", text: "Muvaffaqiyatli o'tdingiz!" };
    return { title: "MASHQ DAVOM ETADI 🎯", color: "from-blue-500 to-indigo-600", text: "Xatolar ustida ishlang!" };
  };

  const rank = getRankBadge();

  // Faqat xatolarni qayta ishlash
  const retakeWrongQuestions = () => {
    const wrongQuestions = quiz.questions.filter((q, idx) => rawAnswers[idx] !== q.correctAnswer);
    if (wrongQuestions.length === 0) {
      alert("Siz barcha savollarga to'g'ri javob bergansiz!");
      return;
    }

    const retryQuizId = 'retry_' + Math.random().toString(36).substring(7);
    const retryQuiz = {
      id: retryQuizId,
      userId: user?.uid,
      title: `${quiz.title} (Xatolar ustida ishlash)`,
      questions: wrongQuestions,
      createdAt: new Date().toISOString()
    };

    localStorage.setItem(`quiz_${retryQuizId}`, JSON.stringify(retryQuiz));
    navigate(`/quiz/${retryQuizId}`);
  };

  const handleShare = () => {
    const shareText = `Men "${quiz.title}" testidan ${scorePercent}% (${correctCount}/${totalCount}) natija to'pladim!`;
    const shareUrl = window.location.origin;

    if (navigator.share) {
      navigator.share({
        title: quiz.title,
        text: shareText,
        url: shareUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full pb-24 px-4 pt-4 relative">
      {/* Confetti Canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50"></canvas>

      {/* Yuqori boshqaruv */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-bold text-xs bg-white/5 border border-white/10 px-4 py-2 rounded-full">
          <ArrowLeft className="w-3.5 h-3.5" /> Bosh sahifaga qaytish
        </Link>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-blue-600/15 border border-blue-500/30 text-blue-400 text-xs font-bold hover:bg-blue-600/25"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copied ? "Nusxalandi!" : "Ulashish"}</span>
          </button>

          <button 
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-bold hover:bg-white/10"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chop etish</span>
          </button>
        </div>
      </div>

      {/* Asosiy Natija Kartasi (Hero) */}
      <div className="glass-card rounded-[2.5rem] p-6 sm:p-10 shadow-2xl border border-white/10 mb-8 relative overflow-hidden text-center animated-gradient-border">
        
        {/* Daraja Medali */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/15 text-xs font-black uppercase tracking-widest mb-3">
          <span className="text-amber-400">{rank.title}</span>
        </div>

        <h1 className="text-xl md:text-3xl font-black text-white mb-6">{quiz.title}</h1>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 md:gap-12 mb-8">
           {/* Foiz doirasi (Neon Gauge) */}
           <div className="relative w-40 h-40 md:w-48 md:h-48 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/10"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={isPassing ? "text-emerald-400" : "text-red-400"}
                  strokeWidth="3"
                  strokeDasharray={`${scorePercent}, 100`}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl md:text-5xl font-black text-white tracking-tighter">{scorePercent}%</span>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {correctCount} / {totalCount} To'g'ri
                </span>
              </div>
           </div>

           {/* Statistika Kartachalari */}
           <div className="text-center sm:text-left space-y-4">
             <div>
               <p className="text-xl md:text-2xl font-black tracking-tight text-white">
                 {rank.text}
               </p>
               <p className="text-xs text-slate-400 font-medium mt-1">
                 {isPassing ? "Siz ushbu mavzuni puxta egallagansiz." : "Xatolar ustida ishlab, darajangizni oshiring."}
               </p>
             </div>

             <div className="grid grid-cols-3 gap-2.5 pt-2">
               <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-3 text-center">
                 <span className="text-xl font-black text-emerald-400 block leading-tight">{correctCount}</span>
                 <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider">To'g'ri</span>
               </div>
               <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-3 text-center">
                 <span className="text-xl font-black text-red-400 block leading-tight">{incorrectCount}</span>
                 <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-wider">Xato</span>
               </div>
               <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-center">
                 <span className="text-xl font-black text-slate-200 block leading-tight">{timeStr.split(' ')[0]}</span>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vaqt</span>
               </div>
             </div>
           </div>
        </div>

        {/* Tugmalar */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-5 border-t border-white/10">
          <button 
            onClick={() => navigate(`/quiz/${result.quizId}`)}
            className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Qaytadan Topshirish
          </button>

          {incorrectCount > 0 && (
            <button 
              onClick={retakeWrongQuestions}
              className="w-full sm:w-auto px-6 py-3.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" /> Faqat Xatolarni Qaytarish ({incorrectCount})
            </button>
          )}

          <Link 
            to={`/flashcards/${result.quizId}`}
            className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
          >
            <Layers className="w-4 h-4 text-emerald-400" /> Yodlash Kartochkalari
          </Link>
        </div>
      </div>

      {/* Savollar Tahlili */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-6">
          <h3 className="text-base font-black text-white uppercase tracking-tight">
             Savollar Tahlili ({quiz.questions.length} ta)
          </h3>
          <span className="text-xs text-slate-400 font-bold">Barcha javoblar</span>
        </div>

        {quiz.questions.map((q, idx) => {
          const userAnswer = rawAnswers[idx];
          const isCorrect = userAnswer === q.correctAnswer;
          const isSkipped = userAnswer === -1 || userAnswer === undefined;

          return (
            <div key={idx} className="glass-card p-5 md:p-6 rounded-3xl border border-white/10">
              <div className="flex items-start gap-3.5 mb-4">
                <div className="pt-0.5 shrink-0">
                  {isCorrect ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  ) : isSkipped ? (
                    <HelpCircle className="w-6 h-6 text-slate-500" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-400" />
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                    SAVOL {idx + 1}
                  </span>
                  <h4 className="text-sm md:text-base font-bold text-white leading-relaxed">{q.question}</h4>
                </div>
              </div>

              {/* Variantlar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-9">
                {q.options.map((opt, oIdx) => {
                  const isThisCorrect = oIdx === q.correctAnswer;
                  const isUserChoice = oIdx === userAnswer;

                  let style = "border-white/5 bg-white/[0.02] text-slate-400";
                  if (isThisCorrect) {
                    style = "border-emerald-500 bg-emerald-500/15 text-emerald-100 font-black ring-1 ring-emerald-500/50";
                  } else if (isUserChoice && !isCorrect) {
                    style = "border-red-500 bg-red-500/15 text-red-100 font-black ring-1 ring-red-500/50";
                  }

                  return (
                    <div key={oIdx} className={cn("px-4 py-3 border-2 rounded-2xl text-xs flex items-center justify-between gap-3 transition-colors", style)}>
                      <span className="leading-relaxed">{String.fromCharCode(65 + oIdx)}. {opt}</span>
                      {isThisCorrect && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      {isUserChoice && !isCorrect && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>

              {q.explanation && (
                <div className="mt-4 ml-9 p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs text-blue-300">
                  <strong>Izoh:</strong> {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
