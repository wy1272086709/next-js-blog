import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const MAX_FILE_SIZE = 16 * 1024 * 1024
const fileSchema = z.object({
  name: z.string().min(1),
  size: z.number().positive().max(MAX_FILE_SIZE),
  type: z.string(),
})

export type ParseUploadResponse = {
  title: string
  content: string
}

function errorResponse(error: string, status: number, code: string) {
  return NextResponse.json({ error, code }, { status })
}

function getExtension(filename: string) {
  const dotIndex = filename.lastIndexOf(".")
  return dotIndex >= 0 ? filename.slice(dotIndex).toLowerCase() : ""
}

function getTitle(filename: string) {
  return filename.replace(/\.(md|markdown|pdf)$/i, "").trim()
}

async function extractPdfText(data: Uint8Array) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs")
  const loadingTask = getDocument({ data })
  const document = await loadingTask.promise
  const pages: string[] = []

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const textContent = await page.getTextContent()
      const text = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+\n/g, "\n")
        .trim()

      if (text) pages.push(text)
    }
  } finally {
    await loadingTask.destroy()
  }

  return pages.join("\n\n")
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

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return errorResponse("File is required", 400, "file_required")
  }

  const parsedFile = fileSchema.safeParse({ name: file.name, size: file.size, type: file.type })
  if (!parsedFile.success) {
    const code = file.size > MAX_FILE_SIZE ? "file_too_large" : "invalid_file"
    return errorResponse("Invalid file", 400, code)
  }

  const extension = getExtension(file.name)
  if (![".md", ".markdown", ".pdf"].includes(extension)) {
    return errorResponse("Unsupported file type", 415, "unsupported_file_type")
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const content = extension === ".pdf"
      ? await extractPdfText(bytes)
      : new TextDecoder("utf-8", { fatal: true }).decode(bytes)

    if (!content.trim()) {
      return errorResponse("No readable text found", 422, "empty_file_content")
    }

    return NextResponse.json({
      title: getTitle(file.name),
      content: content.trim(),
    } satisfies ParseUploadResponse)
  } catch (error) {
    console.error("Failed to parse uploaded article:", error)
    return errorResponse("Failed to parse file", 422, "parse_failed")
  }
}
