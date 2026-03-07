import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { LikeButton } from "@/components/like-button"
import { CalendarDays, Eye } from "lucide-react"
import { format } from "date-fns"
import { zhCN } from "date-fns/locale"

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
  console.log('post:', post, 'id:', id);
  if (!post) {
    notFound()
  }

  // 获取点赞数
  const { count: likeCount } = await supabase
    .from("likes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", id)

  // 获取当前用户是否点赞
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let hasLiked = false
  if (user) {
    const { data: like } = await supabase.from("likes").select("id").eq("post_id", id).eq("user_id", user.id).single()

    hasLiked = !!like
  }

  // 更新浏览量
  await supabase
    .from("posts")
    .update({ view_count: (post.view_count || 0) + 1 })
    .eq("id", id)

  const author = post.profiles as { username: string; avatar_url: string } | null
  const category = post.categories as { name: string; slug: string } | null

  return (
    <article className="container max-w-4xl py-10">
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
          <AvatarImage src={author?.avatar_url || "/placeholder.svg"} />
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
          </div>
        </div>
        <LikeButton postId={post.id} initialLikeCount={likeCount || 0} initialHasLiked={hasLiked} />
      </div>

      {/* 文章内容 */}
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        {post.content.split("\n").map((paragraph: string, index: number) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
    </article>
  )
}
