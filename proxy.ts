import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { updateSession } from "@/lib/supabase/proxy"
import type { NextRequest } from "next/server"

const intlMiddleware = createMiddleware(routing)

export async function proxy(request: NextRequest) {
  const intlResponse = intlMiddleware(request)
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse
  }
  return await updateSession(request)
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
