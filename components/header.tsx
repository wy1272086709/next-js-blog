import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { UserNav } from "@/components/user-nav"
import { LanguageSwitcher } from "@/components/language-switcher"
import { PenSquare } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"

export async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const t = await getTranslations("Header")

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
          <LanguageSwitcher />
          {user ? (
            <UserNav user={user} />
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
