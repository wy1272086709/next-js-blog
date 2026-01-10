import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Heart, Eye, TrendingUp } from "lucide-react"
import { PostCard } from "@/components/post-card"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // 获取用户文章统计
  const { count: postCount } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("author_id", user.id)

  // 获取用户所有文章的浏览量总和
  const { data: viewData } = await supabase.from("posts").select("view_count").eq("author_id", user.id)

  const totalViews = viewData?.reduce((sum, post) => sum + (post.view_count || 0), 0) || 0

  // 获取用户文章收到的点赞总数
  const { data: userPosts } = await supabase.from("posts").select("id").eq("author_id", user.id)

  let totalLikes = 0
  if (userPosts && userPosts.length > 0) {
    const postIds = userPosts.map((p) => p.id)
    const { count } = await supabase.from("likes").select("*", { count: "exact", head: true }).in("post_id", postIds)

    totalLikes = count || 0
  }

  // 获取最近的文章
  const { data: recentPosts } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles:author_id(username, avatar_url),
      categories:category_id(name, slug),
      likes(count)
    `,
    )
    .eq("author_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3)

  const username = user.user_metadata?.username || user.email?.split("@")[0]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">欢迎回来，{username}</h1>
        <p className="text-muted-foreground">这是您的创作数据概览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">文章总数</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{postCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总阅读量</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">获得点赞</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLikes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均阅读</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{postCount ? Math.round(totalViews / postCount) : 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* 最近文章 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">最近发布</h2>
        {recentPosts && recentPosts.length > 0 ? (
          <div className="grid gap-4">
            {recentPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <p>您还没有发布任何文章</p>
              <p className="text-sm mt-1">点击左侧"写文章"开始您的第一篇创作</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
