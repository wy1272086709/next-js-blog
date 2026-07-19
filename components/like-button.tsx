"use client"

import { Button } from "@/components/ui/button"
import { Heart } from "lucide-react"
import { cn } from "@/lib/utils"
import { useLikeMutation } from "@/hooks/use-like-mutation"
import { useEffect } from "react"

interface LikeButtonProps {
  postId: string
  initialLikeCount?: number
  initialHasLiked?: boolean
  className?: string
  size?: "sm" | "default" | "lg"
  onLikeChange?: (liked: boolean, count: number) => void
}

export function LikeButton({
  postId,
  initialLikeCount,
  initialHasLiked,
  className,
  size = "sm",
  onLikeChange,
}: LikeButtonProps) {
  const {
    likeData,
    isPending,
    isSuccess,
    isError,
    error,
    handleLike,
  } = useLikeMutation({
    postId,
    initialData: initialLikeCount === undefined
      ? undefined
      : { count: initialLikeCount, liked: initialHasLiked ?? false },
  })

  // 监听点赞变化
  useEffect(() => {
    if (likeData && onLikeChange) {
      onLikeChange(likeData.liked, likeData.count)
    }
  }, [likeData, onLikeChange])

  // 处理点击事件
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    handleLike()
  }
  console.log('likeData', likeData)
  // 添加键盘支持
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleLike()
    }
  }

  // 按钮尺寸配置
  const sizeClasses = {
    sm: "h-8 px-3 text-xs",
    default: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  }

  // 加载状态动画
  const animationClasses = isPending
    ? "animate-pulse"
    : isSuccess
      ? "transition-all duration-200 ease-in-out"
      : ""

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={isPending}
      className={cn(
        "gap-2 transition-all duration-200 hover:bg-red-50 hover:text-red-500",
        sizeClasses[size],
        likeData?.liked && "text-red-500",
        animationClasses,
        className
      )}
      aria-label={likeData?.liked ? "取消点赞" : "点赞"}
      aria-pressed={likeData?.liked}
    >
      <Heart
        className={cn(
          "transition-all duration-200",
          likeData?.liked
            ? "fill-current text-red-500 scale-110"
            : "text-gray-400 hover:text-red-500"
        )}
        style={{
          animation: isSuccess ? "pulse 0.3s ease-in-out" : "none"
        }}
      />

      <span className="font-medium transition-all duration-200">
        {isPending ? "..." : likeData?.count}
      </span>

      {/* 加载状态指示器 */}
      {isPending && (
        <div className="ml-2">
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-red-500 border-t-transparent"></div>
        </div>
      )}

      {/* 错误提示 */}
      {isError && (
        <span className="ml-2 text-xs text-red-500" role="alert">
          {error?.message}
        </span>
      )}
    </Button>
  )
}
