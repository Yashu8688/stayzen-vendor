import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBzed6mnYYuma1wbJQ72tAPdATm10S4bVc",
  authDomain: "stayzen-dcc00.firebaseapp.com",
  projectId: "stayzen-dcc00",
  storageBucket: "stayzen-dcc00.firebasestorage.app",
  messagingSenderId: "538053550578",
  appId: "1:538053550578:web:1b37bd9f840b301e804b6b",
  measurementId: "G-QF45N9C5RE"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firestore with persistence (Offline Support)
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
