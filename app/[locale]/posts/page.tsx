import { setRequestLocale } from "next-intl/server"
import { routing } from "@/i18n/routing"
import { PostsBrowser } from "@/components/posts-browser"
import { getPublicPosts } from "@/lib/data/public-posts"

type Props = {
  params: Promise<{ locale: string }>
}

export const revalidate = 300

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function PostsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const { categories, posts } = await getPublicPosts()

  return (
    <div className="py-8">
      <PostsBrowser categories={categories} posts={posts} />
    </div>
  )
}
