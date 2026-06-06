'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

interface UsePostsCacheOptions {
  userId: string
  enabled?: boolean
}

export function usePostsCache({ userId, enabled = true }: UsePostsCacheOptions) {
  const queryClient = useQueryClient()

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

    // This would typically be used to prefetch posts before navigation
    // Implementation depends on your data fetching strategy
  }

  return {
    clearPostsCache,
    prefetchPosts,
  }
}