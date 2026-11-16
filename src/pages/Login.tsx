import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { 
  Sparkles, Send, CheckCircle2, ShieldCheck, 
  ArrowRight, RefreshCw, Smartphone, KeyRound, ExternalLink, Zap
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Login() {
  const { user, loginWithTelegramWidget, loginWithTelegramUser, loginDemo } = useAuth();
  const [botUsername, setBotUsername] = useState('quizgenrobot');
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [loginToken, setLoginToken] = useState('');
  const [botUrl, setBotUrl] = useState('');
  const [waitingForAuth, setWaitingForAuth] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoName, setDemoName] = useState('');
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const pollTimerRef = useRef<any>(null);

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        if (data.telegramBotUsername) {
          setBotUsername(data.telegramBotUsername);
        }
      })
      .catch(() => {});
  }, []);

  // Telegram Login Widget yuklash
  useEffect(() => {
    if (user) return;

    window.onTelegramAuth = (telegramUser: any) => {
      loginWithTelegramWidget(telegramUser).catch(err => {
        alert("Telegram orqali kirishda xatolik: " + err.message);
      });
    };

    if (widgetContainerRef.current) {
      widgetContainerRef.current.innerHTML = '';
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', botUsername);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-radius', '16');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.setAttribute('data-request-access', 'write');
      script.async = true;
      widgetContainerRef.current.appendChild(script);
    }
  }, [botUsername, user]);

  // Telegram orqali 1-bosishda kirish tokenini olish
  const startTelegramDeepLinkAuth = async () => {
    try {
      setShowTelegramModal(true);
      setWaitingForAuth(true);

      const res = await fetch('/api/auth/telegram-code', { method: 'POST' });
      const data = await res.json();

      if (data.token) {
        setLoginToken(data.token);
        const tgLink = `https://t.me/${botUsername}?start=login_${data.token}`;
        setBotUrl(tgLink);

        // Polling boshlash
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        pollTimerRef.current = setInterval(async () => {
          try {
            const checkRes = await fetch(`/api/auth/check-login-code?token=${data.token}`);
            const checkData = await checkRes.json();

            if (checkData.authorized && checkData.user) {
              clearInterval(pollTimerRef.current);
              setWaitingForAuth(false);
              loginWithTelegramUser(checkData.user);
            }
          } catch (e) {
            // Polling xatoligi
          }
        }, 1500);
      }
    } catch (err: any) {
      alert("Kirish tokenini olishda xatolik: " + err.message);
    }
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  if (user) return <Navigate to="/" />;

  return (
    <div className="flex flex-col min-h-screen text-slate-100 mesh-gradient-bg relative overflow-hidden">
      
      {/* Ambient Lighting Orbs */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-blue-600/25 to-purple-600/15 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Landing Navbar */}
      <header className="h-[76px] flex items-center justify-between px-6 md:px-12 z-30 sticky top-0 bg-[#0c121e]/60 backdrop-blur-2xl border-b border-white/[0.08]">
         <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/30">
              Q
            </div>
            <div>
              <h1 className="font-black text-sm tracking-widest text-white leading-none">QUIZGEN</h1>
              <span className="text-[10px] text-blue-400 font-extrabold uppercase tracking-widest">HEMIS & TMA</span>
            </div>
         </div>

         <div className="flex items-center gap-3">
           <button 
             onClick={() => setShowDemoModal(true)}
             className="text-xs font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-full transition-all"
           >
             Sinov hisobi
           </button>
           <button 
             onClick={startTelegramDeepLinkAuth}
             className="text-xs font-black bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-full transition-all shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 flex items-center gap-2"
           >
             <Send className="w-3.5 h-3.5" />
             Telegram bilan Kirish
           </button>
         </div>
      </header>

      {/* Hero Section */}
      <section className="pt-12 pb-16 md:pt-20 md:pb-24 px-4 flex flex-col items-center text-center max-w-4xl mx-auto relative z-10">
         
         <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-black tracking-widest uppercase mb-8 shadow-inner animate-float">
           <Sparkles className="w-4 h-4 text-sky-400" /> Rasmiy Telegram Tizimi & HEMIS Model
         </div>
         
         <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white mb-6 leading-[1.1] max-w-3xl">
           HEMIS Testlarini <br />
           <span className="animated-gradient-text">
             0 soniyada interaktiv testga
           </span> aylantiring
         </h1>
         
         <p className="text-sm sm:text-base md:text-lg text-slate-300 mb-10 max-w-xl mx-auto font-medium leading-relaxed">
           OTM test hujjatlarini (Word, .docx) <strong>mutlaqo bepul va 0 AI xarajat bilan</strong> testga aylantiring. Yodlash kartochkalari bilan sessiyaga 100% tayyorlaning.
         </p>

         {/* Strict Telegram Login Block */}
         <div className="flex flex-col items-center justify-center gap-4 w-full max-w-sm px-4">
           
           {/* Asosiy Telegram bilan kirish tugmasi */}
           <button 
             onClick={startTelegramDeepLinkAuth}
             className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all hover:shadow-2xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2.5 shadow-xl shadow-blue-600/30"
           >
             <Send className="w-4 h-4" />
             Telegram Orqali 1 Bosishda Kirish
           </button>

           {/* Rasmiy Telegram Vidjeti (Alternativ) */}
           <div className="flex flex-col items-center gap-1.5 w-full">
             <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-2">
               <span className="w-8 h-px bg-white/10"></span>
               yoki vidjet orqali
               <span className="w-8 h-px bg-white/10"></span>
             </div>
             <div ref={widgetContainerRef} className="flex justify-center min-h-[46px] my-1"></div>
           </div>

           <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
             <ShieldCheck className="w-4 h-4 text-emerald-400" />
             Parol shart emas, Telegram orqali 100% xavfsiz
           </p>
         </div>

         {/* Mockup Preview Card */}
         <div className="w-full max-w-xl mt-12 glass-card rounded-[2.5rem] p-6 border border-white/10 shadow-2xl relative overflow-hidden text-left">
           <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
             <div className="flex items-center gap-2">
               <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
               <span className="w-3 h-3 rounded-full bg-amber-500/80"></span>
               <span className="w-3 h-3 rounded-full bg-emerald-500/80"></span>
               <span className="text-xs font-bold text-slate-400 ml-2">Falsafa_HEMIS_Test.docx</span>
             </div>
             <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/25">
               150 ta savol
             </span>
           </div>

           <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">SAVOL 1 / 150</p>
           <h4 className="text-sm font-bold text-white mb-4">Algoritmning qadam-baqadam bajarilishi uning qaysi xossasi?</h4>

           <div className="space-y-2">
             <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 flex items-center gap-3">
               <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[11px] font-bold">A</span>
               Ommaviylik
             </div>
             <div className="p-3 bg-emerald-500/15 border-2 border-emerald-500 rounded-xl text-xs text-emerald-200 font-bold flex items-center justify-between shadow-lg shadow-emerald-500/10">
               <div className="flex items-center gap-3">
                 <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-[11px] font-bold">B</span>
                 Diskretlik
               </div>
               <CheckCircle2 className="w-4 h-4 text-emerald-400" />
             </div>
           </div>
         </div>
      </section>

      {/* Telegram Deep-Link Auth Modal */}
      {showTelegramModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="glass-card rounded-[2.5rem] p-7 md:p-8 max-w-sm w-full shadow-2xl border border-blue-500/30 text-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
            
            {/* Modal Ambient Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>

            <div className="w-16 h-16 rounded-3xl bg-blue-500/20 border-2 border-blue-500/50 text-blue-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <Send className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-white mb-2">Telegram orqali Kirish</h3>
            <p className="text-xs text-slate-300 mb-6 font-medium leading-relaxed">
              Quyidagi tugma orqali Telegram botimizga o'ting va <strong>"Boshlash"</strong> tugmasini bosing:
            </p>

            {/* Telegram Botga o'tish tugmasi */}
            {botUrl && (
              <a
                href={botUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all hover:shadow-xl hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 mb-4"
              >
                <ExternalLink className="w-4 h-4" />
                Telegramda Botni Ochish
              </a>
            )}

            {/* Verification code chip */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 mb-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Kirish kodi</span>
              <div className="font-mono text-lg font-black text-blue-400 tracking-widest">{loginToken || 'YUKLANMOQDA...'}</div>
            </div>

            {/* Polling Spinner Indicator */}
            {waitingForAuth && (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mb-6">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                <span>Telegramdan tasdiqlash kutilmoqda...</span>
              </div>
            )}

            <button
              onClick={() => {
                setShowTelegramModal(false);
                if (pollTimerRef.current) clearInterval(pollTimerRef.current);
              }}
              className="text-xs font-bold text-slate-400 hover:text-white"
            >
              Bekor qilish
            </button>

          </div>
        </div>
      )}

      {/* Demo Tester Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="glass-card rounded-[2.5rem] p-7 md:p-8 max-w-sm w-full shadow-2xl border border-white/15 animate-in zoom-in-95 duration-200 text-center">
             <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto mb-4">
               <Zap className="w-7 h-7" />
             </div>
             <h3 className="text-xl font-black text-white mb-2">Sinov Hisobi Bilan Kirish</h3>
             <p className="text-xs text-slate-400 mb-6 font-medium">
               Dastur imkoniyatlarini tekshirish uchun ismingizni kiriting va darhol tizimga o'ting:
             </p>

             <input 
               type="text" 
               placeholder="Ismingiz (masalan: Alisher)"
               value={demoName}
               onChange={(e) => setDemoName(e.target.value)}
               className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 mb-4"
             />

             <button
               onClick={() => {
                 loginDemo(demoName.trim() || 'Talaba (Sinov)');
                 setShowDemoModal(false);
               }}
               className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-blue-600/30 mb-3"
             >
               Kirish
             </button>

             <button
               onClick={() => setShowDemoModal(false)}
               className="text-xs font-bold text-slate-400 hover:text-white"
             >
               Orqaga
             </button>
          </div>
        </div>
      )}

    </div>
  );
}
