/**
 * Firebase Configuration
 * =======================
 * Initialize Firebase and Firestore for authentication and data persistence.
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app;
let auth;
let firestore;
let persistenceEnabled = false;

try {
  // Check if all required config values are present
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const hasAllConfig = requiredKeys.every(key => firebaseConfig[key]);
  
  if (hasAllConfig) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);
    
    // Enable offline persistence for Firestore
    enableIndexedDbPersistence(firestore).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence not enabled');
      } else if (err.code === 'unimplemented') {
        console.warn('Browser doesn\'t support persistence');
      }
    });
    
    persistenceEnabled = true;
    console.log('Firebase initialized successfully');
  } else {
    console.warn('Firebase configuration incomplete. Using demo mode.');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

/**
 * Firestore Collections Schema
 * =============================
 * 
 * users/
 *   - uid (document id)
 *   - email
 *   - displayName
 *   - photoURL
 *   - createdAt
 *   - updatedAt
 *   - settings (theme, notifications, privacy)
 *   - storageUsed (in bytes)
 *   - totalUpscales (counter)
 * 
 * enhancement_history/
 *   - id (document id)
 *   - userId (reference to user)
 *   - originalImageId (reference to image)
 *   - upscaledImageId (reference to image)
 *   - scaleFactor (4)
 *   - processingTime (ms)
 *   - inferenceTime (ms)
 *   - method (AI/Bicubic)
 *   - status (completed/failed)
 *   - createdAt
 *   - updatedAt
 * 
 * images/
 *   - id (document id)
 *   - userId (reference to user)
 *   - name
 *   - width
 *   - height
 *   - size (bytes)
 *   - format (png/jpeg/webp)
 *   - hash (content hash for deduplication)
 *   - storageUrl (cloud storage path)
 *   - createdAt
 *   - isOriginal (boolean)
 *   - isUpscaled (boolean)
 * 
 * settings/
 *   - userId (document id)
 *   - theme (dark/light/auto)
 *   - language (en/ja/etc)
 *   - notifications (boolean)
 *   - emailNotifications (boolean)
 *   - privacy (public/private)
 *   - autoSave (boolean)
 *   - updatedAt
 */

/**
 * Get Firebase app instance
 */
export function getFirebaseApp() {
  return app;
}

/**
 * Get Firebase Auth instance
 */
export function getFirebaseAuth() {
  return auth;
}

/**
 * Get Firestore instance
 */
export function getFirestore_() {
  return firestore;
}

/**
 * Check if Firebase is configured
 */
export function isFirebaseConfigured() {
  return app !== undefined && auth !== undefined && firestore !== undefined;
}

/**
 * Check if offline persistence is enabled
 */
export function isOfflinePersistenceEnabled() {
  return persistenceEnabled;
}

/**
 * Export Firestore rules (for reference, deploy these to Firebase Console)
 */
export const FIRESTORE_RULES = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - only accessible by authenticated users
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
    }
    
    // Enhancement history - only accessible by owner
    match /enhancement_history/{document=**} {
      allow read: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.uid == request.auth.uid;
      allow write: if request.auth != null && 
                      resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
    }
    
    // Images collection - only accessible by owner
    match /images/{document=**} {
      allow read: if request.auth != null && 
                     resource.data.userId == request.auth.uid;
      allow write: if request.auth != null && 
                      resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && 
                       request.resource.data.userId == request.auth.uid;
    }
    
    // Settings - only accessible by owner
    match /settings/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;
    }
  }
}
`;

export default {
  getFirebaseApp,
  getFirebaseAuth,
  getFirestore_,
  isFirebaseConfigured,
  isOfflinePersistenceEnabled,
};
