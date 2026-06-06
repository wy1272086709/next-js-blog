"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import "highlight.js/styles/github.css"
import { memo, useEffect, useState } from "react"

interface MarkdownRendererProps {
  content: string
  typing?: boolean
  speed?: number
}

export const MarkdownRenderer = memo(({
  content,
  typing = false,
  speed = 30
}: MarkdownRendererProps) => {
  const [displayContent, setDisplayContent] = useState("")
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    if (!typing) {
      setDisplayContent(content)
      return
    }

    setIsTyping(true)
    setDisplayContent("")

    let currentIndex = 0
    const typingInterval = setInterval(() => {
      if (currentIndex <= content.length) {
        setDisplayContent(content.substring(0, currentIndex))
        currentIndex++
      } else {
        clearInterval(typingInterval)
        setIsTyping(false)
      }
    }, speed)

    return () => clearInterval(typingInterval)
  }, [content, typing, speed])

  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "")
            return !inline && match ? (
              <pre className="relative rounded-lg overflow-hidden">
                <code className={`${className} p-4 block`} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="px-1 py-0.5 bg-muted rounded text-sm" {...props}>
                {children}
              </code>
            )
          },
        }}
      >
        {displayContent}
      </ReactMarkdown>
      {isTyping && (
        <span className="inline-block ml-1 w-2 h-4 bg-primary animate-pulse" />
      )}
    </div>
  )
})

MarkdownRenderer.displayName = "MarkdownRenderer"