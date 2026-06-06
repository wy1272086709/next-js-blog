"use client"
import { useEffect, useState } from "react"
import remarkGfm from "remark-gfm"
import dynamic from "next/dynamic"

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
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  useEffect(() => {
    setIsPreviewMode(preview)
  }, [preview])
  return (
    <div className="space-y-4">
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
          <div
            className="h-full overflow-y-auto"
            onClick={(e) => console.log('Preview mode clicked:', e)}
          >
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
              textareaProps={{
                placeholder: placeholder,
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