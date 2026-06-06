import { createClient } from '@/lib/supabase/server'

export async function ensureUserProfile(userId: string) {
  const supabase = await createClient()

  // Check if profile exists
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw fetchError
  }

  // If profile doesn't exist, create it
  if (!profile) {
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username: `用户${userId.slice(-6)}`, // Use last 6 chars of user ID as default username
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (insertError) {
      throw insertError
    }

    // Fetch the created profile
    const { data: newProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    return newProfile
  }

  return profile
}

export async function getUserProfile(userId: string) {
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return profile
}