'use client'

import { useEffect } from 'react'

interface ClientCSRFProviderProps {
  children: React.ReactNode
}

export function ClientCSRFProvider({ children }: ClientCSRFProviderProps) {
  useEffect(() => {
    // Initialize CSRF token if it doesn't exist
    const initializeCSRF = async () => {
      if (typeof window !== 'undefined' && !(window as any).csrfToken) {
        try {
          const response = await fetch('/api/csrf', {
            method: 'GET',
            credentials: 'include'
          })

          if (response.ok) {
            const { token } = await response.json();
            (window as any).csrfToken = token
          }
        } catch (error) {
          console.error('Failed to fetch CSRF token:', error)
        }
      }
    }

    initializeCSRF()
  }, [])

  return <>{children}</>
}