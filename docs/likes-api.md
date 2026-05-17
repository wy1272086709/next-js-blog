# 点赞功能 API 文档

## 概述

点赞功能使用 Supabase 数据库存储用户与文章之间的点赞关系。主要包含以下几个 API 端点。

## 数据库表结构

### post_likes 表
- `id`: 主键，UUID
- `post_id`: 文章 ID，关联到 posts 表
- `user_id`: 用户 ID，关联到 profiles 表
- `created_at`: 创建时间
- 唯一约束：`UNIQUE(post_id, user_id)`

## API 端点

### 1. 点赞/取消点赞操作

**端点**: `POST /api/posts/[id]/like`

**请求方式**: POST

**描述**: 对指定文章进行点赞或取消点赞操作

**请求体**: 无

**响应示例**:
```json
{
  "success": true,
  "liked": true,
  "count": 5
}
```

**错误响应**:
```json
{
  "error": "未授权"
}
```
状态码: 401

```json
{
  "error": "点赞失败"
}
```
状态码: 500

### 2. 获取点赞状态

**端点**: `GET /api/posts/[id]/like`

**请求方式**: GET

**描述**: 获取指定文章的点赞总数和当前用户是否已点赞

**查询参数**: 无

**响应示例**:
```json
{
  "count": 5,
  "hasLiked": true
}
```

### 3. 获取点赞用户列表

**端点**: `GET /api/posts/[id]/likes`

**请求方式**: GET

**描述**: 获取点赞指定文章的用户列表

**查询参数**: 无

**响应示例**:
```json
{
  "likes": [
    {
      "id": "uuid",
      "created_at": "2024-01-01T00:00:00Z",
      "user": {
        "id": "uuid",
        "username": "john_doe",
        "avatar_url": "https://example.com/avatar.jpg"
      }
    }
  ],
  "total": 5
}
```

## 客户端使用示例

### React 组件示例

```typescript
import { LikeButton } from "@/components/like-button"

function PostCard({ post }) {
  return (
    <div>
      <h2>{post.title}</h2>
      <LikeButton
        postId={post.id}
        initialLikeCount={post.like_count || 0}
        initialHasLiked={post.user_has_liked || false}
      />
    </div>
  )
}
```

### 服务器端获取点赞状态

```typescript
import { getPostLikes } from "@/lib/likes"

async function PostPage({ params }) {
  const { postId } = params
  const likes = await getPostLikes(postId)
  
  return (
    <div>
      {/* 渲染文章内容 */}
      <p>点赞数: {likes.count}</p>
      {/* 渲染点赞按钮 */}
    </div>
  )
}
```

### 使用 useQuery（如果使用 TanStack Query）

```typescript
import { useQuery } from "@tanstack/react-query"
import { getPostLikes } from "@/lib/likes"

function usePostLikes(postId: string) {
  return useQuery({
    queryKey: ["post-likes", postId],
    queryFn: () => getPostLikes(postId),
  })
}
```

## 安全性

- 使用 Supabase RLS (Row Level Security) 确保用户只能操作自己的点赞记录
- API 端点会验证用户身份，未登录用户会收到 401 错误
- 所有数据库操作都经过权限检查

## 注意事项

1. 确保在 Supabase 中已经运行了数据库迁移文件 `supabase/migrations/20240517000000_add_post_likes_tables.sql`
2. 前端组件使用乐观更新，提供更好的用户体验
3. API 返回的数据是实时查询的结果，确保数据的一致性