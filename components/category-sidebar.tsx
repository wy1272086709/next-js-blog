"use client"

import type React from "react"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { Code2, Server, Bot, LayoutGrid } from "lucide-react"
import { useTranslations } from "next-intl"

interface Category {
  id: string
  name: string
  slug: string
}

const categoryIcons: Record<string, React.ReactNode> = {
  frontend: <Code2 className="h-4 w-4" />,
  backend: <Server className="h-4 w-4" />,
  ai: <Bot className="h-4 w-4" />,
}

export function CategorySidebar({
  categories,
  activeCategory,
  onCategoryChange,
}: {
  categories: Category[]
  activeCategory?: string
  onCategoryChange?: (category?: string) => void
}) {
  const t = useTranslations("CategorySidebar")

  return (
    <aside className="hidden md:block w-56 shrink-0">
      <nav className="sticky top-20 space-y-1">
        <Link
          href="/posts"
          onClick={() => onCategoryChange?.()}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
            !activeCategory
              ? "bg-primary text-primary-foreground"
              : "hover:bg-muted text-muted-foreground"
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          {t("allPosts")}
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/posts?category=${category.slug}`}
            onClick={() => onCategoryChange?.(category.slug)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              activeCategory === category.slug
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            {categoryIcons[category.slug] || <LayoutGrid className="h-4 w-4" />}
            {category.name}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
