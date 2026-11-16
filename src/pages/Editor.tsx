import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Plus, Trash2, CheckCircle2, Save, PlayCircle, Download, Clock, Copy, Sparkles, Cpu } from 'lucide-react';
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
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Umumiy');
  const [timeLimit, setTimeLimit] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sourceType, setSourceType] = useState('hemis');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadQuiz() {
      if (!quizId) return;
      try {
        const res = await fetch(`/api/quizzes/${quizId}`);
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

  const handleCorrectAnswerSelect = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    updated[qIndex].correctAnswer = optIndex;
    setQuestions(updated);
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert("Testda kamida bitta savol bo'lishi kerak.");
      return;
    }
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: "Yangi savol matni?",
        options: ["A variant", "B variant", "C variant", "D variant"],
        correctAnswer: 0
      }
    ]);
  };

  const saveToBackend = async () => {
    if (!title.trim()) {
      alert("Test nomini kiriting.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id: quizId,
        userId: user?.uid || 'anonymous',
        title,
        subject,
        sourceType,
        timeLimitMinutes: timeLimit,
        questions
      };

      const res = await fetch(`/api/quizzes/${quizId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.status === 404) {
        await fetch('/api/quizzes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      localStorage.setItem(`quiz_${quizId}`, JSON.stringify({
        id: quizId,
        userId: user?.uid,
        title,
        questions,
        timeLimitMinutes: timeLimit
      }));

      alert("O'zgarishlar muvaffaqiyatli saqlandi!");
    } catch (err: any) {
      alert("Saqlashda xatolik: " + err.message);
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

  const copyToClipboard = () => {
    let output = '';
    questions.forEach((q) => {
      output += '++++\n' + q.question + '\n';
      q.options.forEach((opt, idx) => {
        output += '====\n' + (idx === q.correctAnswer ? '#' : '') + opt + '\n';
      });
    });
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-slate-400 font-bold">Yuklanmoqda...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto w-full pt-4 pb-24 px-4">
      {/* Yuqori boshqaruv */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors bg-white/5 border border-white/10 px-4 py-2 rounded-full text-xs font-bold w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Orqaga
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all"
          >
            <Copy className="w-3.5 h-3.5" /> {copied ? "Nusxalandi!" : "HEMIS Nusxa"}
          </button>
          
          <button 
            onClick={exportAsHemis}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all"
          >
            <Download className="w-3.5 h-3.5" /> HEMIS Yuklab Olish (.txt)
          </button>

          <button 
            onClick={saveToBackend}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition-all shadow-sm"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>

          <button 
            onClick={() => {
              saveToBackend().then(() => navigate(`/quiz/${quizId}`));
            }}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all"
          >
            <PlayCircle className="w-4 h-4" /> Testni Boshlash
          </button>
        </div>
      </div>

      {/* Test Meta sozlamalari */}
      <div className="glass-card rounded-[2rem] p-6 border border-white/10 shadow-xl mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">
              Test Nomi
            </label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-base font-bold text-white outline-none focus:border-blue-500 focus:bg-white/10 transition-all"
              placeholder="Test nomi..."
            />
          </div>

          <div className="w-full md:w-52">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-400" /> Vaqt chegarasi
            </label>
            <select
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value, 10))}
              className="w-full px-4 py-3 bg-[#111827] border border-white/10 rounded-2xl text-xs font-bold text-white outline-none focus:border-blue-500"
            >
              <option value={0}>Cheklovsiz</option>
              <option value={10}>10 daqiqa</option>
              <option value={15}>15 daqiqa</option>
              <option value={20}>20 daqiqa</option>
              <option value={30}>30 daqiqa</option>
              <option value={45}>45 daqiqa</option>
              <option value={60}>60 daqiqa</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 text-xs font-semibold text-slate-400 border-t border-white/5">
          <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/25">
            <Cpu className="w-3.5 h-3.5" /> Jami: {questions.length} ta savol
          </span>
          <span>To'g'ri javobni tanlash uchun variant harfini bosing</span>
        </div>
      </div>

      {/* Savollar ro'yxati */}
      <div className="space-y-4">
        {questions.map((q, qIdx) => (
          <div key={qIdx} className="glass-card rounded-[2rem] p-5 md:p-6 border border-white/10 shadow-lg">
            <div className="flex items-start justify-between gap-3 mb-4">
              <span className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-black flex items-center justify-center shrink-0">
                {qIdx + 1}
              </span>
              <textarea 
                value={q.question}
                onChange={(e) => handleQuestionChange(qIdx, e.target.value)}
                rows={2}
                className="w-full p-3 bg-white/5 border border-white/10 rounded-2xl text-sm font-bold text-white outline-none focus:border-blue-500 transition-all resize-y"
                placeholder="Savol matni..."
              />
              <button 
                onClick={() => handleDeleteQuestion(qIdx)}
                className="text-slate-500 hover:text-red-400 p-2 rounded-xl hover:bg-red-500/10 transition-colors"
                title="Savolni o'chirish"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Variantlar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pl-11">
              {q.options.map((opt, oIdx) => {
                const isCorrect = q.correctAnswer === oIdx;
                return (
                  <div 
                    key={oIdx}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl border-2 transition-all",
                      isCorrect ? "border-emerald-500 bg-emerald-500/15" : "border-white/10 bg-white/[0.03] focus-within:border-blue-500/50"
                    )}
                  >
                    <button 
                      type="button"
                      onClick={() => handleCorrectAnswerSelect(qIdx, oIdx)}
                      className={cn(
                        "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all shrink-0",
                        isCorrect ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" : "bg-white/5 border border-white/15 text-slate-400 hover:text-white"
                      )}
                      title="To'g'ri javob"
                    >
                      {String.fromCharCode(65 + oIdx)}
                    </button>
                    <input 
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(qIdx, oIdx, e.target.value)}
                      className="w-full bg-transparent text-xs font-medium text-white outline-none"
                      placeholder={`Variant ${String.fromCharCode(65 + oIdx)}...`}
                    />
                    {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <button
          onClick={handleAddQuestion}
          className="w-full py-4 bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/20 hover:border-blue-500 text-slate-300 hover:text-white rounded-3xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 text-blue-400" /> Yangi Savol Qo'shish
        </button>
      </div>
    </div>
  );
}
