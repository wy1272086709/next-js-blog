"use server"

import { revalidatePath, revalidateTag } from "next/cache"
import { z } from "zod"
import { interactionsEnabled } from "@/lib/features"
import { createClient } from "@/lib/supabase/server"
import { routing } from "@/i18n/routing"

const postSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  content: z
    .string()
    .max(2_000_000)
    .refine((value) => value.trim().length > 0),
  excerpt: z.string().max(1000).optional(),
  category_id: z.string().uuid().nullable().optional(),
  published: z.boolean(),
})

const postIdSchema = z.string().uuid()

function revalidatePostPages(postId?: string) {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/dashboard/posts`, "page")
    revalidatePath(`/${locale}/posts`, "page")
    if (postId) revalidatePath(`/${locale}/posts/${postId}`, "page")
  }
  revalidateTag("posts", { expire: 0 })
}

async function getAuthenticatedClient() {
  if (!interactionsEnabled) throw new Error("Interactions are disabled")

  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error("Unauthorized")

  return { supabase, user: data.user }
}

export async function savePost(input: unknown) {
  const parsed = postSchema.safeParse(input)
  if (!parsed.success) throw new Error("Invalid post data")

  const { supabase, user } = await getAuthenticatedClient()
  const { id, ...postData } = parsed.data
  const values = {
    ...postData,
    excerpt: postData.excerpt || postData.content.substring(0, 150),
    author_id: user.id,
    updated_at: new Date().toISOString(),
  }

  const query = id
    ? supabase
        .from("posts")
        .update(values)
        .eq("id", id)
        .eq("author_id", user.id)
    : supabase.from("posts").insert(values)

  const { data, error } = await query.select().single()
  if (error) {
    console.error("Failed to save post:", error)
    throw new Error("Failed to save post")
  }

  revalidatePostPages(data.id)
  return data
}

export async function deletePost(postId: string) {
  const parsedId = postIdSchema.safeParse(postId)
  if (!parsedId.success) throw new Error("Invalid post ID")

  const { supabase, user } = await getAuthenticatedClient()
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", parsedId.data)
    .eq("author_id", user.id)

  if (error) {
    console.error("Failed to delete post:", error)
    throw new Error("Failed to delete post")
  }

  revalidatePostPages(parsedId.data)
}
