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


export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles:author_id(username, avatar_url),
      categories:category_id(name, slug)
    `,
    )
    .eq("id", id)
    .single()
  if (!post) {
    notFound()
  }

  // 优化：使用 Redis 缓存获取点赞数
  const likeKey = `post:${id}:likes`
  let likeCount: number | null = null
  
  // 先从 Redis 获取
  const cachedCount = await redis.get(likeKey)
  if (cachedCount !== null) {
    likeCount = parseInt(cachedCount)
  } else {
    // Redis 未命中，从数据库查询
    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("post_id", id)
    
    likeCount = count || 0
    // 缓存到 Redis，24小时过期
    await redis.set(likeKey, String(likeCount), { EX: 86400 })
  }

  // 获取当前用户是否点赞
  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  let hasLiked = false
  if (user) {
    const userLikeKey = `post:${id}:user:${user.id}:liked`
    
    // 先从 Redis 获取用户点赞状态
    const cachedLikeStatus = await redis.exists(userLikeKey)
    
    if (cachedLikeStatus) {
      hasLiked = true
    } else {
      // Redis 未命中，从数据库查询
      const { data: like } = await supabase
        .from("likes")
        .select("id")
        .eq("post_id", id)
        .eq("user_id", user.id)
        .single()
      
      hasLiked = !!like
      
      // 如果用户已点赞，缓存这个状态（30天过期）
      if (hasLiked) {
        await redis.set(userLikeKey, "1", { EX: 86400 * 30 })
      }
    }
  }

  // 更新浏览量
  await supabase
    .from("posts")
    .update({ view_count: (post.view_count || 0) + 1 })
    .eq("id", id)

  // 获取评论数
  const { count: commentCount } = await supabase
    .from("comments")
    .select("*", { count: "exact", head: true })
    .eq("post_id", id)

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