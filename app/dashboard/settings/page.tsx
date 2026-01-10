import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/profile-form"

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // 获取用户资料
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">账户设置</h1>
        <p className="text-muted-foreground">管理您的个人资料</p>
      </div>

      <ProfileForm user={user} profile={profile} />
    </div>
  )
}
