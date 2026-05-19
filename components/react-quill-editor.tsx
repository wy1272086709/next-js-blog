"use client"

import React, { useState } from "react"
import dynamic from "next/dynamic"
import MDEditor from "@uiw/react-md-editor"

// Dynamically import MDEditor to avoid SSR issues
const MDEditorNoSSR = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default),
  { ssr: false }
)

interface RichEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  height?: number
  hasSubmitted?: boolean
}

export function RichEditor({
  value,
  onChange,
  placeholder = "Start writing your post...",
  height = 500,
  hasSubmitted = false
}: RichEditorProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="border rounded-t-lg border-b-0 bg-background">
        <div className="flex items-center gap-2 p-4">
          <button
            className={`px-3 py-1.5 text-sm rounded-md ${
              isPreviewMode
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            {isPreviewMode ? "Edit" : "Preview"}
          </button>
        </div>
      </div>

      {/* Editor/Preview Area */}
      <div style={{ height }} className="border rounded-lg overflow-hidden">
        {isPreviewMode ? (
          // Preview mode
          <div className="h-full overflow-y-auto">
            <MDEditor.Markdown source={value || placeholder} />
          </div>
        ) : (
          // Edit mode
          <div style={{ height: `${height}px` }}>
            <MDEditorNoSSR
              value={value || ""}
              onChange={onChange}
              placeholder={placeholder}
              height={height}
              visibledragbar={false}
              textareaProps={{
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