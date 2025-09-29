'use client';

import { initializeApp, getApp, FirebaseApp, getApps } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

// This function can be called multiple times, it will only initialize once.
function ensureFirebaseInitialized() {
  if (typeof window === 'undefined' || appInstance) {
    return;
  }

  if (getApps().length > 0) {
    appInstance = getApp("default");
  } else {
    try {
      const firebaseConfig = (window as any).__firebase_config;
      if (!firebaseConfig) {
         console.warn("Firebase config not found on window. Initialization skipped.");
         return; 
      }
      appInstance = initializeApp(firebaseConfig, "default");
    } catch (e: any) {
      console.error("Firebase initialization failed:", e.message);
      return;
    }
  }
}

export const getFirebaseAuth = (): Auth => {
  ensureFirebaseInitialized();
  if (!appInstance) {
    throw new Error("Firebase has not been initialized. Please check your configuration.");
  }
  if (!authInstance) {
    authInstance = getAuth(appInstance);
  }
  return authInstance;
};

export const getFirebaseFirestore = (): Firestore | null => {
  ensureFirebaseInitialized();
  if (!appInstance) {
      return null;
  }
  if (!dbInstance) {
    dbInstance = getFirestore(appInstance);
  }
  return dbInstance;
}


export const getAppId = (): string => {
    if (typeof window === "undefined") {
        return 'server-app-id'; // Return a default or handle server-side case
    }
    const appId = (window as any).__app_id;
    if (!appId) {
        // Provide a default for offline/local development scenarios
        return 'local-dev-app-id';
    }
    return appId;
}

export const getInitialAuthToken = (): string | null => {
    if (typeof window === "undefined") {
        return null;
    }
    return (window as any).__initial_auth_token || null;
}
