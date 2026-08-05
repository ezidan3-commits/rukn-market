import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from './firebase-admin'

interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds?: number
}

interface RateLimitOptions {
  limit: number
  windowSeconds: number
}

// Vercel serverless functions don't share memory across invocations, so an
// in-process counter wouldn't work — this uses a small Firestore doc per key
// as the shared counter instead. Cost is one transaction (read+write) per
// request, only on routes that are publicly reachable without auth.
export async function checkRateLimit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
  const db = getAdminDb()
  const ref = db.collection('rateLimits').doc(key)
  const now = Date.now()
  const windowMs = opts.windowSeconds * 1000

  return db.runTransaction(async tx => {
    const snap = await tx.get(ref)
    const data = snap.data() as { windowStart?: number; count?: number } | undefined

    if (!data || typeof data.windowStart !== 'number' || now - data.windowStart > windowMs) {
      tx.set(ref, { windowStart: now, count: 1, updatedAt: FieldValue.serverTimestamp() })
      return { allowed: true }
    }

    if (data.count !== undefined && data.count >= opts.limit) {
      return { allowed: false, retryAfterSeconds: Math.ceil((data.windowStart + windowMs - now) / 1000) }
    }

    tx.update(ref, { count: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() })
    return { allowed: true }
  })
}

export function getClientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') ?? 'unknown'
}
