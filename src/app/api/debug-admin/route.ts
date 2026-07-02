import { NextResponse } from 'next/server'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export const runtime = 'nodejs'

export async function GET() {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const rawKey = process.env.FIREBASE_PRIVATE_KEY

  const info = {
    projectId: projectId ?? 'MISSING',
    clientEmailDomain: clientEmail ? clientEmail.split('@')[1] : 'MISSING',
    keyLength: rawKey?.length ?? 0,
    keyIsBase64: rawKey ? /^[A-Za-z0-9+/=\s]+$/.test(rawKey.trim()) : false,
    decodedStart: '',
    appsCount: getApps().length,
    firestoreTest: '',
    error: '',
  }

  try {
    const privateKey = Buffer.from((rawKey ?? '').trim(), 'base64').toString('utf8')
    info.decodedStart = privateKey.substring(0, 27)

    const testApp = initializeApp({
      credential: cert({ projectId: projectId!, clientEmail: clientEmail!, privateKey }),
    }, 'debug-test-' + Date.now())

    const db = getFirestore(testApp)
    await db.collection('products').limit(1).get()
    info.firestoreTest = 'SUCCESS'
  } catch (err) {
    info.error = err instanceof Error ? err.message : String(err)
  }

  return NextResponse.json(info)
}
