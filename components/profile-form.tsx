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

interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
  bio: string | null
}

export function ProfileForm({ user, profile }: { user: User; profile: Profile | null }) {
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

      setMessage({ type: "success", text: "资料已更新" })
      router.refresh()
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "更新失败" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>个人资料</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" value={user.email || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">邮箱不可修改</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              placeholder="输入您的用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="bio">个人简介</Label>
            <Textarea
              id="bio"
              placeholder="介绍一下自己..."
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
            {isLoading ? "保存中..." : "保存更改"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
