
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

import firebaseAppletConfig from './firebase-applet-config.json';

const getFirebaseConfig = () => {
  // Hardcoded configuration as requested by the user
  const config = {
    apiKey: "AIzaSyD8x_6Fs7vHf3lhO4pCFbD7p7y06JJCIhM",
    authDomain: "lksblora-8bf69.firebaseapp.com",
    projectId: "lksblora-8bf69",
    storageBucket: "lksblora-8bf69.firebasestorage.app",
    messagingSenderId: "876278261984",
    appId: "1:876278261984:web:c8a5055d52e615c6acc885",
    measurementId: "G-86L9F0BJ7F"
  };

  console.log(`Firebase Active Project: ${config.projectId}`);
  
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
