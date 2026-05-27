import { createClient } from "@/lib/supabase/server"
import type { Comment } from "@/components/comment-section"

export async function getCommentsData(postId: string) {
  const supabase = await createClient()

  // 批量获取所有需要的评论数据
  const [commentsResult, likesResult] = await Promise.all([
    // 获取所有评论和回复
    supabase
      .from('comments')
      .select(`
        id,
        content,
        author_id,
        post_id,
        parent_id,
        created_at,
        profiles:author_id(username, avatar_url)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true }),

    // 获取所有点赞
    supabase
      .from('comment_likes')
      .select('*')
      .in('comment_id', 'comments(id)')
  ])

  if (commentsResult.error) {
    throw new Error(commentsResult.error.message)
  }

  // 创建评论和回复的映射
  const commentsMap = new Map()
  const repliesMap = new Map()
  const rootComments: Comment[] = []

  // 构建评论树
  commentsResult.data.forEach(comment => {
    const commentData = {
      id: comment.id,
      content: comment.content,
      author_id: comment.author_id,
      post_id: comment.post_id,
      parent_id: comment.parent_id,
      created_at: comment.created_at,
      profiles: Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles,
      likes_count: 0,
      user_has_liked: false,
      replies: [] as Comment[]
    }

    if (comment.parent_id === null) {
      // 顶级评论
      rootComments.push(commentData)
      commentsMap.set(comment.id, commentData)
    } else {
      // 回复
      if (!repliesMap.has(comment.parent_id)) {
        repliesMap.set(comment.parent_id, [])
      }
      repliesMap.get(comment.parent_id).push(commentData)
    }
  })

  // 处理点赞数据
  if (likesResult.data) {
    likesResult.data.forEach(like => {
      const commentId = like.comment_id

      // 更新评论点赞数
      const comment = commentsMap.get(commentId) ||
                      repliesMap.get(commentId)?.find(c => c.id === commentId)
      if (comment) {
        comment.likes_count++
      }
    })
  }

  // 将回复添加到对应的评论
  repliesMap.forEach((replies, parentId) => {
    const parentComment = commentsMap.get(parentId)
    if (parentComment) {
      parentComment.replies = replies
    } else {
      // 处理可能的情况：回复在评论之前被处理
      rootComments.forEach(comment => {
        if (comment.id === parentId) {
          comment.replies = replies
        }
      })
    }
  })

  return {
    comments: rootComments,
    totalComments: rootComments.reduce((count, comment) => count + 1 + (comment?.replies?.length || 0), 0)
  }
}