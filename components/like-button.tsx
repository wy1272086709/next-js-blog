"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export function LikeButton({
  postId,
  initialLikeCount,
  initialHasLiked,
}: {
  postId: string
  initialLikeCount: number
  initialHasLiked: boolean
}) {
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [hasLiked, setHasLiked] = useState(initialHasLiked)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLike = async () => {
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push("/auth/login")
      return
    }

    setIsLoading(true)

    try {
      if (hasLiked) {
        await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user.id)

        setLikeCount((prev) => prev - 1)
        setHasLiked(false)
      } else {
        await supabase.from("likes").insert({ post_id: postId, user_id: user.id })

        setLikeCount((prev) => prev + 1)
        setHasLiked(true)
      }
    } catch (error) {
      console.error("点赞失败:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLike} disabled={isLoading} className="gap-2 bg-transparent">
      <Heart className={cn("h-4 w-4", hasLiked && "fill-red-500 text-red-500")} />
      {likeCount}
    </Button>
  )
}
