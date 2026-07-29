import { createClient } from '@/lib/supabase/client'

export interface Post {
  id: string
  title: string
  content: string
  excerpt: string | null
  category_id: string | null
  published: boolean
  author_id: string
  created_at: string
  updated_at: string
  view_count?: number
  categories?: {
    name: string
    slug: string
  } | null
  likes?: Array<{
    count: number
  }>
}

export class PostsAPI {
  private supabase = createClient()

  async getUserPosts(userId: string, limit = 10, offset = 0) {
    const { data, error } = await this.supabase
      .from('posts')
      .select(`
        *,
        categories:category_id(name, slug),
        likes:post_likes(count)
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return data
  }

  // Clear cache by forcing a refetch
  async invalidateUserPostsCache(userId: string) {
    // This method is called after mutations to ensure fresh data
    // In a real app with React Query, this would automatically trigger a refetch
    console.log('Invalidating posts cache for user:', userId)
  }
}
