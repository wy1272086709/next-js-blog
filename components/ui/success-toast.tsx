"use client"

import { CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ClientOnly } from './client-only'

interface SuccessToastProps {
  message: string
  type?: 'success' | 'error'
  onClose?: () => void
  duration?: number
}

export function SuccessToast({
  message,
  type = 'success',
  onClose,
  duration = 3000,
}: SuccessToastProps) {
  // 使用 ClientOnly 包装器确保只在客户端渲染
  return (
    <ClientOnly fallback={null}>
      <div className={cn(
        "fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg border p-4 shadow-lg transition-all duration-300",
        type === 'success'
          ? "bg-green-50 border-green-200 text-green-800"
          : "bg-red-50 border-red-200 text-red-800"
      )}>
        {type === 'success' ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          <XCircle className="h-5 w-5" />
        )}
        <span className="font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 hover:opacity-70"
        >
          <XCircle className="h-4 w-4" />
        </button>
      </div>
    </ClientOnly>
  )
}