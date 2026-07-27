import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { interactionsEnabled } from "@/lib/features"
import { createServerClientWithCookies } from "@/lib/supabase/server"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(1024),
})

export type LoginInput = z.infer<typeof loginSchema>

export async function POST(request: NextRequest) {
  if (!interactionsEnabled) {
    return NextResponse.json({ error: "Interactions are disabled" }, { status: 403 })
  }

  const parsed = loginSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login data" }, { status: 400 })
  }

  const supabase = await createServerClientWithCookies()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status ?? 401 },
    )
  }

  return NextResponse.json({ success: true })
}
