import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getServerMessage } from "@/lib/i18n/server"

async function createSupabaseClient() {
  const cookieStore = await cookies()

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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The "setAll" method was called from a Server Component.
          }
        },
      },
    }
  )
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseClient()

  try {
    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log("当前用户信息:", user, '错误:', userError)
    if (userError || !user || !user.id) {
      return NextResponse.json({ error: await getServerMessage("api.unauthorized") }, { status: 401 })
    }

    const postId = (await params).id

    // 检查是否已经点赞
    let existingLike
    let checkError

    try {
      const result = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .single()

      existingLike = result.data
      checkError = result.error
    } catch (err) {
      checkError = err as any
    }

    console.log("检查点赞状态:", existingLike, '错误:', checkError)
    // 如果错误是 PGRST116 (no rows returned)，说明没有点赞记录，这是正常情况
    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json({ error: await getServerMessage("api.checkLikeStatusFailed") }, { status: 500 })
    }

    let liked: boolean
    let count: number

    if (existingLike) {
      // 如果已经点赞，则取消点赞
      const { error: deleteError } = await supabase
        .from("likes")
        .delete()
        .eq("id", existingLike.id)

      if (deleteError) {
        return NextResponse.json({ error: await getServerMessage("api.unlikeFailed") }, { status: 500 })
      }

      liked = false

      // 获取最新的点赞数
      const { count: likeCount } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId)

      count = likeCount || 0
    } else {
      // 如果没有点赞，则添加点赞
      const { error: insertError } = await supabase
        .from("likes")
        .insert({
          post_id: postId,
          user_id: user.id,
        })

      if (insertError) {
        return NextResponse.json({ error: await getServerMessage("api.likeFailed") }, { status: 500 })
      }

      liked = true

      // 获取最新的点赞数
      const { count: likeCount } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId)

      count = likeCount || 0
    }

    return NextResponse.json({
      success: true,
      liked,
      count,
    })

  } catch (error) {
    console.error("点赞操作错误:", error)
    return NextResponse.json({ error: await getServerMessage("api.serverError", "Internal server error") }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseClient()

  try {
    const postId = params.id

    // 获取文章的点赞总数
    const { count: likeCount, error: countError } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId)

    if (countError) {
      return NextResponse.json({ error: await getServerMessage("api.getLikeCountFailed") }, { status: 500 })
    }

    // 如果用户已登录，检查当前用户是否点赞了该文章
    let hasLiked = false
    const { data: { user } } = await supabase.auth.getUser()

    if (user && user.id) {
      const { data: userLike, error: likeError } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .single()

      if (!likeError && userLike) {
        hasLiked = true
      }
    }

    return NextResponse.json({
      count: likeCount || 0,
      hasLiked,
    })

  } catch (error) {
    console.error("获取点赞状态错误:", error)
    return NextResponse.json({ error: await getServerMessage("api.serverError", "Internal server error") }, { status: 500 })
  }
}