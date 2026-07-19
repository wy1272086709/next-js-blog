import { createServerClientWithCookies } from "@/lib/supabase/server"
import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { NextResponse, type NextRequest } from "next/server"

/**
 * 国际化中间件 - 处理语言路由
 */
const intlMiddleware = createMiddleware(routing)

/**
 * 认证中间件 - 处理用户认证和 CSRF 保护
 */
async function authMiddleware(request: NextRequest) {
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
  if (isApiRoute) {
    const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH']
    const isProtectedMethod = protectedMethods.includes(request.method)
    const isExcludedApi =
      request.nextUrl.pathname.includes('/api/auth/') ||
      request.nextUrl.pathname.includes('/api/public/') ||
      request.nextUrl.pathname.includes('/api/csrf')

    if (isProtectedMethod && !isExcludedApi) {
      const cookieToken = request.cookies.get('csrf_token')?.value
      const headerToken = request.headers.get('x-csrf-token')

      if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return NextResponse.json(
          { error: 'Invalid CSRF token' },
          { status: 403, headers: { 'X-CSRF-Error': 'token_mismatch' } }
        )
      }
    }

    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({
    request,
  });
  // 创建一个特殊的cookie store，使用request.cookies
  const cookieStore = {
    getAll: () => request.cookies.getAll(),
    setAll: (cookiesToSet: any[]) => {
      cookiesToSet.forEach(({ name, value, options }) => {
        request.cookies.set(name, value)
        supabaseResponse.cookies.set(name, value, options)
      })
      supabaseResponse = NextResponse.next({
        request,
      })
    }
  }

  const supabase = await createServerClientWithCookies(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 保护个人中心路由（支持 locale 前缀如 /zh-CN/dashboard）
  const pathname = request.nextUrl.pathname
  const localeMatch = pathname.match(/^\/(zh-CN|en)\/dashboard/)
  if (localeMatch && !user) {
    const url = request.nextUrl.clone()
    url.pathname = `/${localeMatch[1]}/auth/login`
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

/**
 * 根目录中间件 - 组合所有中间件逻辑
 *
 * 执行顺序：
 * 1. 国际化处理（语言检测和重定向）
 * 2. 认证处理（登录状态检查）
 * 3. API 路由特殊处理（移除语言前缀）
 *
 * 这样设计的好处：
 * - 统一的入口点
 * - 清晰的执行顺序
 * - 易于维护和调试
 */
export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // API 路由不参与页面语言重定向，否则 /api 会在 locale 路径间循环。
  if (pathname.startsWith('/api/')) {
    return authMiddleware(request)
  }

  // 兼容历史上带语言前缀的 API URL。
  const apiLocaleMatch = pathname.match(/^\/(zh-CN|en)\/api\/(.*)/)
  if (apiLocaleMatch && apiLocaleMatch[2]) {
    request.nextUrl.pathname = `/api/${apiLocaleMatch[2]}`
    return NextResponse.rewrite(request.nextUrl)
  }

  // 1. 处理国际化页面路由
  const intlResponse = intlMiddleware(request)
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    // 如果是重定向（如语言切换），直接返回
    return intlResponse
  }

  // 2. 处理认证逻辑
  return authMiddleware(request)
}

export const config = {
  // 匹配所有需要处理的路径，包括 API 路由
  matcher: [
    // 匹配所有非静态文件的路由
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
