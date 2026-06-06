'use client'

import { useQuery } from '@tanstack/react-query'
import { PostsAPI } from '@/lib/api/posts'

export function useUserPosts(userId: string, limit = 10, offset = 0) {
  const postsAPI = new PostsAPI()

  return useQuery({
    queryKey: ['posts', 'user', userId, limit, offset],
    queryFn: () => postsAPI.getUserPosts(userId, limit, offset),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}