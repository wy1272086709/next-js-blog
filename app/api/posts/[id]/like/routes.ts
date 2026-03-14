import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/posts/[id]/like
 * 处理文章点赞（使用 Supabase 数据库存储）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const postId = params.id

    // 获取当前用户
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const userId = user.id

    // 检查用户是否已点赞
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single()

    if (existingLike) {
      // 已点赞，取消点赞
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)

      // 获取新的点赞数
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

      return NextResponse.json({
        success: true,
        liked: false,
        count: count || 0,
      })
    } else {
      // 未点赞，添加点赞
      await supabase
        .from('likes')
        .insert({
          post_id: postId,
          user_id: userId,
        })

      // 获取新的点赞数
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

      return NextResponse.json({
        success: true,
        liked: true,
        count: count || 0,
      })
    }
  } catch (error) {
    console.error('[Like API] 错误:', error)
    return NextResponse.json(
      { error: '操作失败，请稍后重试' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/posts/[id]/like
 * 获取文章点赞数和用户点赞状态
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const postId = params.id

    // 获取点赞总数
    const { count } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)

    // 检查当前用户是否已点赞
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let hasLiked = false
    if (user) {
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single()

      hasLiked = !!existingLike
    }

    return NextResponse.json({
      success: true,
      count: count || 0,
      liked: hasLiked,
    })
  } catch (error) {
    console.error('[Get Like Count] 错误:', error)
    return NextResponse.json(
      { error: '获取失败，请稍后重试' },
      { status: 500 }
    )
  }
}
