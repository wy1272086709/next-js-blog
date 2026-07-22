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
import { FileText, Loader2, Upload } from "lucide-react"
import { RichEditor } from "@/components/react-quill-editor"
import { CollapsibleMarkdown } from "@/components/collapsible-markdown"
import { useMarkdownStream } from '@/hooks/use-markdown-preview'
import { usePostMutation } from '@/hooks/use-post-mutation'
import { SuccessToast } from "./ui/success-toast"
import { getClientCSRFToken } from "@/lib/csrf/client"
import { normalizeLooseNestedLists } from "@/lib/markdown/normalize"

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

type WriteMode = "manual" | "upload"

const MAX_ARTICLE_FILE_SIZE = 16 * 1024 * 1024

const CATEGORY_KEYWORDS = [
  {
    categoryTerms: ["ai", "人工智能", "机器学习", "大模型"],
    contentTerms: ["ai", "人工智能", "机器学习", "深度学习", "大模型", "llm", "openai", "chatgpt", "prompt", "提示词", "agent", "智能体"],
  },
  {
    categoryTerms: ["frontend", "front-end", "前端"],
    contentTerms: ["前端", "frontend", "html", "css", "javascript", "typescript", "react", "next.js", "nextjs", "vue", "angular", "浏览器", "组件"],
  },
  {
    categoryTerms: ["backend", "back-end", "后端", "服务端"],
    contentTerms: ["后端", "backend", "服务端", "node.js", "nodejs", "nestjs", "java", "spring", "golang", "python", "django", "数据库", "mysql", "postgresql", "redis", "api"],
  },
]

function containsTerm(text: string, term: string) {
  if (!/^[a-z0-9.-]+$/i.test(term)) return text.includes(term)
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text)
}

function inferCategory(categories: Category[], filename: string, content: string) {
  const titleText = filename.replace(/\.(md|markdown|pdf)$/i, "").toLowerCase()
  const contentText = content.toLowerCase()

  const ranked = categories.map((category) => {
    const categoryText = `${category.name} ${category.slug}`.toLowerCase()
    const categoryTerms = [
      category.name.toLowerCase(),
      ...category.slug.toLowerCase().split(/[-_\s]+/),
    ].filter((term) => term.length >= 2)

    let score = categoryTerms.reduce((total, term) => {
      return total + (containsTerm(titleText, term) ? 8 : 0) + (containsTerm(contentText, term) ? 3 : 0)
    }, 0)

    for (const group of CATEGORY_KEYWORDS) {
      if (!group.categoryTerms.some((term) => containsTerm(categoryText, term))) continue
      score += group.contentTerms.reduce((total, term) => {
        return total + (containsTerm(titleText, term) ? 5 : 0) + (containsTerm(contentText, term) ? 1 : 0)
      }, 0)
    }

    return { category, score }
  })

  ranked.sort((a, b) => b.score - a.score)
  return ranked[0]?.score > 0 ? ranked[0].category : null
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
  const [content, setContent] = useState(normalizeLooseNestedLists(post?.content || ""))
  const [excerpt, setExcerpt] = useState(post?.excerpt || "")
  const [categoryId, setCategoryId] = useState(post?.category_id || "")
  const [published, setPublished] = useState(post?.published ?? true)
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [useAIPolish, setUseAIPolish] = useState(false)
  const [writeMode, setWriteMode] = useState<WriteMode>("manual")
  const [isParsingFile, setIsParsingFile] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState("")
  const [inferredCategoryName, setInferredCategoryName] = useState("")
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

      const csrfToken = await getClientCSRFToken()
      const response = await fetch('/api/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
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

  const getUploadError = (code?: string) => {
    if (code === "file_too_large") return t("fileTooLarge")
    if (code === "unsupported_file_type") return t("unsupportedFileType")
    if (code === "empty_file_content") return t("emptyFileContent")
    return t("parseFileFailed")
  }

  const handleArticleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setUploadedFileName("")
    if (inferredCategoryName) setCategoryId("")
    setInferredCategoryName("")

    const extension = file.name.split(".").pop()?.toLowerCase()
    if (!extension || !["md", "markdown", "pdf"].includes(extension)) {
      setError(t("unsupportedFileType"))
      event.target.value = ""
      return
    }

    if (file.size > MAX_ARTICLE_FILE_SIZE) {
      setError(t("fileTooLarge"))
      event.target.value = ""
      return
    }

    setIsParsingFile(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const csrfToken = await getClientCSRFToken()
      const response = await fetch("/api/posts/parse-upload", {
        method: "POST",
        headers: { "X-CSRF-Token": csrfToken },
        body: formData,
      })
      const data = await response.json()

      if (!response.ok) throw new Error(getUploadError(data.code))

      setTitle(data.title)
      setContent(normalizeLooseNestedLists(data.content))
      setUploadedFileName(file.name)
      const inferredCategory = inferCategory(categories, file.name, data.content)
      if (inferredCategory) {
        setCategoryId(inferredCategory.id)
        setInferredCategoryName(inferredCategory.name)
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t("parseFileFailed"))
      event.target.value = ""
    } finally {
      setIsParsingFile(false)
    }
  }

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
            {!post && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="write-mode">{t("writeMode")}</Label>
                  <Select value={writeMode} onValueChange={(value) => setWriteMode(value as WriteMode)}>
                    <SelectTrigger id="write-mode" className="w-full sm:w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">{t("manualWrite")}</SelectItem>
                      <SelectItem value="upload">{t("uploadArticle")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {writeMode === "upload" && (
                  <div className="grid gap-2">
                    <Label htmlFor="article-file">{t("articleFile")}</Label>
                    <div className="rounded-md border border-dashed p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          <Input
                            id="article-file"
                            type="file"
                            accept=".pdf,.md,.markdown,application/pdf,text/markdown,text/plain"
                            onChange={handleArticleUpload}
                            disabled={isParsingFile}
                            className="sr-only"
                          />
                          <div className="flex min-w-0 items-center gap-3">
                            <Label
                              htmlFor="article-file"
                              aria-disabled={isParsingFile}
                              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground aria-disabled:pointer-events-none aria-disabled:opacity-50"
                            >
                              {isParsingFile ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                              {uploadedFileName ? t("replaceFile") : t("chooseFile")}
                            </Label>
                            {uploadedFileName && (
                              <span className="min-w-0 truncate text-sm" title={uploadedFileName}>
                                <FileText className="mr-1.5 inline h-4 w-4" />
                                {uploadedFileName}
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {isParsingFile
                              ? t("parsingFile")
                              : uploadedFileName
                                ? t("fileParsed", { filename: uploadedFileName })
                                : t("uploadHint")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

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
              <Select
                value={categoryId}
                onValueChange={(value) => {
                  setCategoryId(value)
                  setInferredCategoryName("")
                }}
              >
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
              {inferredCategoryName && (
                <p className="text-sm text-muted-foreground">
                  {t("categoryInferred", { category: inferredCategoryName })}
                </p>
              )}
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
