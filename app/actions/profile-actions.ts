'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createProfileIfNotExists(userId: string) {
  const supabase = await createClient()

  // 检查 profile 是否存在
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Failed to check profile: ${error.message}`)
  }

  // 如果 profile 不存在，创建它
  if (!profile) {
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username: `user_${userId.slice(-6)}`, // 使用 user_ 前缀加用户 ID 的最后6位作为默认用户名
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (insertError) {
      throw new Error(`Failed to create profile: ${insertError.message}`)
    }

    // 重新获取创建的 profile
    const { data: newProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    return newProfile
  }

  return profile
}

export async function updateProfile(userId: string, updates: {
  username?: string
  avatar_url?: string
  bio?: string
}) {
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`)
  }

  revalidatePath('/profile', 'page')
  return profile
}