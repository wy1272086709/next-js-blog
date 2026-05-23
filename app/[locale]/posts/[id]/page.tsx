import { setRequestLocale } from "next-intl/server"
import { getTranslations } from "next-intl/server"
import { createClient } from "@/lib/supabase/server"
import { redis } from "@/lib/redis"
import { notFound } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { LikeButton } from "@/components/like-button"
import { CalendarDays, Eye, MessageSquare } from "lucide-react"
import { format } from "date-fns"
import { zhCN, enUS } from "date-fns/locale"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { CommentSection } from "@/components/comment-section"
import { routing } from "@/i18n/routing"

const REDIS_TIMEOUT_MS = 3000
// 强制动态渲染
export const dynamic = 'force-dynamic'

async function withRedisTimeout<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await Promise.race([
      fn(),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("Redis timeout")), REDIS_TIMEOUT_MS)
      ),
    ])
  } catch {
    return null
  }
}

type Props = { params: Promise<{ locale: string; id: string }> }

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function PostPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const t = await getTranslations("PostDetail")
  const dateFormatT = await getTranslations("dateFormat")
  const dateLocale = locale === "zh-CN" ? zhCN : enUS
  const dateFormat = dateFormatT("yearMonthDay")
  // 使用了依赖动态 API（如 cookies）的 Supabase 服务端客户端
  // bug修复
  const supabase = await createClient()
  const likeKey = `post:${id}:likes`
  const [postResult, cachedCount, authResult] = await Promise.all([
    supabase
      .from("posts")
      .select(
        `
      *,
      profiles:author_id(username, avatar_url),
      categories:category_id(name, slug)
    `
      )
      .eq("id", id)
      .single(),
    withRedisTimeout(() => redis.get(likeKey)),
    supabase.auth.getUser(),
  ])

  const { data: post } = postResult
  if (!post) notFound()

  const { data: { user } } = authResult

  let likeCount: number
  if (cachedCount !== null && cachedCount !== undefined) {
    likeCount = typeof cachedCount === "string" ? parseInt(cachedCount, 10) : Number(cachedCount)
  } else {
    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", id)
    likeCount = count ?? 0
    withRedisTimeout(() => redis.set(likeKey, String(likeCount), { ex: 86400 })).catch(() => {})
  }

  let hasLiked = false
  const userLikeKey = user ? `post:${id}:user:${user.id}:liked` : null

  const [cachedLikeStatus, _view, commentResult] = await Promise.all([
    userLikeKey ? withRedisTimeout(() => redis.exists(userLikeKey)) : Promise.resolve(null),
    supabase.from("posts").update({ view_count: (post.view_count || 0) + 1 }).eq("id", id),
    supabase.from("comments").select("*", { count: "exact", head: true }).eq("post_id", id),
  ])

  if (user && userLikeKey) {
    if (cachedLikeStatus === true) {
      hasLiked = true
    } else {
      const { data: like } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", id)
        .eq("user_id", user.id)
        .single()
      hasLiked = !!like
      if (hasLiked) {
        withRedisTimeout(() => redis.set(userLikeKey, "1", { ex: 86400 * 30 })).catch(() => {})
      }
    }
  }

  const { count: commentCount } = commentResult
  const author = post.profiles as { username: string; avatar_url: string } | null
  const category = post.categories as { name: string; slug: string } | null

  return (
    <article className="pl-[24px] pr-[24px] py-10">
      {category && (
        <Badge variant="secondary" className="mb-4">
          {category.name}
        </Badge>
      )}
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-balance">{post.title}</h1>
      <div className="flex items-center gap-4 mb-8 pb-8 border-b">
        <Avatar className="h-10 w-10">
          <AvatarImage src={author?.avatar_url ? author.avatar_url : undefined} />
          <AvatarFallback>{author?.username?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-medium">{author?.username || t("anonymousUser")}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              {format(new Date(post.created_at), dateFormat, { locale: dateLocale })}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {post.view_count || 0} {t("reads")}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              {commentCount || 0} {t("commentsCount")}
            </span>
          </div>
        </div>
        <LikeButton postId={id} initialLikeCount={likeCount || 0} initialHasLiked={hasLiked} />
      </div>
      <div className="markdown-body prose prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {post.content || ""}
        </ReactMarkdown>
      </div>
      <div className="mt-12 border-t pt-8">
        <h2 className="text-xl font-bold mb-6">
          {t("commentsTitle")} ({commentCount || 0})
        </h2>
        <CommentSection postId={id} />
      </div>
    </article>
  )
}
