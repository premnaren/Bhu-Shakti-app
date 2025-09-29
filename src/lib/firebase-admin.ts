// src/lib/firebase-admin.ts

import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

let app: admin.app.App | null = null;

function initializeApp() {
  if (admin.apps.length > 0) {
    app = admin.apps[0];
    return;
  }

  // Attempt to initialize with credentials from environment variables.
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (Object.keys(serviceAccount).length > 0 && projectId) {
       app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId,
      }, uuidv4());
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
       // Fallback for environments where GOOGLE_APPLICATION_CREDENTIALS is set
       app = admin.initializeApp({
         projectId: process.env.FIREBASE_PROJECT_ID,
       });
    } else {
      console.warn("Firebase Admin SDK initialization skipped: Required environment variables are not set.");
    }
  } catch (error) {
    console.error("Firebase Admin SDK initialization error:", error);
  }
}

initializeApp();

export function getFirestoreAdmin() {
  if (!app) {
    // Attempt re-initialization if app is null
    initializeApp();
    if (!app) {
      console.error("Cannot get Firestore instance: Firebase Admin SDK not initialized.");
      return null;
    }
  }
  return app.firestore();
}

export function getProjectID() {
  return process.env.FIREBASE_PROJECT_ID || null;
}
