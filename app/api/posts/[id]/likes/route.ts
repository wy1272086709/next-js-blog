import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient()

  try {
    const postId = params.id

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
      return NextResponse.json({ error: "获取点赞列表失败" }, { status: 500 })
    }

    // 格式化返回数据
    const formattedLikes = likes?.map(like => ({
      id: like.id,
      created_at: like.created_at,
      user: like.profiles ? {
        id: like.profiles.id,
        username: like.profiles?.username,
        avatar_url: like.profiles?.avatar_url,
      } : null
    })) || []

    return NextResponse.json({
      likes: formattedLikes,
      total: formattedLikes.length,
    })

  } catch (error) {
    console.error("获取点赞列表错误:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}