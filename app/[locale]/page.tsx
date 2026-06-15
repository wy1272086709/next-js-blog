import { setRequestLocale } from "next-intl/server"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { ArrowRight, Code2, Server, Bot, Download } from "lucide-react"
import { routing } from "@/i18n/routing"

type Props = { params: Promise<{ locale: string }> }

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations("HomePage")

  return (
    <div className="flex flex-col">
      <section className="py-24 md:py-32">
        <div className="flex flex-col items-center text-center gap-8">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
            {t("title")}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl text-balance">
            {t("subtitle")}
          </p>
          <div className="flex gap-4">
            <Button size="lg" asChild>
              <Link href="/posts">
                {t("browsePosts")} <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/dashboard/write">{t("startWriting")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-16 border-t pl-[24px] pr-[24px]">
        <h2 className="text-2xl font-bold text-center mb-12">{t("categoriesTitle")}</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Link
            href="/posts?category=frontend"
            className="group p-8 rounded-lg border bg-card hover:border-primary/50 transition-colors"
          >
            <Code2 className="h-10 w-10 mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
              {t("frontend")}
            </h3>
            <p className="text-muted-foreground">{t("frontendDesc")}</p>
          </Link>
          <Link
            href="/posts?category=backend"
            className="group p-8 rounded-lg border bg-card hover:border-primary/50 transition-colors"
          >
            <Server className="h-10 w-10 mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
              {t("backend")}
            </h3>
            <p className="text-muted-foreground">{t("backendDesc")}</p>
          </Link>
          <Link
            href="/posts?category=ai"
            className="group p-8 rounded-lg border bg-card hover:border-primary/50 transition-colors"
          >
            <Bot className="h-10 w-10 mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
              {t("ai")}
            </h3>
            <p className="text-muted-foreground">{t("aiDesc")}</p>
          </Link>
        </div>
      </section>

      <section className="py-16 border-t">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center text-center">
              <h2 className="text-2xl font-bold mb-8">{t("chatTitle")}</h2>
              <div className="w-full max-w-4xl mx-auto">
                <Link
                  href="/chat/download"
                  className="group block p-8 md:p-12 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 transition-all duration-300"
                >
                  <div className="flex flex-col items-center gap-6">
                    <div className="p-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Download className="h-12 w-12 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-2xl md:text-3xl font-bold mb-3 group-hover:text-primary transition-colors">
                        {t("chat")}
                      </h3>
                      <p className="text-lg text-muted-foreground mb-6">{t("chatDesc")}</p>
                      <Button variant="default" size="lg" className="group-hover:scale-105 transition-transform">
                        {t("downloadNow")} <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>
    </div>
  )
}
