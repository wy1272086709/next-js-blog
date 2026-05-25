import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getServerMessage } from "@/lib/i18n/server"
import { redis } from "@/lib/redis"

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
  const postId = (await params).id

  // 定义缓存键
  const CACHE_KEY = `post:${postId}:likes`
  const CACHE_USER_KEY = `post:${postId}:user:${(await supabase.auth.getUser()).data.user?.id}:liked`
  const CACHE_TTL = 300 // 5分钟

  try {
    // 获取当前用户
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log("当前用户信息:", user, '错误:', userError)
    if (userError || !user || !user.id) {
      return NextResponse.json({ error: await getServerMessage("api.unauthorized") }, { status: 401 })
    }

    // 1. 使用Redis缓存获取用户点赞状态
    let hasLiked = false
    try {
      const cachedLiked = await redis.get(CACHE_USER_KEY)
      if (cachedLiked !== null) {
        hasLiked = JSON.parse(cachedLiked)
      } else {
        // 从数据库查询用户点赞状态
        const result = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .single()

        if (!result.error && result.data) {
          hasLiked = true
        }
        // 缓存用户点赞状态
        await redis.set(CACHE_USER_KEY, String(hasLiked), { ex: CACHE_TTL })
      }
    } catch (err) {
      console.error("查询点赞状态错误:", err)
      // 缓存查询失败，直接查询数据库
      const result = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .single()

      hasLiked = !result.error && !!result.data
    }

    // 2. 执行点赞/取消点赞操作
    let liked: boolean = hasLiked
    let count: number

    if (hasLiked) {
      // 取消点赞
      const { error: deleteError } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id)

      if (deleteError) {
        return NextResponse.json({ error: await getServerMessage("api.unlikeFailed") }, { status: 500 })
      }
      liked = false
    } else {
      // 添加点赞
      const { error: insertError } = await supabase
        .from("post_likes")
        .insert({
          post_id: postId,
          user_id: user.id,
        })

      if (insertError) {
        return NextResponse.json({ error: await getServerMessage("api.likeFailed") }, { status: 500 })
      }
      liked = true
    }

    // 3. 获取最新点赞数（使用Redis缓存优化）
    let finalCount: number
    try {
      const cachedCount = await redis.get(CACHE_KEY)
      if (cachedCount !== null) {
        finalCount = JSON.parse(cachedCount)
        // 如果有实际点赞操作，更新计数
        if (liked) {
          finalCount += 1
        } else {
          finalCount = Math.max(0, finalCount - 1)
        }
      } else {
        // 从数据库获取最新计数
        const { count: dbCount } = await supabase
          .from("post_likes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", postId)
        finalCount = dbCount || 0
      }
    } catch (err) {
      console.error("获取计数错误:", err)
      // 缓存失败，直接查询数据库
      const { count: dbCount } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId)
      finalCount = dbCount || 0
    }

    // 4. 更新缓存
    try {
      await redis.set(CACHE_KEY, String(finalCount), { ex: CACHE_TTL })
      // 更新用户缓存
      await redis.set(CACHE_USER_KEY, String(liked), { ex: CACHE_TTL })
    } catch (err) {
      console.error("更新缓存失败:", err)
      // 缓存失败不影响主要功能
    }

    return NextResponse.json({
      success: true,
      liked,
      count: finalCount,
    })
  } catch (error) {
    console.error("点赞操作错误:", error)
    return NextResponse.json({ error: await getServerMessage("api.serverError", "Internal server error") }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseClient()
  const postId = params.id

  // 定义缓存键
  const CACHE_KEY = `post:${postId}:likes`
  const CACHE_TTL = 300 // 5分钟

  try {
    // 1. 优先从Redis缓存获取点赞总数
    let count: number
    try {
      const cachedCount = await redis.get(CACHE_KEY)
      if (cachedCount !== null) {
        count = JSON.parse(cachedCount)
      } else {
        // 从数据库获取最新计数
        const { count: dbCount } = await supabase
          .from("post_likes")
          .select("*", { count: "exact", head: true })
          .eq("post_id", postId)
        count = dbCount || 0

        // 缓存到Redis
        await redis.set(CACHE_KEY, String(count), { ex: CACHE_TTL })
      }
    } catch (err) {
      console.error("获取计数错误:", err)
      // 缓存失败，直接查询数据库
      const { count: dbCount } = await supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId)
      count = dbCount || 0
    }

    // 2. 检查当前用户是否点赞了该文章
    let hasLiked = false
    const { data: { user } } = await supabase.auth.getUser()

    if (user && user.id) {
      const CACHE_USER_KEY = `post:${postId}:user:${user.id}:liked`
      try {
        const cachedLiked = await redis.get(CACHE_USER_KEY)
        if (cachedLiked !== null) {
          hasLiked = JSON.parse(cachedLiked)
        } else {
          // 从数据库查询用户点赞状态
          const { data: userLike, error: likeError } = await supabase
            .from("post_likes")
            .select("id")
            .eq("post_id", postId)
            .eq("user_id", user.id)
            .single()

          hasLiked = !likeError && !!userLike
          // 缓存用户点赞状态
          await redis.set(CACHE_USER_KEY, String(hasLiked), { ex: CACHE_TTL })
        }
      } catch (err) {
        console.error("查询用户点赞状态错误:", err)
        // 直接查询数据库
        const { data: userLike, error: likeError } = await supabase
          .from("post_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("user_id", user.id)
          .single()
        hasLiked = !likeError && !!userLike
      }
    }

    return NextResponse.json({
      count,
      hasLiked,
    })
  } catch (error) {
    console.error("获取点赞状态错误:", error)
    return NextResponse.json({ error: await getServerMessage("api.serverError", "Internal server error") }, { status: 500 })
  }
}