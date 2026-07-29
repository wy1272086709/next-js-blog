'use client'

import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { useRouter } from '@/i18n/navigation'
import { savePost } from '@/app/actions/post-actions'

interface PostData {
  title: string
  content: string
  excerpt?: string
  category_id?: string | null
  published: boolean
}

export function usePostMutation() {
  const t = useTranslations("PostMutation")
  const router = useRouter()

  return useMutation({
    mutationFn: (data: PostData & { id?: string }) => savePost(data),
    onSuccess: (_data, variables) => {
      // Show success toast
      toast.success(
        variables.id ? t('postUpdated') : t('postCreated')
      )

      // Navigate to posts dashboard after successful mutation
      router.push('/dashboard/posts')
    },
    onError: (error) => {
      toast.error(t('saveFailed'))
    },
  })
}
