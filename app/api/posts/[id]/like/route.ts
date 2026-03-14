import { redis } from '@/lib/redis'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/posts/[id]/like
 * 处理文章点赞（使用 Redis 缓存和 Supabase 数据库存储）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const postId = (await params).id
    console.log(`[Like API] Processing POST request for post ID: ${postId}`)
    // 获取当前用户
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 })
    }

    const userId = user.id
    const likeKey = `post:${postId}:likes`
    const userLikeKey = `post:${postId}:user:${userId}:liked`

    // 检查用户是否已点赞（使用 Redis）
    const hasLiked = await redis.exists(userLikeKey)

    if (hasLiked) {
      // 已点赞，取消点赞
      await redis.del(userLikeKey)
      const newCount = await redis.decr(likeKey)

      // 同时更新数据库
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)

      return NextResponse.json({
        success: true,
        liked: false,
        count: Math.max(newCount, 0),
      })
    } else {
      // 未点赞，添加点赞
      await redis.set(userLikeKey, '1', { EX: 86400 * 30 }) // 30天过期
      const newCount = await redis.incr(likeKey)

      // 同时更新数据库
      await supabase
        .from('likes')
        .insert({
          post_id: postId,
          user_id: userId,
        })
        .select()

      return NextResponse.json({
        success: true,
        liked: true,
        count: newCount,
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
 * 获取文章点赞数和用户点赞状态（从 Redis 缓存）
 * 
 * 性能注意：
 * 此端点在 /app/posts/[id]/page.tsx 中被多次调用：
 * 1. 初始化加载点赞数
 * 2. 用户点赞后刷新
 * 3. React 热更新（开发环境）会导致组件重新渲染
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const postId = params.id
    const likeKey = `post:${postId}:likes`

    // 先从 Redis 获取缓存的点赞数
    let count = await redis.get(likeKey)

    if (count === null) {
      // Redis 未命中，从数据库加载
      const { count: dbCount, error } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)

      if (error) {
        console.error('数据库查询错误:', error)
        count = '0'
      } else {
        count = String(dbCount || 0)
        // 缓存到 Redis，24小时过期
        await redis.set(likeKey, count, { EX: 86400 })
      }
    }

    // 检查当前用户是否已点赞
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let hasLiked = false
    if (user) {
      const userLikeKey = `post:${postId}:user:${user.id}:liked`
      // 使用 Redis 缓存用户点赞状态
      hasLiked = (await redis.exists(userLikeKey)) > 0
    }

    return NextResponse.json({
      success: true,
      count: parseInt(count || '0'),
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
