import { initializeCSRFToken } from '@/lib/csrf/utils'
import { cookies } from 'next/headers'

export async function CSRFProvider({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()

  // 初始化 CSRF token
  await initializeCSRFToken()

  // 从 cookie 获取 token（用于客户端）
  const csrfToken = cookieStore.get('csrf_token')?.value || ''

  // 将 token 传递给客户端
  return (
    <div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              const csrfToken = '${csrfToken}';
              if (typeof window !== 'undefined') {
                window.csrfToken = csrfToken;
              }
            })()
          `
        }}
      />
      {children}
    </div>
  )
}