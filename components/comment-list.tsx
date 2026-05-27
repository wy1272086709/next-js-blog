'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, Reply, ThumbsUp } from 'lucide-react'
import { format } from 'date-fns'
import { useTranslations } from 'next-intl'
import { User } from '@supabase/supabase-js'
import { useState } from 'react'
import { Locale } from 'date-fns'

interface Comment {
  id: string
  content: string
  created_at: string
  likes_count: number
  user_has_liked: boolean
  profiles?: {
    username?: string
    avatar_url?: string
  }
  replies?: Comment[]
}

interface CommentListProps {
  comments: Comment[]
  user: User | null
  t: (key: string) => string
  handleLikeComment: (commentId: string, isReply?: boolean) => void
  handleSubmitReply: (e: React.FormEvent) => void
  replyingTo: string | null
  setReplyingTo: (id: string | null) => void
  setReplyText: (text: string) => void
  replyText: string
  dateFormat: string
  dateLocale: Locale
}

export function CommentList({
  comments,
  user,
  t,
  handleLikeComment,
  handleSubmitReply,
  replyingTo,
  setReplyingTo,
  setReplyText,
  replyText,
  dateFormat,
  dateLocale,
}: CommentListProps) {
  return (
    <div className="space-y-6">
      {comments.length > 0 ? (
        comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
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
        ))
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>{t('noComments')}</p>
        </div>
      )}
    </div>
  )
}

interface CommentItemProps {
  comment: Comment
  user: User | null
  t: (key: string) => string
  handleLikeComment: (commentId: string, isReply?: boolean) => void
  handleSubmitReply: (e: React.FormEvent) => void
  replyingTo: string | null
  setReplyingTo: (id: string | null) => void
  setReplyText: (text: string) => void
  replyText: string
  dateFormat: string
  dateLocale: Locale
}

function CommentItem({
  comment,
  user,
  t,
  handleLikeComment,
  handleSubmitReply,
  replyingTo,
  setReplyingTo,
  setReplyText,
  replyText,
  dateFormat,
  dateLocale,
}: CommentItemProps) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start gap-4">
        <Avatar className="h-10 w-10">
          <AvatarImage src={comment.profiles?.avatar_url ? comment.profiles.avatar_url : undefined} />
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
            <ReplyForm
              user={user}
              t={t}
              handleSubmitReply={handleSubmitReply}
              setReplyingTo={setReplyingTo}
              setReplyText={setReplyText}
              replyText={replyText}
              placeholder={`${t('replyTo')} ${comment.profiles?.username || t('user')}`}
              className="mt-4 border-t pt-4"
            />
          )}

          {/* 回复列表 */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-200">
              {comment.replies.map((reply) => (
                <div key={reply.id} className="space-y-2">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={reply.profiles?.avatar_url ? reply.profiles.avatar_url : undefined} />
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
                        <ReplyForm
                          user={user}
                          t={t}
                          handleSubmitReply={handleSubmitReply}
                          setReplyingTo={setReplyingTo}
                          setReplyText={setReplyText}
                          replyText={replyText}
                          placeholder={`${t('replyTo')} ${reply.profiles?.username || t('user')}`}
                          className="mt-3 border-t pt-3"
                          size="sm"
                        />
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
  )
}

interface ReplyFormProps {
  user: User
  t: (key: string) => string
  handleSubmitReply: (e: React.FormEvent) => void
  setReplyingTo: (id: string | null) => void
  setReplyText: (text: string) => void
  replyText: string
  placeholder: string
  className?: string
  size?: 'default' | 'sm'
}

function ReplyForm({
  user,
  t,
  handleSubmitReply,
  setReplyingTo,
  setReplyText,
  replyText,
  placeholder,
  className,
  size = 'default',
}: ReplyFormProps) {
  const avatarSize = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'
  const buttonSize = size === 'sm' ? 'sm' : 'default'

  return (
    <div className={className}>
      <form onSubmit={handleSubmitReply} className={`flex items-start gap-${size === 'sm' ? '3' : '4'}`}>
        <Avatar className={avatarSize}>
          <AvatarImage src={user.user_metadata?.avatar_url ? user.user_metadata.avatar_url : undefined} />
          <AvatarFallback>{user.user_metadata?.username?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            placeholder={placeholder}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className={`min-h-${size === 'sm' ? '[60px]' : '[80px]'} resize-none`}
            maxLength={1000}
          />
          <div className="flex justify-between items-center mt-2">
            <span className={`text-${size === 'sm' ? 'xs' : 'sm'} text-muted-foreground`}>
              {replyText.length}/1000
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size={buttonSize}
                onClick={() => {
                  setReplyingTo(null)
                  setReplyText('')
                }}
              >
                {t('cancelReply')}
              </Button>
              <Button type="submit" size={buttonSize} disabled={!replyText.trim()}>
                {t('reply')}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}