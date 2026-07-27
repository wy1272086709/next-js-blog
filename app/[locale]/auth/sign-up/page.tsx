"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { Link, useRouter, getPathname } from "@/i18n/navigation"
import { getClientCSRFToken } from "@/lib/csrf/client"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [username, setUsername] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const t = useTranslations("Auth")

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"))
      setIsLoading(false)
      return
    }
    try {
      const csrfToken = await getClientCSRFToken()
      const response = await fetch("/api/auth/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
        body: JSON.stringify({ email, password, username }),
      })
      if (!response.ok) throw new Error((await response.json()).error)
      router.push(getPathname({ href: "/auth/sign-up-success", locale: "" } ))
    } catch {
      setError(t("signUpError"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-muted/30">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t("signUp")}</CardTitle>
            <CardDescription>{t("signUpDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">{t("username")}</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder={t("usernamePlaceholder")}
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">{t("email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">{t("password")}</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t("signingUp") : t("signUp")}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                {t("hasAccount")}{" "}
                <Link href={getPathname({ href: "/auth/login", locale: "" })} className="underline underline-offset-4 hover:text-primary">
                  {t("signInNow")}
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
