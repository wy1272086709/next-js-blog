import { setRequestLocale } from "next-intl/server"
import { getTranslations } from "next-intl/server"
import { redirect } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Heart, Eye, TrendingUp } from "lucide-react"
import { PostCard } from "@/components/post-card"
import { routing } from "@/i18n/routing"

type Props = { params: Promise<{ locale: string }> }

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("Dashboard")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { count: postCount } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("author_id", user.id)

  const { data: viewData } = await supabase
    .from("posts")
    .select("view_count")
    .eq("author_id", user.id)
  const totalViews = viewData?.reduce((sum, post) => sum + (post.view_count || 0), 0) || 0

  const { data: userPosts } = await supabase
    .from("posts")
    .select("id")
    .eq("author_id", user.id)
  let totalLikes = 0
  if (userPosts?.length) {
    const postIds = userPosts.map((p) => p.id)
    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .in("post_id", postIds)
    totalLikes = count || 0
  }

  const { data: recentPosts } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles:author_id(username, avatar_url),
      categories:category_id(name, slug),
      likes(count)
    `
    )
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3)

  const username = user.user_metadata?.username || user.email?.split("@")[0]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t("welcomeBack", { name: username })}</h1>
        <p className="text-muted-foreground">{t("overviewDesc")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("postCount")}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{postCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalViews")}</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalLikes")}</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLikes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("avgViews")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {postCount ? Math.round(totalViews / postCount) : 0}
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-4">{t("recentPosts")}</h2>
        {recentPosts?.length ? (
          <div className="grid gap-4">
            {recentPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <p>{t("noPostsYet")}</p>
              <p className="text-sm mt-1">{t("startFirstPost")}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
