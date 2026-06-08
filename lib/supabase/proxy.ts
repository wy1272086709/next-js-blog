import { createServerClientWithCookies } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
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
    }
  }

  const supabase = await createServerClientWithCookies(cookieStore)

  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log("当前用户信息:proxy.ts:", user)
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
