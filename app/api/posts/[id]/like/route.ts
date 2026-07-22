import { NextResponse } from "next/server"
import { revalidateTag } from "next/cache"
import { createServerClientWithCookies } from "@/lib/supabase/server"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteContext) {
  const supabase = await createServerClientWithCookies()
  const postId = (await params).id

  try {
    const authResult = await supabase.auth.getUser()
    const { user } = authResult.data
    const userError = authResult.error

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { liked } = (await request.json()) as { liked?: boolean }
    if (typeof liked !== "boolean") {
      return NextResponse.json({ error: "Invalid like state" }, { status: 400 })
    }

    if (!liked) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id)

      if (error) {
        console.error("Failed to unlike post:", error)
        return NextResponse.json({ error: "Failed to unlike post" }, { status: 500 })
      }
    } else {
      const { error } = await supabase
        .from("post_likes")
        .upsert(
          { post_id: postId, user_id: user.id },
          { onConflict: "post_id,user_id", ignoreDuplicates: true }
        )

      if (error) {
        console.error("Failed to like post:", error)
        return NextResponse.json({ error: "Failed to like post" }, { status: 500 })
      }
    }

    const { count, error: countError } = await supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId)

    if (countError) {
      console.error("Failed to count post likes:", countError)
      return NextResponse.json({ error: "Failed to get like count" }, { status: 500 })
    }

    revalidateTag("posts", { expire: 0 })
    return NextResponse.json({ liked, count: count ?? 0 })
  } catch (error) {
    console.error("Failed to update post like:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(_request: Request, { params }: RouteContext) {
  const supabase = await createServerClientWithCookies()
  const postId = (await params).id

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const user = session?.user

    const countQuery = supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId)

    const likeQuery = user
      ? supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null })

    const [{ count, error: countError }, { data: userLike, error: likeError }] =
      await Promise.all([countQuery, likeQuery])

    if (countError || likeError) {
      console.error("Failed to get post likes:", countError || likeError)
      return NextResponse.json({ error: "Failed to get likes" }, { status: 500 })
    }

    return NextResponse.json({
      count: count ?? 0,
      liked: Boolean(userLike),
    })
  } catch (error) {
    console.error("Failed to get post likes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
