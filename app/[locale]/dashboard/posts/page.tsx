import { setRequestLocale } from "next-intl/server"
import { getTranslations } from "next-intl/server"
import { redirect, Link } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PenSquare, Eye, Heart, Edit } from "lucide-react"
import { format } from "date-fns"
import { zhCN, enUS } from "date-fns/locale"
import { DeletePostButton } from "@/components/delete-post-button"
import { routing } from "@/i18n/routing"

type Props = { params: Promise<{ locale: string }> }

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function MyPostsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("Dashboard")
  const dateLocale = locale === "zh-CN" ? zhCN : enUS
  const dateFormat = locale === "zh-CN" ? "yyyy年M月d日" : "MMM d, yyyy"

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: posts } = await supabase
    .from("posts")
    .select(
      `
      *,
      categories:category_id(name, slug),
      likes(count)
    `
    )
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("myPostsTitle")}</h1>
          <p className="text-muted-foreground">{t("myPostsDesc")}</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/write">
            <PenSquare className="mr-2 h-4 w-4" />
            {t("writePost")}
          </Link>
        </Button>
      </div>
      {posts && posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => {
            const category = post.categories as { name: string; slug: string } | null
            const likeCount = post.likes?.[0]?.count || 0
            return (
              <Card key={post.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {category && (
                          <Badge variant="secondary">{category.name}</Badge>
                        )}
                        {!post.published && (
                          <Badge variant="outline">{t("draft")}</Badge>
                        )}
                      </div>
                      <Link href={`/posts/${post.id}`} className="hover:underline">
                        <h3 className="font-semibold text-lg">{post.title}</h3>
                      </Link>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>
                          {format(new Date(post.created_at), dateFormat, {
                            locale: dateLocale,
                          })}
                        </span>
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
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/write?edit=${post.id}`}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">{t("edit")}</span>
                        </Link>
                      </Button>
                      <DeletePostButton postId={post.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <p>{t("noMyPosts")}</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/write">
                <PenSquare className="mr-2 h-4 w-4" />
                {t("writeFirstPost")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
