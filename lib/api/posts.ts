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

export interface CreatePostData {
  title: string
  content: string
  excerpt?: string
  category_id?: string | null
  published: boolean
}

export interface UpdatePostData extends Partial<CreatePostData> {
  id: string
}

export class PostsAPI {
  private supabase = createClient()

  async createPost(data: CreatePostData & { author_id: string }) {
    const { data: postData, error } = await this.supabase
      .from('posts')
      .insert({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return postData
  }

  async updatePost(data: UpdatePostData & { author_id: string }) {
    const { data: postData, error } = await this.supabase
      .from('posts')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)
      .select()
      .single()

    if (error) throw error
    return postData
  }

  async getUserPosts(userId: string, limit = 10, offset = 0) {
    const { data, error } = await this.supabase
      .from('posts')
      .select(`
        *,
        categories:category_id(name, slug),
        likes(count)
      `)
      .eq('author_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return data
  }

  async deletePost(id: string) {
    const { error } = await this.supabase.from('posts').delete().eq('id', id)
    if (error) throw error
  }

  // Clear cache by forcing a refetch
  async invalidateUserPostsCache(userId: string) {
    // This method is called after mutations to ensure fresh data
    // In a real app with React Query, this would automatically trigger a refetch
    console.log('Invalidating posts cache for user:', userId)
  }
}