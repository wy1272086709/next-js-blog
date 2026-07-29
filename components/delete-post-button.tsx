"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { ClientOnly } from "@/components/ui/client-only"
import { deletePost } from "@/app/actions/post-actions"

export function DeletePostButton({ postId }: { postId: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const t = useTranslations("DeletePostButton")

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      await deletePost(postId)
    } catch (error) {
      console.error("删除失败:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // 使用 ClientOnly 包装器确保只在客户端渲染
  return (
    <ClientOnly fallback={null}>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">{t("delete")}</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isLoading ? t("deleting") : t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ClientOnly>
  )
}
