import { createServerClient } from "@supabase/ssr"
import { createBrowserClient } from "@supabase/ssr"

export async function createClient() {
  // Server Component: create client with cookie support
  if (typeof window === 'undefined') {
    const cookieStore = await import("next/headers").then(cookies => cookies.cookies())

    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
            } catch {
              // The "setAll" method was called from a Server Component.
            }
          },
        },
      }
    )
  }

  // Client Component: create client without cookie support
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function createServerSideClient() {
  // Only for server components (no cookie handling needed for server-only operations)
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // No-op for server-only operations
        },
      },
    }
  )
}
