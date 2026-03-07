import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Code2, Server, Bot } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section container */}
      <section className="py-24 md:py-32">
        <div className="flex flex-col items-center text-center gap-8">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">探索技术的无限可能</h1>
          <p className="text-xl text-muted-foreground max-w-2xl text-balance">
            一个专注于前端、后端和人工智能的技术博客平台。 分享知识，记录成长，与志同道合的开发者一起进步。
          </p>
          <div className="flex gap-4">
            <Button size="lg" asChild>
              <Link href="/posts">
                浏览文章 <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/auth/sign-up">开始写作</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Categories Section container */}
      <section className="py-16 border-t pl-[24px] pr-[24px]">
        <h2 className="text-2xl font-bold text-center mb-12">技术板块</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Link
            href="/posts?category=frontend"
            className="group p-8 rounded-lg border bg-card hover:border-primary/50 transition-colors"
          >
            <Code2 className="h-10 w-10 mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">前端开发</h3>
            <p className="text-muted-foreground">React、Vue、Next.js、CSS、TypeScript 等前端技术文章</p>
          </Link>
          <Link
            href="/posts?category=backend"
            className="group p-8 rounded-lg border bg-card hover:border-primary/50 transition-colors"
          >
            <Server className="h-10 w-10 mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">后端开发</h3>
            <p className="text-muted-foreground">Node.js、Python、Go、数据库、微服务等后端技术文章</p>
          </Link>
          <Link
            href="/posts?category=ai"
            className="group p-8 rounded-lg border bg-card hover:border-primary/50 transition-colors"
          >
            <Bot className="h-10 w-10 mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">人工智能</h3>
            <p className="text-muted-foreground">机器学习、深度学习、LLM、AI 应用开发等前沿技术</p>
          </Link>
        </div>
      </section>
    </div>
  )
}
