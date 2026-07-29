"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { z } from "zod"
import { routing } from "@/i18n/routing"
import { interactionsEnabled } from "@/lib/features"
import { createClient } from "@/lib/supabase/server"

const profileSchema = z.object({
  username: z.string().trim().min(1).max(50),
  bio: z.string().max(1000),
})

export async function updateProfile(input: unknown) {
  if (!interactionsEnabled) throw new Error("Interactions are disabled")

  const parsed = profileSchema.safeParse(input)
  if (!parsed.success) throw new Error("Invalid profile data")

  const supabase = await createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) throw new Error("Unauthorized")

  const { username, bio } = parsed.data
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: authData.user.id,
      username,
      bio,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (profileError) {
    console.error("Failed to update profile:", profileError)
    throw new Error("Failed to update profile")
  }

  const { error: metadataError } = await supabase.auth.updateUser({
    data: { username },
  })
  if (metadataError) {
    console.error("Failed to update user metadata:", metadataError)
    throw new Error("Failed to update user metadata")
  }

  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/dashboard/settings`, "page")
    revalidatePath(`/${locale}/dashboard`, "page")
  }
  revalidateTag("posts", { expire: 0 })

  return profile
}
