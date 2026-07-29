import { setRequestLocale } from "next-intl/server"
import { getTranslations } from "next-intl/server"
import { redirect } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase/server"
import { ProfileForm } from "@/components/profile-form"
import { routing } from "@/i18n/routing"

type Props = { params: Promise<{ locale: string }> }

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function SettingsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("Dashboard")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return redirect({ href: "/auth/login", locale })

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("accountSettings")}</h1>
        <p className="text-muted-foreground">{t("settingsDesc")}</p>
      </div>
      <ProfileForm user={user} profile={profile} />
    </div>
  )
}
