import { NextResponse } from 'next/server'

const PROJECT_ID = 'store-manager-8d619'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products/${params.id}`,
      { next: { revalidate: 300 } }
    )
    if (!res.ok) return new NextResponse('Not found', { status: 404 })

    const data = await res.json()
    const f = data.fields
    if (!f) return new NextResponse('Not found', { status: 404 })

    // If there's a real URL, redirect to it
    const imageUrl = f.imageUrl?.stringValue
    if (imageUrl) return NextResponse.redirect(imageUrl)

    // Convert base64 to image
    const base64 = f.imageBase64?.stringValue
    if (!base64) return new NextResponse('No image', { status: 404 })

    const buffer = Buffer.from(base64, 'base64')
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse('Error', { status: 500 })
  }
}
