'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter, getPathname } from '@/i18n/navigation'
import { useCallback, useRef } from 'react'

interface BatchLikeAction {
  postId: string
  liked: boolean
}

interface BatchLikeResult {
  postId: string
  success: boolean
  data?: {
    count: number
    liked: boolean
  }
  error?: string
}

export function useBatchLikeMutation() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (actions: BatchLikeAction[]): Promise<BatchLikeResult[]> => {
      // 批量获取所有文章的当前状态
      const currentState = await Promise.all(
        actions.map(async ({ postId, liked }) => {
          const data = queryClient.getQueryData(['post', postId, 'likes'])
          return { postId, liked, currentData: data }
        })
      )

      // 乐观更新所有文章状态
      const optimisticResults = await Promise.allSettled(
        actions.map(async ({ postId, liked }) => {
          // 保存之前的状态
          const previousData: any = queryClient.getQueryData(['post', postId, 'likes'])

          // 计算新状态
          const newCount = (previousData?.count || 0) + (liked ? 1 : -1)

          // 乐观更新
          queryClient.setQueryData(['post', postId, 'likes'], {
            count: Math.max(0, newCount),
            liked,
          })

          return { postId, previousData }
        })
      )

      // 执行批量API调用
      const promises = actions.map(action =>
        fetch(`/api/posts/${action.postId}/like`, {
          method: 'POST',
        })
      )

      // 使用 Promise.allSettled 保证部分失败也能继续
      const responses = await Promise.allSettled(promises)

      // 处理结果
      const results = responses.map((response, index) => {
        const action = actions[index]

        if (response.status === 'fulfilled') {
          // 成功，更新为服务器数据
          response.value.json().then(serverData => {
            queryClient.setQueryData(['post', action.postId, 'likes'], serverData)
          })

          return {
            postId: action.postId,
            success: true,
            data: {
              count: optimisticResults[index].status === 'fulfilled'
                ? optimisticResults[index].value.count
                : 0,
              liked: action.liked,
            },
          }
        } else {
          // 失败，回滚
          const rollback = optimisticResults[index].status === 'fulfilled'
            ? optimisticResults[index].value
            : null

          if (rollback?.previousData) {
            queryClient.setQueryData(['post', action.postId, 'likes'], rollback.previousData)
          }

          return {
            postId: action.postId,
            success: false,
            error: response.reason?.message || '网络错误',
          }
        }
      })

      // 统计结果
      const successCount = results.filter(r => r.success).length
      const failureCount = results.filter(r => !r.success).length

      // 显示批量操作结果提示
      if (successCount > 0) {
        toast.success(
          `成功 ${successCount} 个操作${failureCount > 0 ? `，失败 ${failureCount} 个` : ''}`,
          {
            duration: 3000,
            position: 'top-right',
          }
        )
      } else if (failureCount > 0) {
        toast.error(
          `所有操作失败，请检查网络连接`,
          {
            duration: 4000,
            position: 'top-right',
          }
        )
      }

      return results
    },

    onSettled: () => {
      // 批量操作完成后，失效所有相关查询
      queryClient.invalidateQueries({
        predicate: (query) => {
          return query.queryKey[0] === 'post' &&
                 query.queryKey[2] === 'likes'
        }
      })
    },
  })
}

// 优化版：单个文章的批量点赞（用于实现防抖）
export function useOptimizedLikeMutation() {
  const queryClient = useQueryClient()
  const batchMutation = useBatchLikeMutation()
  const pendingLikes = useRef<Map<string, number>>(new Map())

  const handleLikeWithDebounce = useCallback(
    async (postId: string, liked: boolean) => {
      // 检查是否有进行中的操作
      const pendingTime = pendingLikes.current.get(postId)
      if (pendingTime && Date.now() - pendingTime < 1500) {
        return // 防抖：1.5秒内重复操作不执行
      }

      // 记录开始时间
      pendingLikes.current.set(postId, Date.now())

      try {
        // 使用批量API处理单个操作
        await batchMutation.mutateAsync([{ postId, liked }])
      } finally {
        // 清理
        pendingLikes.current.delete(postId)
      }
    },
    [batchMutation]
  )

  return {
    handleLikeWithDebounce,
    isPending: batchMutation.isPending,
    reset: batchMutation.reset,
  }
}