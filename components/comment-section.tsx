'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ThumbsUp, Reply, MessageSquare } from 'lucide-react'
import { format } from 'date-fns'
import { zhCN, enUS } from 'date-fns/locale'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { ensureUserProfile } from '@/lib/utils/profiles'

interface Comment {
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

export function CommentSection({ postId }: { postId: string }) {
  const locale = useLocale()
  const t = useTranslations('CommentSection')
  const dateLocale = locale === 'zh-CN' ? zhCN : enUS
  const dateFormat = locale === 'zh-CN' ? 'yyyy年M月d日 HH:mm' : 'MMM d, yyyy HH:mm'
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [user, setUser] = useState<any>(null)

  // 获取用户信息
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    fetchUser()
  }, [])

  // 获取评论
  useEffect(() => {
    const fetchComments = async () => {
      try {
        const supabase = createClient()
        const { data: comments, error } = await supabase
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
          .is('parent_id', null)
          .order('created_at', { ascending: true })

        if (error) {
          setLoading(false)
          console.error('Error fetching comments:', error)
          return
        }

        // 获取每个评论的回复和点赞数
        const commentsWithReplies = await Promise.all(
          comments.map(async (comment) => {
          const { data: replies, error: repliesError } = await supabase
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
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true })

          if (repliesError) {
            console.error('Error fetching replies:', repliesError)
          }

          // 获取评论的点赞数
          const { count: likesCount } = await supabase
            .from('comment_likes')
            .select('*', { count: 'exact', head: true })
            .eq('comment_id', comment.id)

          let userHasLiked = false
          if (user) {
            const { data: like } = await supabase
            .from('comment_likes')
            .select('id')
            .eq('comment_id', comment.id)
            .eq('user_id', user.id)
            .single()
            userHasLiked = !!like
          }

          const repliesWithLikeStatus = await Promise.all(
            (replies || []).map(async (reply) => {
            const { count: replyLikesCount } = await supabase
              .from('comment_likes')
              .select('*', { count: 'exact', head: true })
              .eq('comment_id', reply.id)

            let replyUserHasLiked = false
            if (user) {
              const { data: like } = await supabase
              .from('comment_likes')
              .select('id')
              .eq('comment_id', reply.id)
              .eq('user_id', user.id)
              .single()
              replyUserHasLiked = !!like
            }
            return {
              ...reply,
              likes_count: replyLikesCount || 0,
              user_has_liked: replyUserHasLiked,
              profiles: Array.isArray(reply.profiles) ? reply.profiles[0] : reply.profiles
            }
            })
          )

          return {
            ...comment,
            likes_count: likesCount || 0,
            user_has_liked: userHasLiked,
            replies: repliesWithLikeStatus,
            profiles: Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles
          }
          })
        )

        setComments(commentsWithReplies as Comment[])
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

    const supabase = createClient()

    try {
      // 确保用户资料存在
      await ensureUserProfile(user.id)
    } catch (error) {
      console.error('Error creating user profile:', error)
      return
    }

    const { data: newComment, error } = await supabase
      .from('comments')
      .insert({
        content: commentText,
        author_id: user.id,
        post_id: postId,
        parent_id: null
      })
      .select(`
        id,
        content,
        author_id,
        post_id,
        parent_id,
        created_at,
        profiles:author_id(username, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Error submitting comment:', error)
      return
    }

    setComments([...comments, {
      ...newComment,
      likes_count: 0,
      user_has_liked: false,
      replies: [],
      profiles: {
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

    const supabase = createClient()

    try {
      // 确保用户资料存在
      await ensureUserProfile(user.id)
    } catch (error) {
      console.error('Error creating user profile:', error)
      return
    }

    const { data: newReply, error } = await supabase
      .from('comments')
      .insert({
        content: replyText,
        author_id: user.id,
        post_id: postId,
        parent_id: replyingTo
      })
      .select(`
        id,
        content,
        author_id,
        post_id,
        parent_id,
        created_at,
        profiles:author_id(username, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Error submitting reply:', error)
      return
    }

    const updatedComments = comments.map(comment => {
      if (comment.id === replyingTo) {
        return {
          ...comment,
          replies: [...(comment.replies || []), {
            ...newReply,
            likes_count: 0,
            user_has_liked: false
          }]
        }
      }
      return comment
    })

    setComments(updatedComments as Comment[])
    setReplyText('')
    setReplyingTo(null)
  }

  // 点赞评论
  const handleLikeComment = async (commentId: string, isReply = false) => {
    if (!user) return

    const supabase = createClient()
    
    // 检查是否已点赞
    const { data: existingLike } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .single()

    if (existingLike) {
      // 取消点赞
      await supabase
        .from('comment_likes')
        .delete()
        .eq('id', existingLike.id)
    } else {
      // 添加点赞
      await supabase
        .from('comment_likes')
        .insert({
          comment_id: commentId,
          user_id: user.id
        })
    }

    // 更新本地状态
    if (isReply) {
      const updatedComments = comments.map(comment => ({
        ...comment,
        replies: comment.replies?.map(reply => {
          if (reply.id === commentId) {
            return {
              ...reply,
              likes_count: existingLike ? reply.likes_count - 1 : reply.likes_count + 1,
              user_has_liked: !existingLike
            }
          }
          return reply
        })
      }))
      setComments(updatedComments)
    } else {
      const updatedComments = comments.map(comment => {
        if (comment.id === commentId) {
          return {
            ...comment,
            likes_count: existingLike ? comment.likes_count - 1 : comment.likes_count + 1,
            user_has_liked: !existingLike
          }
        }
        return comment
      })
      setComments(updatedComments)
    }
  }

  if (loading) {
    return <div className="text-center py-8">{t('loading')}</div>
  }

  return (
    <div className="space-y-6">
      {/* 评论输入框 */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-4">{t('postComment')}</h3>
        {user ? (
          <form onSubmit={handleSubmitComment} className="space-y-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.user_metadata?.avatar_url || "/avatar.png"} />
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
      <div className="space-y-6">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="border rounded-lg p-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={comment.profiles?.avatar_url || "/avatar.png"} />
                  <AvatarFallback>{comment.profiles?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <div>
                    <h4 className="font-medium">{comment.profiles?.username || t('anonymousUser')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(comment.created_at), dateFormat, { locale: dateLocale })}
                    </p>
                  </div>
                  <p>{comment.content}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <button
                      onClick={() => handleLikeComment(comment.id)}
                      className={`flex items-center gap-1 transition-colors ${
                      comment.user_has_liked
                        ? 'text-blue-500'
                        : 'hover:text-blue-500'
                      }`}
                    >
                      <ThumbsUp className={`h-4 w-4 ${comment.user_has_liked ? 'fill-current' : ''}`} />
                      <span>{comment.likes_count}</span>
                    </button>
                    {user && (
                      <button
                        onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                        className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                      >
                        <Reply className="h-4 w-4" />
                        <span>{t('reply')}</span>
                      </button>
                    )}
                  </div>

                  {/* 回复输入框 */}
                  {replyingTo === comment.id && user && (
                    <div className="mt-4 border-t pt-4">
                      <form onSubmit={handleSubmitReply} className="flex items-start gap-4">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.user_metadata?.avatar_url || "/avatar.png"} />
                          <AvatarFallback>{user.user_metadata?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <Textarea
                            placeholder={t('replyTo', { name: comment.profiles?.username || t('user') })}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="min-h-[80px] resize-none"
                            maxLength={1000}
                          />
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-sm text-muted-foreground">
                              {replyText.length}/1000
                            </span>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                  setReplyingTo(null)
                                  setReplyText('')
                                }}
                              >
                                {t('cancelReply')}
                              </Button>
                              <Button type="submit" disabled={!replyText.trim()}>
                                {t('reply')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* 回复列表 */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-200">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="space-y-2">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={reply.profiles?.avatar_url || "/avatar.png"} />
                              <AvatarFallback>{reply.profiles?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                              <div>
                                <h5 className="font-medium text-sm">{reply.profiles?.username || t('anonymousUser')}</h5>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(reply.created_at), dateFormat, { locale: dateLocale })}
                                </p>
                              </div>
                              <p className="text-sm">{reply.content}</p>
                              <div className="flex items-center gap-4 text-xs">
                                <button
                                  onClick={() => handleLikeComment(reply.id, true)}
                                  className={`flex items-center gap-1 transition-colors ${
                                  reply.user_has_liked
                                    ? 'text-blue-500'
                                    : 'hover:text-blue-500'
                                  }`}
                                >
                                  <ThumbsUp className={`h-3 w-3 ${reply.user_has_liked ? 'fill-current' : ''}`} />
                                  <span>{reply.likes_count}</span>
                                </button>
                                {user && (
                                  <button
                                    onClick={() => setReplyingTo(replyingTo === reply.id ? null : reply.id)}
                                    className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                                  >
                                    <Reply className="h-3 w-3" />
                                    <span>{t('reply')}</span>
                                  </button>
                                )}
                              </div>

                              {/* 回复的回复输入框 */}
                              {replyingTo === reply.id && user && (
                                <div className="mt-3 border-t pt-3">
                                  <form onSubmit={handleSubmitReply} className="flex items-start gap-3">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={user.user_metadata?.avatar_url || "/avatar.png"} />
                                      <AvatarFallback>{user.user_metadata?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <Textarea
                                        placeholder={t('replyTo', { name: reply.profiles?.username || t('user') })}
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        className="min-h-[60px] resize-none text-sm"
                                        maxLength={1000}
                                      />
                                      <div className="flex justify-between items-center mt-2">
                                        <span className="text-xs text-muted-foreground">
                                          {replyText.length}/1000
                                        </span>
                                        <div className="flex gap-2">
                                          <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                              setReplyingTo(null)
                                              setReplyText('')
                                            }}
                                          >
                                            {t('cancelReply')}
                                          </Button>
                                          <Button type="submit" size="sm" disabled={!replyText.trim()}>
                                            {t('reply')}
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  </form>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>{t('noComments')}</p>
          </div>
        )}
      </div>
    </div>
  )
}