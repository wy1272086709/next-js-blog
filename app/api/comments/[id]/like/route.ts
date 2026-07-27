import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { interactionsEnabled } from "@/lib/features"
import { createServerClientWithCookies } from "@/lib/supabase/server"

const paramsSchema = z.object({ id: z.string().uuid() })
const likeSchema = z.object({ liked: z.boolean() })
type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  if (!interactionsEnabled) {
    return NextResponse.json({ error: "Interactions are disabled" }, { status: 403 })
  }

  const parsedParams = paramsSchema.safeParse(await context.params)
  const parsedBody = likeSchema.safeParse(await request.json().catch(() => null))
  if (!parsedParams.success || !parsedBody.success) {
    return NextResponse.json({ error: "Invalid like data" }, { status: 400 })
  }

  const supabase = await createServerClientWithCookies()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const commentId = parsedParams.data.id
  const userId = authData.user.id
  const { error } = parsedBody.data.liked
    ? await supabase
        .from("comment_likes")
        .upsert(
          { comment_id: commentId, user_id: userId },
          { onConflict: "comment_id,user_id", ignoreDuplicates: true },
        )
    : await supabase
        .from("comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", userId)

  if (error) {
    console.error("Failed to update comment like:", error)
    return NextResponse.json({ error: "Failed to update comment like" }, { status: 500 })
  }

  return NextResponse.json({ liked: parsedBody.data.liked })
}
