"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { useTranslations } from "next-intl"

interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
  bio: string | null
}

export function ProfileForm({ user, profile }: { user: User; profile: Profile | null }) {
  const t = useTranslations("ProfileForm")
  const [username, setUsername] = useState(profile?.username || user.user_metadata?.username || "")
  const [bio, setBio] = useState(profile?.bio || "")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const supabase = createClient()

    try {
      // 更新或插入 profile
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        username,
        bio,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      // 更新 user metadata
      await supabase.auth.updateUser({
        data: { username },
      })

      setMessage({ type: "success", text: t("saved") })
      router.refresh()
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : t("updateFailed") })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input id="email" value={user.email || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">{t("emailReadonly")}</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="username">{t("username")}</Label>
            <Input
              id="username"
              placeholder={t("usernamePlaceholder")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bio">{t("bio")}</Label>
            <Textarea
              id="bio"
              placeholder={t("bioPlaceholder")}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
            />
          </div>

          {message && (
            <p className={`text-sm ${message.type === "success" ? "text-green-600" : "text-destructive"}`}>
              {message.text}
            </p>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? t("saving") : t("saveChanges")}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
