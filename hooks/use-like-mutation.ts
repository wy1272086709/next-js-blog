'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import { useRouter, getPathname } from '@/i18n/navigation'
import type { User } from '@supabase/supabase-js'
import { useState, useEffect, useCallback } from 'react'
import { fetchWithCSRF } from '@/lib/csrf/client'

export interface LikeData {
  count: number
  liked: boolean
}

interface UseLikeMutationOptions {
  postId: string
  initialData?: LikeData
  enabled?: boolean
}

export function useLikeMutation({ postId, initialData, enabled = true }: UseLikeMutationOptions) {
  const queryClient = useQueryClient()
  const t = useTranslations("LikeButton")
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  
  // 获取当前用户
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u))
  }, [])

  // 获取点赞状态和数量
  const { data: likeData, isLoading } = useQuery<LikeData>({
    queryKey: ['post', postId, 'likes'],
    queryFn: async (): Promise<LikeData> => {
      const response = await fetch(`/api/posts/${postId}/like`)
      if (!response.ok) throw new Error('获取点赞状态失败')
      return response.json()
    },
    initialData,
    staleTime: 1000 * 60 * 5, // 5分钟内不重新请求
    enabled,
  });

  // 乐观更新 mutation
  const mutation = useMutation({
    mutationFn: async (liked: boolean) => {
      if (!user) {
        throw new Error('请先登录')
      }

      const response = await fetchWithCSRF(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ liked }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '操作失败')
      }

      return response.json()
    },

    // 1. 乐观更新 - 在请求发送前立即更新UI
    onMutate: async () => {
      // 保存之前的快照用于回滚
      const previousLikeData = queryClient.getQueryData(['post', postId, 'likes']) as LikeData

      // 获取当前最新的 likeData
      const currentData = queryClient.getQueryData(['post', postId, 'likes']) as LikeData

      // 立即更新UI，实现零延迟反馈
      const newLiked = !currentData?.liked
      const optimisticData: LikeData = {
        count: newLiked ? (currentData?.count || 0) + 1 : (currentData?.count || 0) - 1,
        liked: newLiked,
      }

      // 设置乐观缓存
      queryClient.setQueryData(['post', postId, 'likes'], optimisticData)

      // 添加动画效果（仅在客户端执行）
      if (typeof window !== 'undefined') {
        const button = document.activeElement as HTMLElement
        if (button) {
          button.style.transform = 'scale(0.95)'
          setTimeout(() => {
            button.style.transform = 'scale(1)'
          }, 150)
        }
      }

      return { previousLikeData }
    },

    // 2. 成功处理
    onSuccess: (data: LikeData, variables, context) => {
      // 成功时用服务器数据更新缓存
      queryClient.setQueryData(['post', postId, 'likes'], data)

      // 显示成功提示
      toast.success(
        data.liked ? t('likedSuccessfully') : t('unlikedSuccessfully'),
        {
          duration: 2000,
          position: 'top-right',
        }
      )
    },

    // 3. 错误处理 - 自动回滚
    onError: (error: Error, variables, context) => {
      // 回滚到之前的状态
      if (context?.previousLikeData) {
        queryClient.setQueryData(['post', postId, 'likes'], context.previousLikeData)
      }

      // 根据错误类型显示不同提示
      if (error.message.includes('请先登录')) {
        router.push(getPathname({ href: "/auth/login", locale: "" }))
      } else {
        toast.error(
          t('operationFailed'),
          {
            duration: 3000,
            position: 'top-right',
          }
        )
      }
    },

  })
  // 手动触发点赞的方法（用于防抖）
  const handleLike = useCallback(() => {
    if (mutation.isPending) return // 防止重复点击
    const currentData = queryClient.getQueryData(['post', postId, 'likes']) as LikeData
    mutation.mutate(!currentData?.liked)
  }, [mutation, postId, queryClient])

  return {
    likeData,
    isLoading,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    isError: mutation.isError,
    error: mutation.error,
    handleLike,
    mutate: mutation.mutate,
    reset: mutation.reset,
  }
}
