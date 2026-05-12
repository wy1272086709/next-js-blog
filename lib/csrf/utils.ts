import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 生成 CSRF Token
export function generateCSRFToken() {
  return crypto.randomUUID()
}

// 从 session 获取 CSRF Token
export async function getCSRFToken() {
  const cookieStore = await cookies()

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // No-op
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    // 从 session 的 user_metadata 中获取
    return session?.user?.user_metadata?.csrf_token
  } catch (error) {
    console.error('Error getting CSRF token:', error)
    return null
  }
}

// 设置 CSRF Token 到 session
export async function setCSRFToken(token: string) {
  const cookieStore = await cookies()

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // No-op
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      // 更新 user metadata 包含 CSRF token
      await supabase.auth.updateUser({
        data: {
          csrf_token: token
        }
      })
    }

    // 同时设置短期 cookie 用于快速验证
    cookieStore.set('csrf_token', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 300, // 5分钟过期
      path: '/'
    })
  } catch (error) {
    console.error('Error setting CSRF token:', error)
  }
}

// 验证 CSRF Token
export async function validateCSRFToken(token: string): Promise<boolean> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // No-op
          },
        },
      }
    )

    const { data: { session } } = await supabase.auth.getSession()

    // 验证 token 是否匹配
    const sessionToken = session?.user?.user_metadata?.csrf_token
    const cookieValue = cookieStore.get('csrf_token')?.value

    return token === sessionToken && token === cookieValue
  } catch (error) {
    console.error('Error validating CSRF token:', error)
    return false
  }
}

// 初始化 CSRF Token（如果不存在）
export async function initializeCSRFToken() {
  const existingToken = await getCSRFToken()

  if (!existingToken) {
    const newToken = generateCSRFToken()
    await setCSRFToken(newToken)
    return newToken
  }

  return existingToken
}