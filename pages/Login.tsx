
import React, { useState } from 'react';
import { ShieldCheck, LogIn, RefreshCw, User, Lock, Settings, Database, Save, X, Globe } from 'lucide-react';
import { UserAccount } from '../types';
import { db, firebaseConfig, auth, googleProvider } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { signInWithPopup } from 'firebase/auth';

interface LoginProps {
  onLogin: (user: UserAccount) => void;
  appName: string;
  appLogo: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, appName, appLogo }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Config State
  const [showConfig, setShowConfig] = useState(false);
  const [manualApiKey, setManualApiKey] = useState(localStorage.getItem('si-lks-firebase-apikey') || firebaseConfig.apiKey || '');
  const [manualProjectId, setManualProjectId] = useState(localStorage.getItem('si-lks-firebase-projectid') || firebaseConfig.projectId || '');
  const [manualAppId, setManualAppId] = useState(localStorage.getItem('si-lks-firebase-appid') || firebaseConfig.appId || '');
  const [manualStorage, setManualStorage] = useState(localStorage.getItem('si-lks-firebase-storage') || firebaseConfig.storageBucket || '');

  const saveConfig = () => {
    localStorage.setItem('si-lks-firebase-apikey', manualApiKey);
    localStorage.setItem('si-lks-firebase-projectid', manualProjectId);
    localStorage.setItem('si-lks-firebase-appid', manualAppId);
    localStorage.setItem('si-lks-firebase-storage', manualStorage);
    window.location.reload(); // Reload to apply new config
  };

  const resetConfig = () => {
    localStorage.removeItem('si-lks-firebase-apikey');
    localStorage.removeItem('si-lks-firebase-projectid');
    localStorage.removeItem('si-lks-firebase-appid');
    localStorage.removeItem('si-lks-firebase-storage');
    window.location.reload();
  };

  const handleGoogleLogin = async () => {
    if (!auth) {
      setError('Konfigurasi Firebase belum siap. Cek Setelan Database (API Key).');
      return;
    }
    setIsConnecting(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userAccount: UserAccount = {
        id: user.uid,
        username: user.email || user.uid,
        password: '',
        nama: user.displayName || 'User',
        role: 'Admin',
        avatar: user.photoURL || undefined,
        createdAt: new Date().toISOString()
      };
      
      onLogin(userAccount);
    } catch (err: any) {
      console.error("Google Login Error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Login Google belum diaktifkan di Firebase Console.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`Domain ${window.location.hostname} belum didaftarkan di Authorized Domains.`);
      } else {
        setError(err.message || 'Gagal login via Google.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSimpleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username dan Password harus diisi.');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      // Untuk kemudahan, kita buat default admin: admin / admin123
      if (username === 'admin' && password === 'admin123') {
        const userAccount: UserAccount = {
          id: 'admin-id',
          username: 'admin',
          password: 'admin123',
          nama: 'Administrator',
          role: 'Admin',
          createdAt: new Date().toISOString()
        };
        onLogin(userAccount);
        return;
      }

      // Cek ke Firestore jika ada user lain
      const q = query(collection(db, 'users'), where('username', '==', username), where('password', '==', password));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data() as UserAccount;
        onLogin({ ...userData, id: querySnapshot.docs[0].id });
      } else {
        setError('Username atau Password salah.');
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      // Jika gagal konek firestore, beri tahu
      setError('Gagal menghubungkan ke database. Pastikan konfigurasi API Key dan Project ID benar.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-indigo-600/10 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500 text-center">
        {!showConfig ? (
          <>
            <div className="mb-8">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-600/40 mb-6 overflow-hidden">
                {appLogo ? (
                  <img src={appLogo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <ShieldCheck size={40} className="text-white" />
                )}
              </div>
              <h1 className="text-3xl font-black text-white tracking-tighter leading-tight uppercase">{appName}</h1>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Pemerintah Kabupaten Blora</p>
            </div>

            <form onSubmit={handleSimpleLogin} className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Username" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-sm"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="password" 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-bold text-sm"
                />
              </div>
              
              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl">
                  <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">{error}</p>
                </div>
              )}

              <button 
                type="submit"
                disabled={isConnecting} 
                className="w-full py-5 bg-blue-600 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-4 hover:bg-blue-500 disabled:opacity-50 mt-6"
              >
                {isConnecting ? <RefreshCw className="animate-spin" size={20}/> : <LogIn size={20} />}
                {isConnecting ? 'MEMPROSES...' : 'MASUK KE SISTEM'}
              </button>

              <div className="flex items-center gap-4 my-6">
                <div className="h-px bg-white/10 flex-1"></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Atau</span>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>

              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={isConnecting} 
                className="w-full py-5 bg-white text-slate-900 rounded-[1.8rem] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-4 hover:bg-slate-100 disabled:opacity-50"
              >
                {isConnecting ? <RefreshCw className="animate-spin" size={20}/> : <Globe size={20} className="text-blue-600" />}
                {isConnecting ? 'MENGHUBUNGKAN...' : 'MASUK DENGAN GOOGLE'}
              </button>
            </form>

            <button 
              onClick={() => setShowConfig(true)}
              className="mt-8 flex items-center gap-2 mx-auto text-slate-500 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest"
            >
              <Database size={14} />
              Setelan Database
            </button>
          </>
        ) : (
          <div className="animate-in slide-in-from-right-4 duration-300">
             <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3 text-white">
                 <Settings className="text-blue-500" size={24} />
                 <h2 className="text-xl font-black uppercase tracking-tight">Setelan Firebase</h2>
               </div>
               <button onClick={() => setShowConfig(false)} className="text-slate-500 hover:text-white transition-all">
                 <X size={24} />
               </button>
             </div>

             <div className="space-y-4 text-left">
               <div>
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">API Key</label>
                 <input 
                   type="text" 
                   value={manualApiKey}
                   onChange={(e) => setManualApiKey(e.target.value)}
                   placeholder="AIzaSyA..."
                   className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                 />
               </div>
               
               <div>
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Project ID</label>
                 <input 
                   type="text" 
                   value={manualProjectId}
                   onChange={(e) => setManualProjectId(e.target.value)}
                   placeholder="my-project-123"
                   className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                 />
               </div>

               <div>
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">App ID (Opsional)</label>
                 <input 
                   type="text" 
                   value={manualAppId}
                   onChange={(e) => setManualAppId(e.target.value)}
                   placeholder="1:123456789:web:abcdef"
                   className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                 />
               </div>

               <div>
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Storage Bucket</label>
                 <input 
                   type="text" 
                   value={manualStorage}
                   onChange={(e) => setManualStorage(e.target.value)}
                   placeholder="project-id.appspot.com"
                   className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                 />
               </div>

               <div className="pt-4 space-y-3">
                 <button 
                   onClick={saveConfig}
                   className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-blue-500 transition-all"
                 >
                   <Save size={18} />
                   Simpan & Muat Ulang
                 </button>
                 <button 
                   onClick={resetConfig}
                   className="w-full py-3 bg-white/5 text-slate-400 hover:text-white hover:bg-rose-600/20 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all"
                 >
                   Reset ke Default
                 </button>
               </div>
             </div>
          </div>
        )}

        <div className="mt-12 pt-8 border-t border-white/10 text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
          {!showConfig && (
            <>Gunakan username: <span className="text-slate-400">admin</span> & password: <span className="text-slate-400">admin123</span></>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
