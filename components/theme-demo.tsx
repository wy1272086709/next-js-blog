"use client"

import { useEffect, useState } from "react"

// 检测系统主题偏好
export function useSystemTheme() {
  const [systemTheme, setSystemTheme] = useState<string | null>(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    setSystemTheme(mediaQuery.matches ? "dark" : "light")

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light")
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  return systemTheme
}

// 保存主题偏好到 localStorage
export function saveThemePreference(theme: string) {
  localStorage.setItem("theme", theme)
}

// 获取保存的主题偏好
export function getSavedThemePreference(): string | null {
  return localStorage.getItem("theme")
}

// 获取当前主题（保存的优先，其次是系统）
export function getCurrentTheme(savedTheme: string | null, systemTheme: string | null): string {
  return savedTheme || systemTheme || "light"
}