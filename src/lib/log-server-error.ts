import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb } from './firebase-admin'

// Several failure paths (email delivery, admin notifications) are
// intentionally non-blocking — they must never fail the customer-facing
// request — so they were only ever `console.error`'d. On Vercel, console
// logs roll off and nobody gets paged, so a broken Gmail integration could
// silently stay broken for weeks. This persists a durable record in
// Firestore instead, in addition to the console log, without ever throwing
// itself (a logging failure must not break the caller's flow).
export async function logServerError(context: string, err: unknown, extra?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`[${context}]`, message)
  try {
    await getAdminDb().collection('systemErrors').add({
      context,
      message,
      extra: extra ?? null,
      createdAt: FieldValue.serverTimestamp(),
    })
  } catch (logErr) {
    console.error('[logServerError] failed to persist error log:', logErr)
  }
}
