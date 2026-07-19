'use client'

import { useEffect } from 'react'
import { getClientCSRFToken } from '@/lib/csrf/client'

interface ClientCSRFProviderProps {
  children: React.ReactNode
}

export function ClientCSRFProvider({ children }: ClientCSRFProviderProps) {
  useEffect(() => {
    getClientCSRFToken().catch(error => {
      console.error('Failed to fetch CSRF token:', error)
    })
  }, [])

  return <>{children}</>
}
