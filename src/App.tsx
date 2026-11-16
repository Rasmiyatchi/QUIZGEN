import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Quiz from './pages/Quiz';
import Result from './pages/Result';
import History from './pages/History';
import Editor from './pages/Editor';
import Flashcards from './pages/Flashcards';
import Pricing from './pages/Pricing';
import Navbar from './components/Navbar';
import { Sparkles, Layers, History as HistoryIcon, LayoutGrid, Flame, Crown } from 'lucide-react';
import { cn } from './lib/utils';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#090d16] text-white">
        <div className="relative w-16 h-16 flex items-center justify-center mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping"></div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/30">
            Q
          </div>
        </div>
        <p className="text-xs uppercase tracking-widest text-slate-400 font-bold animate-pulse">Yuklanmoqda...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function FloatingBottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  
  if (!user || location.pathname === '/login') return null;

  const navItems = [
    { path: '/', label: 'Asosiy', icon: LayoutGrid },
    { path: '/history', label: 'Tarix & Baza', icon: HistoryIcon },
    { path: '/pricing', label: 'Tariflar', icon: Crown },
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 md:hidden z-50">
      <div className="bg-[#121826]/85 backdrop-blur-2xl border border-white/10 px-6 py-2.5 rounded-full flex justify-around items-center shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link 
              key={item.path}
              to={item.path} 
              className={cn(
                "flex flex-col items-center gap-1 relative px-4 py-1 rounded-2xl transition-all duration-300",
                isActive ? "text-blue-400 scale-105" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5 transition-transform duration-300", isActive && "stroke-[2.5px]")} />
                {isActive && (
                  <div className="absolute -inset-1 bg-blue-500/20 blur-sm rounded-full -z-10"></div>
                )}
              </div>
              <span className={cn("text-[10px] font-bold tracking-tight", isActive ? "text-blue-400" : "text-slate-400")}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"></div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="flex flex-col h-screen overflow-hidden text-slate-100 font-sans relative isolate mesh-gradient-bg">
          {/* Ambient Lighting Orbs */}
          <div className="absolute top-[-80px] left-[-80px] w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] pointer-events-none -z-10"></div>
          <div className="absolute top-[20%] right-[-100px] w-96 h-96 bg-purple-600/15 rounded-full blur-[130px] pointer-events-none -z-10"></div>
          <div className="absolute bottom-[-100px] left-[30%] w-96 h-96 bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none -z-10"></div>

          {/* Main Scrollable View */}
          <main className="flex flex-col flex-1 overflow-x-hidden overflow-y-auto pb-safe no-scrollbar">
             <Navbar />
             <div className="w-full pb-24 md:pb-12">
               <Routes>
                 <Route path="/login" element={<Login />} />
                 <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                 <Route path="/quiz/:quizId" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
                 <Route path="/editor/:quizId" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
                 <Route path="/flashcards/:quizId" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
                 <Route path="/result/:resultId" element={<ProtectedRoute><Result /></ProtectedRoute>} />
                 <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
                 <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
               </Routes>
             </div>
          </main>
          
          <FloatingBottomNav />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
