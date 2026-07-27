'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ThumbsUp, Reply, MessageSquare } from 'lucide-react'
import { zhCN, enUS } from 'date-fns/locale'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { getClientCSRFToken } from '@/lib/csrf/client'
import { CommentList } from '@/components/comment-list'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'

export interface Comment {
  id: string
  content: string
  author_id: string
  post_id: string
  parent_id: string | null
  created_at: string
  profiles: {
    username: string
    avatar_url: string
  }
  likes_count: number
  user_has_liked: boolean
  replies?: Comment[]
}

interface CommentSectionProps {
  postId: string
  initialUser?: any
  commentCount?: number
}

function findCommentById(comments: Comment[], targetId: string): Comment | null {
  for (const comment of comments) {
    if (comment.id === targetId) return comment
    const reply = findCommentById(comment.replies || [], targetId)
    if (reply) return reply
  }
  return null
}

export function CommentSection({ postId, initialUser }: CommentSectionProps) {
  const locale = useLocale()
  const t = useTranslations('CommentSection')
  const dateFormatT = useTranslations('dateFormat')
  const dateLocale = locale === 'zh-CN' ? zhCN : enUS
  const dateFormat = dateFormatT('yearMonthDayTime')
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [user, setUser] = useState<any>(initialUser)

  console.log('comments', comments)
  // 如果没有传入用户信息，则从客户端获取
  useEffect(() => {
    if (!user) {
      const fetchUser = async () => {
        const clientSupabase = createClient()
        const { data: { user } } = await clientSupabase.auth.getUser()
        setUser(user)
      }
      fetchUser()
    }
  }, [user])

  // 获取评论
  useEffect(() => {
    const fetchComments = async () => {
      try {
        // 优先使用服务端传递的supabase客户端
        const clientSupabase = createClient()

        // 批量获取所有需要的评论数据
        const [commentsResult, likesResult] = await Promise.all([
          // 获取所有评论和回复
          clientSupabase
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
          clientSupabase
            .from('comment_likes')
            .select('id, comment_id, user_id')
        ]);
        if (commentsResult.error) {
          setLoading(false)
          console.error('Error fetching comments:', commentsResult.error)
          return
        }

        // 创建评论和回复的映射
        const commentsMap = new Map()
        const repliesMap = new Map()
        const rootComments: Comment[] = []

        // 构建评论树
        commentsResult.data.forEach(comment => {
          const commentData = {
            ...comment,
            profiles: Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles,
            likes_count: 0,
            user_has_liked: false,
            replies: [] as Comment[]
          };

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
            const commentId = like.comment_id;
            // 更新评论点赞数
            const comment = commentsMap.get(commentId) || repliesMap.get(commentId)?.find(c => c.id === commentId);
            if (comment) {
              comment.likes_count++;
              // 检查用户是否点赞
              if (user && like.user_id === user.id) {
                comment.user_has_liked = true;
              }
            }
          });
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
        });
        setComments(rootComments);
        setLoading(false)
      } catch (error) {
        console.error('Error fetching comments:', error)
        setLoading(false)
      }
    }
    fetchComments()
  }, [postId, user])

  // 提交评论
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || !user) return

    const csrfToken = await getClientCSRFToken()
    const response = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ content: commentText, parentId: null })
    })

    if (!response.ok) {
      console.error('Error submitting comment:', await response.json())
      return
    }

    const { data: newComment } = await response.json()

    setComments([...comments, {
      ...newComment,
      likes_count: 0,
      user_has_liked: false,
      replies: [],
      profiles: Array.isArray(newComment.profiles) ? newComment.profiles[0] : newComment.profiles || {
        username: user.user_metadata?.username || '',
        avatar_url: user.user_metadata?.avatar_url || ''
      }
    } as Comment])
    setCommentText('')
  }

  // 提交回复
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyText.trim() || !user || !replyingTo) return

    const csrfToken = await getClientCSRFToken()
    const response = await fetch(`/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ content: replyText, parentId: replyingTo })
    })

    if (!response.ok) {
      console.error('Error submitting reply:', await response.json())
      return
    }

    const { data: newReply } = await response.json()

    const newReplyComment = {
      ...newReply,
      likes_count: 0,
      user_has_liked: false,
      profiles: Array.isArray(newReply.profiles) ? newReply.profiles[0] : newReply.profiles || {
        username: user.user_metadata?.username || '',
        avatar_url: user.user_metadata?.avatar_url || ''
      }
    }

    const updatedComments = addReplyToComment(comments, replyingTo, newReplyComment)
    setComments(updatedComments)
    setReplyText('')
    setReplyingTo(null)
  }

  // 递归函数：在评论树中查找并添加回复
  const addReplyToComment = (commentsArray: Comment[], targetCommentId: string, newReply: Comment): Comment[] => {
    return commentsArray.map(comment => {
      if (comment.id === targetCommentId) {
        // 找到目标评论，添加回复
        return {
          ...comment,
          replies: [...(comment.replies || []), newReply]
        }
      }
      // 如果当前评论有子评论，递归查找
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: addReplyToComment(comment.replies, targetCommentId, newReply)
        }
      }
      return comment
    })
  }

   // 点赞评论
  const handleLikeComment = async (commentId: string, _isReply = false) => {
    if (!user) return

    const commentToLike = findCommentById(comments, commentId)
    if (!commentToLike) return

    const liked = !commentToLike.user_has_liked
    const csrfToken = await getClientCSRFToken()
    const response = await fetch(`/api/comments/${commentId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ liked })
    })

    if (!response.ok) {
      console.error('Error liking comment:', await response.json())
      return
    }

    // 更新本地状态 - 使用深度遍历来更新嵌套的评论
    setComments(prevComments => {
      const findAndUpdateComment = (commentsArray: Comment[], targetId: string, updatedComment: Comment): Comment[] => {
        return commentsArray.map(comment => {
          // 如果当前评论ID匹配
          if (comment.id === targetId) {
            return updatedComment
          }

          // 如果当前评论有回复，递归检查
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: findAndUpdateComment(comment.replies, targetId, updatedComment)
            }
          }

          return comment
        })
      }

      // 辅助函数：在评论树中查找评论
      const findComment = (commentsArray: Comment[], targetId: string): Comment | null => {
        for (const comment of commentsArray) {
          if (comment.id === targetId) {
            return comment
          }
          if (comment.replies && comment.replies.length > 0) {
            const found = findComment(comment.replies, targetId)
            if (found) {
              return found
            }
          }
        }
        return null
      }

      const commentToUpdate = findComment(prevComments, commentId)
      if (!commentToUpdate) return prevComments

      // 创建更新后的评论对象
      const updatedComment: Comment = {
        ...commentToUpdate,
        likes_count: liked ? commentToUpdate.likes_count + 1 : commentToUpdate.likes_count - 1,
        user_has_liked: liked
      }

      return findAndUpdateComment(prevComments, commentId, updatedComment)
    })
  }

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>
  }

  return (
    <div className="mt-12 border-t pt-8">
      <h2 className="text-xl font-bold mb-6">
        {t("commentsTitle")} ({comments.length || 0})
      </h2>
      <div className="space-y-6">
      {/* 评论输入框 */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-4">{t('postComment')}</h3>
        {user ? (
          <form onSubmit={handleSubmitComment} className="space-y-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.user_metadata?.avatar_url ? user.user_metadata.avatar_url : undefined} />
                <AvatarFallback>{user.user_metadata?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  placeholder={t('placeholder')}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[100px] resize-none"
                  maxLength={1000}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-muted-foreground">
                    {commentText.length}/1000
                  </span>
                  <Button type="submit" disabled={!commentText.trim()}>
                    {t('publish')}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <p className="text-center py-8">
            {t('loginToComment')} <Link href="/auth/login" className="text-blue-500 hover:underline">{t('login')}</Link> {t('afterLogin')}
          </p>
        )}
      </div>

      {/* 评论列表 */}
      <CommentList
        comments={comments}
        user={user}
        t={t}
        handleLikeComment={handleLikeComment}
        handleSubmitReply={handleSubmitReply}
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
        setReplyText={setReplyText}
        replyText={replyText}
        dateFormat={dateFormat}
        dateLocale={dateLocale}
      />
    </div>
    </div>
  )
}
