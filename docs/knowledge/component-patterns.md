# 组件模式知识文档

## 概述
本文档描述了博客平台中常用的组件模式，包括它们的结构、属性和用法示例。

## UI 组件（Radix UI + shadcn/ui）

### 基础模式
所有 UI 组件都遵循此模式：
- 位于 `components/ui/`
- 使用 TypeScript 接口定义属性
- 通过 class-variance-authority 支持变体
- 使用 Tailwind CSS 进行样式设置
- 包含来自 Radix UI 的无障碍功能

### 常见组件

#### Button
```tsx
import { Button } from "@/components/ui/button"

// 使用方式
<Button variant="default">默认</Button>
<Button variant="destructive">危险</Button>
<Button variant="outline">边框</Button>
<Button variant="secondary">次要</Button>
<Button variant="ghost">幽灵</Button>
<Button variant="link">链接</Button>
```

#### Input
```tsx
import { Input } from "@/components/ui/input"

// 使用方式
<Input 
  type="text" 
  placeholder="输入文本"
  value={value}
  onChange={handleChange}
/>
```

#### Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

// 使用方式
<Card>
  <CardHeader>
    <CardTitle>卡片标题</CardTitle>
  </CardHeader>
  <CardContent>
    卡片内容
  </CardContent>
</Card>
```

## 应用组件

### PostCard
显示博客文章摘要。

```tsx
interface PostCardProps {
  post: Post;
  showExcerpt?: boolean;
  showAuthor?: boolean;
  showCategory?: boolean;
  showDate?: boolean;
}

// 使用方式
<PostCard 
  post={post}
  showExcerpt={true}
  showAuthor={true}
  showCategory={true}
  showDate={true}
/>
```

**功能**：
- 响应式设计
- 点赞按钮与计数
- 分类徽章
- 作者头像和名称
- 发布日期
- 可点击卡片链接到完整文章

### WritePostForm
用于创建/编辑文章的富文本编辑器。

```tsx
interface WritePostFormProps {
  post?: Post;
  onSubmit: (data: PostFormData) => Promise<void>;
  isLoading?: boolean;
}

// 使用方式
<WritePostForm
  post={editingPost}
  onSubmit={handleSubmit}
  isLoading={isSubmitting}
/>
```

**功能**：
- 标题输入与 slug 自动生成
- 富文本编辑器（React Quill）
- 摘要文本区域
- 分类选择
- 发布切换
- 自动保存功能
- Zod 表单验证

### CommentSection
显示和管理文章评论。

```tsx
interface CommentSectionProps {
  postId: string;
  className?: string;
}

// 使用方式
<CommentSection postId={post.id} />
```

**功能**：
- 评论列表与作者头像
- 评论表单（仅限认证用户）
- 回复功能
- 删除评论（仅限作者）
- 时间戳格式化
- 加载状态

### LikeButton
文章点赞/取消点赞功能。

```tsx
interface LikeButtonProps {
  postId: string;
  initialLiked?: boolean;
  initialCount?: number;
}

// 使用方式
<LikeButton 
  postId={post.id}
  initialLiked={userLikedPost}
  initialCount={post.likes_count}
/>
```

**功能**：
- 切换点赞状态
- 动画爱心图标
- 点赞数显示
- 匿名用户禁用状态
- 乐观更新

## 自定义钩子

### usePosts
管理文章数据获取和缓存。

```tsx
function usePosts(options?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
}) {
  // 返回 posts、loading、error、pagination
}
```

### useAuth
处理认证状态。

```tsx
function useAuth() {
  // 返回 user、loading、login、logout 函数
}
```

### useFormWithValidation
使用 Zod 进行通用表单验证。

```tsx
function useFormWithValidation<T extends Record<string, any>>(
  schema: ZodType<T>,
  onSubmit: (data: T) => Promise<void>
) {
  // 返回表单状态、验证、提交处理程序
}
```

## 组件组织模式

### 布局组件

#### ClientLayout
客户端页面的提供者包装器。

```tsx
interface ClientLayoutProps {
  children: React.ReactNode;
  locale: string;
}

// 使用方式
<ClientLayout locale={locale}>
  <DashboardPage />
</ClientLayout>
```

#### DashboardLayout
内部导航板布局。

```tsx
interface DashboardLayoutProps {
  children: React.ReactNode;
  user: User;
}

// 使用方式
<DashboardLayout user={user}>
  <WritePage />
</DashboardLayout>
```

### 高阶组件

#### withAuth
保护需要认证的路由。

```tsx
function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthComponent(props: P) {
    // 认证逻辑
  }
}
```

## 样式模式

### 优先使用 CSS 工具类
```tsx
// 使用 clsx 组合类
const className = clsx(
  "基础类",
  condition && "条件类",
  additionalClasses
)

// 使用 tw-merge
const mergedClasses = twMerge(
  "基础类",
  "覆盖类"
)
```

### 响应式设计
```tsx
// Tailwind 响应式工具
<div className="w-full sm:w-1/2 md:w-1/3 lg:w-1/4">
  响应式网格项
</div>
```

## 性能模式

### 懒加载
```tsx
import dynamic from 'next/dynamic'

const LazyComponent = dynamic(() => import('./Component'), {
  loading: () => <div>加载中...</div>,
  ssr: false
})
```

### 记忆化
```tsx
const MemoizedComponent = React.memo(Component, (prevProps, nextProps) => {
  return prevProps.id === nextProps.id
})
```

## 错误边界

### ErrorBoundary
```tsx
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  // 错误边界实现
}
```

## 最佳实践

1. **属性接口**：始终为组件属性定义 TypeScript 接口
2. **组件大小**：保持组件小巧且专注（200 行以下）
3. **职责**：单一职责原则 - 每个组件一个任务
4. **测试**：组件应易于测试
5. **无障碍**：遵循 WCAG 指南
6. **性能**：在适当的地方使用记忆化和懒加载
7. **一致性**：遵循既定的命名和样式约定