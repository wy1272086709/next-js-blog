import type React from "react"
import { redirect } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { useLocale } from "next-intl"

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect({ href: "/auth/login", locale: params.locale })
  }

  return (
    <div className="container py-8">
      <div className="flex gap-8">
        <DashboardSidebar />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
