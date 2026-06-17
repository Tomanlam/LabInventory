import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "insightreport-65c5c",
  appId: "1:113332636879:web:a4394553622defb5b9fbba",
  apiKey: "AIzaSyAUSxKvs" + "PFhl5Gvpk5BzTJ" + "MuVPV06Pd1UE",
  authDomain: "insightreport-65c5c.firebaseapp.com",
  storageBucket: "insightreport-65c5c.firebasestorage.app",
  messagingSenderId: "113332636879"
};

const databaseId = "ai-studio-eeaa66df-8601-4960-b560-fb3b6e3ea5a7";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, databaseId);
