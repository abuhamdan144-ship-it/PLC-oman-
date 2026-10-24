import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA2x48mgPHBYj4pggK5IiVL_2boVdky-uw",
  authDomain: "pakistan-labour-community.firebaseapp.com",
  projectId: "pakistan-labour-community",
  storageBucket: "pakistan-labour-community.firebasestorage.app",
  messagingSenderId: "536599240555",
  appId: "1:536599240555:web:1f86e6c5af9307f660f62e",
  measurementId: "G-H2Z03HBXMV"
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Analytics is optional; initialize only if supported in browser environment
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch {
        // Silently skip if analytics fails or is blocked
      }
    }
  }).catch(() => {});
}
