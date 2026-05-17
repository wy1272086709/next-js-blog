"use client"

import { useState, useOptimistic, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { useTranslations } from "next-intl"
import { useRouter, getPathname } from "@/i18n/navigation"

export function LikeButton({
  postId,
  initialLikeCount,
  initialHasLiked,
}: {
  postId: string
  initialLikeCount: number
  initialHasLiked: boolean
}) {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const { toast } = useToast()
  const t = useTranslations("LikeButton")
  
  // 实际状态：从 props 初始化，后续由服务器响应更新
  const [likeState, setLikeState] = useState({
    count: initialLikeCount,
    liked: initialHasLiked,
  })

  // 乐观更新：基于实际状态，在 transition 期间显示中间状态
  const [optimisticState, setOptimisticState] = useOptimistic(
    likeState,
    (state, newState: typeof likeState) => newState
  )

  // 客户端获取当前用户（用于未登录时跳转登录页）
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u))
  }, [])

  // 如果 props 更新（例如父组件重新获取数据），同步实际状态（可选）
  useEffect(() => {
    setLikeState({ count: initialLikeCount, liked: initialHasLiked })
  }, [initialLikeCount, initialHasLiked])

  const handleLike = () => {
    console.log("点击了点赞按钮，当前用户信息:", user)
    // 未登陆，则跳转至登录页
    if (!user) {
      router.push(getPathname({ href: "/auth/login", locale: "" }))
      return
    }

    // 保存当前状态，用于失败时回滚
    const previousState = { ...likeState }

    // 立即计算乐观更新并触发 UI 更新
    const optimisticNew = {
      count: likeState.liked ? likeState.count - 1 : likeState.count + 1,
      liked: !likeState.liked,
    }
    setOptimisticState(optimisticNew)

    // 在 background 中执行实际的 API 调用
    ;(async () => {
      try {
        const response = await fetch(`/api/posts/${postId}/like`, {
          method: "POST",
        })

        if (response.status === 401) {
          // 未登录：回滚到之前的状态
          setOptimisticState(previousState)
          setLikeState(previousState)
          router.push(getPathname({ href: "/auth/login", locale: "" }))
          return
        }

        if (!response.ok) {
          const error = await response.json()
          // 服务器错误：回滚到之前的状态
          setOptimisticState(previousState)
          setLikeState(previousState)
          toast({
            title: t("error"),
            description: error.error || t("operationFailed"),
            variant: "destructive",
          })
          return
        }

        const data = await response.json()
        // 成功：用服务器返回的真实数据更新实际状态
        setLikeState({ count: data.count, liked: data.liked })
        setOptimisticState({ count: data.count, liked: data.liked })

        toast({
          title: data.liked ? t("liked") : t("unliked"),
          duration: 2000,
        })
      } catch (error) {
        console.error("点赞失败:", error)
        // 网络错误：回滚到之前的状态
        setOptimisticState(previousState)
        setLikeState(previousState)
        toast({
          title: t("error"),
          description: t("networkError"),
          variant: "destructive",
        })
      }
    })()
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLike}
      disabled={false}
      className="gap-2 bg-transparent"
    >
      <Heart
        className={cn(
          "h-4 w-4",
          optimisticState.liked && "fill-red-500 text-red-500"
        )}
      />
      {optimisticState.count}
    </Button>
  )
}