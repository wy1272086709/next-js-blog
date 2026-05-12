'use client'

import React, { useEffect, useState } from 'react'

interface CSRFFormProps {
  action: string
  method?: 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  children: React.ReactNode
  className?: string
  onSubmit?: (e: React.FormEvent) => void
}

export function CSRFForm({
  action,
  method = 'POST',
  children,
  className,
  onSubmit
}: CSRFFormProps) {
  const [csrfToken, setCSRFToken] = useState<string>('')

  useEffect(() => {
    // 从全局变量获取 CSRF token
    setCSRFToken(window.csrfToken || '')
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
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