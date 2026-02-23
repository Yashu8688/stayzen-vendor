import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyA2-Pnc7p8NvjEhIB0ZVh64DifRDeS0FSE",
    authDomain: "stayzen-dcc00.firebaseapp.com",
    projectId: "stayzen-dcc00",
    storageBucket: "stayzen-dcc00.firebasestorage.app",
    messagingSenderId: "538053550578",
    appId: "1:538053550578:web:b093963a84778e46804b6b",
    measurementId: "G-13LDES39TP"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export default app;
