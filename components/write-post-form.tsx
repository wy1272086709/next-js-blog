"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"

interface Category {
  id: string
  name: string
  slug: string
}

interface Post {
  id: string
  title: string
  content: string
  excerpt: string | null
  category_id: string | null
  published: boolean
}

export function WritePostForm({
  categories,
  post,
  userId,
}: {
  categories: Category[]
  post: Post | null
  userId: string
}) {
  const [title, setTitle] = useState(post?.title || "")
  const [content, setContent] = useState(post?.content || "")
  const [excerpt, setExcerpt] = useState(post?.excerpt || "")
  const [categoryId, setCategoryId] = useState(post?.category_id || "")
  const [published, setPublished] = useState(post?.published ?? true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      const postData = {
        title,
        content,
        excerpt: excerpt || content.substring(0, 150),
        category_id: categoryId || null,
        published,
        author_id: userId,
        updated_at: new Date().toISOString(),
      }

      if (post) {
        const { error } = await supabase.from("posts").update(postData).eq("id", post.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from("posts").insert(postData)

        if (error) throw error
      }

      router.push("/dashboard/posts")
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : "保存失败")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              placeholder="输入文章标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">分类</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="excerpt">摘要（可选）</Label>
            <Textarea
              id="excerpt"
              placeholder="输入文章摘要，留空将自动截取正文前150字"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="content">正文</Label>
            <Textarea
              id="content"
              placeholder="输入文章内容..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch id="published" checked={published} onCheckedChange={setPublished} />
              <Label htmlFor="published">{published ? "立即发布" : "保存为草稿"}</Label>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "保存中..." : post ? "更新文章" : "发布文章"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              取消
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
