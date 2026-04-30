
import React, { useState, useRef, useEffect } from 'react';
import { User, Shield, Trash2, UserPlus, Settings, Save, Image as ImageIcon, Camera, AlertTriangle, RefreshCw, Download, Upload, Share2, Cloud, ShieldCheck, CheckCircle2, Info, Loader2, UploadCloud, Globe } from 'lucide-react';
import { UserAccount } from '../types';

interface ProfileProps {
  currentUser: UserAccount;
  allUsers: UserAccount[];
  setAllUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  onUpdateCurrentUser: (user: UserAccount) => void;
  appName: string;
  setAppName: (name: string) => void;
  appLogo: string | null;
  setAppLogo: (logo: string | null) => void;
  cloudConfig: {apiKey: string, projectId: string} | null;
  setCloudConfig: (config: {apiKey: string, projectId: string} | null) => void;
  forcePush?: () => void;
  isGoogleConnected: boolean;
}

const Profile: React.FC<ProfileProps> = ({ 
  currentUser, 
  allUsers, 
  setAllUsers, 
  onUpdateCurrentUser,
  appName,
  setAppName,
  appLogo,
  setAppLogo,
  cloudConfig,
  setCloudConfig,
  forcePush,
  isGoogleConnected
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'admin' | 'system' | 'data'>('profile');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
  const [editNama, setEditNama] = useState(currentUser.nama);
  const [newPassword, setNewPassword] = useState('');
  
  const [firebaseApiKey, setFirebaseApiKey] = useState(cloudConfig?.apiKey || '');
  const [firebaseProjectId, setFirebaseProjectId] = useState(cloudConfig?.projectId || '');
  const [firebaseStorageBucket, setFirebaseStorageBucket] = useState(cloudConfig?.storageBucket || '');
  const [firebaseAppId, setFirebaseAppId] = useState(cloudConfig?.appId || '');
  
  const [tempAppName, setTempAppName] = useState(appName);
  const [newUser, setNewUser] = useState({ username: '', password: '', nama: '', role: 'User' as any });

  const compressImage = (file: File, maxSize: number): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          if (width > height) { if (width > maxSize) { height *= maxSize / width; width = maxSize; } }
          else { if (height > maxSize) { width *= maxSize / height; height = maxSize; } }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.5));
        };
      };
    });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    const updatedUser = { ...currentUser, nama: editNama };
    if (newPassword) updatedUser.password = newPassword;
    setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    onUpdateCurrentUser(updatedUser);
    setNewPassword('');
    setTimeout(() => { setIsProcessing(false); alert('Profil diperbarui.'); }, 800);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImage(true);
      const base64 = await compressImage(file, 128);
      const updatedUser = { ...currentUser, avatar: base64 };
      setAllUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
      onUpdateCurrentUser(updatedUser);
      setIsProcessingImage(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImage(true);
      const base64 = await compressImage(file, 300);
      setAppLogo(base64);
      setIsProcessingImage(false);
    }
  };

  const handleActivateCloudSync = () => {
    if (!firebaseApiKey || !firebaseProjectId) return alert('Lengkapi konfigurasi API Key dan Project ID.');
    setCloudConfig({ 
      apiKey: firebaseApiKey, 
      projectId: firebaseProjectId,
      storageBucket: firebaseStorageBucket,
      appId: firebaseAppId
    });
    alert('Sinkronisasi Cloud Aktif! Silakan muat ulang halaman jika diperlukan.');
  };

  const [googleDebug, setGoogleDebug] = useState<any>(null);
  const [isInIframe, setIsInIframe] = useState(false);
  
  useEffect(() => {
    // Check if running in iframe
    setIsInIframe(window.self !== window.top);

    const fetchGoogleDebug = async () => {
      try {
        const response = await fetch('/api/auth/google/config-debug');
        if (response.ok) {
          const data = await response.json();
          setGoogleDebug(data);
        } else {
          setGoogleDebug({ error: true });
        }
      } catch (err) {
        console.error("Failed to fetch Google debug info:", err);
        setGoogleDebug({ error: true });
      }
    };
    fetchGoogleDebug();
  }, [isGoogleConnected]);

  const handleConnectGoogle = async () => {
    try {
      const response = await fetch('/api/auth/google/url');
      const contentType = response.headers.get("content-type");
      
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Gagal mengambil URL autentikasi Google.");
        }
        window.open(data.url, 'google_auth', 'width=600,height=700');
      } else {
        const text = await response.text();
        console.error("Server returned non-JSON response:", text);
        const snippet = text.substring(0, 100);
        throw new Error(`Server error (Bukan JSON): ${response.status} ${response.statusText}. Pesan: ${snippet}...`);
      }
    } catch (error: any) {
      alert(error.message || "Gagal mengambil URL autentikasi Google.");
    }
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div className="flex bg-white p-2 rounded-[2rem] border border-slate-100 shadow-sm w-fit overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('profile')} className={`px-8 py-3 rounded-2xl text-xs font-black uppercase transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'profile' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><User size={16} /> Profil Saya</button>
        {currentUser.role === 'Admin' && (
          <button onClick={() => setActiveTab('admin')} className={`px-8 py-3 rounded-2xl text-xs font-black uppercase transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'admin' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}><Shield size={16} /> Manajemen User</button>
        )}
      </div>

      {activeTab === 'profile' && (
        <div className="bg-white p-10 rounded-[3rem] border shadow-xl max-w-4xl">
           <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
              <div className="relative group cursor-pointer">
                 <div className="w-32 h-32 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-white overflow-hidden ring-8 ring-slate-50 relative">
                   {currentUser.avatar ? <img src={currentUser.avatar} className="w-full h-full object-cover" /> : <img src={`https://ui-avatars.com/api/?name=${currentUser.nama}&background=random&color=fff&size=256`} />}
                   <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="text-white" size={32} />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                   </label>
                 </div>
              </div>
              <div className="text-center md:text-left">
                 <h2 className="text-3xl font-black text-slate-800">{currentUser.nama}</h2>
                 <p className="text-blue-600 font-bold uppercase text-[10px] tracking-widest mt-1">{currentUser.role}</p>
              </div>
           </div>
           <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Lengkap</label><input type="text" value={editNama} onChange={e => setEditNama(e.target.value)} className="w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ganti Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Biarkan kosong" className="w-full px-5 py-4 bg-slate-50 border rounded-2xl" /></div>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="submit" disabled={isProcessing} className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all">
                   {isProcessing ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} SIMPAN PERUBAHAN
                </button>
              </div>
           </form>
        </div>
      )}

      {activeTab === 'admin' && (
        <div className="space-y-8">
           <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
              <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-3"><UserPlus size={20} className="text-blue-600" /> Tambah Akun Pengguna</h3>
              <form onSubmit={e => {
                e.preventDefault();
                const user = { ...newUser, id: Math.random().toString(36).substr(2, 9), createdAt: new Date().toISOString() };
                setAllUsers(prev => [...prev, user]);
                setNewUser({ username: '', password: '', nama: '', role: 'User' });
                alert('User ditambahkan.');
              }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                 <div className="space-y-1"><label className="text-[10px] font-black text-slate-400">Username</label><input type="text" value={newUser.username} onChange={e=>setNewUser({...newUser, username: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm" /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black text-slate-400">Password</label><input type="password" value={newUser.password} onChange={e=>setNewUser({...newUser, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm" /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black text-slate-400">Nama</label><input type="text" value={newUser.nama} onChange={e=>setNewUser({...newUser, nama: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm" /></div>
                 <div className="space-y-1"><label className="text-[10px] font-black text-slate-400">Peran</label><select value={newUser.role} onChange={e=>setNewUser({...newUser, role: e.target.value as any})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm"><option value="User">User</option><option value="Admin">Admin</option></select></div>
                 <button type="submit" className="bg-blue-600 text-white px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg">Tambah</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
