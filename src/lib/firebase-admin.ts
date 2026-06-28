import { App, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing server environment variable: ${name}`)
  return value
}

let adminApp: App | undefined

function initAdminApp() {
  if (adminApp) return adminApp
  if (getApps().length) return getApps()[0]

  adminApp = initializeApp({
    credential: cert({
      projectId: requiredEnv('FIREBASE_PROJECT_ID'),
      clientEmail: requiredEnv('FIREBASE_CLIENT_EMAIL'),
      privateKey: requiredEnv('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
    }),
  })

  return adminApp
}

export function getAdminDb() {
  return getFirestore(initAdminApp())
}
