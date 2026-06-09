"use client"

import { useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import { useRouter, getPathname } from "@/i18n/navigation"

export function useAuthListener() {
  const { user } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  // 处理认证错误（如 token 过期）
  const handleAuthError = useCallback(async (error: any) => {
    console.error("Auth error:", error)

    // 如果是认证错误（如 401），登出用户
    if (error?.status === 401 || error?.code === 'unauthorized') {
      const { toast } = require("@/components/ui/use-toast")
      toast({
        title: "登录已过期",
        description: "请重新登录",
        variant: "destructive",
      })
      await supabase.auth.signOut()
      router.push(getPathname({ href: "/auth/login", locale: "zh-CN" }))
    }
  }, [router, supabase.auth])

  // 监听所有 API 请求的错误
  useEffect(() => {
    const originalFetch = window.fetch

    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args)
        // 检查响应是否是 401 且是认证相关 API
        if (response.status === 401 && String(args?.[0])?.includes('/api/')) {
          const error = new Error("Unauthorized")
          Object.assign(error, { status: 401 })
          handleAuthError(error)
        }
        return response
      } catch (error) {
        handleAuthError(error)
        throw error
      }
    }

    return () => {
      window.fetch = originalFetch
    }
  }, [handleAuthError])

  // 定期检查 token 有效性（每 5 分钟）
  useEffect(() => {
    if (!user) return

    const checkTokenValidity = async () => {
      try {
        const { data, error } = await supabase.auth.getUser()

        if (error || !data.user) {
          handleAuthError(error || new Error("Token invalid"))
        }
      } catch (error) {
        handleAuthError(error)
      }
    }

    // 每 5 分钟检查一次
    const interval = setInterval(checkTokenValidity, 5 * 60 * 1000)

    // 组件卸载时清除定时器
    return () => clearInterval(interval)
  }, [user, handleAuthError, supabase.auth])
}

// 导出一个组合 Hook，方便使用
export function useAuthWithListener() {
  useAuthListener()
  return useAuth()
}