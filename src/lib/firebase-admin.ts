import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing server environment variable: ${name}`)
  return value
}

const APP_NAME = 'gulf-market-admin'

function initAdminApp() {
  const existing = getApps().find(a => a.name === APP_NAME)
  if (existing) return getApp(APP_NAME)

  const rawKey = requiredEnv('FIREBASE_PRIVATE_KEY')
  // Strip surrounding quotes Vercel sometimes wraps the value in, then convert \n → newline
  const privateKey = rawKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n')

  return initializeApp({
    credential: cert({
      projectId: requiredEnv('FIREBASE_PROJECT_ID'),
      clientEmail: requiredEnv('FIREBASE_CLIENT_EMAIL'),
      privateKey,
    }),
  }, APP_NAME)
}

export function getAdminDb() {
  return getFirestore(initAdminApp())
}
