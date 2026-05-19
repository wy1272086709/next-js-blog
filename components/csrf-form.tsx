'use client'

import React, { useEffect, useState } from 'react'

interface CSRFFormProps {
  action: string
  method?: 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  children: React.ReactNode
  className?: string
  onSubmit?: (e: React.FormEvent) => void
  // 新增：从 session 获取 token 的选项
  useSessionToken?: boolean
}

export function CSRFForm({
  action,
  method = 'POST',
  children,
  className,
  onSubmit,
  useSessionToken = false
}: CSRFFormProps) {
  const [csrfToken, setCSRFToken] = useState<string>('')
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const initializeCSRFToken = async () => {
      if (typeof window === 'undefined') return

      try {
        // 如果使用 session token，从 API 获取
        if (useSessionToken) {
          const response = await fetch('/api/csrf', {
            method: 'GET',
            credentials: 'include'
          })

          if (response.ok) {
            const { token } = await response.json()
            setCSRFToken(token)
          }
        } else {
          // 默认从全局变量获取 CSRF token（从 cookie 来）
          setCSRFToken((window as any).csrfToken || '')
        }
      } catch (error) {
        console.error('Failed to initialize CSRF token:', error)
      } finally {
        setIsInitialized(true)
      }
    }

    initializeCSRFToken()
  }, [useSessionToken])

  const handleSubmit = (e: React.FormEvent) => {
    if (!isInitialized) {
      e.preventDefault()
      console.error('CSRF token is not initialized yet')
      return
    }

    if (!csrfToken) {
      e.preventDefault()
      console.error('CSRF token is missing')
      return
    }

    if (onSubmit) {
      onSubmit(e)
    }
  }

  return (
    <form
      action={action}
      method={method}
      className={className}
      onSubmit={handleSubmit}
    >
      <input
        type="hidden"
        name="csrf_token"
        value={csrfToken}
        readOnly
      />
      {children}
    </form>
  )
}