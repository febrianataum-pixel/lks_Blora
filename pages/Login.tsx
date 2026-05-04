
import React, { useState } from 'react';
import { ShieldCheck, LogIn, RefreshCw, Globe } from 'lucide-react';
import { UserAccount } from '../types';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';

interface LoginProps {
  onLogin: (user: UserAccount) => void;
  appName: string;
  appLogo: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, appName, appLogo }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    if (!auth) {
      setError('Konfigurasi Firebase belum siap. Pastikan API Key sudah benar.');
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
      console.error("Login Error Details:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Login Google belum diaktifkan di Firebase Console.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError(`Domain ${window.location.hostname} belum didaftarkan di Authorized Domains Firebase.`);
      } else if (err.code === 'auth/api-key-not-valid' || err.message?.includes('api-key-not-valid')) {
        setError(`API Key tidak valid untuk Project ID ini. Cek kembali di Environment Variables.`);
      } else {
        setError(err.message || 'Gagal login via Google.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleAdminMockLogin = () => {
    const userAccount: UserAccount = {
      id: 'system-admin',
      username: 'admin',
      password: '',
      nama: 'Administrator (Offline)',
      role: 'Admin',
      createdAt: new Date().toISOString()
    };
    onLogin(userAccount);
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-blue-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-indigo-600/10 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 p-10 rounded-[3.5rem] shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-500 text-center">
        <div className="mb-10">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl mx-auto flex items-center justify-center shadow-2xl shadow-blue-600/40 mb-6 overflow-hidden">
            {appLogo ? (
              <img src={appLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <ShieldCheck size={40} className="text-white" />
            )}
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter leading-tight uppercase">{appName}</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Dinas Sosial Kabupaten Blora</p>
        </div>

        <div className="space-y-6">
          <p className="text-slate-300 text-sm font-medium mb-4">Masuk untuk mengelola data LKS dan Penerima Manfaat.</p>
          
          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl mb-6">
              <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest">{error}</p>
            </div>
          )}

          <button 
            onClick={handleGoogleLogin} 
            disabled={isConnecting} 
            className="w-full py-5 bg-white text-slate-900 rounded-[1.8rem] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-4 hover:bg-slate-100 disabled:opacity-50"
          >
            {isConnecting ? <RefreshCw className="animate-spin" size={20}/> : <Globe size={20} className="text-blue-600" />}
            {isConnecting ? 'MENGHUBUNGKAN...' : 'MASUK DENGAN GOOGLE'}
          </button>

          <button 
            onClick={handleAdminMockLogin}
            className="w-full mt-4 py-3 bg-transparent text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-600 transition-all"
          >
            Masuk Mode Demo (Tanpa Database Sync)
          </button>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
          Sistem Informasi Lembaga Kesejahteraan Sosial<br/>
          Pemerintah Kabupaten Blora
        </div>
      </div>
    </div>
  );
};

export default Login;
