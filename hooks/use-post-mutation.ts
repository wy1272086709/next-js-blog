'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations("PostMutation")
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
      });

      // Show success toast
      toast.success(
        variables.id ? t('postUpdated') : t('postCreated')
      )
    },
    onError: (error) => {
      toast.error(t('saveFailed'))
    },
  })
}