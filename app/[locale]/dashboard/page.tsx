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


// 获取用户数据的函数（不缓存，因为依赖用户特定的cookie）
async function getUserData(userId: string, supabase: any) {
  // 并行执行所有数据库查询
  const [postsResult, profileResult, likesResult] = await Promise.all([
    supabase
      .from("posts")
      .select(`
        id,
        title,
        excerpt,
        published,
        created_at,
        updated_at,
        view_count,
        category_id (
          name,
          slug
        )
      `)
      .eq("author_id", userId)
      .order("created_at", { ascending: false }),

    supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", userId)
      .single(),

    // 获取该用户所有文章的点赞总数
    supabase
      .from("likes")
      .select("post_id", { count: "exact" })
      .eq("user_id", userId)
  ])

  const { data: posts } = postsResult
  const { data: profile } = profileResult
  const { count: totalLikes } = likesResult

  const stats = {
    postCount: posts?.length || 0,
    totalViews: posts?.reduce((sum: number, post: any) => sum + (post.view_count || 0), 0) || 0,
    totalLikes: totalLikes || 0,
    username: profile?.username || null,
    avatarUrl: profile?.avatar_url || null,
    recentPosts: posts?.slice(0, 3) || []
  }

  return stats
}

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("Dashboard")

  // 获取 cookieStore 在缓存函数之外
  const cookieStore = await import("next/headers").then(cookies => cookies.cookies())

  // 需要一个带 cookies 支持的客户端来获取用户信息
  const supabase = await createClient(cookieStore)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  console.log("当前用户信息:page.ts:", user)

  // 检查用户是否存在以及 user.id 是否存在
  if (!user || !user.id) {
    redirect({ href: "/auth/login", locale })
  }

  // 获取用户数据（不缓存，因为依赖用户特定的cookie）
  const stats = await getUserData(user?.id!, supabase)

  const username = stats.username || user?.user_metadata?.username || user?.email?.split("@")?.[0]

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
            <div className="text-2xl font-bold">{stats.postCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalViews")}</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("totalLikes")}</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLikes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("avgViews")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.postCount ? Math.round(stats.totalViews / stats.postCount) : 0}
            </div>
          </CardContent>
        </Card>
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-4">{t("recentPosts")}</h2>
        {stats.recentPosts?.length ? (
          <div className="grid gap-4">
            {stats.recentPosts.map((post: any) => (
              <PostCard key={post.id} post={{ ...post, username }} />
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
