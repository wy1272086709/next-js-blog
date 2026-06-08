import { createServerClientWithCookies } from '@/lib/supabase/server'
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
    const supabase = await createServerClientWithCookies(cookieStore)

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
            // No-op - cookie setting is handled by Server Action
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

    // Note: Cookie setting is now handled by the Server Action
    // The cookie will be set in the response headers automatically
  } catch (error) {
    console.error('Error setting CSRF token:', error)
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