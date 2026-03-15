"use client"

import { usePathname } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, FileText, PenSquare, Settings } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"

const sidebarKeys = [
  { href: "/dashboard", key: "overview", icon: LayoutDashboard },
  { href: "/dashboard/posts", key: "myPosts", icon: FileText },
  { href: "/dashboard/write", key: "writePost", icon: PenSquare },
  { href: "/dashboard/settings", key: "settings", icon: Settings },
] as const

export function DashboardSidebar() {
  const pathname = usePathname()
  const t = useTranslations("Dashboard")

  return (
    <aside className="hidden md:block w-56 shrink-0 ml-[24px]">
      <nav className="sticky top-20 space-y-1">
        {sidebarKeys.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {t(item.key)}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
