'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'

export function useLikePrefetch() {
  const queryClient = useQueryClient()

  // 预加载单个文章的点赞状态
  const prefetchLikeState = useCallback(
    async (postId: string) => {
      try {
        // 预加载到缓存中
        await queryClient.prefetchQuery({
          queryKey: ['post', postId, 'likes'],
          queryFn: async () => {
            const response = await fetch(`/api/posts/${postId}/like`)
            if (!response.ok) throw new Error('预加载失败')
            return response.json()
          },
          staleTime: 1000 * 60 * 5, // 5分钟内不重新请求
        })

        console.log(`预加载了文章 ${postId} 的点赞状态`)
      } catch (error) {
        console.error(`预加载文章 ${postId} 点赞状态失败:`, error)
      }
    },
    [queryClient]
  )

  // 批量预加载多个文章的点赞状态
  const batchPrefetchLikeStates = useCallback(
    async (postIds: string[]) => {
      const prefetchPromises = postIds.map(postId =>
        prefetchLikeState(postId)
      )

      await Promise.allSettled(prefetchPromises)
    },
    [prefetchLikeState]
  )

  // 滚动时预加载（懒加载优化）
  const prefetchOnScroll = useCallback(
    (containerSelector: string, threshold = 0.8) => {
      const container = document.querySelector(containerSelector) as HTMLElement
      if (!container) return

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const postId = entry.target.getAttribute('data-post-id')
              if (postId) {
                prefetchLikeState(postId)
              }
              observer.unobserve(entry.target)
            }
          })
        },
        {
          rootMargin: '200px', // 提前200px开始预加载
          threshold,
        }
      )

      // 观察所有可见的文章
      document.querySelectorAll('[data-post-id]').forEach(el => {
        observer.observe(el)
      })

      return () => {
        observer.disconnect()
      }
    },
    [prefetchLikeState]
  )

  // 页面切换时预加载
  useEffect(() => {
    // 当路由变化时，预加载当前页面的点赞状态
    const handleRouteChange = () => {
      // 获取当前页面的所有文章ID（可以根据实际路由结构调整）
      const postIds = Array.from(
        document.querySelectorAll('[data-post-id]')
      ).map(el => el.getAttribute('data-post-id') as string)

      if (postIds.length > 0) {
        batchPrefetchLikeStates(postIds)
      }
    }

    // 监听路由变化（这里假设使用 Next.js 的路由事件）
    window.addEventListener('popstate', handleRouteChange)

    // 初始加载
    handleRouteChange()

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [batchPrefetchLikeStates])

  return {
    prefetchLikeState,
    batchPrefetchLikeStates,
    prefetchOnScroll,
  }
}

// 使用场景示例
/*
function usePostListOptimized() {
  const { batchPrefetchLikeStates, prefetchOnScroll } = useLikePrefetch()

  // 在组件挂载时预加载
  useEffect(() => {
    batchPrefetchLikeStates(postIds)

    // 设置滚动预加载
    return prefetchOnScroll('.post-list')
  }, [batchPrefetchLikeStates, prefetchOnScroll])
}
*/