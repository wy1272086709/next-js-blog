import { NextResponse } from 'next/server'
import { generateCSRFToken, setCSRFToken } from '@/lib/csrf/utils'

export async function GET() {
  const token = generateCSRFToken()

  // 设置 session 中的 CSRF token
  await setCSRFToken(token)

  const response = NextResponse.json({ token })

  // Set the cookie in the response
  response.cookies.set('csrf_token', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 300, // 5分钟过期
    path: '/'
  })

  // 添加响应头，便于调试
  response.headers.set('X-CSRF-Token', token)
  response.headers.set('X-CSRF-Source', 'both-cookie-and-session')

  return response
}