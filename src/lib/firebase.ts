import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const configModules = import.meta.glob('../../firebase-applet-config.json', { eager: true });
const localConfig = configModules['../../firebase-applet-config.json'] as any;

const firebaseConfig = localConfig?.default || {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const databaseId = localConfig?.default?.firestoreDatabaseId || import.meta.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-eeaa66df-8601-4960-b560-fb3b6e3ea5a7";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, databaseId);
