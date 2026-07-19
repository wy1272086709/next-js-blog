'use client'

let csrfRequest: Promise<string> | null = null

export function getClientCSRFToken(): Promise<string> {
  const existingToken = (window as Window & { csrfToken?: string }).csrfToken
  const cookieToken = document.cookie
    .split('; ')
    .find(cookie => cookie.startsWith('csrf_token='))
    ?.slice('csrf_token='.length)

  if (cookieToken) {
    if (existingToken !== cookieToken) {
      ;(window as Window & { csrfToken?: string }).csrfToken = cookieToken
    }
    return Promise.resolve(cookieToken)
  }

  if (csrfRequest) return csrfRequest

  if (!csrfRequest) {
    csrfRequest = fetch('/api/csrf', { credentials: 'include' })
      .then(async response => {
        if (!response.ok) throw new Error('CSRF token initialization failed')
        const { token } = await response.json()
        ;(window as Window & { csrfToken?: string }).csrfToken = token
        return token as string
      })
      .catch(error => {
        csrfRequest = null
        throw error
      })
  }

  return csrfRequest
}
