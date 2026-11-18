import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Landing from './Landing';
import { 
  UploadCloud, Loader2, FileCheck2, XCircle, ArrowRight, FileText, 
  Layers, BookOpen, ArrowLeft, Info, Sparkles, Cpu, Send, Edit3, 
  PlayCircle, Clock, Flame, Zap, Award, CheckCircle2, ShieldCheck 
} from 'lucide-react';
import { cn } from '../lib/utils';

type ViewMode = 'menu' | 'upload' | 'guide';

export default function Home() {
  const { user, loading: authLoading, authFetch } = useAuth();
  const [view, setView] = useState<ViewMode>('menu');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showInvalid, setShowInvalid] = useState(false);
  const [generatedQuizId, setGeneratedQuizId] = useState<string | null>(null);
  const [generatedQuizMeta, setGeneratedQuizMeta] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  if (!authLoading && !user) {
    return <Landing />;
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    if (isValidFile(selectedFile)) {
      setFile(selectedFile);
      setError('');
      setShowInvalid(false);
    } else {
      setFile(null);
      setShowInvalid(true);
      setTimeout(() => setShowInvalid(false), 3000);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const isValidFile = (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
       setError("Fayl hajmi juda katta (maksimal 15MB). Kichikroq fayl tanlang.");
       return false;
    }
    const name = file.name.toLowerCase();
    return name.endsWith('.pdf') || name.endsWith('.docx') || name.endsWith('.txt');
  };

  const generateQuiz = async () => {
    if (!file || !user) return;
    setLoading(true);
    setError('');
    setUploadProgress(0);

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 20;
      });
    }, 180);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await authFetch('/api/generate-quiz', {
        method: 'POST',
        body: formData,
      });

      const rawText = await response.text();
      let data;
      try {
         data = JSON.parse(rawText);
      } catch(parseErr) {
         console.error("Raw response:", rawText.substring(0, 100));
         throw new Error("Tizim fayl formatini o'qiy olmadi yoki hujjat juda katta.");
      }

      if (!response.ok) {
        throw new Error(data.error || "Test yaratishda xatolik yuz berdi");
      }

      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("Hujjatdan test savollari topilmadi.");
      }

      clearInterval(progressInterval);
      setUploadProgress(100);
      await new Promise(r => setTimeout(r, 300)); 

      const quizId = Math.random().toString(36).substring(7);
      const quizTitle = file.name.replace(/\.[^/.]+$/, "");

      const newQuiz = {
        id: quizId,
        userId: user?.uid || 'anonymous',
        title: quizTitle,
        sourceFileName: file.name,
        source: data.source || 'hemis',
        formatType: data.formatType,
        questions: data.questions,
        createdAt: new Date().toISOString()
      };
      
      // SQLite bazaga saqlash
      try {
        await authFetch('/api/quizzes', {
          method: 'POST',
          body: JSON.stringify({
            id: quizId,
            title: quizTitle,
            sourceType: data.source || 'hemis',
            questions: data.questions,
            timeLimitMinutes: 0
          })
        });
      } catch (beErr) {
        console.warn("Backend save fallback to localStorage:", beErr);
      }

      localStorage.setItem(`quiz_${quizId}`, JSON.stringify(newQuiz));
      setGeneratedQuizId(quizId);
      setGeneratedQuizMeta(newQuiz);

    } catch (err: any) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      console.error(err);
      setError(err.message || 'Kutilmagan xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  // 1. Fayl yuklash oynasi
  if (view === 'upload') {
    return (
      <div className="max-w-2xl mx-auto w-full pt-6 pb-24 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button 
          onClick={() => {
            setView('menu');
            setGeneratedQuizId(null);
            setFile(null);
          }}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 font-bold text-xs transition-colors group bg-white/5 border border-white/10 px-4 py-2 rounded-full w-fit"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Orqaga qaytish</span>
        </button>

        {generatedQuizId && generatedQuizMeta ? (
          <div className="glass-card rounded-[2.5rem] p-8 md:p-10 text-center relative overflow-hidden animated-gradient-border">
            <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
              <FileCheck2 className="w-10 h-10" />
            </div>

            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/30 mb-4 inline-block">
              {generatedQuizMeta.source === 'hemis' ? "⚡ HEMIS Tahlil (0 AI Sarfi)" : "✨ Gemini 2.5 Flash"}
            </span>

            <h2 className="text-2xl md:text-3xl font-black text-white mb-3">{generatedQuizMeta.title}</h2>
            <p className="text-sm text-slate-300 font-medium mb-8 max-w-md mx-auto">
              Jami <strong className="text-emerald-400 font-extrabold">{generatedQuizMeta.questions.length} ta savol</strong> muvaffaqiyatli tahlil qilindi va doimiy bazaga saqlandi.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <button
                onClick={() => navigate(`/quiz/${generatedQuizId}`)}
                className="py-4 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
              >
                <PlayCircle className="w-4 h-4" /> Boshlash
              </button>

              <button
                onClick={() => navigate(`/editor/${generatedQuizId}`)}
                className="py-4 px-5 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-2xl border border-white/15 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Edit3 className="w-4 h-4 text-amber-400" /> Tahrirlash
              </button>

              <button
                onClick={() => navigate(`/flashcards/${generatedQuizId}`)}
                className="py-4 px-5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold text-xs uppercase tracking-wider rounded-2xl border border-emerald-500/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
              >
                <Layers className="w-4 h-4 text-emerald-400" /> Kartochkalar
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-black uppercase tracking-wider mb-2">
                <Cpu className="w-3.5 h-3.5" /> HEMIS Parser & Gemini AI
              </span>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">
                Test Hujjatini Yuklang
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
                Word (.docx), PDF yoki TXT testlaringizni tashlang. HEMIS testlari soniyaning yuzdan bir ulushida testga aylanadi.
              </p>
            </div>

            <div className="glass-card rounded-[2.5rem] p-4 border border-white/10">
              <div 
                className={cn(
                  "border-2 border-dashed rounded-[2rem] p-10 sm:p-14 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer text-center relative overflow-hidden",
                  dragActive ? "border-blue-500 bg-blue-500/10 scale-[1.01]" : "border-white/15 bg-white/[0.02] hover:border-blue-500/50 hover:bg-blue-500/5",
                  file && !showInvalid ? "border-emerald-500/80 bg-emerald-500/10" : "",
                  showInvalid ? "border-red-500/80 bg-red-500/10" : "",
                  loading ? "opacity-75 pointer-events-none" : ""
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !file && fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" 
                  onChange={handleFileChange}
                />

                {!file ? (
                  <>
                    <div className={cn(
                      "w-20 h-20 rounded-3xl flex items-center justify-center mb-5 transition-all duration-500 ease-out shadow-2xl",
                      dragActive ? "bg-blue-600 text-white scale-110 shadow-blue-500/50" : "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-600/30"
                    )}>
                      {showInvalid ? (
                        <XCircle className="w-9 h-9 text-red-300" />
                      ) : (
                        <UploadCloud className="w-9 h-9" />
                      )}
                    </div>
                    <p className="text-lg font-black text-white mb-1.5">
                      {showInvalid ? "Yaroqsiz format" : (dragActive ? "Faylni shu yerga qo'yib yuboring" : "Tanlash uchun bosing yoki tashlang")}
                    </p>
                    <p className="text-xs text-slate-400 font-semibold">
                      Word (.docx), PDF (.pdf) yoki Matn (.txt) (Maks. 15MB)
                    </p>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center w-full relative z-10 animate-in fade-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-emerald-500 text-white shadow-2xl shadow-emerald-500/40 rounded-3xl flex items-center justify-center mb-5">
                      <FileCheck2 className="w-10 h-10" />
                    </div>
                    <p className="text-base font-black text-white break-words w-full px-4 mb-1">{file.name}</p>
                    <p className="text-xs text-slate-400 font-bold">{(file.size / 1024).toFixed(1)} KB</p>
                    
                    {loading ? (
                       <div className="w-full max-w-sm mx-auto mt-6">
                         <div className="flex justify-between text-xs font-black text-slate-300 mb-2 uppercase tracking-widest">
                           <span className="text-blue-400">
                             {uploadProgress < 40 ? "Yuklanmoqda..." : 
                              uploadProgress < 80 ? "HEMIS / AI Tahlil..." : "Tayyorlanmoqda..."}
                           </span>
                           <span>{Math.round(uploadProgress)}%</span>
                         </div>
                         <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-300 rounded-full relative" 
                              style={{ width: `${uploadProgress}%` }}
                            >
                              <div className="absolute inset-0 bg-white/30 animate-[shimmer_1.5s_infinite]"></div>
                            </div>
                         </div>
                      </div>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="mt-6 text-xs uppercase tracking-widest font-black text-red-400 hover:text-white hover:bg-red-500 border border-red-500/30 transition-all px-6 py-2.5 rounded-full"
                      >
                        Boshqa fayl tanlash
                      </button>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 p-4 rounded-2xl bg-red-500/15 text-red-300 text-xs border border-red-500/30 font-semibold text-center flex items-center justify-center gap-2">
                  <Info className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <div className="mt-4">
                <button
                  onClick={generateQuiz}
                  disabled={loading || !file}
                  className={cn(
                    "w-full py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3",
                    loading || !file
                      ? "bg-white/5 text-slate-500 cursor-not-allowed border border-white/5"
                      : "bg-gradient-to-r from-blue-600 to-sky-500 text-white hover:from-blue-500 hover:to-sky-400 shadow-xl shadow-blue-500/30 hover:scale-[1.01] active:scale-95"
                  )}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Tahlil qilinmoqda...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Test Yaratishni Boshlash
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Qoidalar & Namuna oynasi
  if (view === 'guide') {
    return (
      <div className="max-w-2xl mx-auto w-full pt-6 pb-24 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button 
          onClick={() => setView('menu')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 font-bold text-xs transition-colors bg-white/5 border border-white/10 px-4 py-2 rounded-full w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Orqaga
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-black text-white mb-2">HEMIS Test Standartlari</h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Quyidagi formatdagi fayllar <strong>0 AI xarajati bilan, mutlaqo tekinga</strong> testga aylanadi:
          </p>
        </div>

        <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 space-y-6">
           <div>
             <div className="flex items-center gap-2 mb-2">
               <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-black flex items-center justify-center">1</span>
               <h3 className="font-bold text-white text-sm">Simvolli Format (++++ va ====)</h3>
             </div>
             <p className="text-xs text-slate-400 mb-3">Har bir savol <code>++++</code> bilan, variantlar <code>====</code> bilan ajratiladi. To'g'ri variant oldiga <code>#</code> qo'yiladi.</p>
             <div className="bg-[#080c14] rounded-2xl p-4 text-slate-300 font-mono text-xs overflow-x-auto border border-white/5 shadow-inner">
<pre>{`++++
O'zbekiston Davlat bayrog'i qachon qabul qilingan?
====
1990-yil 31-avgust
====
#1991-yil 18-noyabr
====
1992-yil 8-dekabr
====
1993-yil 2-iyul`}</pre>
             </div>
           </div>

           <div>
             <div className="flex items-center gap-2 mb-2">
               <span className="w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-black flex items-center justify-center">2</span>
               <h3 className="font-bold text-white text-sm">Raqamlangan Format (1. Savol... A) B) C) D))</h3>
             </div>
             <p className="text-xs text-slate-400 mb-3">Word faylda raqam va harflar bilan yozilgan odatiy testlar. To'g'ri javob <code>Javob: A</code> yoki <code>#A)</code> bilan belgilanadi.</p>
             <div className="bg-[#080c14] rounded-2xl p-4 text-slate-300 font-mono text-xs overflow-x-auto border border-white/5 shadow-inner">
<pre>{`1. Dasturlashda o'zgaruvchi nima?
A) O'zgarmas kattalik
#B) Xotiraning nomlangan sohasi
C) Funksiya nomi
D) Kompilyator buyrug'i
Javob: B`}</pre>
             </div>
           </div>

           <button
             onClick={() => setView('upload')}
             className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all"
           >
             Faylni Yuklashga O'tish <ArrowRight className="w-4 h-4" />
           </button>
        </div>
      </div>
    );
  }

  // 3. Asosiy Dashboard (Bento Grid)
  return (
    <div className="max-w-4xl mx-auto w-full pt-4 md:pt-8 pb-20 px-4 animate-in fade-in duration-500">
       
       {/* Gamified Welcome Header */}
       <header className="mb-6 md:mb-8">
         <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-extrabold uppercase tracking-wider mb-3">
           <Cpu className="w-3.5 h-3.5" /> HEMIS Avtomatik Modeli Faol
         </div>
         <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
           Bugun qaysi testni <br className="hidden sm:inline" />
           <span className="animated-gradient-text">zabt etamiz?</span>
         </h1>
         <p className="text-slate-400 mt-2 text-xs sm:text-sm font-medium">
           HEMIS testlarini soniyada interaktiv testga aylantiring yoki kartochkalar bilan yodlang.
         </p>
       </header>
       
       {/* Bento Grid */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         
         {/* Katta Bento: Fayl yuklash (Hero Card) */}
         <button 
           onClick={() => {
             setGeneratedQuizId(null);
             setView('upload');
           }}
           className="md:col-span-2 group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-600 p-8 md:p-10 text-left text-white shadow-[0_25px_50px_-12px_rgba(37,99,235,0.4)] transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] flex flex-col justify-end min-h-[300px] border border-white/20"
         >
            {/* Background 3D icon */}
            <div className="absolute top-0 right-0 p-6 opacity-15 group-hover:opacity-30 group-hover:-translate-y-2 group-hover:translate-x-2 transition-all duration-500 pointer-events-none">
               <UploadCloud size={160} strokeWidth={1} />
            </div>
            
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-[10px] uppercase tracking-widest font-black backdrop-blur-md mb-4 border border-white/25">
                 <Sparkles className="w-3 h-3 text-white" />
                 0 AI Sarfi • 100% Bepul
              </span>
              <h2 className="text-3xl md:text-4xl font-black mb-3 tracking-tight">Hujjatdan Test Tuzish</h2>
              <p className="text-blue-100 max-w-md font-medium text-xs sm:text-sm leading-relaxed mb-6">
                HEMIS formatidagi Word (.docx), PDF yoki TXT faylingizni yuklang. Tizim bir zumda tayyor test oynasini ochadi.
              </p>

              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-slate-900 font-extrabold text-xs uppercase tracking-wider shadow-lg group-hover:shadow-white/20 transition-all">
                <span>Fayl tanlash</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
         </button>

         {/* Kichik Bento: Format Qo'llanmasi */}
         <button 
           onClick={() => setView('guide')}
           className="col-span-1 rounded-[2.5rem] glass-card-interactive p-8 text-left flex flex-col justify-between min-h-[220px] md:min-h-[300px] group border border-white/10"
         >
            <div className="w-12 h-12 bg-sky-500/15 border border-sky-500/30 text-sky-400 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="mt-8">
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 block mb-1">Standartlar</span>
              <h4 className="font-extrabold text-xl text-white mb-2">HEMIS Formatlari</h4>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Testlaringiz to'g'ri o'qilishi uchun shablon va qoidalar bilan tanishing.
              </p>
            </div>
         </button>

         {/* 3. Yodlash Kartochkalari (Flashcards Arena) */}
         <Link 
           to="/history"
           className="col-span-1 rounded-[2rem] glass-card-interactive p-6 text-left flex items-start gap-4 group border border-emerald-500/20 hover:border-emerald-500/40"
         >
            <div className="w-12 h-12 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
               <Layers className="w-6 h-6" />
            </div>
            <div>
               <h4 className="font-extrabold text-white text-sm mb-1">Yodlash Kartochkalari</h4>
               <p className="text-xs text-slate-400 font-medium leading-relaxed">
                 Savollarni 3D flip-kartochkalar orqali tez yodlang.
               </p>
            </div>
         </Link>

         {/* 4. Imtihon Tarixi va Baza */}
         <Link 
           to="/history"
           className="col-span-1 rounded-[2rem] glass-card-interactive p-6 text-left flex items-start gap-4 group border border-purple-500/20 hover:border-purple-500/40"
         >
            <div className="w-12 h-12 bg-purple-500/15 border border-purple-500/30 text-purple-400 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20 group-hover:scale-110 transition-transform">
               <Award className="w-6 h-6" />
            </div>
            <div>
               <h4 className="font-extrabold text-white text-sm mb-1">Mening Testlarim</h4>
               <p className="text-xs text-slate-400 font-medium leading-relaxed">
                 O'tgan imtihonlar ballari va saqlangan testlar.
               </p>
            </div>
         </Link>

         {/* 5. Telegram Bot Integratsiyasi */}
         <a 
           href="https://t.me/quizgenrobot" 
           target="_blank" 
           rel="noreferrer"
           className="col-span-1 rounded-[2rem] glass-card-interactive p-6 text-left flex items-start gap-4 group border border-blue-500/20 hover:border-blue-500/40"
         >
            <div className="w-12 h-12 bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
               <Send className="w-6 h-6" />
            </div>
            <div>
               <h4 className="font-extrabold text-white text-sm mb-1">Telegram Bot</h4>
               <p className="text-xs text-slate-400 font-medium leading-relaxed">
                 @quizgenrobot ga fayl yuborib bir zumda test oching.
               </p>
            </div>
         </a>

       </div>
    </div>
  );
}
