
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Building2, Users, Menu, X, ChevronRight, LogOut, Bell, FileText, ClipboardList, UserCircle, ChevronLeft, Trash2, Clock, CheckCircle2, Cloud, CloudOff, RefreshCw, AlertCircle, CheckCircle, SearchCode, Filter, Loader2 } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import LKSList from './pages/LKSList';
import AdministrasiPage from './pages/Administrasi';
import PenerimaManfaatPage from './pages/PenerimaManfaat';
import AdvancedSearchPage from './pages/AdvancedSearch';
import RekomendasiPage from './pages/Rekomendasi';
import ProfilePage from './pages/Profile';
import LoginPage from './pages/Login';
import { MOCK_LKS, MOCK_PM, MOCK_USERS } from './constants';
import { LKS, PenerimaManfaat as PMType, UserAccount, LetterRecord } from './types';

// Firebase Imports
import { db, auth } from './firebase';
import { doc, onSnapshot, setDoc, collection, writeBatch } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

type Page = 'dashboard' | 'lks' | 'administrasi' | 'pm' | 'pencarian' | 'rekomendasi' | 'profile';

interface Notification {
  id: string;
  user: string;
  action: string;
  target: string;
  time: Date;
  isRead: boolean;
}

const APP_VERSION = "v1.4.0-auth";

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [navContext, setNavContext] = useState<{ id: string; type: 'LKS' | 'PM' } | null>(null);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const [appName, setAppName] = useState(() => localStorage.getItem('si-lks-appname') || 'SI-LKS BLORA');
  const [appLogo, setAppLogo] = useState<string | null>(() => localStorage.getItem('si-lks-applogo') || null);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>({
    id: 'system-admin',
    username: 'admin',
    password: '',
    nama: 'Administrator Sistem',
    role: 'Admin',
    createdAt: new Date().toISOString()
  });
  const [authLoading, setAuthLoading] = useState(false);

  const [allUsers, setAllUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem('si-lks-allusers');
    return saved ? JSON.parse(saved) : MOCK_USERS;
  });

  const [lksData, setLksData] = useState<LKS[]>(() => {
    const saved = localStorage.getItem('si-lks-lksdata');
    return saved ? JSON.parse(saved) : MOCK_LKS;
  });
  const [pmData, setPmData] = useState<PMType[]>(() => {
    const saved = localStorage.getItem('si-lks-pmdata');
    return saved ? JSON.parse(saved) : MOCK_PM;
  });
  const [lettersData, setLettersData] = useState<LetterRecord[]>(() => {
    const saved = localStorage.getItem('si-lks-lettersdata');
    return saved ? JSON.parse(saved) : [];
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('si-lks-notifications');
    return saved ? JSON.parse(saved).map((n: any) => ({ ...n, time: new Date(n.time) })) : [];
  });

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error' | 'connected'>('idle');
  const isRemoteUpdate = useRef<boolean>(false);
  const lastLocalUpdate = useRef<number>(0);
  const lastSyncedLks = useRef<string>('');
  const lastSyncedPm = useRef<string>('');
  const lastSyncedConfig = useRef<string>('');

  const [storageError, setStorageError] = useState<string | null>(null);

  // Removed Auth Listener - Accessing directly via System Admin
  useEffect(() => {
    setAuthLoading(false);
  }, []);

  // Refs for latest state to avoid stale closures in onSnapshot
  const appNameRef = useRef(appName);
  const appLogoRef = useRef(appLogo);
  const allUsersRef = useRef(allUsers);
  const lksDataRef = useRef(lksData);
  const pmDataRef = useRef(pmData);
  const lettersDataRef = useRef(lettersData);
  const notificationsRef = useRef(notifications);

  useEffect(() => { appNameRef.current = appName; }, [appName]);
  useEffect(() => { appLogoRef.current = appLogo; }, [appLogo]);
  useEffect(() => { allUsersRef.current = allUsers; }, [allUsers]);
  useEffect(() => { lksDataRef.current = lksData; }, [lksData]);
  useEffect(() => { pmDataRef.current = pmData; }, [pmData]);
  useEffect(() => { lettersDataRef.current = lettersData; }, [lettersData]);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);

  const markLocalUpdate = () => {
    lastLocalUpdate.current = Date.now();
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      try {
        localStorage.setItem('si-lks-appname', appName);
        localStorage.setItem('si-lks-applogo', appLogo || '');
        localStorage.setItem('si-lks-allusers', JSON.stringify(allUsers));
        localStorage.setItem('si-lks-lksdata', JSON.stringify(lksData));
        localStorage.setItem('si-lks-pmdata', JSON.stringify(pmData));
        localStorage.setItem('si-lks-lettersdata', JSON.stringify(lettersData));
        localStorage.setItem('si-lks-islogged', isLoggedIn.toString());
        localStorage.setItem('si-lks-notifications', JSON.stringify(notifications));
        if (currentUser) localStorage.setItem('si-lks-currentuser', JSON.stringify(currentUser));
        setStorageError(null);
      } catch (err: any) {
        console.error("Storage Error:", err);
        if (err.name === 'QuotaExceededError' || err.code === 22) {
          setStorageError("Memori Penyimpanan Penuh! Hapus beberapa dokumen PDF untuk menambah data baru.");
        }
      }
    }, 1000); // Debounce local storage saves
    return () => clearTimeout(timeout);
  }, [appName, appLogo, allUsers, lksData, pmData, lettersData, isLoggedIn, notifications, currentUser]);

  const [isGoogleConnected, setIsGoogleConnected] = useState(false);

  useEffect(() => {
    const checkGoogleStatus = async () => {
      try {
        const response = await fetch('/api/auth/google/status', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setIsGoogleConnected(data.connected);
        }
      } catch (err) {
        console.error("Failed to check Google status:", err);
      }
    };
    checkGoogleStatus();
  }, []);

  useEffect(() => {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    if (!projectId || !db) {
      setSyncStatus('idle');
      return;
    }

    try {
      const projectRef = doc(db, 'projects', projectId);
      const lksCol = collection(db, 'projects', projectId, 'lks');
      const pmCol = collection(db, 'projects', projectId, 'pm');

      // Listen to Config
      const unsubConfig = onSnapshot(projectRef, (snapshot) => {
        if (snapshot.exists()) {
          if (snapshot.metadata.hasPendingWrites || (Date.now() - lastLocalUpdate.current < 2000)) {
            return;
          }

          const cloud = snapshot.data();
          const configToSync = {
            appName: appNameRef.current, 
            appLogo: appLogoRef.current, 
            allUsers: allUsersRef.current, 
            lettersData: lettersDataRef.current,
            notifications: notificationsRef.current.map(n => ({...n, time: n.time.toISOString()}))
          };
          
          if (JSON.stringify(cloud) !== JSON.stringify(configToSync)) {
            isRemoteUpdate.current = true;
            if (cloud.appName && cloud.appName !== appNameRef.current) setAppName(cloud.appName);
            if (cloud.appLogo && cloud.appLogo !== appLogoRef.current) setAppLogo(cloud.appLogo);
            if (cloud.allUsers) setAllUsers(cloud.allUsers);
            if (cloud.lettersData) setLettersData(cloud.lettersData);
            if (cloud.notifications) setNotifications(cloud.notifications.map((n:any)=>({...n, time: new Date(n.time)})));
            setTimeout(() => { isRemoteUpdate.current = false; }, 200);
          }
        }
      });

      // Listen to LKS Collection
      const unsubLks = onSnapshot(lksCol, (snapshot) => {
        if (snapshot.metadata.hasPendingWrites || (Date.now() - lastLocalUpdate.current < 2000)) {
          return;
        }

        if (!snapshot.empty) {
          const data = snapshot.docs.map(d => d.data() as LKS);
          if (JSON.stringify(data) !== JSON.stringify(lksDataRef.current)) {
            isRemoteUpdate.current = true;
            setLksData(data);
            setTimeout(() => { isRemoteUpdate.current = false; }, 200);
          }
        }
      });

      // Listen to PM Collection
      const unsubPm = onSnapshot(pmCol, (snapshot) => {
        if (snapshot.metadata.hasPendingWrites || (Date.now() - lastLocalUpdate.current < 2000)) {
          return;
        }

        if (!snapshot.empty) {
          const data = snapshot.docs.map(d => d.data() as PMType);
          if (JSON.stringify(data) !== JSON.stringify(pmDataRef.current)) {
            isRemoteUpdate.current = true;
            setPmData(data);
            setTimeout(() => { isRemoteUpdate.current = false; }, 200);
          }
        }
      });

      setSyncStatus('connected');

      return () => {
        unsubConfig();
        unsubLks();
        unsubPm();
      };
    } catch (err) {
      console.error("Firebase Sync Error:", err);
      setSyncStatus('error');
    }
  }, [isLoggedIn]);

  // Sync Logic
  useEffect(() => {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    if (syncStatus !== 'connected' || isRemoteUpdate.current || !projectId || !db) return;

    const configToSync = {
      appName, appLogo, allUsers, lettersData,
      notifications: notifications.map(n => ({...n, time: n.time.toISOString()}))
    };
    const configStr = JSON.stringify(configToSync);
    
    if (configStr === lastSyncedConfig.current) return;

    const timeout = setTimeout(async () => {
      try {
        const projectRef = doc(db, 'projects', projectId);
        await setDoc(projectRef, {
          ...configToSync,
          lastSync: new Date().toISOString()
        }, { merge: true });
        lastSyncedConfig.current = configStr;
      } catch (err) {
        console.error("Config Sync Error:", err);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [appName, appLogo, allUsers, lettersData, notifications, syncStatus]);

  // Optimized Partial Sync LKS
  useEffect(() => {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    if (syncStatus !== 'connected' || isRemoteUpdate.current || !projectId || !db) return;

    const timeout = setTimeout(async () => {
      const currentLksStr = JSON.stringify(lksData);
      if (currentLksStr === lastSyncedLks.current) return;

      setSyncStatus('syncing');
      try {
        const prevLks = lastSyncedLks.current ? JSON.parse(lastSyncedLks.current) as LKS[] : [];
        
        const changedLks = lksData.filter(curr => {
          const prev = prevLks.find(p => p.id === curr.id);
          return !prev || JSON.stringify(prev) !== JSON.stringify(curr);
        });

        const currentIds = new Set(lksData.map(l => l.id));
        const deletedLksIds = prevLks.filter(p => !currentIds.has(p.id)).map(p => p.id);

        if (changedLks.length > 0 || deletedLksIds.length > 0) {
          const batchSize = 100;
          for (let i = 0; i < changedLks.length; i += batchSize) {
            const batch = writeBatch(db);
            changedLks.slice(i, i + batchSize).forEach(lks => {
              const lksDoc = doc(db, 'projects', projectId, 'lks', lks.id);
              batch.set(lksDoc, lks, { merge: true });
            });
            await batch.commit();
          }

          for (let i = 0; i < deletedLksIds.length; i += batchSize) {
            const batch = writeBatch(db);
            deletedLksIds.slice(i, i + batchSize).forEach(id => {
              const lksDoc = doc(db, 'projects', projectId, 'lks', id);
              batch.delete(lksDoc);
            });
            await batch.commit();
          }
        }
        
        lastSyncedLks.current = currentLksStr;
        setSyncStatus('connected');
      } catch (err) {
        console.error("LKS Sync Error:", err);
        setSyncStatus('error');
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [lksData, syncStatus]);

  // Optimized Partial Sync PM
  useEffect(() => {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    if (syncStatus !== 'connected' || isRemoteUpdate.current || !projectId || !db) return;

    const timeout = setTimeout(async () => {
      const currentPmStr = JSON.stringify(pmData);
      if (currentPmStr === lastSyncedPm.current) return;

      setSyncStatus('syncing');
      try {
        const prevPm = lastSyncedPm.current ? JSON.parse(lastSyncedPm.current) as PMType[] : [];
        
        const changedPm = pmData.filter(curr => {
          const prev = prevPm.find(p => p.id === curr.id);
          return !prev || JSON.stringify(prev) !== JSON.stringify(curr);
        });

        const currentIds = new Set(pmData.map(p => p.id));
        const deletedPmIds = prevPm.filter(p => !currentIds.has(p.id)).map(p => p.id);

        if (changedPm.length > 0 || deletedPmIds.length > 0) {
          const batchSize = 100;
          for (let i = 0; i < changedPm.length; i += batchSize) {
            const batch = writeBatch(db);
            changedPm.slice(i, i + batchSize).forEach(pm => {
              const pmDoc = doc(db, 'projects', projectId, 'pm', pm.id);
              batch.set(pmDoc, pm, { merge: true });
            });
            await batch.commit();
          }

          for (let i = 0; i < deletedPmIds.length; i += batchSize) {
            const batch = writeBatch(db);
            deletedPmIds.slice(i, i + batchSize).forEach(id => {
              const pmDoc = doc(db, 'projects', projectId, 'pm', id);
              batch.delete(pmDoc);
            });
            await batch.commit();
          }
        }
        
        lastSyncedPm.current = currentPmStr;
        setSyncStatus('connected');
      } catch (err) {
        console.error("PM Sync Error:", err);
        setSyncStatus('error');
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [pmData, syncStatus]);

  const addNotification = (action: string, target: string) => {
    if (!currentUser) return;
    const newNotif: Notification = {
      id: Math.random().toString(36).substr(2, 9),
      user: currentUser.nama,
      action,
      target,
      time: new Date(),
      isRead: false
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
  };

  const handleLogin = (user: UserAccount) => {
    markLocalUpdate();
    setCurrentUser(user);
    setIsLoggedIn(true);
    setActivePage('dashboard');
    addNotification('Login', 'Aplikasi');
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      markLocalUpdate();
      addNotification('Logout', 'Sesi');
      setIsLoggedIn(false);
      setCurrentUser(null);
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  const handleNavigateToDetail = (id: string, type: 'LKS' | 'PM') => {
    setNavContext({ id, type });
    setActivePage(type === 'LKS' ? 'lks' : 'pm');
  };

  if (authLoading) {
    return (
      <div className="h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <LoginPage 
        onLogin={handleLogin} 
        appName={appName} 
        appLogo={appLogo}
      />
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={24} /> },
    { id: 'lks', label: 'Data LKS', icon: <Building2 size={24} /> },
    { id: 'administrasi', label: 'Administrasi', icon: <ClipboardList size={24} /> },
    { id: 'pm', label: 'Penerima Manfaat', icon: <Users size={24} /> },
    { id: 'pencarian', label: 'Pencarian PM', icon: <Filter size={24} /> },
    { id: 'rekomendasi', label: 'Rekomendasi', icon: <FileText size={24} /> },
    { id: 'profile', label: 'Profil Saya', icon: <UserCircle size={24} /> },
  ];

  return (
    <div className="h-screen bg-[#F5F5F7] flex flex-col overflow-hidden font-inter relative">
      {/* macOS Menu Bar (Top) */}
      <header className="h-8 bg-white/70 backdrop-blur-xl border-b border-black/5 flex items-center justify-between px-4 sticky top-0 z-50 no-print select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 mr-2">
            <div className="w-3 h-3 rounded-full bg-[#FF5F57] border border-black/5"></div>
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/5"></div>
            <div className="w-3 h-3 rounded-full bg-[#28C840] border border-black/5"></div>
          </div>
          <div className="flex items-center gap-4 text-[13px] font-semibold text-slate-800">
            <span className="font-black">{appName}</span>
            <span className="font-medium opacity-60 hidden sm:inline">File</span>
            <span className="font-medium opacity-60 hidden sm:inline">Edit</span>
            <span className="font-medium opacity-60 hidden sm:inline">View</span>
            <span className="font-medium opacity-60 hidden sm:inline">Window</span>
            <span className="font-medium opacity-60 hidden sm:inline">Help</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[13px] font-semibold text-slate-800">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${syncStatus === 'connected' ? 'bg-emerald-500' : syncStatus === 'syncing' ? 'bg-blue-500 animate-pulse' : syncStatus === 'error' ? 'bg-red-500' : 'bg-slate-300'}`}></div>
            <span className="text-[10px] opacity-60 uppercase tracking-tight">{syncStatus}</span>
          </div>
          <span className="opacity-60">{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={`bg-white/40 backdrop-blur-xl border-r border-black/5 flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'} no-print`}>
          <div className="p-6 flex items-center justify-between">
            {!isSidebarCollapsed && <h1 className="text-xl font-black text-slate-800 tracking-tighter">SI-LKS</h1>}
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 hover:bg-black/5 rounded-lg text-slate-500">
              {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
          
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto no-scrollbar">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActivePage(item.id as Page); setNavContext(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${activePage === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-black/5'}`}
              >
                <div className={`${activePage === item.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'}`}>{item.icon}</div>
                {!isSidebarCollapsed && <span className="text-sm font-bold tracking-tight">{item.label}</span>}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-black/5">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all">
              <LogOut size={24} />
              {!isSidebarCollapsed && <span className="text-sm font-bold tracking-tight">Keluar</span>}
            </button>
          </div>
        </aside>
        
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Sub Header / Window Title Bar */}
        <header className="h-16 bg-white/40 backdrop-blur-md border-b border-black/5 flex items-center justify-between px-6 lg:px-10 z-40 no-print">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{activePage.charAt(0).toUpperCase() + activePage.slice(1)}</h2>
            {storageError && (
              <div className="flex items-center gap-1.5 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                <AlertCircle size={12} className="text-rose-600" />
                <p className="text-[10px] text-rose-700 font-bold uppercase tracking-tight">{storageError}</p>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative">
                <button onClick={() => setShowNotifPanel(!showNotifPanel)} className="p-2.5 bg-white/50 text-slate-600 rounded-xl hover:bg-white/80 transition-all relative group border border-black/5 shadow-sm">
                  <Bell size={18} />
                  {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white">{unreadCount}</span>}
                </button>
                <AnimatePresence>
                  {showNotifPanel && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-12 right-0 w-80 bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-black/5 z-[100] overflow-hidden"
                    >
                      <div className="p-5 border-b border-black/5 flex items-center justify-between bg-white/50">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Notifications</h4>
                        <button onClick={() => { setNotifications(notifications.map(n => ({...n, isRead: true}))); setShowNotifPanel(false); }} className="text-[10px] font-bold text-blue-600 hover:underline">Clear All</button>
                      </div>
                      <div className="max-h-80 overflow-y-auto no-scrollbar">
                        {notifications.length > 0 ? notifications.map(n => (
                          <div key={n.id} className={`p-4 border-b border-black/5 last:border-0 transition-colors ${n.isRead ? 'opacity-50' : 'bg-blue-500/5'}`}>
                            <p className="text-xs font-medium text-slate-800"><span className="font-bold text-blue-600">{n.user}</span> {n.action} <span className="font-bold">{n.target}</span></p>
                            <p className="text-[10px] text-slate-400 font-medium mt-1 uppercase">{n.time.toLocaleTimeString('id-ID')}</p>
                          </div>
                        )) : (
                          <div className="p-10 text-center text-slate-400 italic text-xs">No new notifications</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
             
             <button onClick={() => setActivePage('profile')} className="flex items-center gap-2.5 hover:bg-white/50 p-1 pr-3 rounded-2xl transition-all border border-transparent hover:border-black/5">
                <div className="w-8 h-8 rounded-xl overflow-hidden shadow-sm border border-black/10">
                   {currentUser?.avatar ? <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <img src={`https://ui-avatars.com/api/?name=${currentUser?.nama}&background=2563eb&color=fff`} alt="Avatar" />}
                </div>
                <div className="hidden md:block text-left">
                   <p className="text-[12px] font-bold text-slate-900 leading-none">{currentUser?.nama}</p>
                </div>
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <div className="max-w-7xl mx-auto pb-32">
            {activePage === 'dashboard' && <Dashboard lks={lksData} pm={pmData} onNavigateToItem={handleNavigateToDetail} />}
            {activePage === 'lks' && <LKSList data={lksData} setData={(val) => { markLocalUpdate(); setLksData(val); }} initialSelectedId={navContext?.type === 'LKS' ? navContext.id : undefined} onNotify={addNotification} appLogo={appLogo} isGoogleConnected={isGoogleConnected} />}
            {activePage === 'administrasi' && <AdministrasiPage data={lksData} setData={(val) => { markLocalUpdate(); setLksData(val); }} onNotify={addNotification} isGoogleConnected={isGoogleConnected} />}
            {activePage === 'pm' && <PenerimaManfaatPage lksData={lksData} pmData={pmData} setPmData={(val) => { markLocalUpdate(); setPmData(val); }} initialSelectedPmId={navContext?.type === 'PM' ? navContext.id : undefined} onNotify={addNotification} />}
            {activePage === 'pencarian' && <AdvancedSearchPage lksData={lksData} pmData={pmData} />}
            {activePage === 'rekomendasi' && <RekomendasiPage lksData={lksData} letters={lettersData} setLetters={(val) => { markLocalUpdate(); setLettersData(val); }} onNotify={addNotification} appLogo={appLogo} />}
            {activePage === 'profile' && currentUser && (
              <ProfilePage 
                currentUser={currentUser} 
                allUsers={allUsers} 
                setAllUsers={(val) => { markLocalUpdate(); setAllUsers(val); }} 
                onUpdateCurrentUser={(val) => { markLocalUpdate(); setCurrentUser(val); }} 
                appName={appName} 
                setAppName={(val) => { markLocalUpdate(); setAppName(val); }} 
                appLogo={appLogo} 
                setAppLogo={(val) => { markLocalUpdate(); setAppLogo(val); }}
                isGoogleConnected={isGoogleConnected}
              />
            )}
          </div>
        </div>

      </main>
    </div>
  </div>
  );
};

export default App;
