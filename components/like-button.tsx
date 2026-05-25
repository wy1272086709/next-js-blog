"use client"

import { useState, useEffect, useCallback } from "react"
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


  // 客户端获取当前用户（用于未登录时跳转登录页）
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u))
  }, [])

  // 如果 props 更新（例如父组件重新获取数据），同步实际状态（可选）
  useEffect(() => {
    setLikeState({ count: initialLikeCount, liked: initialHasLiked })
  }, [initialLikeCount, initialHasLiked])

  const handleLike = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    console.log("点击了点赞按钮，当前用户信息:", user)
    // 未登陆，则跳转至登录页
    if (!user) {
      router.push(getPathname({ href: "/auth/login", locale: "" }))
      return
    }

    // 保存当前状态，用于失败时回滚
    const previousState = { ...likeState }

    // 立即更新本地状态，触发 UI 更新
    const newState = {
      count: likeState.liked ? likeState.count - 1 : likeState.count + 1,
      liked: !likeState.liked,
    }
    setLikeState(newState)

    // 添加视觉反馈
    const button = document.activeElement as HTMLButtonElement
    if (button) {
      // 使用CSS transform实现更流畅的动画
      button.style.transform = 'scale(0.95)'
      setTimeout(() => {
        button.style.transform = 'scale(1)'
      }, 150)

      // 心跳动画
      const heart = button.querySelector('svg')
      if (heart) {
        heart.style.animation = 'none'
        setTimeout(() => {
          heart.style.animation = 'pulse 0.3s ease-in-out'
        }, 10)
      }
    }

    // 在 background 中执行实际的 API 调用
    ;(async () => {
      try {
        const response = await fetch(`/api/posts/${postId}/like`, {
          method: "POST",
        })

        if (response.status === 401) {
          // 未登录：回滚到之前的状态
          setLikeState(previousState)
          router.push(getPathname({ href: "/auth/login", locale: "" }))
          return
        }

        if (!response.ok) {
          const error = await response.json()
          // 服务器错误：回滚到之前的状态
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
      } catch (error) {
        console.error("点赞失败:", error)
        // 网络错误：回滚到之前的状态
        setLikeState(previousState)
        toast({
          title: t("error"),
          description: t("networkError"),
          variant: "destructive",
        })
      }
    })()
  }, [user, postId, likeState, t, router])

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLike}
      disabled={false}
      className="gap-2 bg-transparent transition-transform duration-100"
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-colors duration-200",
          likeState.liked ? "fill-red-500 text-red-500" : "text-gray-500"
        )}
      />
      <span className="transition-all duration-200">
        {likeState.count}
      </span>
    </Button>
  )
}