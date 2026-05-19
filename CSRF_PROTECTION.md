# CSRF Protection Implementation

## Overview

This project implements CSRF (Cross-Site Request Forgery) protection using the following approach:

1. **Server-generated tokens**: Random UUID tokens are generated on the server
2. **Cookie storage**: Tokens are stored in both HTTP-only cookies and user metadata in Supabase
3. **Client-side availability**: Tokens are made available to client components via `window.csrfToken`
4. **Form integration**: The `CSRFForm` component automatically includes the CSRF token in forms

## Architecture

### Components

1. **`/app/api/csrf/route.ts`** - API route that generates and sets CSRF tokens
2. **`/components/client-csrf-provider.tsx`** - Client component that ensures CSRF token is available
3. **`/components/csrf-form.tsx`** - Enhanced form component that includes CSRF tokens
4. **`/lib/csrf/utils.ts`** - Utility functions for CSRF token management

### Flow

1. Server-side initialization (in layout)
   - Fetches `/api/csrf` to generate and set a token
   - Token is stored in both cookie and Supabase user metadata

2. Client-side availability
   - `ClientCSRFProvider` ensures `window.csrfToken` is set
   - Token is accessible in client components

3. Form submission
   - `CSRFForm` automatically includes the token
   - Server validates token against both cookie and session

## Usage

### In Forms

```tsx
import { CSRFForm } from '@/components/csrf-form'

<CSRFForm action="/api/submit" method="POST">
  <input type="text" name="content" />
  <button type="submit">Submit</button>
</CSRFForm>
```

### Manual CSRF Usage

```tsx
// In client components
const token = window.csrfToken

// In API routes
const cookieToken = req.cookies.get('csrf_token')?.value
const sessionToken = session?.user?.user_metadata?.csrf_token
```

## Security Features

1. **Double validation**: Tokens must match both cookie and session
2. **Short-lived tokens**: Cookies expire after 5 minutes (300 seconds)
3. **Secure flags**: Cookies use secure flag in production
4. **SameSite protection**: Lax SameSite policy for CSRF protection

## Testing

Run the test script:

```bash
node test-csrf.js
```

## Troubleshooting

### "Cookies can only be modified in a Server Action or Route Handler"

This error occurs when trying to set cookies outside of server contexts. The fix is to:
1. Move cookie-setting code to Server Actions or API routes
2. Use the provided `/api/csrf` endpoint for token generation
3. Let the framework handle cookie setting via response headers

### Token Not Available on Client

Ensure:
1. `ClientCSRFProvider` is wrapping your components
2. The token is being set on the server first
3. Cookies are being sent with requests (`credentials: 'include'`)

## Future Improvements

1. Token refresh mechanism
2. Integration with form validation
3. Customizable token expiration
4. IP-based binding for additional security