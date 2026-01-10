import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { WritePostForm } from "@/components/write-post-form"

export default async function WritePage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // 获取分类
  const { data: categories } = await supabase.from("categories").select("*").order("name")

  // 如果是编辑模式，获取文章数据
  let post = null
  if (params.edit) {
    const { data } = await supabase.from("posts").select("*").eq("id", params.edit).eq("author_id", user.id).single()

    post = data
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{post ? "编辑文章" : "写文章"}</h1>
        <p className="text-muted-foreground">{post ? "修改您的文章内容" : "分享您的知识和经验"}</p>
      </div>

      <WritePostForm categories={categories || []} post={post} userId={user.id} />
    </div>
  )
}
