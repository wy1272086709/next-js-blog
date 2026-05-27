"use client"

import { useAuthWithListener } from "@/hooks/use-auth-listener"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslations } from "next-intl"
import { useRouter, getPathname } from "@/i18n/navigation"

export function AuthExample() {
  const { user, loading, signOut } = useAuthWithListener()
  const router = useRouter()
  const t = useTranslations("AuthExample")

  // 处理认证状态变化
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>{t("pleaseLogin")}</CardTitle>
            <CardDescription>{t("loginDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push(getPathname({ href: "/auth/login", locale: "" }))}
              className="w-full"
            >
              {t("goToLogin")}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("welcomeBack", { username: user.email! })}</CardTitle>
          <CardDescription>{t("userStatus")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>{t("email")}:</strong>
              <p>{user.email}</p>
            </div>
            <div>
              <strong>{t("authTime")}:</strong>
              <p>
                {user.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleString()
                  : t("neverSignedIn")
                }
              </p>
            </div>
          </div>

          <Button
            onClick={async () => {
              try {
                await signOut()
                const { toast } = require("@/components/ui/use-toast")
                toast({
                  title: t("signedOut"),
                })
              } catch (error) {
                const { toast } = require("@/components/ui/use-toast")
                toast({
                  title: t("signOutError"),
                  variant: "destructive",
                })
              }
            }}
            variant="outline"
            className="w-full"
          >
            {t("signOut")}
          </Button>

          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>✨ 自动认证监听已启用</strong>
            </p>
            <p className="text-xs text-blue-600 mt-1">
              • Token 过期会自动提醒<br/>
              • API 错误会自动处理<br/>
              • 每 5 分钟检查一次状态
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}