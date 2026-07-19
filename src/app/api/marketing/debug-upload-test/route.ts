import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getApp, getApps, initializeApp, cert } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { getFirestore } from 'firebase-admin/firestore'

export const runtime = 'nodejs'

// TEMPORARY — verifies the Admin SDK Storage upload path works end-to-end
// before relying on it from the discount-alert flow. Delete after use.
const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='

const APP_NAME = 'gulf-market-admin-debug'

function initDebugApp() {
  const existing = getApps().find(a => a.name === APP_NAME)
  if (existing) return getApp(APP_NAME)
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64
  if (!b64) throw new Error('Missing server environment variable: FIREBASE_SERVICE_ACCOUNT_B64')
  const serviceAccount = JSON.parse(Buffer.from(b64.trim(), 'base64').toString('utf8'))
  return initializeApp({ credential: cert(serviceAccount) }, APP_NAME)
}

async function tryBucket(app: ReturnType<typeof initDebugApp>, bucketName: string) {
  try {
    const bucket = getStorage(app).bucket(bucketName)
    const filePath = `debug-test/${Date.now()}.jpg`
    const file = bucket.file(filePath)
    const downloadToken = randomUUID()

    await file.save(Buffer.from(TINY_JPEG_BASE64, 'base64'), {
      resumable: false,
      metadata: {
        contentType: 'image/jpeg',
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
    })

    const encodedPath = encodeURIComponent(filePath)
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`
    const fetchResult = await fetch(url)
    const bytes = fetchResult.ok ? (await fetchResult.arrayBuffer()).byteLength : null

    return {
      ok: true,
      bucketName: bucket.name,
      url,
      fetchStatus: fetchResult.status,
      fetchedBytes: bytes,
    }
  } catch (err) {
    return {
      ok: false,
      bucketName,
      error: err instanceof Error ? err.message : String(err),
      code: (err as { code?: unknown })?.code,
    }
  }
}

export async function GET(request: Request) {
  const key = request.headers.get('X-Marketing-Key')
  if (!key || key !== process.env.MARKETING_API_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64
  let serviceAccountInfo: { project_id?: string; client_email?: string } | { error: string }
  try {
    const parsed = JSON.parse(Buffer.from((b64 ?? '').trim(), 'base64').toString('utf8'))
    serviceAccountInfo = { project_id: parsed.project_id, client_email: parsed.client_email }
  } catch (err) {
    serviceAccountInfo = { error: err instanceof Error ? err.message : String(err) }
  }

  const app = initDebugApp()

  let sampleImageUrl: string | null = null
  let sampleError: string | null = null
  try {
    const db = getFirestore(app)
    const snap = await db.collection('products').where('imageUrl', '!=', '').limit(5).get()
    const found = snap.docs.map(d => d.data().imageUrl as string).find(u => !!u)
    sampleImageUrl = found ?? null
  } catch (err) {
    sampleError = err instanceof Error ? err.message : String(err)
  }

  const results = {
    serviceAccount: serviceAccountInfo,
    sampleImageUrl,
    sampleError,
    appspot: await tryBucket(app, 'store-manager-8d619.appspot.com'),
    firebasestorageapp: await tryBucket(app, 'store-manager-8d619.firebasestorage.app'),
  }

  return NextResponse.json(results)
}
