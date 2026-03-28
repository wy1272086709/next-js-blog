import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { updateSession } from "@/lib/supabase/proxy"
import type { NextRequest } from "next/server"

/**
 * 国际化中间件 - 处理语言路由
 */
const intlMiddleware = createMiddleware(routing)

/**
 * 认证中间件 - 处理用户认证
 */
const authMiddleware = updateSession

/**
 * 根目录中间件 - 组合所有中间件逻辑
 *
 * 执行顺序：
 * 1. 国际化处理（语言检测和重定向）
 * 2. 认证处理（登录状态检查）
 *
 * 这样设计的好处：
 * - 统一的入口点
 * - 清晰的执行顺序
 * - 易于维护和调试
 */
export default function middleware(request: NextRequest) {
  // 1. 先处理国际化路由
  const intlResponse = intlMiddleware(request)
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    // 如果是重定向（如语言切换），直接返回
    return intlResponse
  }

  // 2. 处理认证逻辑
  return authMiddleware(request)
}

export const config = {
  // 匹配所有非静态文件和非 API 路由
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}