"use client"
import type React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { RichEditor } from "@/components/react-quill-editor"
import { CollapsibleMarkdown } from "@/components/collapsible-markdown"
import { useMarkdownStream } from '@/hooks/use-markdown-preview'
import { usePostMutation } from '@/hooks/use-post-mutation'
import { SuccessToast } from "./ui/success-toast"

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
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [useAIPolish, setUseAIPolish] = useState(false)
  const {
    source,
    isStreaming,
    isPaused,
    startStream,
    discardStream,
    pauseStream,
    resumeStream
  } = useMarkdownStream();

  const generateSummary = async () => {
    if (!content.trim()) {
      setError(t("enterContentFirst"))
      setHasSubmitted(true)
      return
    }

    setIsGeneratingSummary(true)
    setError(null)

    try {
      // {t("useLanguagePrefixPath")}
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
        throw new Error(data.error || t("generateSummaryFailed"))
      }

      if (!data.result || typeof data.result !== 'string') {
        throw new Error(t("invalidResult"))
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
      const errorMessage = error instanceof Error ? error.message : t("generateSummaryFailedRetry")
      setError(errorMessage)
      // 如果AI生成失败，使用内容的前150个字符作为摘要
      setExcerpt(content.substring(0, 150))
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const usePolishedContent = () => {
    setContent(source)
  }

  const discardPolishedContent = () => {
    // {t("closePolishFeature")}
    setUseAIPolish(false)
    // {t("resetContentToOriginal")}
    setContent(post?.content || "")
    discardStream()
  }

  const router = useRouter();
  const t = useTranslations("WritePostForm");
  const mutation = usePostMutation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setHasSubmitted(true)

    if (!content.trim()) {
      setError(t("enterContentFirst"))
      return
    }

    const postData = {
      title,
      content,
      excerpt: excerpt || content.substring(0, 150),
      category_id: categoryId || null,
      published,
      author_id: userId,
    }

    mutation.mutate(
      post
        ? { ...postData, id: post.id }
        : postData
    )
  }
  
  // Handle loading state from mutation
  if (mutation.isPending) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">保存中...</span>
      </div>
    )
  }

  return (
    <div>
      {/* Success Toast */}
      {showSuccessToast && (
        <SuccessToast
          message={successMessage}
          onClose={() => setShowSuccessToast(false)}
        />
      )}
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
              <RichEditor
                value={content}
                onChange={setContent}
                placeholder={t("contentPlaceholder")}
                hasSubmitted={hasSubmitted}
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Switch id="useAIPolish" checked={useAIPolish} onCheckedChange={setUseAIPolish} />
                <Label htmlFor="useAIPolish">{t("useAIPolishLabel")}</Label>
                { useAIPolish && (<Button
                  type="button"
                  variant="outline"
                  onClick={() => startStream(content.trim())}
                  disabled={isStreaming}
                  size="sm"
                  className="cursor-pointer"
                >
                  {t("polish")}
                </Button>) }
              </div>
            </div>

            {useAIPolish && (
              <div className="mt-4 optimize-preview">
                <CollapsibleMarkdown
                  title={t("polishPreviewTitle")}
                  defaultCollapsed={false}
                >
                  <RichEditor
                    value={source} // {t("useMarkdownStreamSource")}
                    preview={true}
                    onChange={() => {}} // {t("readOnlyMode")}
                    placeholder={t("polishContentPlaceholder")}
                    height={400}
                    hasSubmitted={false}
                  />
                </CollapsibleMarkdown>

                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={isPaused ? resumeStream : pauseStream}
                    disabled={!isStreaming}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    {isPaused ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        {t("resumePolish")}
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="6" y="4" width="4" height="16"></rect>
                          <rect x="14" y="4" width="4" height="16"></rect>
                        </svg>
                        {t("pausePolish")}
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={discardPolishedContent} className="cursor-pointer">
                    {t("discardPolish")}
                  </Button>
                  <Button type="button" onClick={usePolishedContent} disabled={!source || isStreaming} className="cursor-pointer">
                    {isStreaming ? t("polishing") : t("usePolished")}
                  </Button>
                </div>
              </div>
            )}

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
                  className="mt-6 h-10 shrink-0 mt-auto mb-auto cursor-pointer"
                >
                  {isGeneratingSummary ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("generateSummary")
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
              <Button type="submit" disabled={mutation.isPending} className="cursor-pointer">
                {mutation.isPending ? t("saving") : post ? t("updatePost") : t("publishPost")}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()} className="cursor-pointer">
                {t("cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
