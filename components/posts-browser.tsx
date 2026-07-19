"use client"

import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"
import { CategorySidebar } from "@/components/category-sidebar"
import { PostCard } from "@/components/post-card"

interface Category {
  id: string
  name: string
  slug: string
}

export function PostsBrowser({ categories, posts }: { categories: Category[]; posts: any[] }) {
  const [activeCategory, setActiveCategory] = useState<string>()
  const t = useTranslations("PostsPage")

  useEffect(() => {
    const syncCategory = () => {
      setActiveCategory(new URLSearchParams(window.location.search).get("category") ?? undefined)
    }

    syncCategory()
    window.addEventListener("popstate", syncCategory)
    return () => window.removeEventListener("popstate", syncCategory)
  }, [])

  const visiblePosts = activeCategory
    ? posts.filter((post) => post.categories?.slug === activeCategory)
    : posts
  const title = activeCategory
    ? categories.find((category) => category.slug === activeCategory)?.name ?? t("allPosts")
    : t("allPosts")

  return (
    <div className="flex gap-8 ml-[24px] mr-[24px]">
      <CategorySidebar
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />
      <div className="flex-1">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        {visiblePosts.length > 0 ? (
          <div className="grid gap-6">
            {visiblePosts.map((post) => <PostCard key={post.id} post={post} />)}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <p>{t("noPosts")}</p>
          </div>
        )}
      </div>
    </div>
  )
}
