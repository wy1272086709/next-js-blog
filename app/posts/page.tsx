import { createClient } from "@/lib/supabase/server"
import { PostCard } from "@/components/post-card"
import { CategorySidebar } from "@/components/category-sidebar"

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // 获取分类
  const { data: categories } = await supabase.from("categories").select("*").order("name")

  // 获取文章（profiles、categories 需有直接 FK 关联，见 scripts/002-add-posts-profiles-fk.sql）
  let query = supabase
    .from("posts")
    .select(
      `
      *,
      profiles:author_id(username, avatar_url),
      categories:category_id(name, slug),
      likes(count)
    `,
    )
    .eq("published", true)
    .order("created_at", { ascending: false })
  if (params.category) {
    const { data: category } = await supabase.from("categories").select("id").eq("slug", params.category).single()
    if (category) {
      query = query.eq("category_id", category.id)
    }
  }
  const { data: posts } = await query
  return (
    <div className="py-8">
      <div className="flex gap-8 ml-[24px] mr-[24px]">
        {/* 左侧分类导航 */}
        <CategorySidebar categories={categories || []} activeCategory={params.category} />

        {/* 右侧文章列表 */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">
              {params.category ? categories?.find((c) => c.slug === params.category)?.name || "全部文章" : "全部文章"}
            </h1>
          </div>

          {posts && posts.length > 0 ? (
            <div className="grid gap-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p>暂无文章</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
