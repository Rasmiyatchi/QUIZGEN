import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Search, BookOpen, Bookmark, BookmarkCheck, GitFork, Share2, 
  Flag, PlayCircle, Layers, FolderPlus, Folder, Trash2, 
  Sparkles, Flame, Eye, CheckCircle2, AlertTriangle, X, 
  Copy, ExternalLink, Filter, TrendingUp, Clock, Compass
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface LibraryQuiz {
  id: string;
  title: string;
  category: string;
  visibility: 'public' | 'private' | 'unlisted';
  status: string;
  slug?: string;
  questions_count?: number;
  views_count?: number;
  is_featured?: number;
  creator_name?: string;
  creator_username?: string;
  created_at?: string;
  saved_at?: string;
  folder_id?: string;
  folder_name?: string;
  is_saved?: boolean;
  score?: number;
  percentage?: number;
  completed_at?: string;
}

export interface LibraryFolder {
  id: string;
  name: string;
  color?: string;
  created_at: string;
}

const CATEGORIES = [
  'Barchasi',
  'Umumiy',
  'Tibbiyot',
  'Iqtisodiyot',
  'Axborot texnologiyalari',
  'Huquq',
  'Tillar',
  'Aniq fanlar',
  'Ijtimoiy fanlar'
];

export default function Library() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();

  // Tab: 'public' | 'mine' | 'saved' | 'recent'
  const [activeTab, setActiveTab] = useState<'public' | 'mine' | 'saved' | 'recent'>('public');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Barchasi');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'questions'>('popular');

  // Data
  const [quizzes, setQuizzes] = useState<LibraryQuiz[]>([]);
  const [featuredQuizzes, setFeaturedQuizzes] = useState<LibraryQuiz[]>([]);
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [savedQuizIds, setSavedQuizIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Modals & Feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [shareModalQuiz, setShareModalQuiz] = useState<LibraryQuiz | null>(null);
  const [reportModalQuiz, setReportModalQuiz] = useState<LibraryQuiz | null>(null);
  const [reportReason, setReportReason] = useState('incorrect_answers');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Folder creation modal
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#3b82f6');
  const [creatingFolder, setCreatingFolder] = useState(false);

  function showToast(text: string, type: 'success' | 'error' | 'info' = 'success') {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(prev => prev?.text === text ? null : prev);
    }, 3500);
  }

  // Yuklash
  useEffect(() => {
    loadData();
  }, [activeTab, selectedCategory, sortBy, selectedFolderId]);

  // Qidiruv uchun debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === 'public') {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.append('q', searchQuery.trim());
        if (selectedCategory !== 'Barchasi') params.append('category', selectedCategory);
        params.append('sort', sortBy);

        const [publicRes, featuredRes] = await Promise.all([
          authFetch(`/api/library/public?${params.toString()}`),
          authFetch('/api/library/featured')
        ]);

        if (publicRes.ok) {
          const pData = await publicRes.json();
          setQuizzes(pData.quizzes || []);
        }
        if (featuredRes.ok) {
          const fData = await featuredRes.json();
          setFeaturedQuizzes(fData.quizzes || []);
        }
      } else if (activeTab === 'mine') {
        const res = await authFetch('/api/library/mine');
        if (res.ok) {
          const data = await res.json();
          let list = data.quizzes || [];
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((item: LibraryQuiz) => 
              item.title.toLowerCase().includes(q) || 
              (item.category && item.category.toLowerCase().includes(q))
            );
          }
          if (selectedCategory !== 'Barchasi') {
            list = list.filter((item: LibraryQuiz) => item.category === selectedCategory);
          }
          setQuizzes(list);
        }
      } else if (activeTab === 'saved') {
        const [savedRes, foldersRes] = await Promise.all([
          authFetch(`/api/library/saved${selectedFolderId ? `?folder_id=${selectedFolderId}` : ''}`),
          authFetch('/api/library/folders')
        ]);

        if (savedRes.ok) {
          const data = await savedRes.json();
          let list = data.quizzes || [];
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((item: LibraryQuiz) => 
              item.title.toLowerCase().includes(q) || 
              (item.category && item.category.toLowerCase().includes(q))
            );
          }
          setQuizzes(list);
          const savedIds = new Set<string>(list.map((q: LibraryQuiz) => q.id));
          setSavedQuizIds(savedIds);
        }

        if (foldersRes.ok) {
          const fData = await foldersRes.json();
          setFolders(fData.folders || []);
        }
      } else if (activeTab === 'recent') {
        const res = await authFetch('/api/library/recent');
        if (res.ok) {
          const data = await res.json();
          let list = data.quizzes || [];
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter((item: LibraryQuiz) => 
              item.title.toLowerCase().includes(q)
            );
          }
          setQuizzes(list);
        }
      }

      // Saqlangan testlar ro'yxatini belgilab olish
      if (activeTab !== 'saved') {
        try {
          const sRes = await authFetch('/api/library/saved');
          if (sRes.ok) {
            const sData = await sRes.json();
            const sIds = new Set<string>((sData.quizzes || []).map((q: any) => q.id));
            setSavedQuizIds(sIds);
          }
        } catch (_) {}
      }
    } catch (err: any) {
      console.warn("Library load error:", err);
      showToast("Ma'lumotlarni yuklashda xatolik yuz berdi", 'error');
    } finally {
      setLoading(false);
    }
  }

  // Saqlash yoki olib tashlash
  async function toggleSaveQuiz(quiz: LibraryQuiz) {
    const isCurrentlySaved = savedQuizIds.has(quiz.id);
    try {
      if (isCurrentlySaved) {
        const res = await authFetch(`/api/library/saved/${quiz.id}`, { method: 'DELETE' });
        if (res.ok) {
          setSavedQuizIds(prev => {
            const next = new Set(prev);
            next.delete(quiz.id);
            return next;
          });
          if (activeTab === 'saved') {
            setQuizzes(prev => prev.filter(q => q.id !== quiz.id));
          }
          showToast("Kutubxonadan olib tashlandi", 'info');
        } else {
          showToast("Olib tashlashda xatolik", 'error');
        }
      } else {
        const res = await authFetch(`/api/library/saved/${quiz.id}`, { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.success) {
          setSavedQuizIds(prev => new Set(prev).add(quiz.id));
          showToast("Kutubxonaga muvaffaqiyatli saqlandi! 📚", 'success');
        } else {
          showToast(data.message || "Saqlashda xatolik yuz berdi", 'error');
        }
      }
    } catch (err: any) {
      showToast("Server bilan aloqa uzildi", 'error');
    }
  }

  // Nusxa olish (Fork)
  async function handleForkQuiz(quiz: LibraryQuiz) {
    try {
      const res = await authFetch(`/api/quizzes/${quiz.id}/fork`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`"${quiz.title}" nusxasi shaxsiy bazangizga saqlandi! ✨`, 'success');
        if (data.quiz?.id) {
          setTimeout(() => {
            navigate(`/editor/${data.quiz.id}`);
          }, 800);
        }
      } else {
        showToast(data.message || "Nusxa olishda xatolik", 'error');
      }
    } catch (err: any) {
      showToast("Server xatosi", 'error');
    }
  }

  // Shikoyat yuborish
  async function submitReport() {
    if (!reportModalQuiz) return;
    setSubmittingReport(true);
    try {
      const res = await authFetch(`/api/quizzes/${reportModalQuiz.id}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reportReason,
          details: reportDetails
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Shikoyatingiz qabul qilindi. Moderatsiya ko'rib chiqadi.", 'info');
        setReportModalQuiz(null);
        setReportDetails('');
      } else {
        showToast(data.message || "Shikoyat yuborishda xatolik", 'error');
      }
    } catch (err: any) {
      showToast("Server xatosi", 'error');
    } finally {
      setSubmittingReport(false);
    }
  }

  // Jild yaratish
  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      const res = await authFetch('/api/library/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          color: newFolderColor
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFolders(prev => [data.folder, ...prev]);
        setShowFolderModal(false);
        setNewFolderName('');
        showToast("Yangi jild yaratildi! 📁", 'success');
      } else {
        showToast(data.message || "Jild yaratib bo'lmadi", 'error');
      }
    } catch (err: any) {
      showToast("Server xatosi", 'error');
    } finally {
      setCreatingFolder(false);
    }
  }

  // Ulashish havolasini nusxalash
  function copyShareLink(quiz: LibraryQuiz) {
    const slug = quiz.slug || quiz.id;
    const url = `${window.location.origin}/q/${slug}`;
    navigator.clipboard.writeText(url);
    showToast("Havola buferga nusxalandi! 📋", 'success');
  }

  function getTelegramShareUrl(quiz: LibraryQuiz) {
    const slug = quiz.slug || quiz.id;
    const url = `${window.location.origin}/q/${slug}`;
    const text = `🎯 QUIZGEN test: "${quiz.title}"\nSavollar: ${quiz.questions_count || 0} ta\nBu yerda yeching:`;
    return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Toast Bildirishnoma */}
      {toastMessage && (
        <div className={cn(
          "fixed top-20 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border text-sm font-bold transition-all animate-in slide-in-from-top-4",
          toastMessage.type === 'success' && "bg-emerald-950/85 border-emerald-500/40 text-emerald-200",
          toastMessage.type === 'error' && "bg-red-950/85 border-red-500/40 text-red-200",
          toastMessage.type === 'info' && "bg-blue-950/85 border-blue-500/40 text-blue-200"
        )}>
          {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {toastMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400" />}
          {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 text-blue-400" />}
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sarlavha & Intro */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Test Kutubxonasi
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 font-extrabold">
                  v3
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Minglab talabalar va o'qituvchilar tomonidan tayyorlangan testlar bazasi
              </p>
            </div>
          </div>
        </div>

        {/* Tablar */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
          <button
            onClick={() => { setActiveTab('public'); setSelectedFolderId(null); }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              activeTab === 'public' 
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Ommaviy</span>
          </button>
          <button
            onClick={() => { setActiveTab('saved'); setSelectedFolderId(null); }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              activeTab === 'saved' 
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saqlanganlar</span>
          </button>
          <button
            onClick={() => { setActiveTab('mine'); setSelectedFolderId(null); }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              activeTab === 'mine' 
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Mening testlarim</span>
          </button>
          <button
            onClick={() => { setActiveTab('recent'); setSelectedFolderId(null); }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              activeTab === 'recent' 
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30" 
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Yaqinda</span>
          </button>
        </div>
      </div>

      {/* Featured Banner (faqat Ommaviy bo'limda va birinchi ochilishda) */}
      {activeTab === 'public' && featuredQuizzes.length > 0 && !searchQuery && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-slate-900/40 border border-blue-500/20 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <span className="p-1 rounded-lg bg-amber-500/20 text-amber-300">
              <Sparkles className="w-4 h-4 fill-current" />
            </span>
            <span className="text-xs uppercase tracking-wider font-black text-amber-300">
              Tavsiya etilgan testlar (Featured)
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {featuredQuizzes.map(quiz => (
              <div 
                key={quiz.id}
                className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-blue-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      {quiz.category || 'Umumiy'}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {quiz.views_count || 0}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-sm text-white line-clamp-1">
                    {quiz.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {quiz.questions_count || 0} ta savol • {quiz.creator_name || 'HEMIS'}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                  <button
                    onClick={() => navigate(`/quiz/${quiz.id}`)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Boshlash</span>
                  </button>
                  <button
                    onClick={() => toggleSaveQuiz(quiz)}
                    className={cn(
                      "p-1.5 rounded-xl border transition-all",
                      savedQuizIds.has(quiz.id)
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                    )}
                    title="Saqlash"
                  >
                    {savedQuizIds.has(quiz.id) ? (
                      <BookmarkCheck className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter va Qidiruv Qatori */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Test nomi yoki fan bo'yicha qidiruv..."
            className="w-full bg-slate-900/60 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 backdrop-blur-xl"
          />
        </div>

        {/* Saralash & Kategoriyalar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {activeTab === 'public' && (
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-900/60 border border-white/10 rounded-2xl px-3 py-2.5 text-xs font-bold text-slate-200 focus:outline-none focus:border-blue-500/50 backdrop-blur-xl"
            >
              <option value="popular">🔥 Ko'p ko'rilgan</option>
              <option value="newest">✨ Yangi qo'shilgan</option>
              <option value="questions">❓ Ko'p savolli</option>
            </select>
          )}

          {activeTab === 'saved' && (
            <button
              onClick={() => setShowFolderModal(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 text-xs font-bold whitespace-nowrap transition-all"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Yangi Jild</span>
            </button>
          )}
        </div>
      </div>

      {/* Jildlar (faqat Saqlanganlar tabida) */}
      {activeTab === 'saved' && folders.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setSelectedFolderId(null)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap",
              selectedFolderId === null
                ? "bg-blue-600/30 border-blue-500 text-blue-300"
                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
            )}
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Barchasi ({folders.length})</span>
          </button>
          {folders.map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFolderId(f.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap",
                selectedFolderId === f.id
                  ? "bg-blue-600/30 border-blue-500 text-blue-300"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              )}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color || '#3b82f6' }}></span>
              <span>{f.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Kategoriya Pillari (Ommaviy va Mening testlarim tabida) */}
      {(activeTab === 'public' || activeTab === 'mine') && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap border transition-all",
                selectedCategory === cat
                  ? "bg-blue-600 text-white border-blue-500 shadow-sm shadow-blue-500/30"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-slate-200"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Ro'yxat / Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
          <span className="text-xs uppercase tracking-widest font-bold">Kutubxona yuklanmoqda...</span>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center p-6 rounded-3xl bg-white/[0.02] border border-white/5">
          <div className="p-4 rounded-3xl bg-blue-600/10 text-blue-400 mb-3">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base font-extrabold text-white mb-1">
            {activeTab === 'saved' ? "Hech qanday test saqlanmagan" : "Mos testlar topilmadi"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            {activeTab === 'saved'
              ? "Ommaviy kutubxonadan o'zingizga ma'qul testlarni belgilab, shu yerda saqlang."
              : "Qidiruv so'zini o'zgartirib ko'ring yoki boshqa kategoriyani tanlang."}
          </p>
          {activeTab === 'saved' && (
            <button
              onClick={() => setActiveTab('public')}
              className="px-4 py-2 rounded-2xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 transition-all shadow-md shadow-blue-500/20"
            >
              Ommaviy Kutubxonaga o'tish
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map(quiz => {
            const isSaved = savedQuizIds.has(quiz.id) || quiz.is_saved;
            const isOwner = quiz.creator_name === user?.displayName;

            return (
              <div
                key={quiz.id}
                className="p-4 rounded-3xl bg-slate-900/60 border border-white/10 hover:border-blue-500/40 transition-all flex flex-col justify-between backdrop-blur-xl group relative overflow-hidden shadow-lg shadow-black/20"
              >
                <div>
                  {/* Badge & Info */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      {quiz.category || 'Umumiy'}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {quiz.views_count || 0}
                      </span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-extrabold text-white text-base leading-snug line-clamp-2 group-hover:text-blue-300 transition-colors">
                    {quiz.title}
                  </h3>

                  {/* Author & Stats */}
                  <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
                    <span>
                      {quiz.questions_count || 0} ta savol
                    </span>
                    <span className="text-[11px] text-slate-500 truncate max-w-[140px]">
                      {quiz.creator_name ? `Muallif: ${quiz.creator_name}` : 'HEMIS'}
                    </span>
                  </div>

                  {/* Agar recent bo'lsa oxirgi ball */}
                  {quiz.percentage !== undefined && (
                    <div className="mt-2.5 p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400">Oxirgi natija:</span>
                      <span className={cn(
                        quiz.percentage >= 70 ? "text-emerald-400" : "text-amber-400"
                      )}>
                        {quiz.percentage}% ({quiz.score}/{quiz.questions_count})
                      </span>
                    </div>
                  )}
                </div>

                {/* Tugmalar paneli */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-1.5">
                  <button
                    onClick={() => navigate(`/quiz/${quiz.id}`)}
                    className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/30"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Yechish</span>
                  </button>

                  <button
                    onClick={() => navigate(`/flashcards/${quiz.id}`)}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all"
                    title="Flashcardlar"
                  >
                    <Layers className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => toggleSaveQuiz(quiz)}
                    className={cn(
                      "p-2 rounded-xl border transition-all",
                      isSaved
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                    )}
                    title={isSaved ? "Saqlanganlardan o'chirish" : "Kutubxonaga saqlash"}
                  >
                    {isSaved ? (
                      <BookmarkCheck className="w-4 h-4 fill-current" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    onClick={() => handleForkQuiz(quiz)}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white transition-all"
                    title="Shaxsiy nusxa olish (Fork)"
                  >
                    <GitFork className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setShareModalQuiz(quiz)}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 text-slate-400 hover:text-white transition-all"
                    title="Ulashish"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setReportModalQuiz(quiz)}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/30 text-slate-500 hover:text-red-400 transition-all"
                    title="Shikoyat qilish"
                  >
                    <Flag className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ulashish Modali */}
      {shareModalQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl relative">
            <button
              onClick={() => setShareModalQuiz(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Testni ulashish</h3>
                <p className="text-xs text-slate-400 line-clamp-1">{shareModalQuiz.title}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">To'g'ridan-to'g'ri havola:</label>
                <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-black/40 border border-white/10">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/q/${shareModalQuiz.slug || shareModalQuiz.id}`}
                    className="bg-transparent text-xs text-slate-200 flex-1 focus:outline-none"
                  />
                  <button
                    onClick={() => copyShareLink(shareModalQuiz)}
                    className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Nusxa</span>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <a
                  href={getTelegramShareUrl(shareModalQuiz)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-sky-600/30"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Telegram orqali do'stlarga yuborish</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shikoyat qilish Modali */}
      {reportModalQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl relative">
            <button
              onClick={() => setReportModalQuiz(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-red-600/20 text-red-400 border border-red-500/30">
                <Flag className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Test ustidan shikoyat</h3>
                <p className="text-xs text-slate-400 line-clamp-1">{reportModalQuiz.title}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1.5">Sababni tanlang:</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-red-500/50"
                >
                  <option value="incorrect_answers">❌ Noto'g'ri kalitlar yoki javoblar</option>
                  <option value="offensive_content">🚫 Nomaqbul yoki haqoratomuz mazmun</option>
                  <option value="copyright">©️ Mualliflik huquqining buzilishi</option>
                  <option value="spam">⚠️ Spam yoki keraksiz fayl</option>
                  <option value="other">📝 Boshqa sabab</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1.5">Izoh (ixtiyoriy):</label>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Qaysi savolda xatolik borligini batafsil yozishingiz mumkin..."
                  rows={3}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportModalQuiz(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  disabled={submittingReport}
                  onClick={submitReport}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all disabled:opacity-50"
                >
                  {submittingReport ? "Yuborilmoqda..." : "Shikoyatni yuborish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Yangi Jild Modali */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl relative">
            <button
              onClick={() => setShowFolderModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                <FolderPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Yangi Jild Yaratish</h3>
                <p className="text-xs text-slate-400">Testlarni saralab saqlash uchun</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Jild nomi:</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Masalan: Anatomiya yakuniy"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Rang tanlang:</label>
                <div className="flex items-center gap-2">
                  {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewFolderColor(color)}
                      className={cn(
                        "w-7 h-7 rounded-full transition-transform",
                        newFolderColor === color && "scale-125 ring-2 ring-white"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  disabled={creatingFolder || !newFolderName.trim()}
                  onClick={handleCreateFolder}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all disabled:opacity-50"
                >
                  {creatingFolder ? "Yaratilmoqda..." : "Yaratish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
