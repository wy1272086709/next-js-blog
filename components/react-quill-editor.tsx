"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ClipboardEvent, DragEvent } from "react"
import remarkGfm from "remark-gfm"
import dynamic from "next/dynamic"
import { ImagePlus, Loader2 } from "lucide-react"
import type { ICommand } from "@uiw/react-md-editor"
import { useTranslations } from "next-intl"
import { getClientCSRFToken } from "@/lib/csrf/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Dynamically import MDEditor to avoid SSR issues
const MDEditorNoSSR = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false }
)

const Markdown = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default.Markdown),
  { ssr: false }
)

// Function to clean markdown content to prevent empty src attributes
const cleanMarkdown = (content: string): string => {
  if (!content) return ""

  // Remove empty image tags ![alt]()
  return content.replace(/!\[.*?\]\(\s*\)/g, "")
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

interface RichEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: number
  preview?: boolean
  hasSubmitted?: boolean
}

export function RichEditor({
  value,
  onChange,
  placeholder = "Start writing your post...",
  height = 500,
  hasSubmitted = false,
  preview = false
}: RichEditorProps) {
  const t = useTranslations("RichEditor")
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [imageError, setImageError] = useState("")
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [imageAlt, setImageAlt] = useState("")
  const [imageUrlError, setImageUrlError] = useState("")
  const editorRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const selectionRef = useRef({ start: 0, end: 0 })
  const valueRef = useRef(value)

  useEffect(() => {
    setIsPreviewMode(preview)
  }, [preview])

  useEffect(() => {
    valueRef.current = value
  }, [value])

  const rememberSelection = useCallback(() => {
    const textarea = editorRef.current?.querySelector("textarea")
    if (!textarea) return
    selectionRef.current = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    }
  }, [])

  const insertImage = useCallback((url: string, alt: string) => {
    const currentValue = valueRef.current
    const { start, end } = selectionRef.current
    const before = currentValue.slice(0, start)
    const after = currentValue.slice(end)
    const leadingBreak = before && !before.endsWith("\n") ? "\n" : ""
    const safeUrl = url.replace(/>/g, "%3E")
    const markdown = `${leadingBreak}![${alt.replace(/[\[\]]/g, "")}](<${safeUrl}>)\n`
    const nextValue = `${before}${markdown}${after}`
    const nextCursor = before.length + markdown.length

    valueRef.current = nextValue
    onChange(nextValue)
    requestAnimationFrame(() => {
      const textarea = editorRef.current?.querySelector("textarea")
      textarea?.focus()
      textarea?.setSelectionRange(nextCursor, nextCursor)
    })
  }, [onChange])

  const uploadImage = useCallback(async (file: File) => {
    setImageError("")
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      setImageError(t("unsupportedType"))
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError(t("fileTooLarge"))
      return
    }

    setIsUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("image", file)
      const csrfToken = await getClientCSRFToken()
      const response = await fetch("/api/posts/images", {
        method: "POST",
        headers: { "X-CSRF-Token": csrfToken },
        body: formData,
      })
      const data = await response.json()
      if (!response.ok) {
        const errorMessages: Record<string, string> = {
          image_too_large: t("fileTooLarge"),
          unsupported_image_type: t("unsupportedType"),
          storage_not_configured: t("storageNotConfigured"),
          storage_permission_denied: t("storagePermissionDenied"),
        }
        throw new Error(errorMessages[data.code] || t("uploadFailed"))
      }
      insertImage(data.url, data.alt)
      setImageDialogOpen(false)
    } catch (error) {
      setImageError(error instanceof Error ? error.message : t("uploadFailed"))
    } finally {
      setIsUploadingImage(false)
      if (imageInputRef.current) imageInputRef.current.value = ""
    }
  }, [insertImage, t])

  const imageUploadCommand = useMemo<ICommand>(() => ({
    name: "image-upload",
    keyCommand: "image-upload",
    buttonProps: {
      "aria-label": t("chooseImage"),
      title: t("chooseImage"),
      disabled: isUploadingImage,
    },
    icon: isUploadingImage
      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
      : <ImagePlus className="h-3.5 w-3.5" />,
    execute: () => {
      rememberSelection()
      setImageError("")
      setImageUrlError("")
      setImageDialogOpen(true)
    },
  }), [isUploadingImage, rememberSelection, t])

  const filterCommands = useCallback((command: ICommand) => {
    return command.name === "image" ? imageUploadCommand : command
  }, [imageUploadCommand])

  const handlePaste = useCallback((event: ClipboardEvent<HTMLTextAreaElement>) => {
    const image = Array.from(event.clipboardData.files).find((file) => file.type.startsWith("image/"))
    if (!image) return
    event.preventDefault()
    rememberSelection()
    void uploadImage(image)
  }, [rememberSelection, uploadImage])

  const handleDrop = useCallback((event: DragEvent<HTMLTextAreaElement>) => {
    const image = Array.from(event.dataTransfer.files).find((file) => file.type.startsWith("image/"))
    if (!image) return
    event.preventDefault()
    rememberSelection()
    void uploadImage(image)
  }, [rememberSelection, uploadImage])

  const handleDragOver = useCallback((event: DragEvent<HTMLTextAreaElement>) => {
    if (Array.from(event.dataTransfer.items).some((item) => item.type.startsWith("image/"))) {
      event.preventDefault()
    }
  }, [])

  const insertImageUrl = useCallback(() => {
    const value = imageUrl.trim()
    try {
      const parsedUrl = new URL(value)
      if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("invalid protocol")
    } catch {
      setImageUrlError(t("invalidUrl"))
      return
    }

    insertImage(value, imageAlt.trim() || t("remoteImageAlt"))
    setImageUrl("")
    setImageAlt("")
    setImageUrlError("")
    setImageDialogOpen(false)
  }, [imageAlt, imageUrl, insertImage, t])

  return (
    <div ref={editorRef} className="space-y-4">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void uploadImage(file)
        }}
      />
      <Dialog
        open={imageDialogOpen}
        onOpenChange={(open) => {
          setImageDialogOpen(open)
          if (!open) setImageUrlError("")
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>{t("dialogDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label>{t("localImage")}</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isUploadingImage}
                onClick={() => imageInputRef.current?.click()}
              >
                {isUploadingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ImagePlus className="h-4 w-4" />
                )}
                {isUploadingImage ? t("uploading") : t("chooseLocalImage")}
              </Button>
              <p className="text-xs text-muted-foreground">{t("localImageHint")}</p>
              {imageError && <p className="text-sm text-destructive">{imageError}</p>}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>{t("or")}</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                insertImageUrl()
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="remote-image-url">{t("imageUrl")}</Label>
                <Input
                  id="remote-image-url"
                  type="url"
                  value={imageUrl}
                  onChange={(event) => {
                    setImageUrl(event.target.value)
                    setImageUrlError("")
                  }}
                  placeholder="https://example.com/image.jpg"
                  autoComplete="url"
                  required
                  aria-invalid={Boolean(imageUrlError)}
                />
                {imageUrlError && <p className="text-sm text-destructive">{imageUrlError}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="remote-image-alt">{t("imageAlt")}</Label>
                <Input
                  id="remote-image-alt"
                  value={imageAlt}
                  onChange={(event) => setImageAlt(event.target.value)}
                  placeholder={t("imageAltPlaceholder")}
                />
              </div>
              <DialogFooter>
                <Button type="submit">{t("insertUrlImage")}</Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      {/* Toolbar */}
      {!preview && <div className="border rounded-t-lg border-b-0 bg-background">
        <div className="flex items-center gap-2 p-4">
          { <button
            type="button"
            className={`px-3 py-1.5 text-sm rounded-md ${
              isPreviewMode
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            {isPreviewMode ? "Edit" : "Preview"}
          </button>
          }
        </div>
      </div>}
      
      {/* Editor/Preview Area */}
      <div style={{ height }} className="border rounded-lg overflow-hidden">
        {isPreviewMode ? (
          // Preview mode
          <div className="h-full overflow-y-auto p-4 [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-md">
            <Markdown 
              remarkPlugins={[remarkGfm]}  
              components={{
                // 可选：自定义代码块样式 - 只处理真正的代码块
                code({ node, className, children, ...props }) {
                  // 检查是否是真正的代码块
                  const isCodeBlock = className?.includes('language-') ||
                                    props.lang ||
                                    typeof children === 'string' &&
                                    (children.includes('\n') || children.length > 100);

                  if (isCodeBlock) {
                    return (
                      <pre className="bg-gray-900 text-gray-[#2754a3] p-4 rounded overflow-x-auto">
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    );
                  }

                  // 对于行内代码或其他情况，返回默认样式
                  return (
                    <code className={className || 'bg-gray-100 px-1 py-0.5 rounded text-sm'} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
              source={value ? cleanMarkdown(value) : undefined} 
            />
          </div>
        ) : (
          // Edit mode
          <div style={{ height: `${height}px` }}>
            <MDEditorNoSSR
              value={value || ""}
              onChange={(val) => onChange(val || "")}
              height={height}
              visibleDragbar={false}
              commandsFilter={filterCommands}
              textareaProps={{
                placeholder: placeholder,
                onPaste: handlePaste,
                onDrop: handleDrop,
                onDragOver: handleDragOver,
                onClick: rememberSelection,
                onKeyUp: rememberSelection,
                style: {
                  fontSize: 14,
                  lineHeight: 1.6,
                  fontFamily: '"Inter", sans-serif',
                },
              }}
            />
          </div>
        )}
      </div>

      <div className="flex min-h-5 items-center justify-between gap-4 px-1 text-xs text-muted-foreground">
        <span>{isUploadingImage ? t("uploading") : t("imageHint")}</span>
        {imageError && <span className="text-destructive">{imageError}</span>}
      </div>

      {/* Character count and validation error */}
      <div className="flex justify-between items-center px-4 pb-2">
        {hasSubmitted && !value && (
          <span className="text-sm text-destructive">
            Content is required
          </span>
        )}
        {value && (
          <span className="text-sm text-muted-foreground">
            {value.length} characters
          </span>
        )}
      </div>
    </div>
  )
}
