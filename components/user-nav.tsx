"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { LogOut, UserIcon, PenSquare } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link, useRouter, getPathname } from "@/i18n/navigation"

export function UserNav({ user, onSignOut }: { user: User; onSignOut?: () => Promise<void> }) {
  const router = useRouter()
  const t = useTranslations("UserNav")

  const handleSignOut = async () => {
    // 使用传入的 onSignOut（来自 AuthContext）
    if (onSignOut) {
      await onSignOut()
    } else {
      // fallback 到原来的逻辑
      const supabase = createClient()
      await supabase.auth.signOut()
      const path = getPathname({ href: "/", locale: "" });
      router.push(path)
      router.refresh()
    }
  }

  const username = user.user_metadata?.username || user.email?.split("@")[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user.user_metadata?.avatar_url ? user.user_metadata.avatar_url : undefined}
              alt={username}
            />
            <AvatarFallback>{username?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{username}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <UserIcon className="mr-2 h-4 w-4" />
            {t("dashboard")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/write">
            <PenSquare className="mr-2 h-4 w-4" />
            {t("writePost")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          {t("signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
