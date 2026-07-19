export function generateCSRFToken() {
  return crypto.randomUUID()
}
