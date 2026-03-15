import { setRequestLocale } from "next-intl/server"
import { getTranslations } from "next-intl/server"
import { createClient } from "@/lib/supabase/server"
import { PostCard } from "@/components/post-card"
import { CategorySidebar } from "@/components/category-sidebar"
import { routing } from "@/i18n/routing"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ category?: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function PostsPage({ params, searchParams }: Props) {
  const { locale } = await params
  const prm = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations("PostsPage")

  const supabase = await createClient()
  const { data: categories } = await supabase.from("categories").select("*").order("name")

  let query = supabase
    .from("posts")
    .select(
      `
      *,
      profiles:author_id(username, avatar_url),
      categories:category_id(name, slug),
      likes(count)
    `
    )
    .eq("published", true)
    .order("created_at", { ascending: false })

  if (prm.category) {
    const { data: category } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", prm.category)
      .single()
    if (category) {
      query = query.eq("category_id", category.id)
    }
  }
  const { data: posts } = await query

  const title = prm.category
    ? categories?.find((c) => c.slug === prm.category)?.name || t("allPosts")
    : t("allPosts")

  return (
    <div className="py-8">
      <div className="flex gap-8 ml-[24px] mr-[24px]">
        <CategorySidebar categories={categories || []} activeCategory={prm.category} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>
          {posts && posts.length > 0 ? (
            <div className="grid gap-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <p>{t("noPosts")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
