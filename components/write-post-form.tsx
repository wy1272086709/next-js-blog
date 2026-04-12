"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useTranslations } from "next-intl"
import { useRouter, getPathname } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

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
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateSummary = async () => {
    if (!content.trim()) {
      setError("请先输入内容再生成摘要")
      return
    }

    setIsGeneratingSummary(true)
    setError(null)

    try {
      // 使用带语言前缀的路径
      const pathname = window.location.pathname.startsWith('/zh-CN')
        ? '/api/zh-CN/dashboard'
        : '/api/en/dashboard';

      const response = await fetch('/api/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "摘要生成失败")
      }

      if (!data.result || typeof data.result !== 'string') {
        throw new Error("返回的摘要格式不正确")
      }

      // 提取AI生成的摘要，如果太长则截取
      const summary = data.result.trim()
      if (summary.length > 150) {
        setExcerpt(summary.substring(0, 150) + '...')
      } else {
        setExcerpt(summary)
      }
    } catch (error) {
      console.error('生成摘要错误:', error)
      const errorMessage = error instanceof Error ? error.message : "生成摘要失败，请稍后重试"
      setError(errorMessage)
      // 如果AI生成失败，使用内容的前150个字符作为摘要
      setExcerpt(content.substring(0, 150))
    } finally {
      setIsGeneratingSummary(false)
    }
  }
  const router = useRouter()
  const t = useTranslations("WritePostForm")

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
      setError(error instanceof Error ? error.message : t("saveFailed"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="title">{t("title")}</Label>
            <Input
              id="title"
              placeholder={t("titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">{t("category")}</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder={t("categoryPlaceholder")} />
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
            <Label htmlFor="content">{t("content")}</Label>
            <Textarea
              id="content"
              placeholder={t("contentPlaceholder")}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={15}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="excerpt">{t("excerpt")}</Label>
            <div className="flex gap-2">
              <Textarea
                id="excerpt"
                placeholder={t("excerptPlaceholder")}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={2}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateSummary}
                disabled={isGeneratingSummary || !content.trim()}
                className="mt-6 h-10 shrink-0"
              >
                {isGeneratingSummary ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "AI生成摘要"
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch id="published" checked={published} onCheckedChange={setPublished} />
              <Label htmlFor="published">{published ? t("publishNow") : t("saveDraft")}</Label>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? t("saving") : post ? t("updatePost") : t("publishPost")}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              {t("cancel")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}
