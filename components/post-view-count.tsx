"use client"

import { useEffect, useState } from "react"
import { getClientCSRFToken } from "@/lib/csrf/client"

type PostViewCountProps = {
  postId: string
  initialCount: number
}

export function PostViewCount({ postId, initialCount }: PostViewCountProps) {
  const [viewCount, setViewCount] = useState(initialCount)

  useEffect(() => {
    let active = true

    async function registerView() {
      try {
        const csrfToken = await getClientCSRFToken()
        const response = await fetch(`/api/posts/${postId}/view`, {
          method: "POST",
          headers: { "X-CSRF-Token": csrfToken },
        })
        if (!response.ok) return

        const data = (await response.json()) as { viewCount: number }
        if (active) setViewCount(data.viewCount)
      } catch (error) {
        console.error("Failed to register post view:", error)
      }
    }

    registerView()
    return () => {
      active = false
    }
  }, [postId])

  return <>{viewCount}</>
}

