import { unstable_cache } from "next/cache"
import { createPublicClient } from "@/lib/supabase/public"

export const getPublicPosts = unstable_cache(
  async () => {
    const supabase = createPublicClient()
    const [{ data: categories, error: categoriesError }, { data: posts, error: postsError }] =
      await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase
          .from("posts")
          .select(`
            *,
            profiles:author_id(username, avatar_url),
            categories:category_id(name, slug),
            likes(count)
          `)
          .eq("published", true)
          .order("created_at", { ascending: false }),
      ])

    if (categoriesError) throw categoriesError
    if (postsError) throw postsError

    return { categories: categories ?? [], posts: posts ?? [] }
  },
  ["public-posts"],
  { revalidate: 300, tags: ["posts", "categories"] }
)

export const getPublicPost = unstable_cache(
  async (id: string) => {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from("posts")
      .select(`
        *,
        profiles:author_id(username, avatar_url),
        categories:category_id(name, slug)
      `)
      .eq("id", id)
      .eq("published", true)
      .single()

    if (error) return null
    return data
  },
  ["public-post"],
  { revalidate: 300, tags: ["posts"] }
)
