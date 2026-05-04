
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

import firebaseAppletConfig from './firebase-applet-config.json';

const getFirebaseConfig = () => {
  const envKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim().replace(/^["'](.+)["']$/, '$1');
  const envProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim().replace(/^["'](.+)["']$/, '$1');
  const envAppId = import.meta.env.VITE_FIREBASE_APP_ID?.trim().replace(/^["'](.+)["']$/, '$1');
  const envStorageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim().replace(/^["'](.+)["']$/, '$1');

  // Start with default auto-provisioned config
  const config = {
    apiKey: firebaseAppletConfig.apiKey,
    authDomain: firebaseAppletConfig.authDomain,
    projectId: firebaseAppletConfig.projectId,
    storageBucket: firebaseAppletConfig.storageBucket,
    appId: firebaseAppletConfig.appId,
  };

  // Override with environment variables if provided
  if (envKey) config.apiKey = envKey;
  if (envProjectId) {
    config.projectId = envProjectId;
    config.authDomain = `${envProjectId}.firebaseapp.com`;
  }
  if (envAppId) config.appId = envAppId;
  if (envStorageBucket) config.storageBucket = envStorageBucket;

  // Log detected environment variables (keys truncated for safety)
  console.log("Firebase Configuration Check:");
  if (envKey || envProjectId || envAppId || envStorageBucket) {
    console.log("- Using some custom Environment Variables (VITE_*)");
  } else {
    console.log("- Using default auto-provisioned configuration.");
  }
  
  return config;
};

const firebaseConfig = getFirebaseConfig();

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
