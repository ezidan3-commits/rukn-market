import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { getStorage } from 'firebase-admin/storage'

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

// The client-facing config (google-services.json etc.) shows the newer
// "<project>.firebasestorage.app" domain, but that's the download-URL
// domain, not the actual GCS bucket resource name — Admin SDK/GCS APIs
// need the underlying bucket, which for this project is still the
// original "<project>.appspot.com" name.
export function getAdminStorageBucket() {
  return getStorage(initAdminApp()).bucket('store-manager-8d619.appspot.com')
}
