"use client"

import React, { useState, useRef, useCallback } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import "highlight.js/styles/github.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface RichEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: number
  required?: boolean
}

export function RichEditor({
  value,
  onChange,
  placeholder = "Start writing your post in Markdown...",
  height = 500,
  required = false
}: RichEditorProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    // 创建文件读取器
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const base64 = e.target?.result as string

        // 这里可以将图片上传到 Supabase 或其他存储服务
        // 现在直接插入 Markdown 图片语法
        const imageMarkdown = `\n![${file.name}](data:image/${file.type.split('/')[1]};base64,${base64.split(',')[1]})\n`
        onChange(value + imageMarkdown)
      } catch (error) {
        console.error('Image upload error:', error)
      } finally {
        setIsUploading(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    }
    reader.readAsDataURL(file)
  }, [value, onChange])

  const insertEmoji = useCallback((emoji: string) => {
    onChange(value + emoji)
  }, [value, onChange])

  const insertHeading = useCallback((level: number) => {
    const heading = "#".repeat(level) + " "
    onChange(value + "\n" + heading)
  }, [value, onChange])

  const insertList = useCallback(() => {
    const list = "\n- "
    onChange(value + list)
  }, [value, onChange])

  // Emoji shortcuts
  const emojis = [
    "😀", "😂", "😍", "🤔", "😎", "👍", "👎", "❤️", "🔥", "✨",
    "🎉", "🎈", "🚀", "🌟", "⭐", "🌈", "☀️", "🌙", "🌸", "🌺"
  ]

  // Common markdown templates
  const markdownTemplates = [
    { label: "H1", action: () => insertHeading(1) },
    { label: "H2", action: () => insertHeading(2) },
    { label: "H3", action: () => insertHeading(3) },
    { label: "List", action: insertList },
    { label: "Bold", action: () => onChange(value + "**bold**") },
    { label: "Italic", action: () => onChange(value + "*italic*") },
    { label: "Link", action: () => onChange(value + "[text](url)") },
    { label: "Quote", action: () => onChange(value + "\n> ") },
  ]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-2 items-center">
          <Button
            variant={isPreviewMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            {isPreviewMode ? "Edit" : "Preview"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              "📷 Upload"
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </Button>

          {markdownTemplates.map((template) => (
            <Button
              key={template.label}
              variant="outline"
              size="sm"
              onClick={template.action}
            >
              {template.label}
            </Button>
          ))}

          <div className="border-l pl-2 flex items-center gap-1">
            <Label className="text-sm text-muted-foreground">Emojis:</Label>
            {emojis.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => insertEmoji(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Editor/Preview Area */}
      <div style={{ height }} className="border rounded-lg overflow-hidden">
        {isPreviewMode ? (
          // Preview mode
          <div className="h-full overflow-y-auto p-4 prose prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
            >
              {value || placeholder}
            </ReactMarkdown>
          </div>
        ) : (
          // Edit mode
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-full p-4 resize-none focus:outline-none"
            style={{ minHeight: `${height}px` }}
            required={required}
          />
        )}
      </div>

      {/* Markdown Quick Reference */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-2">Markdown Quick Reference:</h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div><code>**bold**</code> → Bold text</div>
            <div><code>*italic*</code> → Italic text</div>
            <div><code># Heading</code> → Heading</div>
            <div><code>- List item</code> → List</div>
            <div><code>[link](url)</code> → Link</div>
            <div><code>![alt](src)</code> → Image</div>
            <div><code>`code`</code> → Inline code</div>
            <div><code>```block```</code> → Code block</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}