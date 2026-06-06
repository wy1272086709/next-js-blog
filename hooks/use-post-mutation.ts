'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PostsAPI } from '@/lib/api/posts'

interface PostData {
  title: string
  content: string
  excerpt?: string
  category_id?: string | null
  published: boolean
  author_id: string
}

export function usePostMutation() {
  const queryClient = useQueryClient()
  const postsAPI = new PostsAPI()

  return useMutation({
    mutationFn: async (data: PostData & { id?: string }) => {
      if (data.id) {
        // Update post
        const { id, ...postData } = data
        return postsAPI.updatePost({ ...postData, id })
      } else {
        // Create post
        return postsAPI.createPost(data)
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate posts query to refetch
      queryClient.invalidateQueries({
        queryKey: ['posts', 'user', variables.author_id],
      })

      // Show success toast
      toast.success(
        variables.id ? '文章已更新' : '文章已创建'
      )
    },
    onError: (error) => {
      toast.error('保存失败，请重试')
    },
  })
}