import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const
const imageSchema = z.object({
  name: z.string().min(1),
  size: z.number().positive().max(MAX_IMAGE_SIZE),
  type: z.enum(IMAGE_TYPES),
})

export type ImageUploadResponse = {
  url: string
  alt: string
}

function errorResponse(error: string, status: number, code: string) {
  return NextResponse.json({ error, code }, { status })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return errorResponse("Unauthorized", 401, "unauthorized")

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return errorResponse("Invalid form data", 400, "invalid_form_data")
  }

  const image = formData.get("image")
  if (!(image instanceof File)) {
    return errorResponse("Image is required", 400, "image_required")
  }

  const parsed = imageSchema.safeParse({ name: image.name, size: image.size, type: image.type })
  if (!parsed.success) {
    const code = image.size > MAX_IMAGE_SIZE ? "image_too_large" : "unsupported_image_type"
    return errorResponse("Invalid image", 400, code)
  }

  const extension = image.type === "image/jpeg" ? "jpg" : image.type.slice("image/".length)
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from("post-images")
    .upload(path, await image.arrayBuffer(), {
      contentType: image.type,
      cacheControl: "31536000",
      upsert: false,
    })

  if (uploadError) {
    console.error("Failed to upload post image:", uploadError)
    const message = uploadError.message.toLowerCase()
    if (message.includes("bucket") && (message.includes("not found") || message.includes("does not exist"))) {
      return errorResponse("Post image storage is not configured", 503, "storage_not_configured")
    }
    if (message.includes("row-level security") || message.includes("policy")) {
      return errorResponse("Image upload permission denied", 403, "storage_permission_denied")
    }
    return errorResponse("Image upload failed", 500, "storage_upload_failed")
  }

  const { data } = supabase.storage.from("post-images").getPublicUrl(path)
  return NextResponse.json({
    url: data.publicUrl,
    alt: image.name.replace(/\.[^.]+$/, ""),
  } satisfies ImageUploadResponse)
}
