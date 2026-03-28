"use client"

import { useEffect, useState } from "react"
import { ClientHeader } from "@/components/client-header"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"

export function HybridHeader() {
  const [isClient, setIsClient] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setIsClient(true)
    // 在客户端获取用户状态
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  if (!isClient) {
    // 服务端渲染时，先返回占位符
    return (
      <header className="sticky pl-[24px] pr-[24px] top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 animate-pulse bg-gray-300 rounded" />
              <span className="font-bold text-xl animate-pulse bg-gray-300 rounded px-2">
                技术博客
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="animate-pulse bg-gray-300 rounded w-20 h-8" />
          </div>
        </div>
      </header>
    )
  }

  return <ClientHeader />
}