import { NextResponse } from 'next/server'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

export const runtime = 'nodejs'

export async function GET() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64
  const info: Record<string, unknown> = {
    hasB64: !!b64,
    b64Length: b64?.length ?? 0,
    appsCount: getApps().length,
    firestoreTest: '',
    error: '',
  }

  try {
    const sa = JSON.parse(Buffer.from((b64 ?? '').trim(), 'base64').toString('utf8'))
    info.projectId = sa.project_id
    info.clientEmail = sa.client_email
    info.keyStart = (sa.private_key as string).substring(0, 27)

    const testApp = initializeApp({ credential: cert(sa) }, 'debug-' + Date.now())
    const db = getFirestore(testApp)
    const snap = await db.collection('products').limit(1).get()
    info.firestoreTest = `SUCCESS - ${snap.size} doc(s)`
  } catch (err) {
    info.error = err instanceof Error ? err.message : String(err)
  }

  return NextResponse.json(info)
}
