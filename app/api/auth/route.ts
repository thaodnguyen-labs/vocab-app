import { NextRequest } from 'next/server'

const APP_PASSWORD = process.env.APP_PASSWORD || 'roadto75'

export async function POST(request: NextRequest) {
  const { password } = await request.json()

  if (password !== APP_PASSWORD) {
    return Response.json({ error: 'Wrong password' }, { status: 401 })
  }

  // Set httpOnly cookie for 1 year
  const response = Response.json({ success: true })
  response.headers.set(
    'Set-Cookie',
    `vocab-auth=ok; Path=/; Max-Age=${60 * 60 * 24 * 365}; HttpOnly; SameSite=Lax${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`
  )
  return response
}
