import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { interactionsEnabled } from "@/lib/features"
import { createServerClientWithCookies } from "@/lib/supabase/server"

const paramsSchema = z.object({ id: z.string().uuid() })
const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  parentId: z.string().uuid().nullable().default(null),
})

export type CreateCommentInput = z.infer<typeof createCommentSchema>
type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  if (!interactionsEnabled) {
    return NextResponse.json({ error: "Interactions are disabled" }, { status: 403 })
  }

  const parsedParams = paramsSchema.safeParse(await context.params)
  const parsedBody = createCommentSchema.safeParse(await request.json().catch(() => null))
  if (!parsedParams.success || !parsedBody.success) {
    return NextResponse.json({ error: "Invalid comment data" }, { status: 400 })
  }

  const supabase = await createServerClientWithCookies()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (parsedBody.data.parentId) {
    const { data: parentComment, error: parentError } = await supabase
      .from("comments")
      .select("id")
      .eq("id", parsedBody.data.parentId)
      .eq("post_id", parsedParams.data.id)
      .maybeSingle()

    if (parentError || !parentComment) {
      return NextResponse.json({ error: "Invalid parent comment" }, { status: 400 })
    }
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({
      content: parsedBody.data.content,
      author_id: authData.user.id,
      post_id: parsedParams.data.id,
      parent_id: parsedBody.data.parentId,
    })
    .select(`
      id,
      content,
      author_id,
      post_id,
      parent_id,
      created_at,
      profiles:author_id(username, avatar_url)
    `)
    .single()

  if (error) {
    console.error("Failed to create comment:", error)
    return NextResponse.json({ error: "Failed to create comment" }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
