'use client'

let csrfRequest: Promise<string> | null = null

function readCSRFCookie() {
  return document.cookie
    .split('; ')
    .find(cookie => cookie.startsWith('csrf_token='))
    ?.slice('csrf_token='.length)
}

async function requestCSRFToken(forceRefresh = false): Promise<string> {
  const response = await fetch(forceRefresh ? '/api/csrf?refresh=1' : '/api/csrf', {
    credentials: 'include',
    cache: 'no-store',
  })
  if (!response.ok) throw new Error('CSRF token initialization failed')

  const { token } = await response.json()
  ;(window as Window & { csrfToken?: string }).csrfToken = token
  return token as string
}

export function getClientCSRFToken(): Promise<string> {
  const existingToken = (window as Window & { csrfToken?: string }).csrfToken
  const cookieToken = readCSRFCookie()

  if (cookieToken) {
    if (existingToken !== cookieToken) {
      ;(window as Window & { csrfToken?: string }).csrfToken = cookieToken
    }
    return Promise.resolve(cookieToken)
  }

  if (!csrfRequest) {
    csrfRequest = requestCSRFToken().finally(() => {
      // Only deduplicate concurrent requests. Never retain an expired token promise.
      queueMicrotask(() => {
        csrfRequest = null
      })
    })
  }

  return csrfRequest
}

export async function refreshClientCSRFToken(): Promise<string> {
  csrfRequest = null
  delete (window as Window & { csrfToken?: string }).csrfToken
  return requestCSRFToken(true)
}

export async function fetchWithCSRF(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const send = async (token: string) => {
    const headers = new Headers(init.headers)
    headers.set('X-CSRF-Token', token)
    return fetch(input, { ...init, headers })
  }

  let response = await send(await getClientCSRFToken())
  if (response.status === 403 && response.headers.get('X-CSRF-Error') === 'token_mismatch') {
    response = await send(await refreshClientCSRFToken())
  }

  return response
}
