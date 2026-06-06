'use client'

import { useQueryClient } from '@tanstack/react-query'
import { PostsAPI } from '@/lib/api/posts'

interface UsePostsCacheOptions {
  userId: string
  enabled?: boolean
  limit?: number
  offset?: number
}

/**
 * 使用场景：
 * 1. 在用户点击"我的文章"链接前预取数据
 * 2. 在分页切换时预取下一页数据
 * 3. 在编辑文章后预取更新后的文章列表
 *
 * @example
 * // 在组件中使用
 * const { prefetchPosts } = usePostsCache({
 *   userId: user.id,
 *   limit: 10,
 *   offset: 0
 * })
 *
 * // 在点击事件中预取
 * const handleMyPostsClick = () => {
 *   prefetchPosts()
 *   router.push('/dashboard/my-posts')
 * }
 */
export function usePostsCache({
  userId,
  enabled = true,
  limit = 10,
  offset = 0
}: UsePostsCacheOptions) {
  const queryClient = useQueryClient()
  const postsAPI = new PostsAPI()

  const clearPostsCache = () => {
    if (!enabled) return

    // Clear any cached queries related to posts
    queryClient.removeQueries({
      queryKey: ['posts', 'user', userId],
      exact: false,
    })

    // Clear general posts cache
    queryClient.removeQueries({
      queryKey: ['posts'],
      exact: false,
    })
  }

  const prefetchPosts = async () => {
    if (!enabled) return

    try {
      // Prefetch user posts to make navigation instant
      await queryClient.prefetchQuery({
        queryKey: ['posts', 'user', userId, limit, offset],
        queryFn: () => postsAPI.getUserPosts(userId, limit, offset),
        staleTime: 1000 * 60 * 5, // 5 minutes
      })

      console.log(`Prefetched posts for user ${userId} with limit ${limit}, offset ${offset}`)
    } catch (error) {
      console.error('Failed to prefetch posts:', error)
    }
  }

  return {
    clearPostsCache,
    prefetchPosts,
  }
}