import { NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase-admin'

export const runtime = 'nodejs'

// Called once by the trusted Flutter staff app right after it signs in
// anonymously, to mark that specific anonymous session as staff. The public
// website also signs visitors in anonymously (to read the product catalog),
// but never calls this route, so it never receives the {staff: true} claim.
export async function POST(request: Request) {
  const secret = request.headers.get('X-Staff-Secret')
  if (!secret || secret !== process.env.STAFF_CLAIM_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    if (decoded.firebase.sign_in_provider !== 'anonymous') {
      return NextResponse.json({ error: 'Only anonymous sessions can claim staff' }, { status: 400 })
    }
    await getAdminAuth().setCustomUserClaims(decoded.uid, { staff: true })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'حدث خطأ'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
