import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Crown, ShieldAlert, DollarSign, BookOpen, Award, 
  Search, Plus, CheckCircle2, XCircle, Clock, RefreshCw, 
  Send, AlertTriangle, ArrowRight, Eye, ShieldCheck, FileText, Ban,
  Radio, Tag, Download, Trash2, Flag, UserCheck, Megaphone, Check
} from 'lucide-react';
import { cn } from '../lib/utils';

type AdminTab = 'dashboard' | 'users' | 'moderation' | 'broadcast' | 'promos' | 'subscriptions' | 'orders' | 'audit';

export default function Admin() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Foydalanuvchilar holati
  const [userList, setUserList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Obuna berish modali
  const [selectedUserForGrant, setSelectedUserForGrant] = useState<any>(null);
  const [grantPlan, setGrantPlan] = useState<'start' | 'pro' | 'master'>('pro');
  const [grantDays, setGrantDays] = useState(30);
  const [grantReason, setGrantReason] = useState('Admin tomonidan taqdim etildi');
  const [notifyUser, setNotifyUser] = useState(true);
  const [grantLoading, setGrantLoading] = useState(false);

  // Ommaviy obuna (Bulk Grant) modali
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkUsersText, setBulkUsersText] = useState('');
  const [bulkPlan, setBulkPlan] = useState<'start' | 'pro' | 'master'>('pro');
  const [bulkDays, setBulkDays] = useState(30);
  const [bulkReason, setBulkReason] = useState('Universitet/guruh uchun ommaviy obuna');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);

  // Ban/Unban modali
  const [banUserTarget, setBanUserTarget] = useState<any>(null);
  const [banReason, setBanReason] = useState('Qoidalarni buzganlik uchun');
  const [banLoading, setBanLoading] = useState(false);

  // Moderatsiya (Reports) holati
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Xabarnoma (Broadcasts) holati
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSegment, setBroadcastSegment] = useState<'all' | 'pro' | 'free'>('all');
  const [broadcastsHistory, setBroadcastsHistory] = useState<any[]>([]);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Promokodlar holati
  const [promoCodesList, setPromoCodesList] = useState<any[]>([]);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoType, setNewPromoType] = useState<'percent' | 'fixed' | 'free_days'>('percent');
  const [newPromoValue, setNewPromoValue] = useState<number>(20);
  const [newPromoPlan, setNewPromoPlan] = useState('');
  const [newPromoMaxUses, setNewPromoMaxUses] = useState<number>(100);
  const [newPromoDays, setNewPromoDays] = useState<number>(30);
  const [showPromoModal, setShowPromoModal] = useState(false);

  // Obunalar, Buyurtmalar va Audit ro'yxati
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);

  // Obuna bekor qilish tasdiqlash modali
  const [confirmCancelUser, setConfirmCancelUser] = useState<{ id: string; name: string } | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Bildirishnomalar
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  // Ruxsat tekshiruvi: faqat admin va superadmin
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (!isAdmin) return;
    loadStats();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'moderation') loadReports();
    if (activeTab === 'broadcast') loadBroadcasts();
    if (activeTab === 'promos') loadPromos();
    if (activeTab === 'subscriptions') loadSubscriptions();
    if (activeTab === 'orders') loadOrders();
    if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab, isAdmin]);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await authFetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await authFetch(`/api/admin/users?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setUserList(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const res = await authFetch('/api/admin/reports');
      if (res.ok) {
        const data = await res.json();
        setReportsList(data.reports || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReports(false);
    }
  };

  const loadBroadcasts = async () => {
    try {
      const res = await authFetch('/api/admin/broadcasts');
      if (res.ok) {
        const data = await res.json();
        setBroadcastsHistory(data.broadcasts || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadPromos = async () => {
    try {
      const res = await authFetch('/api/admin/promo-codes');
      if (res.ok) {
        const data = await res.json();
        setPromoCodesList(data.promos || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadSubscriptions = async () => {
    setLoadingTable(true);
    try {
      const res = await authFetch('/api/admin/subscriptions');
      if (res.ok) {
        const data = await res.json();
        setSubscriptionsList(data.subscriptions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTable(false);
    }
  };

  const loadOrders = async () => {
    setLoadingTable(true);
    try {
      const res = await authFetch('/api/admin/orders');
      if (res.ok) {
        const data = await res.json();
        setOrdersList(data.orders || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTable(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoadingTable(true);
    try {
      const res = await authFetch('/api/admin/audit');
      if (res.ok) {
        const data = await res.json();
        setAuditLogsList(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTable(false);
    }
  };

  // Obuna berish
  const handleGrantSubscription = async () => {
    if (!selectedUserForGrant) return;
    setGrantLoading(true);
    setActionSuccessMsg('');
    setActionErrorMsg('');

    try {
      const res = await authFetch(`/api/admin/users/${selectedUserForGrant.id}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: grantPlan,
          durationDays: grantDays,
          reason: grantReason,
          notifyUser
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Obuna berishda xatolik");

      setActionSuccessMsg(`Foydalanuvchi ${selectedUserForGrant.first_name} ga ${grantPlan.toUpperCase()} tarifi (${grantDays} kun) berildi!`);
      setSelectedUserForGrant(null);
      loadUsers();
      loadStats();
    } catch (err: any) {
      setActionErrorMsg(err.message);
    } finally {
      setGrantLoading(false);
    }
  };

  // Ommaviy obuna (Bulk Grant)
  const handleBulkGrant = async () => {
    const rawList = bulkUsersText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (rawList.length === 0) {
      setActionErrorMsg("Kamida bitta foydalanuvchi kiriting.");
      return;
    }

    setBulkLoading(true);
    setActionSuccessMsg('');
    setActionErrorMsg('');
    try {
      const res = await authFetch('/api/admin/subscriptions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: rawList,
          plan: bulkPlan,
          durationDays: bulkDays,
          reason: bulkReason
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBulkResult(data);
        setActionSuccessMsg(`Ommaviy obuna: ${data.successCount} ta foydalanuvchiga muvaffaqiyatli berildi!`);
        loadUsers();
        loadStats();
      } else {
        setActionErrorMsg(data.error || "Ommaviy obuna xatosi");
      }
    } catch (err: any) {
      setActionErrorMsg(err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // Foydalanuvchini bloklash / blokdan chiqarish
  const handleBanSubmit = async () => {
    if (!banUserTarget) return;
    setBanLoading(true);
    try {
      const isAlreadyBanned = Boolean(banUserTarget.is_banned);
      const endpoint = isAlreadyBanned ? `/api/admin/users/${banUserTarget.id}/unban` : `/api/admin/users/${banUserTarget.id}/ban`;
      const res = await authFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: banReason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccessMsg(isAlreadyBanned ? "Foydalanuvchi blokdan chiqarildi." : "Foydalanuvchi bloklandi.");
        setBanUserTarget(null);
        loadUsers();
      } else {
        setActionErrorMsg(data.error || "Amalni bajarib bo'lmadi.");
      }
    } catch (err: any) {
      setActionErrorMsg(err.message);
    } finally {
      setBanLoading(false);
    }
  };

  // Moderatsiya shikoyatini hal qilish
  const handleResolveReport = async (reportId: string, action: 'dismiss' | 'hide' | 'delete') => {
    try {
      const res = await authFetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        setActionSuccessMsg(`Shikoyat ko'rib chiqildi (${action}).`);
        loadReports();
      }
    } catch (err: any) {
      setActionErrorMsg(err.message);
    }
  };

  // Xabarnoma yuborish
  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    setSendingBroadcast(true);
    setActionSuccessMsg('');
    setActionErrorMsg('');
    try {
      const res = await authFetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: broadcastMessage.trim(),
          segment: broadcastSegment
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccessMsg(`Xabarnoma yuborildi! Jami ${data.sentCount} ta foydalanuvchiga navbatga qo'yildi.`);
        setBroadcastMessage('');
        loadBroadcasts();
      } else {
        setActionErrorMsg(data.error || "Xabarnoma yuborishda xatolik.");
      }
    } catch (err: any) {
      setActionErrorMsg(err.message);
    } finally {
      setSendingBroadcast(false);
    }
  };

  // Promokod yaratish
  const handleCreatePromo = async () => {
    if (!newPromoCode.trim()) return;
    try {
      const res = await authFetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newPromoCode.trim(),
          type: newPromoType,
          value: newPromoValue,
          planId: newPromoPlan || undefined,
          maxUses: newPromoMaxUses,
          expiresDays: newPromoDays
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionSuccessMsg(`Promokod ${data.promo.code} yaratildi!`);
        setShowPromoModal(false);
        setNewPromoCode('');
        loadPromos();
      } else {
        setActionErrorMsg(data.error || "Promokod yaratib bo'lmadi.");
      }
    } catch (err: any) {
      setActionErrorMsg(err.message);
    }
  };

  // Promokod o'chirish
  const handleDeletePromo = async (id: string) => {
    try {
      const res = await authFetch(`/api/admin/promo-codes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setActionSuccessMsg("Promokod o'chirildi.");
        loadPromos();
      }
    } catch (err: any) {
      setActionErrorMsg(err.message);
    }
  };

  // CSV yuklab olish
  const downloadCsv = (path: string, filename: string) => {
    const link = document.createElement('a');
    link.href = path;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="glass-card rounded-[2.5rem] p-8 border border-red-500/30">
          <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white mb-2">Kirish Rad Etildi</h2>
          <p className="text-xs text-slate-400 mb-6">
            Ushbu sahifa faqat QUIZGEN tizim administratorlari uchun mo'ljallangan.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold"
          >
            Bosh sahifaga qaytish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-100 mesh-gradient-bg py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Yuqori Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-wider border border-red-500/30">
                ADMINISTRATION v2
              </span>
              <span className="text-xs text-slate-400 font-bold">QUIZGEN Platformasi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Boshqaruv va Moderatsiya Markazi
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => downloadCsv('/api/admin/export/users.csv', 'users.csv')}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition-all"
              title="Foydalanuvchilar bazasini CSV yuklash"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Users CSV</span>
            </button>

            <button
              onClick={() => downloadCsv('/api/admin/export/quizzes.csv', 'quizzes.csv')}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition-all"
              title="Testlar bazasini CSV yuklash"
            >
              <Download className="w-3.5 h-3.5 text-purple-400" />
              <span>Quizzes CSV</span>
            </button>

            <button
              onClick={() => {
                loadStats();
                if (activeTab === 'users') loadUsers();
                if (activeTab === 'moderation') loadReports();
                if (activeTab === 'broadcast') loadBroadcasts();
                if (activeTab === 'promos') loadPromos();
                if (activeTab === 'subscriptions') loadSubscriptions();
                if (activeTab === 'orders') loadOrders();
                if (activeTab === 'audit') loadAuditLogs();
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Yangilash</span>
            </button>
          </div>
        </div>

        {/* Action alerts */}
        {actionSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between">
            <span>{actionSuccessMsg}</span>
            <button onClick={() => setActionSuccessMsg('')}>✕</button>
          </div>
        )}
        {actionErrorMsg && (
          <div className="p-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold flex items-center justify-between">
            <span>{actionErrorMsg}</span>
            <button onClick={() => setActionErrorMsg('')}>✕</button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-2xl overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap",
              activeTab === 'dashboard' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "text-slate-400 hover:text-white"
            )}
          >
            <Award className="w-4 h-4" /> <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap",
              activeTab === 'users' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "text-slate-400 hover:text-white"
            )}
          >
            <Users className="w-4 h-4" /> <span>Foydalanuvchilar</span>
          </button>

          <button
            onClick={() => setActiveTab('moderation')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap",
              activeTab === 'moderation' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "text-slate-400 hover:text-white"
            )}
          >
            <Flag className="w-4 h-4" /> <span>Moderatsiya</span>
            {reportsList.filter(r => r.report_status === 'pending').length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px]">
                {reportsList.filter(r => r.report_status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap",
              activeTab === 'broadcast' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "text-slate-400 hover:text-white"
            )}
          >
            <Megaphone className="w-4 h-4" /> <span>Xabarnoma</span>
          </button>

          <button
            onClick={() => setActiveTab('promos')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap",
              activeTab === 'promos' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "text-slate-400 hover:text-white"
            )}
          >
            <Tag className="w-4 h-4" /> <span>Promokodlar</span>
          </button>

          <button
            onClick={() => setActiveTab('subscriptions')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap",
              activeTab === 'subscriptions' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "text-slate-400 hover:text-white"
            )}
          >
            <Crown className="w-4 h-4" /> <span>Obunalar</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap",
              activeTab === 'orders' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "text-slate-400 hover:text-white"
            )}
          >
            <DollarSign className="w-4 h-4" /> <span>Buyurtmalar</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap",
              activeTab === 'audit' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "text-slate-400 hover:text-white"
            )}
          >
            <FileText className="w-4 h-4" /> <span>Audit Jurnali</span>
          </button>
        </div>

        {/* Tab 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="p-4 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
                <span className="text-xs text-slate-400 font-bold block mb-1">Foydalanuvchilar</span>
                <span className="text-2xl font-black text-white">{stats?.totalUsers || 0}</span>
              </div>
              <div className="p-4 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
                <span className="text-xs text-slate-400 font-bold block mb-1">Yaratilgan testlar</span>
                <span className="text-2xl font-black text-blue-400">{stats?.totalQuizzes || 0}</span>
              </div>
              <div className="p-4 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
                <span className="text-xs text-slate-400 font-bold block mb-1">Urinishlar</span>
                <span className="text-2xl font-black text-purple-400">{stats?.totalAttempts || 0}</span>
              </div>
              <div className="p-4 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
                <span className="text-xs text-slate-400 font-bold block mb-1">Buyurtmalar</span>
                <span className="text-2xl font-black text-emerald-400">{stats?.totalOrders || 0}</span>
              </div>
              <div className="p-4 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl col-span-2 md:col-span-1">
                <span className="text-xs text-slate-400 font-bold block mb-1">Jami Tushum</span>
                <span className="text-2xl font-black text-amber-400">{(stats?.totalRevenue || 0).toLocaleString()} so'm</span>
              </div>
            </div>

            {/* Faol Obunalar Bo'linishi */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl">
              <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4">
                💎 Faol Obunalar Bo'linishi
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-bold">🥉 Talaba Start</span>
                    <span className="text-xl font-black text-white">{stats?.activeSubscriptions?.start || 0} ta</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-blue-400 block font-bold">🥈 Sessiya Pro</span>
                    <span className="text-xl font-black text-blue-300">{stats?.activeSubscriptions?.pro || 0} ta</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-amber-400 block font-bold">🥇 Grand Master</span>
                    <span className="text-xl font-black text-amber-300">{stats?.activeSubscriptions?.master || 0} ta</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: FOYDALANUVCHILAR */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                  placeholder="ID, @username yoki ism bo'yicha qidirish..."
                  className="w-full bg-slate-900/60 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadUsers}
                  className="px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-all"
                >
                  Qidirish
                </button>
                <button
                  onClick={() => setShowBulkModal(true)}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/20"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Ommaviy obuna (Bulk)</span>
                </button>
              </div>
            </div>

            {loadingUsers ? (
              <div className="py-20 text-center text-slate-400 text-xs">Foydalanuvchilar yuklanmoqda...</div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3.5">Foydalanuvchi</th>
                      <th className="p-3.5">Telegram ID</th>
                      <th className="p-3.5">Tarif</th>
                      <th className="p-3.5">Holati</th>
                      <th className="p-3.5 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {userList.map(u => (
                      <tr key={u.id} className="hover:bg-white/[0.02]">
                        <td className="p-3.5 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <span>{u.first_name || 'Noma\'lum'}</span>
                            {u.username && <span className="text-blue-400 text-[11px]">@{u.username}</span>}
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-400">{u.id}</td>
                        <td className="p-3.5">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-black uppercase",
                            u.subscription_plan === 'master' ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                            u.subscription_plan === 'pro' ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" :
                            u.subscription_plan === 'start' ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" :
                            "bg-white/5 text-slate-400"
                          )}>
                            {u.subscription_plan || 'free'}
                          </span>
                        </td>
                        <td className="p-3.5">
                          {u.is_banned ? (
                            <span className="text-red-400 font-bold text-[10px] bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                              🚫 Bloklangan
                            </span>
                          ) : (
                            <span className="text-emerald-400 font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              ✅ Faol
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right space-x-1.5">
                          <button
                            onClick={() => setSelectedUserForGrant(u)}
                            className="px-2.5 py-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-bold text-[11px]"
                          >
                            Obuna berish
                          </button>
                          <button
                            onClick={() => setBanUserTarget(u)}
                            className={cn(
                              "px-2.5 py-1 rounded-xl border font-bold text-[11px]",
                              u.is_banned 
                                ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/30" 
                                : "bg-red-600/20 text-red-300 border-red-500/30"
                            )}
                          >
                            {u.is_banned ? "Unban" : "Ban"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: MODERATSIYA (Shikoyatlar navbati) */}
        {activeTab === 'moderation' && (
          <div className="space-y-4">
            <h3 className="text-base font-black text-white">Shikoyat qilingan testlar navbati</h3>
            {reportsList.length === 0 ? (
              <div className="py-20 text-center text-slate-400 text-xs">
                ✅ Hozirda hech qanday shikoyat yo'q. Barcha testlar toza!
              </div>
            ) : (
              <div className="space-y-3">
                {reportsList.map(rep => (
                  <div key={rep.report_id} className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-black uppercase">
                          {rep.reason}
                        </span>
                        <span className="text-xs text-slate-400">{new Date(rep.reported_at).toLocaleDateString()}</span>
                      </div>
                      <h4 className="font-extrabold text-white text-sm">{rep.quiz_title || `Quiz ID: ${rep.quiz_id}`}</h4>
                      <p className="text-xs text-slate-400">
                        Muallif: {rep.author_name || rep.author_id} • Shikoyatchi: {rep.reporter_id}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResolveReport(rep.report_id, 'dismiss')}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold border border-white/10"
                      >
                        Rad etish (Asossiz)
                      </button>
                      <button
                        onClick={() => handleResolveReport(rep.report_id, 'hide')}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30"
                      >
                        Yashirish (Hide)
                      </button>
                      <button
                        onClick={() => handleResolveReport(rep.report_id, 'delete')}
                        className="px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-bold border border-red-500/30"
                      >
                        O'chirish (Delete)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: XABARNOMA (Broadcast) */}
        {activeTab === 'broadcast' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-4">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-blue-400" />
                <span>Yangi Xabarnoma Yuborish</span>
              </h3>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Auditoriya Segmenti:</label>
                <select
                  value={broadcastSegment}
                  onChange={(e: any) => setBroadcastSegment(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs text-white font-bold"
                >
                  <option value="all">Barcha foydalanuvchilar (All)</option>
                  <option value="pro">Faqat Pro va Master obunachilar</option>
                  <option value="free">Faqat Bepul foydalanuvchilar</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Xabar Matni:</label>
                <textarea
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Hurmatli talabalar! QUIZGEN da yangi imkoniyatlar..."
                  rows={6}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
                />
                <span className="text-[10px] text-slate-500 text-right block mt-1">
                  {broadcastMessage.length} ta belgi
                </span>
              </div>

              <button
                disabled={sendingBroadcast || !broadcastMessage.trim()}
                onClick={handleSendBroadcast}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{sendingBroadcast ? "Yuborilmoqda..." : "Xabarnomani Yuborish"}</span>
              </button>
            </div>

            {/* Tarix */}
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-4">
              <h3 className="text-base font-black text-white">Yuborilgan Xabarnomalar Tarixi</h3>
              {broadcastsHistory.length === 0 ? (
                <p className="text-xs text-slate-500">Hozircha xabarnomalar yuborilmagan.</p>
              ) : (
                <div className="space-y-3">
                  {broadcastsHistory.map(b => (
                    <div key={b.id} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-bold text-blue-400">Segment: {b.segment}</span>
                        <span>{new Date(b.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-white font-medium line-clamp-2">{b.message}</p>
                      <span className="text-[10px] text-emerald-400 font-bold block">
                        ✅ Yetkazildi: {b.sent_count} ta
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: PROMOKODLAR */}
        {activeTab === 'promos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white">Promokodlar Boshqaruvi</h3>
              <button
                onClick={() => setShowPromoModal(true)}
                className="px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Yangi Promokod</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {promoCodesList.map(pr => (
                <div key={pr.id} className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-black text-sm text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {pr.code}
                      </span>
                      <button
                        onClick={() => handleDeletePromo(pr.id)}
                        className="text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-slate-300 font-bold">
                      {pr.type === 'percent' ? `${pr.value}% chegirma` : pr.type === 'fixed' ? `${pr.value.toLocaleString()} so'm chegirma` : `+${pr.value} kun bepul`}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Ishlatildi: {pr.current_uses} / {pr.max_uses} ta
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 6: OBUNALAR */}
        {activeTab === 'subscriptions' && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Foydalanuvchi</th>
                  <th className="p-3.5">Tarif</th>
                  <th className="p-3.5">Holati</th>
                  <th className="p-3.5">Boshlangan</th>
                  <th className="p-3.5">Tugash vaqti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {subscriptionsList.map(s => (
                  <tr key={s.id}>
                    <td className="p-3.5 font-bold text-white">{s.first_name || s.user_id}</td>
                    <td className="p-3.5 font-bold text-blue-400 uppercase">{s.plan_id}</td>
                    <td className="p-3.5 font-bold text-emerald-400">{s.status}</td>
                    <td className="p-3.5 text-slate-400">{new Date(s.starts_at).toLocaleDateString()}</td>
                    <td className="p-3.5 text-slate-400">{new Date(s.expires_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 7: BUYURTMALAR */}
        {activeTab === 'orders' && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Buyurtma ID</th>
                  <th className="p-3.5">Foydalanuvchi</th>
                  <th className="p-3.5">Tarif</th>
                  <th className="p-3.5">Summa</th>
                  <th className="p-3.5">Holati</th>
                  <th className="p-3.5">Vaqti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {ordersList.map(o => (
                  <tr key={o.id}>
                    <td className="p-3.5 font-mono text-[11px] text-slate-400">{o.id}</td>
                    <td className="p-3.5 font-bold text-white">{o.first_name || o.user_id}</td>
                    <td className="p-3.5 uppercase font-bold text-blue-400">{o.plan}</td>
                    <td className="p-3.5 font-bold text-amber-400">{(o.amount || 0).toLocaleString()} so'm</td>
                    <td className="p-3.5 font-bold">{o.status}</td>
                    <td className="p-3.5 text-slate-400">{o.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 8: AUDIT JURNALI */}
        {activeTab === 'audit' && (
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Admin ID</th>
                  <th className="p-3.5">Amal</th>
                  <th className="p-3.5">Nishon</th>
                  <th className="p-3.5">Tafsilotlar</th>
                  <th className="p-3.5">Vaqt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {auditLogsList.map(a => (
                  <tr key={a.id}>
                    <td className="p-3.5 font-mono text-[11px] text-slate-400">{a.actor_id}</td>
                    <td className="p-3.5 font-bold text-purple-300">{a.action}</td>
                    <td className="p-3.5 font-mono text-[11px]">{a.target_id}</td>
                    <td className="p-3.5 text-slate-400 text-[11px]">{JSON.stringify(a.details)}</td>
                    <td className="p-3.5 text-slate-500 text-[11px]">{a.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Ommaviy obuna (Bulk Grant) modali */}
        {showBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className="w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl relative space-y-4">
              <button
                onClick={() => { setShowBulkModal(false); setBulkResult(null); }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                ✕
              </button>
              <h3 className="text-lg font-black text-white">Ommaviy Obuna Taqdim Etish (Bulk)</h3>
              <p className="text-xs text-slate-400">
                Guruh yoki talabalar ro'yxatiga bir vaqtning o'zida obuna berish
              </p>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Telegram ID yoki @usernamelar (har bir qatorda bittadan yoki vergul bilan):
                </label>
                <textarea
                  value={bulkUsersText}
                  onChange={(e) => setBulkUsersText(e.target.value)}
                  placeholder="123456789&#10;987654321&#10;@alisher_talaba"
                  rows={5}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-3 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-purple-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Tarif:</label>
                  <select
                    value={bulkPlan}
                    onChange={(e: any) => setBulkPlan(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white font-bold"
                  >
                    <option value="start">🥉 Talaba Start</option>
                    <option value="pro">🥈 Sessiya Pro</option>
                    <option value="master">🥇 Grand Master</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Kun soni:</label>
                  <input
                    type="number"
                    value={bulkDays}
                    onChange={(e) => setBulkDays(parseInt(e.target.value) || 30)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white font-bold"
                  />
                </div>
              </div>

              <button
                disabled={bulkLoading || !bulkUsersText.trim()}
                onClick={handleBulkGrant}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-purple-600/30 transition-all"
              >
                {bulkLoading ? "Bajarilmoqda..." : "Tasdiqlash va Berish"}
              </button>
            </div>
          </div>
        )}

        {/* Ban / Unban modali */}
        {banUserTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl relative space-y-4">
              <button
                onClick={() => setBanUserTarget(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                ✕
              </button>
              <h3 className="text-lg font-black text-white">
                {banUserTarget.is_banned ? "Blokdan chiqarish" : "Foydalanuvchini bloklash"}
              </h3>
              <p className="text-xs text-slate-400">
                Foydalanuvchi: <b className="text-white">{banUserTarget.first_name}</b> ({banUserTarget.id})
              </p>

              {!banUserTarget.is_banned && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Sabab:</label>
                  <input
                    type="text"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Qoidabuzarlik sababi..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBanUserTarget(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  disabled={banLoading}
                  onClick={handleBanSubmit}
                  className={cn(
                    "flex-1 py-2.5 rounded-xl font-black text-xs text-white shadow-lg",
                    banUserTarget.is_banned ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"
                  )}
                >
                  {banLoading ? "Bajarilmoqda..." : banUserTarget.is_banned ? "Blokdan chiqarish" : "Bloklash"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Obuna berish modali */}
        {selectedUserForGrant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className="w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl relative space-y-4">
              <button
                onClick={() => setSelectedUserForGrant(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                ✕
              </button>
              <h3 className="text-lg font-black text-white">Obuna Berish</h3>
              <p className="text-xs text-slate-400">
                Foydalanuvchi: <b className="text-white">{selectedUserForGrant.first_name}</b> ({selectedUserForGrant.id})
              </p>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Tarif:</label>
                <select
                  value={grantPlan}
                  onChange={(e: any) => setGrantPlan(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white font-bold"
                >
                  <option value="start">🥉 Talaba Start</option>
                  <option value="pro">🥈 Sessiya Pro</option>
                  <option value="master">🥇 Grand Master</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Kun soni:</label>
                <input
                  type="number"
                  value={grantDays}
                  onChange={(e) => setGrantDays(parseInt(e.target.value) || 30)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Sabab:</label>
                <input
                  type="text"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="notify"
                  checked={notifyUser}
                  onChange={(e) => setNotifyUser(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="notify" className="text-xs text-slate-300 font-bold cursor-pointer">
                  Foydalanuvchiga Telegramda xabar yuborish
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForGrant(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  disabled={grantLoading}
                  onClick={handleGrantSubscription}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-lg shadow-blue-600/30"
                >
                  {grantLoading ? "Berilmoqda..." : "Berish"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Promokod yaratish modali */}
        {showPromoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <div className="w-full max-w-sm p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl relative space-y-4">
              <button
                onClick={() => setShowPromoModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                ✕
              </button>
              <h3 className="text-lg font-black text-white">Yangi Promokod</h3>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Kod:</label>
                <input
                  type="text"
                  value={newPromoCode}
                  onChange={(e) => setNewPromoCode(e.target.value.toUpperCase())}
                  placeholder="TALABA2026"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Turi:</label>
                  <select
                    value={newPromoType}
                    onChange={(e: any) => setNewPromoType(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white font-bold"
                  >
                    <option value="percent">Foiz (%)</option>
                    <option value="fixed">Aniq summa (so'm)</option>
                    <option value="free_days">Bonus kunlar</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Qiymat:</label>
                  <input
                    type="number"
                    value={newPromoValue}
                    onChange={(e) => setNewPromoValue(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-xs text-white font-bold"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreatePromo}
                disabled={!newPromoCode.trim()}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-blue-600/30 transition-all"
              >
                Yaratish
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
