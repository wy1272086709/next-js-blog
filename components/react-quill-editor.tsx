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
  required?: boolean
}

export function RichEditor({
  value,
  onChange,
  placeholder = "Start writing your post...",
  height = 500,
  required = false
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
              visibleDragBar={false}
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

      {/* Character count and required indicator */}
      <div className="flex justify-between items-center px-4 pb-2">
        <span className={`text-sm ${required && !value ? 'text-destructive' : 'text-muted-foreground'}`}>
          {required && !value ? 'Content is required' : `${value.length} characters`}
        </span>
      </div>
    </div>
  )
}