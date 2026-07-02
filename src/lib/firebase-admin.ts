import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

const APP_NAME = 'gulf-market-admin'

function initAdminApp() {
  const existing = getApps().find(a => a.name === APP_NAME)
  if (existing) return getApp(APP_NAME)

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64
  if (!b64) throw new Error('Missing server environment variable: FIREBASE_SERVICE_ACCOUNT_B64')

  const serviceAccount = JSON.parse(Buffer.from(b64.trim(), 'base64').toString('utf8'))

  return initializeApp({ credential: cert(serviceAccount) }, APP_NAME)
}

export function getAdminDb() {
  return getFirestore(initAdminApp())
}

export function getAdminAuth() {
  return getAuth(initAdminApp())
}
