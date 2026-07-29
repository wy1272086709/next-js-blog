import { createHmac } from "node:crypto"
import type { NextRequest } from "next/server"

function getRequestIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for")
  return (
    request.headers.get("cf-connecting-ip") ||
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

export function hashRequestIp(request: NextRequest): string | null {
  const salt = process.env.VIEW_COUNT_IP_SALT
  if (!salt) return null

  return createHmac("sha256", salt).update(getRequestIp(request)).digest("hex")
}

