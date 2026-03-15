import { setRequestLocale } from "next-intl/server"
import { getTranslations } from "next-intl/server"
import { redirect } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase/server"
import { WritePostForm } from "@/components/write-post-form"
import { routing } from "@/i18n/routing"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ edit?: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function WritePage({ params, searchParams }: Props) {
  const { locale } = await params
  const { edit } = await searchParams
  setRequestLocale(locale)
  const t = await getTranslations("Dashboard")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("name")

  let post = null
  if (edit) {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("id", edit)
      .eq("author_id", user.id)
      .single()
    post = data
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {post ? t("editPost") : t("writeTitle")}
        </h1>
        <p className="text-muted-foreground">
          {post ? t("editDesc") : t("writeDesc")}
        </p>
      </div>
      <WritePostForm categories={categories || []} post={post} userId={user.id} />
    </div>
  )
}
