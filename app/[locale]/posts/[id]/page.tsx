import { setRequestLocale } from "next-intl/server"
import { getTranslations } from "next-intl/server"
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
import { getPublicPost } from "@/lib/data/public-posts"
import { normalizeLooseNestedLists } from "@/lib/markdown/normalize"
import { interactionsEnabled } from "@/lib/features"
import { PostViewCount } from "@/components/post-view-count"

export const revalidate = 300
export const dynamicParams = true

type Props = { params: Promise<{ locale: string; id: string }> }

export function generateStaticParams() {
  return []
}

export default async function PostPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const t = await getTranslations("PostDetail")
  const dateFormatT = await getTranslations("dateFormat")
  const dateLocale = locale === "zh-CN" ? zhCN : enUS
  const dateFormat = dateFormatT("yearMonthDay")
  const post = await getPublicPost(id)
  if (!post) notFound()

  // 评论总数将在客户端计算，以避免额外的API调用
  const author = post.profiles as {
    username: string
    avatar_url: string
  } | null
  const category = post.categories as { name: string; slug: string } | null

  return (
    <article className="pl-[24px] pr-[24px] py-10">
      {category && (
        <Badge variant="secondary" className="mb-4">
          {category.name}
        </Badge>
      )}
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-balance">
        {post.title}
      </h1>
      <div className="flex items-center gap-4 mb-8 pb-8 border-b">
        <Avatar className="h-10 w-10">
          <AvatarImage
            src={author?.avatar_url ? author.avatar_url : undefined}
          />
          <AvatarFallback>
            {author?.username?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <p className="font-medium">
            {author?.username || t("anonymousUser")}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              {format(new Date(post.created_at), dateFormat, {
                locale: dateLocale,
              })}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <PostViewCount postId={id} initialCount={post.view_count || 0} /> {t("reads")}
            </span>
            {interactionsEnabled && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span className="comment-count">0</span> {t("commentsCount")}
              </span>
            )}
          </div>
        </div>
        {interactionsEnabled && <LikeButton postId={id} />}
      </div>
      <div className="article-markdown markdown-body prose prose-neutral dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {normalizeLooseNestedLists(post.content || "")}
        </ReactMarkdown>
      </div>
      {interactionsEnabled && <CommentSection postId={id} />}
    </article>
  )
}
