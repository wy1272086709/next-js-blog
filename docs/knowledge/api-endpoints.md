# API 端点知识文档

## 概述
本文档描述了博客平台中的所有 API 端点，包括其用途、请求/响应格式以及认证要求。

## 认证
所有受保护的端点都需要：
- 在 `Authorization` 头中包含有效的 Supabase JWT 令牌：`Bearer <token>`
- 写操作必须用户已认证

## 文章管理端点

### 获取所有文章
```http
GET /api/posts
```

**描述**：获取分页的文章列表  
**查询参数**：
- `page` (number)：页码（默认：1）
- `limit` (number)：每页项目数（默认：10）
- `category` (string)：按分类筛选
- `search` (string)：在标题和内容中搜索

**响应**：
```json
{
  "posts": [
    {
      "id": "uuid",
      "title": "文章标题",
      "slug": "文章-slug",
      "content": "文章内容...",
      "excerpt": "简短摘要...",
      "published": true,
      "published_at": "2024-01-01T00:00:00Z",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "author_id": "用户-uuid",
      "category_id": "分类-uuid",
      "category": {
        "id": "分类-uuid",
        "name": "分类名称",
        "slug": "分类-slug"
      },
      "author": {
        "id": "用户-uuid",
        "username": "用户名",
        "full_name": "全名"
      },
      "likes_count": 42,
      "comments_count": 5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### 获取单篇文章
```http
GET /api/posts/[id]
```

**描述**：通过 ID 获取单篇文章  
**路径参数**：
- `id`：文章 UUID

**响应**：单个文章对象（与上述相同结构）

### 创建文章
```http
POST /api/posts
```

**描述**：创建新文章  
**头部**：`Authorization: Bearer <token>`

**请求体**：
```json
{
  "title": "新文章标题",
  "content": "文章内容...",
  "excerpt": "简短摘要...",
  "published": false,
  "category_id": "分类-uuid"
}
```

**响应**：创建的文章对象，状态码 201

### 更新文章
```http
PUT /api/posts/[id]
```

**描述**：更新现有文章  
**头部**：`Authorization: Bearer <token>`  
**路径参数**：`id` - 文章 UUID

**请求体**：与创建相同（所有字段可选）

**响应**：更新后的文章对象

### 删除文章
```http
DELETE /api/posts/[id]
```

**描述**：删除文章  
**头部**：`Authorization: Bearer <token>`  
**路径参数**：`id` - 文章 UUID

**响应**：204 无内容

## 点赞管理端点

### 点赞文章
```http
POST /api/posts/[id]/like
```

**描述**：添加或移除文章点赞  
**头部**：`Authorization: Bearer <token>`  
**路径参数**：`id` - 文章 UUID

**响应**：点赞状态
```json
{
  "liked": true,
  "likes_count": 42
}
```

## 评论管理端点

### 获取评论
```http
GET /api/posts/[id]/comments
```

**描述**：获取文章的评论  
**路径参数**：`id` - 文章 UUID

**响应**：
```json
{
  "comments": [
    {
      "id": "评论-uuid",
      "content": "评论内容",
      "created_at": "2024-01-01T00:00:00Z",
      "author": {
        "id": "用户-uuid",
        "username": "用户名",
        "full_name": "全名"
      }
    }
  ]
}
```

### 创建评论
```http
POST /api/posts/[id]/comments
```

**描述**：向文章添加评论  
**头部**：`Authorization: Bearer <token>`  
**路径参数**：`id` - 文章 UUID

**请求体**：
```json
{
  "content": "评论内容"
}
```

**响应**：创建的评论对象

## 错误响应

所有端点都返回适当的 HTTP 状态码：
- `200 OK`：成功的 GET 请求
- `201 Created`：成功的 POST 请求
- `204 No Content`：成功的 DELETE 请求
- `400 Bad Request`：无效的请求数据
- `401 Unauthorized`：缺少或无效的令牌
- `403 Forbidden`：用户缺少权限
- `404 Not Found`：资源未找到
- `500 Internal Server Error`：服务器错误

错误响应格式：
```json
{
  "error": {
    "message": "错误描述",
    "code": "错误代码"
  }
}
```