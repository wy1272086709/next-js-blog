import { createClient } from "@/lib/supabase/server"
import { redis } from "@/lib/redis"
import { notFound } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { LikeButton } from "@/components/like-button"
import { CalendarDays, Eye, MessageSquare, ThumbsUp, Reply } from "lucide-react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import { CommentSection } from "@/components/comment-section"


// Redis 调用带超时，避免连接异常时长时间阻塞（如 Redis 不可用）
const REDIS_TIMEOUT_MS = 3000

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

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // 第一轮并行：文章、点赞数缓存、当前用户
  const likeKey = `post:${id}:likes`
  const [postResult, cachedCount, authResult] = await Promise.all([
    supabase
      .from("posts")
      .select(
        `
      *,
      profiles:author_id(username, avatar_url),
      categories:category_id(name, slug)
    `,
      )
      .eq("id", id)
      .single(),
    withRedisTimeout(() => redis.get(likeKey)),
    supabase.auth.getUser(),
  ])

  const { data: post } = postResult
  if (!post) {
    notFound()
  }

  const { data: { user } } = authResult

  // 解析点赞数：有缓存用缓存，否则查库并回写缓存（带超时降级）
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

  // 用户点赞状态（仅登录用户）+ 浏览量更新 + 评论数 并行
  let hasLiked = false
  const userLikeKey = user ? `post:${id}:user:${user.id}:liked` : null

  const [cachedLikeStatus, _view, commentResult] = await Promise.all([
    userLikeKey
      ? withRedisTimeout(() => redis.exists(userLikeKey))
      : Promise.resolve(null),
    supabase
      .from("posts")
      .update({ view_count: (post.view_count || 0) + 1 })
      .eq("id", id),
    supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("post_id", id),
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
      {/* 分类标签 */}
      {category && (
        <Badge variant="secondary" className="mb-4">
          {category.name}
        </Badge>
      )}

      {/* 标题 */}
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-balance">{post.title}</h1>

      {/* 作者信息和元数据 */}
      <div className="flex items-center gap-4 mb-8 pb-8 border-b">
        <Avatar className="h-10 w-10">
          <AvatarImage src={author?.avatar_url || "/avatar.png"} />
          <AvatarFallback>{author?.username?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-medium">{author?.username || "匿名用户"}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              {format(new Date(post.created_at), "yyyy年M月d日", { locale: zhCN })}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {post.view_count || 0} 次阅读
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              {commentCount || 0} 条评论
            </span>
          </div>
        </div>
        <LikeButton postId={post.id} initialLikeCount={likeCount || 0} initialHasLiked={hasLiked} />
      </div>

      {/* 文章内容 */}
      <div className="markdown-body prose prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {post.content || ""}
        </ReactMarkdown>
      </div>

      {/* 评论区 */}
      <div className="mt-12 border-t pt-8">
        <h2 className="text-xl font-bold mb-6">评论 ({commentCount || 0})</h2>
        <CommentSection postId={id} />
      </div>
    </article>
  )
}