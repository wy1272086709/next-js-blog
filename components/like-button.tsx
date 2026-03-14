"use client"

import { useState, useOptimistic, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

export function LikeButton({
  postId,
  initialLikeCount,
  initialHasLiked,
}: {
  postId: string
  initialLikeCount: number
  initialHasLiked: boolean
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isPending, startTransition] = useTransition()

  // 使用 useOptimistic 实现乐观更新
  const [optimisticState, setOptimisticState] = useOptimistic(
    { count: initialLikeCount, liked: initialHasLiked },
    (state, action: { count: number; liked: boolean }) => action
  )

  const handleLike = () => {
    startTransition(async () => {
      try {
        // 立即更新 UI（乐观更新）
        const newState = {
          count: optimisticState.liked ? optimisticState.count - 1 : optimisticState.count + 1,
          liked: !optimisticState.liked,
        }
        setOptimisticState(newState)

        // 调用服务端 API
        const response = await fetch(`/api/posts/${postId}/like`, {
          method: "POST",
        })

        if (response.status === 401) {
          // 用户未登录，重置乐观状态
          setOptimisticState({ count: initialLikeCount, liked: initialHasLiked })
          router.push("/auth/login")
          return
        }

        if (!response.ok) {
          // 服务器错误，重置乐观状态
          const error = await response.json()
          setOptimisticState({ count: initialLikeCount, liked: initialHasLiked })
          toast({
            title: "错误",
            description: error.error || "操作失败",
            variant: "destructive",
          })
          return
        }

        const data = await response.json()

        // 使用服务器返回的真实数据更新状态
        setOptimisticState({ count: data.count, liked: data.liked })

        // 显示成功提示
        toast({
          title: data.liked ? "已点赞" : "已取消点赞",
          duration: 2000,
        })
      } catch (error) {
        // 网络错误，重置乐观状态
        console.error("点赞失败:", error)
        setOptimisticState({ count: initialLikeCount, liked: initialHasLiked })
        toast({
          title: "错误",
          description: "网络错误，请稍后重试",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLike}
      disabled={isPending}
      className="gap-2 bg-transparent"
    >
      <Heart className={cn("h-4 w-4", optimisticState.liked && "fill-red-500 text-red-500")} />
      {optimisticState.count}
    </Button>
  )
}
