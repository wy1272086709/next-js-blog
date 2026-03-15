"use client"

import { Link } from "@/i18n/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Heart, Eye } from "lucide-react"
import { format } from "date-fns"
import { zhCN, enUS } from "date-fns/locale"
import { useLocale, useTranslations } from "next-intl"

interface PostCardProps {
  post: {
    id: string
    title: string
    excerpt: string | null
    content: string
    view_count: number
    created_at: string
    profiles: { username: string; avatar_url: string } | null
    categories: { name: string; slug: string } | null
    likes: { count: number }[]
  }
}

export function PostCard({ post }: PostCardProps) {
  const locale = useLocale()
  const t = useTranslations("PostCard")
  const dateLocale = locale === "zh-CN" ? zhCN : enUS
  const dateFormat = locale === "zh-CN" ? "M月d日" : "MMM d"
  const author = post.profiles
  const category = post.categories
  const likeCount = post.likes?.[0]?.count || 0

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <Link href={`/posts/${post.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {category && (
                <Badge variant="secondary" className="mb-2">
                  {category.name}
                </Badge>
              )}
              <CardTitle className="text-xl line-clamp-2">{post.title}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground line-clamp-2 mb-4">
            {post.excerpt || post.content.substring(0, 150)}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={author?.avatar_url || "/avatar.png"} />
                <AvatarFallback>
                  {author?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                {author?.username || t("anonymousUser")}
              </span>
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">
                {format(new Date(post.created_at), dateFormat, {
                  locale: dateLocale,
                })}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {post.view_count || 0}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                {likeCount}
              </span>
            </div>
          </div>
        </CardContent>
      </Link>
    </Card>
  )
}
