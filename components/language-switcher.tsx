"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter as useNextRouter } from "next/navigation"
import { Languages } from "lucide-react"
import { useLocale } from "next-intl"
import { usePathname } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"

const localeLabels: Record<string, string> = {
  "zh-CN": "中文",
  en: "English",
}

export function LanguageSwitcher() {
  const pathname = usePathname()
  const nextRouter = useNextRouter()
  const locale = useLocale()

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale) return
    nextRouter.push(`/${newLocale}${pathname}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Switch language">
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className={locale === loc ? "bg-accent" : ""}
          >
            {localeLabels[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
