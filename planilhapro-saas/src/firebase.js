import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfigFromCanvas = globalThis.__firebase_config;
const appIdFromCanvas = globalThis.__app_id;
const initialAuthTokenFromCanvas = globalThis.__initial_auth_token;
const isCanvasEnvironment = typeof firebaseConfigFromCanvas !== 'undefined';

let firebaseConfig;
let appId;

if (isCanvasEnvironment) {
  firebaseConfig = JSON.parse(firebaseConfigFromCanvas);
  appId = typeof appIdFromCanvas !== 'undefined' ? appIdFromCanvas : 'planilha-pro-demo';
} else {
  firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'COLOQUE_AQUI_A_SUA_API_KEY',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'seu-projeto.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'seu-projeto',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'seu-projeto.appspot.com',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'COLOQUE_AQUI',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || 'COLOQUE_AQUI',
  };
  appId = import.meta.env.VITE_APP_ID || 'planilhapro-saas';
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const initFirebaseAuth = async () => {
  if (!isCanvasEnvironment) return;

  if (typeof initialAuthTokenFromCanvas !== 'undefined' && initialAuthTokenFromCanvas) {
    await signInWithCustomToken(auth, initialAuthTokenFromCanvas);
    return;
  }

  await signInAnonymously(auth);
};

export { app, auth, db, appId, isCanvasEnvironment, initFirebaseAuth };