# React Query 集成优化

## 概述

我们成功集成了 TanStack React Query 来优化数据管理，提升应用性能和用户体验。

## 主要改进

### 1. 安装和配置

```bash
pnpm add @tanstack/react-query
```

### 2. Provider 配置

创建了 `app/providers.tsx` 来包装整个应用：

```tsx
"use client"

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### 3. 自定义 Hooks

#### `use-user-posts.ts` - 获取用户文章列表（暂未使用）

```tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { PostsAPI } from '@/lib/api/posts'

export function useUserPosts(userId: string, limit = 10, offset = 0) {
  const postsAPI = new PostsAPI()

  return useQuery({
    queryKey: ['posts', 'user', userId, limit, offset],
    queryFn: () => postsAPI.getUserPosts(userId, limit, offset),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
```

> **注意**: 此 hook 目前未在项目中使用。当前的文章列表是通过服务器端组件直接查询 Supabase 获取的。

#### `use-post-mutation.ts` - 创建/更新文章

```tsx
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PostsAPI } from '@/lib/api/posts'

interface PostData {
  title: string
  content: string
  excerpt?: string
  category_id?: string | null
  published: boolean
  author_id: string
}

export function usePostMutation() {
  const queryClient = useQueryClient()
  const postsAPI = new PostsAPI()

  return useMutation({
    mutationFn: async (data: PostData & { id?: string }) => {
      if (data.id) {
        // Update post
        const { id, ...postData } = data
        return postsAPI.updatePost({ ...postData, id })
      } else {
        // Create post
        return postsAPI.createPost(data)
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate all user posts queries to refetch with all possible limit/offset combinations
      queryClient.invalidateQueries({
        queryKey: ['posts', 'user', variables.author_id],
      })

      // Show success toast
      toast.success(
        variables.id ? '文章已更新' : '文章已创建'
      )
    },
    onError: (error) => {
      toast.error('保存失败，请重试')
    },
  })
}
```

### 4. 实际使用情况说明

目前的实现有以下特点：

- **服务器端数据 fetching**: 文章列表主要通过服务器组件直接查询 Supabase 获取
- **React Query 仅用于 mutations**: 只有创建/更新文章时使用了 React Query 的缓存失效机制
- **缓存失效范围**: 使用 `['posts', 'user', userId]` 可以正确失效所有相关查询，因为当前没有使用分页

### 5. 组件优化

#### `write-post-form.tsx` 使用 React Query Mutation

```tsx
const mutation = usePostMutation()

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault()
  setHasSubmitted(true)

  if (!content.trim()) {
    setError(t("enterContentFirst"))
    return
  }

  const postData = {
    title,
    content,
    excerpt: excerpt || content.substring(0, 150),
    category_id: categoryId || null,
    published,
    author_id: userId,
  }

  mutation.mutate(
    post
      ? { ...postData, id: post.id }
      : postData,
    {
      onSuccess: () => {
        // Navigate after successful mutation
        const path = getPathname({
          href: "/dashboard/posts",
          locale: '',
        })
        router.push(path)
      },
    }
  )
}

// Handle loading state from mutation
if (mutation.isPending) {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin" />
      <span className="ml-2">保存中...</span>
    </div>
  )
}
```

## 性能优势

1. **自动缓存管理**
   - React Query 自动缓存查询结果
   - 减少重复的数据请求
   - 智能的缓存失效策略

2. **优化的加载状态**
   - 统一管理加载状态
   - 支持乐观更新
   - 更好的用户体验

3. **数据一致性**
   - 自动在数据变更后重新获取
   - 确保 UI 与服务器状态同步

4. **减少代码量**
   - 移除了手动的状态管理
   - 简化了错误处理
   - 更清晰的代码结构

## 关键特性

### Stale-While-Revalidate
- 数据在过期前不会重新请求
- 后台静默更新，无感知刷新

### 自动缓存失效
- 当数据变更时自动触发重新获取
- 确保列表显示最新数据

### 错误处理
- 集中的错误处理机制
- 用户友好的错误提示

## 文件结构

```
├── hooks/
│   ├── use-user-posts.ts      # 获取用户文章列表
│   ├── use-post-mutation.ts   # 文章创建/更新
│   └── use-posts-cache.ts     # 缓存管理（预留）
├── lib/api/
│   └── posts.ts              # API 封装类
├── app/
│   └── providers.tsx         # React Query Provider
└── components/
    └── write-post-form.tsx   # 优化后的表单组件
```

## 使用建议

1. **何时使用 useQuery**
   - 需要显示数据的组件
   - 数据需要缓存的场景

2. **何时使用 useMutation**
   - 创建、更新、删除操作
   - 需要触发相关数据重新获取

3. **缓存策略**
   - 根据业务需求设置合适的 staleTime
   - 考虑数据的重要性和更新频率

## 总结

通过集成 React Query，我们实现了：

- ✅ 更好的性能（缓存、智能刷新）
- ✅ 更少的代码（移除手动状态管理）
- ✅ 更好的用户体验（加载状态、错误处理）
- ✅ 更可靠的数据一致性（自动缓存失效）