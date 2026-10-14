/**
 * CLIENTE OFICIAL DE FIREBASE PARA INTECKNO ERP
 * Conecta el ERP con Cloud Firestore, Firebase Authentication y Cloud Storage en Google Cloud.
 * Proyecto: inteckno-erp (Project Number: 370137794250)
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Configuración oficial de Firebase para el proyecto 'inteckno-erp'
const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || 'AIzaSyCf9KMYRhHRj1BFAxaZrT8c4pUkHP_e9pI',
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || 'inteckno-erp.firebaseapp.com',
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || 'inteckno-erp',
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || 'inteckno-erp.firebasestorage.app',
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '370137794250',
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || '1:370137794250:web:6f0d80fa36f4ce63d15633',
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || 'G-FH2VP1GTTH',
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (app) return app;
  try {
    if (!getApps().length) {
      if (firebaseConfig.apiKey) {
        app = initializeApp(firebaseConfig);
      }
    } else {
      app = getApp();
    }
  } catch (err) {
    console.warn('Firebase no inicializado aún:', err);
  }
  return app;
}

export function getFirebaseDb(): Firestore | null {
  if (db) return db;
  const currentApp = getFirebaseApp();
  if (currentApp) {
    try {
      db = getFirestore(currentApp);
    } catch (e) {
      console.warn('Error inicializando Firestore:', e);
    }
  }
  return db;
}

export function getFirebaseAuth(): Auth | null {
  if (auth) return auth;
  const currentApp = getFirebaseApp();
  if (currentApp) {
    try {
      auth = getAuth(currentApp);
    } catch (e) {
      console.warn('Error inicializando Auth:', e);
    }
  }
  return auth;
}

export const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
};
