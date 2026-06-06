"use client"

import React, { useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

interface CollapsibleMarkdownProps {
  title: string
  children: React.ReactNode
  defaultCollapsed?: boolean
}

export function CollapsibleMarkdown({
  title,
  children,
  defaultCollapsed = false
}: CollapsibleMarkdownProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center justify-between w-full p-4 bg-muted hover:bg-muted/80 transition-colors"
      >
        <h4 className="font-medium">{title}</h4>
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {!isCollapsed && (
        <div className="p-4 bg-background">
          {children}
        </div>
      )}
    </div>
  )
}