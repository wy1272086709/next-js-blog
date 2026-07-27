import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { interactionsEnabled } from "@/lib/features"
import { createServerClientWithCookies } from "@/lib/supabase/server"

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(1024),
  username: z.string().trim().min(1).max(50),
})

export type SignUpInput = z.infer<typeof signUpSchema>

export async function POST(request: NextRequest) {
  if (!interactionsEnabled) {
    return NextResponse.json({ error: "Interactions are disabled" }, { status: 403 })
  }

  const parsed = signUpSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sign-up data" }, { status: 400 })
  }

  const supabase = await createServerClientWithCookies()
  const { email, password, username } = parsed.data
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo:
        process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
        `${request.nextUrl.origin}/dashboard`,
      data: { username },
    },
  })

  if (error) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status ?? 400 },
    )
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
