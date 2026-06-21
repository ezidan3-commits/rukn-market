import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, signInAnonymously } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyCzuPCMVOasbszqQffoYYcNnjsup0ZjnY4',
  authDomain: 'store-manager-8d619.firebaseapp.com',
  projectId: 'store-manager-8d619',
  storageBucket: 'store-manager-8d619.firebasestorage.app',
  messagingSenderId: '458362428840',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

export async function ensureAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth)
  }
}
