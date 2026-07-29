import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"
import { createPublicClient } from "@/lib/supabase/public"
import { hashRequestIp } from "@/lib/views"

const paramsSchema = z.object({ id: z.string().uuid() })
type RouteContext = { params: Promise<{ id: string }> }

export type PostViewResponse = {
  counted: boolean
  viewCount: number
}

export async function POST(request: NextRequest, context: RouteContext) {
  const parsedParams = paramsSchema.safeParse(await context.params)
  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 })
  }

  const ipHash = hashRequestIp(request)
  if (!ipHash) {
    console.error("VIEW_COUNT_IP_SALT is not configured")
    return NextResponse.json({ error: "View tracking is not configured" }, { status: 503 })
  }

  const supabase = createPublicClient()
  const { data, error } = await supabase.rpc("register_post_view", {
    p_post_id: parsedParams.data.id,
    p_ip_hash: ipHash,
  })

  if (error) {
    console.error("Failed to register post view:", error)
    return NextResponse.json({ error: "Failed to register post view" }, { status: 500 })
  }

  const result = data?.[0] as
    | { counted: boolean; current_view_count: number | null }
    | undefined
  if (!result || result.current_view_count === null) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 })
  }

  return NextResponse.json({
    counted: result.counted,
    viewCount: result.current_view_count,
  } satisfies PostViewResponse)
}

