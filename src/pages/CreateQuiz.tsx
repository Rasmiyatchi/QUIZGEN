import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  UploadCloud, FileText, Bot, PlusCircle, Sparkles, CheckCircle2, 
  AlertTriangle, PlayCircle, Layers, Edit3, ArrowRight, X, Trash2, 
  HelpCircle, ChevronRight, Loader2, ArrowLeft 
} from 'lucide-react';
import { cn } from '../lib/utils';

type CreationMode = 'file' | 'text' | 'ai' | 'manual';

export default function CreateQuiz() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<CreationMode>('file');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Result state
  const [createdQuiz, setCreatedQuiz] = useState<any>(null);
  const [parseReport, setParseReport] = useState<any>(null);

  // 1. File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 2. Text Paste State
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');

  // 3. AI Generator State
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(10);
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [aiContext, setAiContext] = useState('');

  // 4. Manual Builder State
  const [manualTitle, setManualTitle] = useState('');
  const [manualCategory, setManualCategory] = useState('Umumiy');
  const [manualQuestions, setManualQuestions] = useState<Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation?: string;
  }>>([
    { question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }
  ]);

  function showToast(text: string, type: 'success' | 'error' | 'info' = 'success') {
    setToast({ text, type });
    setTimeout(() => setToast(prev => prev?.text === text ? null : prev), 3500);
  }

  // 1. Fayl yuklash
  async function handleFileUpload() {
    if (!selectedFile) {
      showToast("Iltimos, faylni tanlang", 'error');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await authFetch('/api/quizzes/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok && data.quiz) {
        setCreatedQuiz(data.quiz);
        setParseReport(data.report || null);
        showToast("Test muvaffaqiyatli yaratildi! 🎉", 'success');
      } else {
        showToast(data.message || "Faylni tahlil qilishda xatolik", 'error');
      }
    } catch (err: any) {
      showToast("Server bilan aloqa uzildi", 'error');
    } finally {
      setLoading(false);
    }
  }

  // 2. Matndan yaratish
  async function handleTextSubmit() {
    if (!textContent.trim()) {
      showToast("Iltimos, test matnini kiriting", 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch('/api/quizzes/from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: textTitle.trim() || 'Matndan yaratilgan test',
          text: textContent.trim()
        })
      });
      const data = await res.json();

      if (res.ok && data.quiz) {
        setCreatedQuiz(data.quiz);
        setParseReport(data.report || null);
        showToast("Test muvaffaqiyatli yaratildi! 🎉", 'success');
      } else {
        showToast(data.message || "Matndan test yaratib bo'lmadi", 'error');
      }
    } catch (err: any) {
      showToast("Server xatosi", 'error');
    } finally {
      setLoading(false);
    }
  }

  // 3. AI Generatsiya
  async function handleAiSubmit() {
    if (!aiTopic.trim()) {
      showToast("Iltimos, test mavzusini kiriting", 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch('/api/quizzes/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          count: aiCount,
          difficulty: aiDifficulty,
          context: aiContext.trim()
        })
      });
      const data = await res.json();

      if (res.ok && data.quiz) {
        setCreatedQuiz(data.quiz);
        showToast("AI testni muvaffaqiyatli tuzdi! ✨", 'success');
      } else {
        showToast(data.message || "AI generatsiyasida xatolik yuz berdi", 'error');
      }
    } catch (err: any) {
      showToast("Server xatosi", 'error');
    } finally {
      setLoading(false);
    }
  }

  // 4. Qo'lda yaratish
  function addManualQuestion() {
    setManualQuestions(prev => [
      ...prev,
      { question: '', options: ['', '', '', ''], correctAnswer: 0, explanation: '' }
    ]);
  }

  function removeManualQuestion(index: number) {
    if (manualQuestions.length <= 1) return;
    setManualQuestions(prev => prev.filter((_, i) => i !== index));
  }

  function updateManualQuestion(qIndex: number, field: string, val: any) {
    setManualQuestions(prev => {
      const next = [...prev];
      next[qIndex] = { ...next[qIndex], [field]: val };
      return next;
    });
  }

  function updateManualOption(qIndex: number, optIndex: number, val: string) {
    setManualQuestions(prev => {
      const next = [...prev];
      const newOpts = [...next[qIndex].options];
      newOpts[optIndex] = val;
      next[qIndex] = { ...next[qIndex], options: newOpts };
      return next;
    });
  }

  async function handleManualSubmit() {
    if (!manualTitle.trim()) {
      showToast("Test nomini kiriting", 'error');
      return;
    }
    // Tekshiruv
    for (let i = 0; i < manualQuestions.length; i++) {
      const q = manualQuestions[i];
      if (!q.question.trim()) {
        showToast(`${i + 1}-savol matni bo'sh bo'lishi mumkin emas`, 'error');
        return;
      }
      if (q.options.some(opt => !opt.trim())) {
        showToast(`${i + 1}-savolning barcha javob variantlarini to'ldiring`, 'error');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await authFetch('/api/quizzes/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: manualTitle.trim(),
          category: manualCategory,
          questions: manualQuestions
        })
      });
      const data = await res.json();

      if (res.ok && data.quiz) {
        setCreatedQuiz(data.quiz);
        showToast("Test saqlandi! 🎉", 'success');
      } else {
        showToast(data.message || "Testni saqlab bo'lmadi", 'error');
      }
    } catch (err: any) {
      showToast("Server xatosi", 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border text-sm font-bold transition-all animate-in slide-in-from-top-4",
          toast.type === 'success' && "bg-emerald-950/85 border-emerald-500/40 text-emerald-200",
          toast.type === 'error' && "bg-red-950/85 border-red-500/40 text-red-200",
          toast.type === 'info' && "bg-blue-950/85 border-blue-500/40 text-blue-200"
        )}>
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400" />}
          {toast.type === 'info' && <Sparkles className="w-4 h-4 text-blue-400" />}
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sarlavha */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            ➕ Test Yaratish Ustasi
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Fayl, matn, Gemini AI yoki savolma-savol qo'lda test tuzing
          </p>
        </div>

        <Link
          to="/library"
          className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kutubxona</span>
        </Link>
      </div>

      {/* Agar test yaratilgan bo'lsa muvaffaqiyat ekrani */}
      {createdQuiz ? (
        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/80 border border-emerald-500/30 backdrop-blur-2xl text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white">{createdQuiz.title}</h2>
            <p className="text-xs text-slate-400">
              Jami savollar: <b className="text-emerald-400">{createdQuiz.total_questions || createdQuiz.questions?.length || 0} ta</b> • Kategoriya: <b>{createdQuiz.category || 'Umumiy'}</b>
            </p>
          </div>

          {/* Parse Hisoboti */}
          {parseReport && (
            <div className="max-w-md mx-auto p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-left text-xs space-y-2">
              <span className="font-extrabold text-slate-300 block">Tahlil hisoboti:</span>
              <div className="flex items-center justify-between text-slate-400">
                <span>Format:</span>
                <span className="font-bold text-blue-400">{parseReport.format || 'HEMIS Word'}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Aniqlangan savollar:</span>
                <span className="font-bold text-emerald-400">{parseReport.questionsCount} ta</span>
              </div>
              {parseReport.needsReviewCount > 0 && (
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-bold">
                  ⚠️ {parseReport.needsReviewCount} ta savolda to'g'ri kalit noaniq bo'lishi mumkin. Muharrirda tekshirib oling.
                </div>
              )}
            </div>
          )}

          {/* Tugmalar */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => navigate(`/quiz/${createdQuiz.id}`)}
              className="py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm flex items-center gap-2 shadow-xl shadow-blue-600/30 transition-all hover:scale-105"
            >
              <PlayCircle className="w-5 h-5" />
              <span>Testni boshlash</span>
            </button>

            <button
              onClick={() => navigate(`/flashcards/${createdQuiz.id}`)}
              className="py-3 px-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all"
            >
              <Layers className="w-4 h-4" />
              <span>3D Flashcards</span>
            </button>

            <button
              onClick={() => navigate(`/editor/${createdQuiz.id}`)}
              className="py-3 px-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all"
            >
              <Edit3 className="w-4 h-4" />
              <span>Tahrirlash (Editor)</span>
            </button>

            <button
              onClick={() => {
                setCreatedQuiz(null);
                setParseReport(null);
                setSelectedFile(null);
              }}
              className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold text-xs transition-all"
            >
              Yana yaratish
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Uslub Tanlash Tablari */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => setMode('file')}
              className={cn(
                "p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5",
                mode === 'file'
                  ? "bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-white"
              )}
            >
              <UploadCloud className="w-5 h-5 text-blue-400" />
              <span className="font-extrabold text-xs">📁 Fayl yuklash</span>
              <span className="text-[10px] text-slate-500">HEMIS Word, TXT</span>
            </button>

            <button
              onClick={() => setMode('text')}
              className={cn(
                "p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5",
                mode === 'text'
                  ? "bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-white"
              )}
            >
              <FileText className="w-5 h-5 text-purple-400" />
              <span className="font-extrabold text-xs">📝 Matndan</span>
              <span className="text-[10px] text-slate-500">Matnni joylash</span>
            </button>

            <button
              onClick={() => setMode('ai')}
              className={cn(
                "p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5",
                mode === 'ai'
                  ? "bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-white"
              )}
            >
              <Bot className="w-5 h-5 text-amber-400" />
              <span className="font-extrabold text-xs">✨ Gemini AI</span>
              <span className="text-[10px] text-slate-500">Mavzudan generatsiya</span>
            </button>

            <button
              onClick={() => setMode('manual')}
              className={cn(
                "p-3.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5",
                mode === 'manual'
                  ? "bg-blue-600/20 border-blue-500 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-900/60 border-white/10 text-slate-400 hover:text-white"
              )}
            >
              <PlusCircle className="w-5 h-5 text-emerald-400" />
              <span className="font-extrabold text-xs">✍️ Qo'lda</span>
              <span className="text-[10px] text-slate-500">Savolma-savol tuzish</span>
            </button>
          </div>

          {/* Tab 1: Fayl yuklash */}
          {mode === 'file' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl space-y-6">
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.txt,.pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
              />

              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setSelectedFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "p-8 sm:p-12 rounded-3xl border-2 border-dashed text-center cursor-pointer transition-all",
                  dragActive 
                    ? "border-blue-500 bg-blue-500/10" 
                    : "border-white/15 hover:border-blue-500/50 hover:bg-white/[0.02]"
                )}
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-3">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h3 className="font-extrabold text-white text-base mb-1">
                  {selectedFile ? selectedFile.name : "Faylni tanlang yoki shu yerga tashlang"}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  HEMIS Word (<b>.docx</b>) yoki (<b>.txt</b>) fayli (maksimal 15 MB)
                </p>
                {selectedFile && (
                  <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Fayl tanlandi ({Math.round(selectedFile.size / 1024)} KB)</span>
                  </div>
                )}
              </div>

              <button
                disabled={loading || !selectedFile}
                onClick={handleFileUpload}
                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                <span>{loading ? "Tahlil qilinmoqda..." : "Testga aylantirish"}</span>
              </button>
            </div>
          )}

          {/* Tab 2: Matndan */}
          {mode === 'text' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Test nomi (ixtiyoriy):</label>
                <input
                  type="text"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  placeholder="Masalan: Falsafa oraliq nazorat"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Test matnini kiriting yoki nusxalang:</label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder={`Masalan:\n++++\nO'zbekiston poytaxti qayer?\n====\n#Toshkent\n====\nSamarqand\n====\nBuxoro\n\nYoki:\n1. Savol matni\nA) Javob 1\nB) Javob 2\nJavob: A`}
                  rows={10}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <button
                disabled={loading || !textContent.trim()}
                onClick={handleTextSubmit}
                className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                <span>{loading ? "Tahlil qilinmoqda..." : "Matndan test yaratish"}</span>
              </button>
            </div>
          )}

          {/* Tab 3: Gemini AI */}
          {mode === 'ai' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Mavzu yoki fan nomi:</label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="Masalan: Odam anatomiyasi — Yurak qon-tomir tizimi"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Savollar soni:</label>
                  <select
                    value={aiCount}
                    onChange={(e) => setAiCount(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50"
                  >
                    <option value={5}>5 ta savol</option>
                    <option value={10}>10 ta savol</option>
                    <option value={15}>15 ta savol</option>
                    <option value={20}>20 ta savol</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Qiyinlik darajasi:</label>
                  <select
                    value={aiDifficulty}
                    onChange={(e) => setAiDifficulty(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="easy">Oson (Boshlang'ich)</option>
                    <option value="medium">O'rtacha (Standart)</option>
                    <option value="hard">Qiyin (Olimpiada)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Qo'shimcha konspekt yoki matn (ixtiyoriy):</label>
                <textarea
                  value={aiContext}
                  onChange={(e) => setAiContext(e.target.value)}
                  placeholder="Agar maxsus ma'ruza matnidan tuzmoqchi bo'lsangiz, shu yerga joylang..."
                  rows={4}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <button
                disabled={loading || !aiTopic.trim()}
                onClick={handleAiSubmit}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-xl shadow-blue-600/30 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{loading ? "AI test tuzmoqda..." : "Gemini AI orqali yaratish"}</span>
              </button>
            </div>
          )}

          {/* Tab 4: Qo'lda */}
          {mode === 'manual' && (
            <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Test nomi:</label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="Masalan: Ingliz tili grammatikasi"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Kategoriya:</label>
                  <input
                    type="text"
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    placeholder="Masalan: Tillar"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>

              {/* Savollar ro'yxati */}
              <div className="space-y-4">
                {manualQuestions.map((q, qIdx) => (
                  <div key={qIdx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-400">#{qIdx + 1}-savol</span>
                      {manualQuestions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeManualQuestion(qIdx)}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      value={q.question}
                      onChange={(e) => updateManualQuestion(qIdx, 'question', e.target.value)}
                      placeholder="Savol matnini kiriting..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                    />

                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 block">
                        Javob variantlari (to'g'risini radio bilan belgilang):
                      </span>
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct_${qIdx}`}
                            checked={q.correctAnswer === optIdx}
                            onChange={() => updateManualQuestion(qIdx, 'correctAnswer', optIdx)}
                            className="w-4 h-4 text-blue-600 focus:ring-0 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateManualOption(qIdx, optIdx, e.target.value)}
                            placeholder={`Variant ${String.fromCharCode(65 + optIdx)}`}
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={addManualQuestion}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
                  <span>Yana savol qo'shish</span>
                </button>

                <button
                  disabled={loading}
                  onClick={handleManualSubmit}
                  className="py-2.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 transition-all"
                >
                  {loading ? "Saqlanmoqda..." : "Testni saqlash"}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
