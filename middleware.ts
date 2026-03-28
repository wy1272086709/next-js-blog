import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import type { NextRequest } from "next/server"

/**
 * 国际化中间件 - 处理语言路由
 */
const intlMiddleware = createMiddleware(routing)

/**
 * 中间件入口点
 */
export default function middleware(request: NextRequest) {
  return intlMiddleware(request)
}

export const config = {
  matcher: [
    // 排除 API 路由、静态文件等
    "/((?!api|_next|_vercel|.*\\..*).*)",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}