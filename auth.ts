import { updateSession } from "@/lib/supabase/proxy"
import type { NextRequest } from "next/server"

/**
 * 认证中间件 - 处理用户登录状态和路由保护
 *
 * 功能：
 * - 检查用户认证状态（通过 Cookie 中的 JWT）
 * - 保护需要登录的页面（如 /dashboard）
 * - 未登录用户自动重定向到登录页
 */
export default function authMiddleware(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  // 只对需要认证的路由生效
  matcher: [
    // 匹配 dashboard 相关路由
    "/((?!api|_next|_vercel|.*\\..*).*)",
    // 排除静态文件
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
