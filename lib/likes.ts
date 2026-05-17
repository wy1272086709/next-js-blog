import { createServerSideClient } from "@/lib/supabase/server"

export async function getPostLikes(postId: string) {
  const supabase = createServerSideClient()

  try {
    // 获取文章的点赞总数
    const { count: likeCount, error: countError } = await supabase
      .from("post_likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", postId)

    if (countError) {
      throw new Error("获取点赞数失败")
    }

    // 如果用户已登录，检查当前用户是否点赞了该文章
    let hasLiked = false
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: userLike, error: likeError } = await supabase
        .from("post_likes")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .single()

      if (!likeError && userLike) {
        hasLiked = true
      }
    }

    return {
      count: likeCount || 0,
      hasLiked,
    }
  } catch (error) {
    console.error("获取点赞状态错误:", error)
    throw error
  }
}

export async function getPostLikeUsers(postId: string) {
  const supabase = createServerSideClient()

  try {
    // 获取点赞该文章的用户列表
    const { data: likes, error } = await supabase
      .from("post_likes")
      .select(`
        id,
        created_at,
        profiles (
          id,
          username,
          avatar_url
        )
      `)
      .eq("post_id", postId)
      .order("created_at", { ascending: false })

    if (error) {
      throw new Error("获取点赞列表失败")
    }

    // 格式化返回数据
    const formattedLikes = likes?.map(like => ({
      id: like.id,
      created_at: like.created_at,
      user: {
        id: like.profiles.id,
        username: like.profiles.username,
        avatar_url: like.profiles.avatar_url,
      }
    })) || []

    return {
      likes: formattedLikes,
      total: formattedLikes.length,
    }
  } catch (error) {
    console.error("获取点赞列表错误:", error)
    throw error
  }
}