"use client"

import { ClientHeader } from "@/components/client-header"

export function HybridHeader() {
  // 直接渲染 ClientHeader，它内部通过 useAuth 处理加载状态和用户状态
  return <ClientHeader />
}