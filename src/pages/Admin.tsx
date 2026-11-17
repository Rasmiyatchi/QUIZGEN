import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Crown, ShieldAlert, DollarSign, BookOpen, Award, 
  Search, Plus, CheckCircle2, XCircle, Clock, RefreshCw, 
  Send, AlertTriangle, ArrowRight, Eye, ShieldCheck, FileText, Ban
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Admin() {
  const { user, authFetch } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'subscriptions' | 'orders' | 'audit'>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Foydalanuvchilar holati
  const [userList, setUserList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Obuna berish modali holati
  const [selectedUserForGrant, setSelectedUserForGrant] = useState<any>(null);
  const [grantPlan, setGrantPlan] = useState<'start' | 'pro' | 'master'>('pro');
  const [grantDays, setGrantDays] = useState(30);
  const [grantReason, setGrantReason] = useState('Admin tomonidan taqdim etildi');
  const [notifyUser, setNotifyUser] = useState(true);
  const [grantLoading, setGrantLoading] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  // Obunalar va Buyurtmalar ro'yxati
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [auditLogsList, setAuditLogsList] = useState<any[]>([]);
  const [loadingTable, setLoadingTable] = useState(false);

  // Obuna bekor qilish tasdiqlash modali
  const [confirmCancelUser, setConfirmCancelUser] = useState<{ id: string; name: string } | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Ruxsat tekshiruvi: faqat admin va superadmin
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (!isAdmin) return;
    loadStats();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'users') loadUsers();
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

  const handleGrantSubscription = async () => {
    if (!selectedUserForGrant) return;
    setGrantLoading(true);
    setActionSuccessMsg('');
    setActionErrorMsg('');

    try {
      const res = await authFetch(`/api/admin/users/${selectedUserForGrant.id}/subscription`, {
        method: 'POST',
        body: JSON.stringify({
          plan: grantPlan,
          durationDays: grantDays,
          reason: grantReason,
          notifyUser
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Obuna berishda xatolik");

      setActionSuccessMsg(`Foydalanuvchi ${selectedUserForGrant.first_name} ga ${grantPlan.toUpperCase()} tarifi (${grantDays} kun) muvaffaqiyatli berildi!`);
      setSelectedUserForGrant(null);
      loadUsers();
      loadStats();
    } catch (err: any) {
      setActionErrorMsg(err.message);
    } finally {
      setGrantLoading(false);
    }
  };

  const executeCancelSubscription = async () => {
    if (!confirmCancelUser) return;
    setCancelLoading(true);
    setActionSuccessMsg('');
    setActionErrorMsg('');
    try {
      const res = await authFetch(`/api/admin/users/${confirmCancelUser.id}/cancel-subscription`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Admin tomonidan bekor qilindi' })
      });
      if (res.ok) {
        setActionSuccessMsg(`${confirmCancelUser.name} ning obunasi bekor qilindi.`);
        setConfirmCancelUser(null);
        loadUsers();
        loadStats();
      } else {
        const data = await res.json();
        setActionErrorMsg(data.error || "Obunani bekor qilishda xatolik");
      }
    } catch (err: any) {
      setActionErrorMsg(err.message);
    } finally {
      setCancelLoading(false);
    }
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
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-wider border border-red-500/30">
                ADMINISTRATION
              </span>
              <span className="text-xs text-slate-400 font-bold">QUIZGEN v3</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Boshqaruv Paneli</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                loadStats();
                if (activeTab === 'users') loadUsers();
                if (activeTab === 'subscriptions') loadSubscriptions();
                if (activeTab === 'orders') loadOrders();
                if (activeTab === 'audit') loadAuditLogs();
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Yangilash</span>
            </button>
          </div>
        </div>

        {/* Action alerts */}
        {actionSuccessMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between">
            <span>{actionSuccessMsg}</span>
            <button onClick={() => setActionSuccessMsg('')}>✕</button>
          </div>
        )}
        {actionErrorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold flex items-center justify-between">
            <span>{actionErrorMsg}</span>
            <button onClick={() => setActionErrorMsg('')}>✕</button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl mb-8 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap",
              activeTab === 'dashboard' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "text-slate-400 hover:text-white"
            )}
          >
            <Award className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap",
              activeTab === 'users' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "text-slate-400 hover:text-white"
            )}
          >
            <Users className="w-4 h-4" /> Foydalanuvchilar
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap",
              activeTab === 'subscriptions' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "text-slate-400 hover:text-white"
            )}
          >
            <Crown className="w-4 h-4" /> Obunalar
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap",
              activeTab === 'orders' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "text-slate-400 hover:text-white"
            )}
          >
            <DollarSign className="w-4 h-4" /> Buyurtmalar
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap",
              activeTab === 'audit' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "text-slate-400 hover:text-white"
            )}
          >
            <FileText className="w-4 h-4" /> Audit Jurnali
          </button>
        </div>

        {/* Tab 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-6 rounded-[2rem] border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Foydalanuvchilar</span>
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-white">{stats?.totalUsers || 0}</h3>
                <span className="text-[11px] text-emerald-400 font-bold">Faol ro'yxatdan o'tganlar</span>
              </div>

              <div className="glass-card p-6 rounded-[2rem] border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Testlar</span>
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-white">{stats?.totalQuizzes || 0}</h3>
                <span className="text-[11px] text-indigo-400 font-bold">HEMIS va AI testlar</span>
              </div>

              <div className="glass-card p-6 rounded-[2rem] border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Topshirilgan Urinishlar</span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-white">{stats?.totalAttempts || 0}</h3>
                <span className="text-[11px] text-emerald-400 font-bold">Jami natijalar</span>
              </div>

              <div className="glass-card p-6 rounded-[2rem] border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jami Tushum</span>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-white">
                  {(stats?.totalRevenue || 0).toLocaleString()} <span className="text-sm font-bold text-slate-400">so'm</span>
                </h3>
                <span className="text-[11px] text-amber-400 font-bold">To'langan buyurtmalar</span>
              </div>
            </div>

            {/* Active Subscriptions Breakdown */}
            <div className="glass-card p-8 rounded-[2.5rem] border border-white/10">
              <h3 className="text-lg font-black text-white mb-6">Faol Obunalar Taqsimoti</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-1">Talaba Start (7 kun)</span>
                    <h4 className="text-2xl font-black text-white">{stats?.activeSubscriptions?.start || 0} ta</h4>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-400 font-black text-xs">7 999 so'm</span>
                </div>

                <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-blue-400 block mb-1">Sessiya Pro (30 kun)</span>
                    <h4 className="text-2xl font-black text-white">{stats?.activeSubscriptions?.pro || 0} ta</h4>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-blue-600 text-white font-black text-xs">29 999 so'm</span>
                </div>

                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-400 block mb-1">Grand Master (90 kun)</span>
                    <h4 className="text-2xl font-black text-white">{stats?.activeSubscriptions?.master || 0} ta</h4>
                  </div>
                  <span className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs">59 900 so'm</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: USERS */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Search Bar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ID, ism yoki @username bo'yicha qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadUsers()}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={loadUsers}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all"
              >
                Qidirish
              </button>
            </div>

            {/* Users Table */}
            <div className="glass-card rounded-[2.5rem] border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <tr>
                      <th className="py-4 px-6">Foydalanuvchi</th>
                      <th className="py-4 px-6">Telegram ID</th>
                      <th className="py-4 px-6">Tarif</th>
                      <th className="py-4 px-6">Rol</th>
                      <th className="py-4 px-6">Ro'yxatdan o'tgan</th>
                      <th className="py-4 px-6 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.07]">
                    {userList.map((u) => {
                      const isPro = u.subscription_plan === 'pro' || u.subscription_plan === 'master';
                      return (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-bold text-white">{u.first_name} {u.last_name || ''}</div>
                            {u.username && <div className="text-[11px] text-blue-400">@{u.username}</div>}
                          </td>
                          <td className="py-4 px-6 font-mono text-slate-300">{u.id}</td>
                          <td className="py-4 px-6">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-black uppercase",
                              u.subscription_plan === 'master' ? "bg-amber-500/20 text-amber-300" :
                              u.subscription_plan === 'pro' ? "bg-blue-500/20 text-blue-300" :
                              u.subscription_plan === 'start' ? "bg-indigo-500/20 text-indigo-300" :
                              "bg-white/10 text-slate-400"
                            )}>
                              {u.subscription_plan || 'free'}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-400 font-semibold">{u.role || 'student'}</td>
                          <td className="py-4 px-6 text-slate-400">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                          <td className="py-4 px-6 text-right space-x-2">
                            <button
                              onClick={() => setSelectedUserForGrant(u)}
                              className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white font-bold text-[11px] transition-all"
                            >
                              + Obuna berish
                            </button>
                            {isPro && (
                              <button
                                onClick={() => setConfirmCancelUser({ id: u.id, name: u.first_name })}
                                className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-600 text-red-300 hover:text-white font-bold text-[11px] transition-all"
                              >
                                Bekor qilish
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: SUBSCRIPTIONS */}
        {activeTab === 'subscriptions' && (
          <div className="glass-card rounded-[2.5rem] border border-white/10 overflow-hidden animate-in fade-in duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-4 px-6">ID / Foydalanuvchi</th>
                    <th className="py-4 px-6">Tarif</th>
                    <th className="py-4 px-6">Boshlanish</th>
                    <th className="py-4 px-6">Tugash</th>
                    <th className="py-4 px-6">Holat</th>
                    <th className="py-4 px-6">Manba</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.07]">
                  {subscriptionsList.map((s) => (
                    <tr key={s.id} className="hover:bg-white/[0.02]">
                      <td className="py-4 px-6">
                        <div className="font-bold text-white">{s.first_name || 'Foydalanuvchi'}</div>
                        <div className="font-mono text-[11px] text-slate-400">{s.user_id}</div>
                      </td>
                      <td className="py-4 px-6 font-black uppercase text-blue-400">{s.plan_id}</td>
                      <td className="py-4 px-6 text-slate-300">{new Date(s.starts_at).toLocaleDateString()}</td>
                      <td className="py-4 px-6 text-slate-300">{new Date(s.expires_at).toLocaleDateString()}</td>
                      <td className="py-4 px-6">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase",
                          s.status === 'active' ? "bg-emerald-500/20 text-emerald-400" :
                          s.status === 'scheduled' ? "bg-amber-500/20 text-amber-400" :
                          "bg-white/10 text-slate-400"
                        )}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400 font-semibold">{s.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: ORDERS */}
        {activeTab === 'orders' && (
          <div className="glass-card rounded-[2.5rem] border border-white/10 overflow-hidden animate-in fade-in duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-4 px-6">Buyurtma ID</th>
                    <th className="py-4 px-6">Foydalanuvchi</th>
                    <th className="py-4 px-6">Tarif</th>
                    <th className="py-4 px-6">Summa</th>
                    <th className="py-4 px-6">Holat</th>
                    <th className="py-4 px-6">Usul</th>
                    <th className="py-4 px-6">Sana</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.07]">
                  {ordersList.map((o) => (
                    <tr key={o.id} className="hover:bg-white/[0.02]">
                      <td className="py-4 px-6 font-mono font-bold text-white">{o.id}</td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-white">{o.first_name || 'Foydalanuvchi'}</div>
                        <div className="font-mono text-[11px] text-slate-400">{o.user_id}</div>
                      </td>
                      <td className="py-4 px-6 font-black uppercase text-blue-400">{o.plan}</td>
                      <td className="py-4 px-6 font-bold text-white">{o.amount?.toLocaleString()} so'm</td>
                      <td className="py-4 px-6">
                        <span className={cn(
                          "px-2.5 py-1 rounded-full text-[10px] font-black uppercase",
                          o.status === 'completed' ? "bg-emerald-500/20 text-emerald-400" :
                          o.status === 'pending' ? "bg-amber-500/20 text-amber-400" :
                          "bg-red-500/20 text-red-400"
                        )}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 uppercase text-slate-400">{o.payment_method}</td>
                      <td className="py-4 px-6 text-slate-400">{new Date(o.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: AUDIT LOG */}
        {activeTab === 'audit' && (
          <div className="glass-card rounded-[2.5rem] border border-white/10 overflow-hidden animate-in fade-in duration-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 border-b border-white/10 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-4 px-6">Vaqt</th>
                    <th className="py-4 px-6">Admin ID</th>
                    <th className="py-4 px-6">Amal</th>
                    <th className="py-4 px-6">Nishon</th>
                    <th className="py-4 px-6">Tafsilotlar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.07]">
                  {auditLogsList.map((a) => (
                    <tr key={a.id} className="hover:bg-white/[0.02]">
                      <td className="py-4 px-6 text-slate-400">{new Date(a.created_at).toLocaleString()}</td>
                      <td className="py-4 px-6 font-mono text-blue-400">{a.actor_id}</td>
                      <td className="py-4 px-6 font-bold text-white uppercase text-[11px]">{a.action}</td>
                      <td className="py-4 px-6 text-slate-300">{a.target_type}: {a.target_id}</td>
                      <td className="py-4 px-6 font-mono text-[11px] text-slate-400">
                        {a.details ? JSON.stringify(a.details) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: OBUNA BERISH (TZ 6.3 OQIMI) */}
        {selectedUserForGrant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
            <div className="glass-card rounded-[2.5rem] p-7 md:p-8 max-w-md w-full shadow-2xl border border-blue-500/40 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">ADMIN HARAKATI</span>
                  <h3 className="text-xl font-black text-white">Obuna Taqdim Etish</h3>
                </div>
                <button
                  onClick={() => setSelectedUserForGrant(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                  <span className="text-[11px] text-slate-400 font-bold block mb-0.5">Foydalanuvchi:</span>
                  <div className="font-black text-white">{selectedUserForGrant.first_name} ({selectedUserForGrant.id})</div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1.5">Tarifni tanlang:</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => { setGrantPlan('start'); setGrantDays(7); }}
                      className={cn(
                        "py-2.5 rounded-xl text-xs font-black uppercase border transition-all",
                        grantPlan === 'start' ? "bg-indigo-600 border-indigo-500 text-white" : "bg-white/5 border-white/10 text-slate-400"
                      )}
                    >
                      Start
                    </button>
                    <button
                      type="button"
                      onClick={() => { setGrantPlan('pro'); setGrantDays(30); }}
                      className={cn(
                        "py-2.5 rounded-xl text-xs font-black uppercase border transition-all",
                        grantPlan === 'pro' ? "bg-blue-600 border-blue-500 text-white" : "bg-white/5 border-white/10 text-slate-400"
                      )}
                    >
                      Pro
                    </button>
                    <button
                      type="button"
                      onClick={() => { setGrantPlan('master'); setGrantDays(90); }}
                      className={cn(
                        "py-2.5 rounded-xl text-xs font-black uppercase border transition-all",
                        grantPlan === 'master' ? "bg-amber-500 border-amber-400 text-slate-950 font-black" : "bg-white/5 border-white/10 text-slate-400"
                      )}
                    >
                      Master
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1.5">Muddati (kun):</label>
                  <input
                    type="number"
                    min={1}
                    value={grantDays}
                    onChange={(e) => setGrantDays(parseInt(e.target.value) || 1)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1.5">Sabab (Audit uchun majburiy):</label>
                  <input
                    type="text"
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                    placeholder="Masalan: Tanlov g'olibi yoki guruh uchun..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={notifyUser}
                    onChange={(e) => setNotifyUser(e.target.checked)}
                    className="accent-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-300">Foydalanuvchiga Telegramda xabar yuborish</span>
                </label>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedUserForGrant(null)}
                  className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleGrantSubscription}
                  disabled={grantLoading}
                  className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 disabled:opacity-50"
                >
                  {grantLoading ? "Yuklanmoqda..." : "Tasdiqlash"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Obunani bekor qilish tasdiqlash modali */}
        {confirmCancelUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="glass-card w-full max-w-md p-6 rounded-3xl border border-red-500/30 shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Obunani bekor qilish</h3>
                  <p className="text-xs text-slate-400">Ushbu amal darhol kuchga kiradi</p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                Foydalanuvchi <strong className="text-white font-bold">{confirmCancelUser.name}</strong> ({confirmCancelUser.id}) ning faol obunasi bekor qilinadi va hisob bepul (Free) rejimga qaytariladi. Davom ettirasizmi?
              </p>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmCancelUser(null)}
                  disabled={cancelLoading}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold text-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={executeCancelSubscription}
                  disabled={cancelLoading}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-red-500/25 disabled:opacity-50"
                >
                  {cancelLoading ? "Bajarilmoqda..." : "Ha, bekor qilinsin"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
