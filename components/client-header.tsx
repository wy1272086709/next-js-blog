"use client"
import { Button } from "@/components/ui/button"
import { UserNav } from "@/components/user-nav"
import { LanguageSwitcher } from "@/components/language-switcher"
import { Clock } from "@/components/clock"
import { PenSquare } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import { useAuth } from "@/lib/auth-context"

export function ClientHeader() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const t = useTranslations("Header")

  // 处理加载状态
  if (loading) {
    return (
      <header className="sticky pl-[24px] pr-[24px] top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 animate-pulse bg-gray-300 rounded" />
              <span className="font-bold text-xl animate-pulse bg-gray-300 rounded px-2">
                {t("siteName")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <>
              <Clock />
              <div className="animate-pulse bg-gray-300 rounded w-20 h-8" />
            </>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky pl-[24px] pr-[24px] top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <PenSquare className="h-5 w-5" />
            <span>{t("siteName")}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link
              href="/posts"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              {t("posts")}
            </Link>
            {user && (
              <Link
                href="/dashboard"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                {t("dashboard")}
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Clock />
          <LanguageSwitcher />
          {user ? (
            <UserNav user={user} onSignOut={signOut} />
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/auth/login">{t("login")}</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/sign-up">{t("signUp")}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}