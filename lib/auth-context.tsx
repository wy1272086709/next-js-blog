"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"
import { useRouter, getPathname } from "@/i18n/navigation"

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // 监听认证状态变化
  useEffect(() => {
    // 获取初始用户状态
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user);
        switch (event) {
          case "SIGNED_IN":
            setUser(session?.user || null)
            // 如果用户从登录页来，重定向到 dashboard
            if (window.location.pathname === "/auth/login") {
              router.push(getPathname({ href: "/dashboard", locale: "" }))
            }
            break
          case "SIGNED_OUT":
            setUser(null)
            // 清除本地存储的状态
            localStorage.removeItem("auth-cache")
            // 重定向到首页
            router.push(getPathname({ href: "/", locale: "" }))
            break
          case "TOKEN_REFRESHED":
            // Token 自动刷新，更新用户信息
            setUser(session?.user || null)
            break
          case "USER_UPDATED":
            // 用户信息更新
            setUser(session?.user || null)
            break
        }
      }
    )

    // 清理订阅
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 登出函数
  const signOut = async () => {
    await supabase.auth.signOut()
    // onAuthStateChange 会处理状态更新和重定向
  }

  const refreshUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
