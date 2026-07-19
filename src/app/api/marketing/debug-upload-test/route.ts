import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getAdminStorageBucket } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

// TEMPORARY — verifies the Admin SDK Storage upload path works end-to-end
// before relying on it from the discount-alert flow. Delete after use.
const TINY_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='

export async function GET(request: Request) {
  const key = request.headers.get('X-Marketing-Key')
  if (!key || key !== process.env.MARKETING_API_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const bucket = getAdminStorageBucket()
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

    return NextResponse.json({
      ok: true,
      bucketName: bucket.name,
      url,
      fetchStatus: fetchResult.status,
      fetchedBytes: bytes,
    })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
      { status: 500 }
    )
  }
}
