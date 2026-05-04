
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

import firebaseAppletConfig from './firebase-applet-config.json';

const getFirebaseConfig = () => {
  const env = import.meta.env;
  
  // Ambil dari localStorage (untuk input manual dari UI)
  const localKey = localStorage.getItem('si-lks-firebase-apikey');
  const localProjectId = localStorage.getItem('si-lks-firebase-projectid');
  const localAppId = localStorage.getItem('si-lks-firebase-appid');
  const localStorageBucket = localStorage.getItem('si-lks-firebase-storage');

  // Standard VITE variable names
  const envKey = env.VITE_FIREBASE_API_KEY || env.VITE_FIREBASE_API_K;
  const envProjectId = env.VITE_FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJ;
  const envAppId = env.VITE_FIREBASE_APP_ID || env.VITE_FIREBASE_APP_I;
  const envStorageBucket = env.VITE_FIREBASE_STORAGE_BUCKET || env.VITE_FIREBASE_STOR;

  // Use auto-provisioned config as base
  const config = {
    apiKey: localKey || (envKey ? envKey.trim().replace(/^["'](.+)["']$/, '$1') : firebaseAppletConfig.apiKey),
    authDomain: firebaseAppletConfig.authDomain,
    projectId: localProjectId || (envProjectId ? envProjectId.trim().replace(/^["'](.+)["']$/, '$1') : firebaseAppletConfig.projectId),
    storageBucket: localStorageBucket || (envStorageBucket ? envStorageBucket.trim().replace(/^["'](.+)["']$/, '$1') : firebaseAppletConfig.storageBucket),
    appId: localAppId || (envAppId ? envAppId.trim().replace(/^["'](.+)["']$/, '$1') : firebaseAppletConfig.appId),
  };

  // Update authDomain based on projectId
  if (config.projectId) {
    config.authDomain = `${config.projectId}.firebaseapp.com`;
  }

  if (localKey || localProjectId) {
    console.log("Firebase: Menggunakan konfigurasi MANUAL dari Browser Storage");
  } else if (envKey || envProjectId) {
    console.log("Firebase: Menggunakan konfigurasi dari Environment Variables");
  } else {
    console.log("Firebase: Menggunakan konfigurasi default (Auto-provisioned)");
  }
  
  return config;
};

export const firebaseConfig = getFirebaseConfig();

// Logging untuk mempermudah debug (pastikan key tidak bocor sepenuhnya di log publik)
console.log(`Firebase Project ID: ${firebaseConfig.projectId}`);
console.log(`Request Origin: ${typeof window !== 'undefined' ? window.location.origin : 'Server-side'}`);
if (firebaseConfig.apiKey) {
  console.log(`Firebase API Key: ${firebaseConfig.apiKey.substring(0, 8)}...`);
} else {
  console.error("Firebase API Key is missing!");
}

// Initialize Firebase
const app = (() => {
  if (getApps().length > 0) return getApp();
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "") {
    console.warn("Firebase: API Key kosong, aplikasi tidak diinisialisasi.");
    return null;
  }
  try {
    return initializeApp(firebaseConfig);
  } catch (err) {
    console.error("Firebase Initialization Error:", err);
    return null;
  }
})();

export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;
export const auth = app ? getAuth(app) : null;
export const googleProvider = new GoogleAuthProvider();

export const uploadFile = async (file: File, path: string): Promise<string> => {
  if (!storage) {
    console.warn("Firebase Storage not initialized. Storage object is null.");
    throw new Error("Firebase Storage belum dikonfigurasi. Silakan atur API Key dan Project ID di menu Profil.");
  }
  
  console.log(`Attempting to upload file to Firebase Storage: ${path} (${file.size} bytes)`);
  
  try {
    const storageRef = ref(storage, path);
    // Set metadata to help with CORS/Content-Type if needed
    const metadata = {
      contentType: file.type,
    };
    const snapshot = await uploadBytes(storageRef, file, metadata);
    console.log("File uploaded successfully to Firebase Storage. Ref:", snapshot.ref.fullPath);
    const url = await getDownloadURL(storageRef);
    console.log("Download URL obtained:", url);
    return url;
  } catch (error: any) {
    console.error("Error in uploadFile:", error);
    if (error.code === 'storage/retry-limit-exceeded') {
      throw new Error("Gagal mengunggah ke Firebase: Batas waktu habis. Pastikan konfigurasi Storage Bucket benar dan CORS telah diatur di Firebase Console.");
    } else if (error.code === 'storage/unauthorized') {
      throw new Error("Gagal mengunggah ke Firebase: Izin ditolak. Pastikan aturan keamanan (Security Rules) Firebase Storage mengizinkan unggahan.");
    } else if (error.code === 'storage/canceled') {
      throw new Error("Unggahan dibatalkan.");
    }
    throw new Error(`Gagal mengunggah ke Firebase: ${error.message}`);
  }
};

export default app;
