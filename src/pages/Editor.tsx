import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  ArrowLeft, Plus, Trash2, CheckCircle2, Save, PlayCircle, 
  Download, Clock, Copy, Sparkles, Lock, Crown, ArrowRight, Check
} from 'lucide-react';
import { cn } from '../lib/utils';

interface Question {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

export default function Editor() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { user, subscription, authFetch } = useAuth();

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Umumiy');
  const [timeLimit, setTimeLimit] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sourceType, setSourceType] = useState('hemis');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [copied, setCopied] = useState(false);

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
            setTitle(data.quiz.title);
            setSubject(data.quiz.subject || 'Umumiy');
            setTimeLimit(data.quiz.time_limit_minutes || 0);
            setSourceType(data.quiz.source_type || 'hemis');
            setQuestions(data.quiz.questions || []);
            setLoading(false);
            return;
          }
        }

        const local = localStorage.getItem(`quiz_${quizId}`);
        if (local) {
          const data = JSON.parse(local);
          setTitle(data.title || 'Nomsiz test');
          setQuestions(data.questions || []);
          setSourceType(data.source || 'hemis');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadQuiz();
  }, [quizId]);

  const handleQuestionChange = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].question = text;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = text;
    setQuestions(updated);
  };

  const handleCorrectAnswerChange = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    updated[qIndex].correctAnswer = optIndex;
    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: 'Yangi savol matni',
        options: ['Variant A', 'Variant B', 'Variant C', 'Variant D'],
        correctAnswer: 0
      }
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const saveQuiz = async () => {
    if (!quizId) return;
    setSaving(true);
    setSaveError('');
    setSavedSuccess(false);

    try {
      const payload = {
        title,
        subject,
        timeLimitMinutes: timeLimit,
        isPublic: 1,
        questions
      };

      const res = await authFetch(`/api/quizzes/${quizId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (res.status === 402) {
        throw new Error("Test muharriri (Editor) dan foydalanish uchun Sessiya Pro tarifi talab etiladi.");
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "O'zgarishlarni saqlashda xatolik");
      }

      localStorage.setItem(`quiz_${quizId}`, JSON.stringify({
        id: quizId,
        userId: user?.uid,
        title,
        questions,
        timeLimitMinutes: timeLimit
      }));

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || "Saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  const exportAsHemis = () => {
    let output = '';
    questions.forEach((q) => {
      output += '++++\n';
      output += q.question + '\n';
      q.options.forEach((opt, idx) => {
        output += '====\n';
        if (idx === q.correctAnswer) {
          output += '#' + opt + '\n';
        } else {
          output += opt + '\n';
        }
      });
    });

    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '_')}_HEMIS.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Paywall ko'rsatish
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
            Test Muharriri (Editor)
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed mb-8 max-w-md mx-auto font-medium">
            Test savollarini tahrirlash, yangi savol qo'shish va qayta HEMIS shablonida yuklab olish imkoniyati <strong>Sessiya Pro</strong> va <strong>Grand Master</strong> tariflarida to'liq ochiq.
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

  return (
    <div className="max-w-4xl mx-auto w-full pt-4 pb-24 px-4">
      
      {/* Yuqori panel */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white font-bold text-xs bg-white/5 border border-white/10 px-4 py-2 rounded-full transition-all"
        >
          <ArrowLeft className="w-4 h-4" /> Orqaga
        </button>

        <div className="flex items-center gap-2">
          <button 
            onClick={exportAsHemis}
            className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs font-bold text-slate-200 transition-all"
            title="HEMIS .txt formatida yuklab olish"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">HEMIS .txt Eksport</span>
          </button>

          <button 
            onClick={saveQuiz}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="mb-4 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" /> O'zgarishlar muvaffaqiyatli saqlandi!
        </div>
      )}

      {saveError && (
        <div className="mb-4 p-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <span>{saveError}</span>
        </div>
      )}

      {/* Test sarlavhasi kartasi */}
      <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 mb-6 border border-white/10">
        <label className="text-[10px] font-black uppercase text-blue-400 tracking-widest block mb-2">
          Test Nomi
        </label>
        <input 
          type="text" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Test nomini kiriting..."
          className="w-full text-xl sm:text-2xl font-black bg-transparent border-b border-white/10 focus:border-blue-500 focus:outline-none pb-2 text-white placeholder-slate-500 mb-6"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5">Fan / Kategoriya</label>
            <input 
              type="text" 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1.5">Vaqt chegarasi (daqiqa, 0 = cheksiz)</label>
            <input 
              type="number" 
              min={0}
              value={timeLimit} 
              onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Savollar ro'yxati */}
      <div className="space-y-4 mb-8">
        {questions.map((q, qIdx) => (
          <div key={qIdx} className="glass-card rounded-[2rem] p-6 border border-white/10 hover:border-white/20 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">
                Savol {qIdx + 1} / {questions.length}
              </span>
              {questions.length > 1 && (
                <button 
                  onClick={() => removeQuestion(qIdx)}
                  className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  title="Savolni o'chirish"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <textarea 
              value={q.question}
              onChange={(e) => handleQuestionChange(qIdx, e.target.value)}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 mb-4 resize-none leading-relaxed"
              placeholder="Savol matnini kiriting..."
            />

            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Variantlar (to'g'ri javobni tanlang):</span>
              {q.options.map((opt, oIdx) => {
                const isCorrect = q.correctAnswer === oIdx;
                return (
                  <div 
                    key={oIdx} 
                    className={cn(
                      "flex items-center gap-2.5 p-2 rounded-xl border transition-all",
                      isCorrect ? "bg-emerald-500/10 border-emerald-500/40" : "bg-white/[0.02] border-white/10"
                    )}
                  >
                    <button 
                      onClick={() => handleCorrectAnswerChange(qIdx, oIdx)}
                      className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 transition-all",
                        isCorrect ? "bg-emerald-500 text-white" : "bg-white/10 text-slate-400 hover:bg-white/20"
                      )}
                      title="To'g'ri javob sifatida belgilash"
                    >
                      {String.fromCharCode(65 + oIdx)}
                    </button>
                    <input 
                      type="text" 
                      value={opt}
                      onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                      className="flex-1 bg-transparent border-none text-xs text-slate-200 focus:outline-none"
                    />
                    {isCorrect && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mr-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Savol qo'shish tugmasi */}
      <button 
        onClick={addQuestion}
        className="w-full py-4 border-2 border-dashed border-white/20 hover:border-blue-500/50 rounded-2xl text-xs font-black text-slate-300 hover:text-white hover:bg-white/5 flex items-center justify-center gap-2 transition-all uppercase tracking-wider mb-8"
      >
        <Plus className="w-4 h-4" /> Yangi Savol Qo'shish
      </button>

    </div>
  );
}
