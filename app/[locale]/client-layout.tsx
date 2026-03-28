"use client"

import { ReactNode } from "react"
import { Header as ServerHeader } from "@/components/header"
import { ClientHeader } from "@/components/client-header"
import { AuthProvider } from "@/lib/auth-context"

interface ClientLayoutProps {
  children: ReactNode
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <AuthProvider>
      {/* 使用客户端 Header，可以响应认证状态变化 */}
      <ClientHeader />
      <main className="min-h-[calc(100svh-3.5rem)]">{children}</main>
    </AuthProvider>
  )
}