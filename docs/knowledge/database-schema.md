# 数据库架构知识文档

## 概述
本文档描述了博客平台使用的 Supabase 数据库架构，包括表结构、关系和重要索引。

## 表结构

### 1. profiles

存储与 auth.users 关联的用户配置信息。

```sql
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  bio text,
  website text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**索引**：
- `profiles_username_idx` 在 username 上，用于快速用户名查找

**使用**：始终通过 Supabase auth.user 关联访问。

### 2. categories

博客文章分类。

```sql
CREATE TABLE public.categories (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**索引**：
- `categories_slug_idx` 在 slug 上，用于 URL 查找的分类

### 3. posts

博客文章内容。

```sql
CREATE TABLE public.posts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text,
  excerpt text,
  published boolean DEFAULT false,
  published_at timestamp with time zone,
  author_id uuid REFERENCES public.profiles NOT NULL,
  category_id uuid REFERENCES public.categories,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**索引**：
- `posts_author_id_idx` 在 author_id 上，用于用户的文章
- `posts_published_at_idx` 在 published_at 上，用于已发布文章排序
- `posts_category_id_idx` 在 category_id 上，用于分类筛选

### 4. comments

文章评论。

```sql
CREATE TABLE public.comments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  content text NOT NULL,
  post_id uuid REFERENCES public.posts NOT NULL,
  author_id uuid REFERENCES public.profiles NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

**索引**：
- `comments_post_id_idx` 在 post_id 上，用于文章评论
- `comments_author_id_idx` 在 author_id 上，用于用户的评论
- `comments_created_at_idx` 在 created_at 上，用于评论排序

### 5. likes

文章点赞记录（包含用户追踪）。

```sql
CREATE TABLE public.likes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id uuid REFERENCES public.posts NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(post_id, user_id) -- 防止重复点赞
);
```

**索引**：
- `likes_post_id_idx` 在 post_id 上，用于点赞统计
- `likes_user_id_idx` 在 user_id 上，用于用户的点赞文章
- 唯一约束防止用户对同一文章重复点赞

## 表关系

```
auth.users
    |
    |--- profiles (1:1)
         |
         |--- posts (1:N)
              |--- comments (N:1)
              |--- likes (N:1 categories)
                   |
                   |--- categories (1:N)
```

## 常见查询

### 获取用户的文章及计数
```sql
SELECT 
  p.*,
  c.name as category_name,
  c.slug as category_slug,
  pr.username as author_username,
  pr.full_name as author_full_name,
  COUNT(l.id) as likes_count,
  COUNT(cmt.id) as comments_count
FROM posts p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN profiles pr ON p.author_id = pr.id
LEFT JOIN likes l ON p.id = l.post_id
LEFT JOIN comments cmt ON p.id = cmt.post_id
WHERE p.author_id = :userId
GROUP BY p.id, c.name, c.slug, pr.username, pr.full_name
ORDER BY p.updated_at DESC;
```

### 获取文章及其所有相关数据
```sql
SELECT 
  p.*,
  c.name as category_name,
  c.slug as category_slug,
  pr.username as author_username,
  pr.full_name as author_full_name,
  COUNT(l.id) as likes_count,
  COUNT(cmt.id) as comments_count
FROM posts p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN profiles pr ON p.author_id = pr.id
LEFT JOIN likes l ON p.id = l.post_id
LEFT JOIN comments cmt ON p.id = cmt.post_id
WHERE p.id = :postId
GROUP BY p.id, c.name, c.slug, pr.username, pr.full_name;
```

### 获取热门文章（按点赞数）
```sql
SELECT 
  p.*,
  c.name as category_name,
  COUNT(l.id) as likes_count
FROM posts p
JOIN likes l ON p.id = l.post_id
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.published = true
GROUP BY p.id, c.name
ORDER BY likes_count DESC
LIMIT 10;
```

## 数据迁移说明

1. **初始设置**：通过 Supabase 迁移创建表
2. **Auth 集成**：`auth.users` 由 Supabase Auth 管理
3. **UUID**：所有 ID 使用 UUID 以获得更好的安全性和可扩展性
4. **时间戳**：所有时间戳字段使用 `timestamp with time zone`
5. **软删除**：当前在应用层实现（published 标志）

## 安全考虑

- 行级安全 (RLS) 在所有表上启用
- 用户只能查看/修改自己的数据
- 公开文章可被认证用户查看
- 草稿文章仅对作者可见
- 评论仅在已发布的文章上可见