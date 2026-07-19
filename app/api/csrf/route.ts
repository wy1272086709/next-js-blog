import { type NextRequest, NextResponse } from 'next/server'
import { generateCSRFToken } from '@/lib/csrf/utils'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('csrf_token')?.value ?? generateCSRFToken()

  const response = NextResponse.json({ token })

  // Set the cookie in the response
  response.cookies.set('csrf_token', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60, // 1 hour
    path: '/'
  })

  // 添加响应头，便于调试
  response.headers.set('X-CSRF-Token', token)
  response.headers.set('X-CSRF-Source', 'both-cookie-and-session')

  return response
}
