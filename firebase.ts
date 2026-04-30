
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

import firebaseAppletConfig from './firebase-applet-config.json';

const getFirebaseConfig = () => {
  const envKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  // Log all VITE variables starting with FIREBASE for debugging (keys truncated)
  console.log("Variabel Environment yang terdeteksi:");
  Object.keys(import.meta.env).forEach(key => {
    if (key.includes('FIREBASE')) {
      const val = import.meta.env[key];
      console.log(`- ${key}: ${val ? (val.length > 8 ? val.substring(0, 8) + '...' : '***') : 'Kosong'}`);
    }
  });

  // Jika ada salah satu Env Var yang diisi, kita prioritaskan Env Var untuk semua field agar tidak campur
  if (envKey || envProjectId) {
    console.log("Firebase: Menggunakan konfigurasi dari Environment Variables (Settings).");
    return {
      apiKey: envKey || "",
      authDomain: envProjectId ? `${envProjectId}.firebaseapp.com` : "",
      projectId: envProjectId || "",
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (envProjectId ? `${envProjectId}.firebasestorage.app` : ""),
      appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    };
  }

  console.warn("Firebase: Tidak ada VITE_FIREBASE_API_KEY di Environment Variables. Menggunakan konfigurasi default.");
  return {
    apiKey: firebaseAppletConfig.apiKey,
    authDomain: firebaseAppletConfig.authDomain,
    projectId: firebaseAppletConfig.projectId,
    storageBucket: firebaseAppletConfig.storageBucket,
    appId: firebaseAppletConfig.appId,
  };
};

const firebaseConfig = getFirebaseConfig();

// Logging untuk mempermudah debug (pastikan key tidak bocor sepenuhnya di log publik)
console.log(`Firebase Project ID: ${firebaseConfig.projectId}`);
if (firebaseConfig.apiKey) {
  console.log(`Firebase API Key: ${firebaseConfig.apiKey.substring(0, 8)}...`);
} else {
  console.error("Firebase API Key is missing!");
}

// Initialize Firebase
const app = (getApps().length === 0 && firebaseConfig.apiKey) 
  ? initializeApp(firebaseConfig) 
  : (getApps().length > 0 ? getApp() : null);

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
