import { createServerClient } from "@supabase/ssr"
import { createBrowserClient } from "@supabase/ssr"

export async function createClient(cookieStore?: any) {
  // Server Component: create client with cookie support
  if (typeof window === 'undefined') {
    // Use provided cookieStore or create one if not provided
    const store = cookieStore || (await import("next/headers").then(cookies => cookies.cookies()))

    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return store.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => store.set(name, value, options))
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

