import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { UserNav } from "@/components/user-nav"
import { PenSquare } from "lucide-react"

export async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="sticky pl-[24px] pr-[24px] top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <PenSquare className="h-5 w-5" />
            <span>技术博客</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/posts" className="transition-colors hover:text-foreground/80 text-foreground/60">
              文章
            </Link>
            {user && (
              <Link href="/dashboard" className="transition-colors hover:text-foreground/80 text-foreground/60">
                个人中心
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <UserNav user={user} />
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" asChild>
                <Link href="/auth/login">登录</Link>
              </Button>
              <Button asChild>
                <Link href="/auth/sign-up">注册</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
