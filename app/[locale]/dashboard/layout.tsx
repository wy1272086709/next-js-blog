import type React from "react"
import { redirect } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardSidebar } from "@/components/dashboard-sidebar"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
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
