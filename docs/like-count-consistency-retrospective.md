# 文章列表与详情点赞数不一致问题复盘

## 问题现象

同一篇文章在不同页面显示了不同的点赞数：

- 文章列表卡片显示 `0`。
- 进入文章详情后显示 `1` 或其他数量。
- 在详情页完成点赞后，返回列表仍可能显示旧值。

这不是单一的前端状态问题，而是数据源、数据库权限、服务端缓存和客户端缓存共同造成的不一致。

## 涉及模块

- 公开文章查询：`lib/data/public-posts.ts`
- 用户文章查询：`lib/api/posts.ts`
- 个人文章列表：`app/[locale]/dashboard/posts/page.tsx`
- 点赞 API：`app/api/posts/[id]/like/route.ts`
- 列表卡片：`components/post-card.tsx`
- 详情点赞按钮：`components/like-button.tsx`
- 点赞 React Query Hook：`hooks/use-like-mutation.ts`
- RLS 修复迁移：`supabase/migrations/20260722000000_allow_public_post_like_counts.sql`

## 根因分析

### 1. 列表和详情读取了不同的数据表

旧的列表查询使用：

```sql
likes(count)
```

详情页点赞 API 使用：

```ts
supabase.from("post_likes")
```

这两个表不是同一个数据源。用户在详情页产生的新点赞写入 `post_likes`，列表继续统计旧的 `likes`，因此列表长期显示错误数量。

修复后，列表使用关系别名保持前端字段结构不变：

```sql
likes:post_likes(count)
```

这样数据库实际查询 `post_likes`，组件仍可以读取 `post.likes`。

### 2. RLS 让“总点赞数”变成了“我的点赞数”

`post_likes` 原有 SELECT 策略为：

```sql
FOR SELECT USING (auth.uid() = user_id)
```

这意味着当前用户只能查询自己的点赞记录，匿名用户一条也看不到。对文章进行 `count` 时，结果最多是当前用户自己的记录数量，而不是真实总点赞数。

点赞数量属于公开文章元数据，因此 SELECT 策略调整为：

```sql
CREATE POLICY "Anyone can view post likes" ON post_likes
  FOR SELECT USING (true);
```

这不会开放写入权限。INSERT 和 DELETE 仍由已有策略限制为 `auth.uid() = user_id`。

## 为什么不能使用“旧数量加一”

旧接口在执行点赞前读取数量，然后按操作计算：

```ts
const count = liked ? previousCount + 1 : previousCount - 1
```

这种方式在以下情况会返回错误结果：

- 相同请求被重复发送。
- `upsert` 因唯一约束忽略了重复点赞，但代码仍然加一。
- 多个用户同时点赞，读取到的 `previousCount` 已经过期。
- 取消一个实际不存在的点赞，代码仍然减一。

修复后的顺序是：

```text
校验用户
  -> 写入或删除点赞记录
  -> 从 post_likes 重新 COUNT
  -> 返回数据库真实数量
```

数据库中的唯一约束负责防止重复点赞：

```sql
UNIQUE(post_id, user_id)
```

API 返回的数量来自操作完成后的数据库状态，不再自行推算。

## 服务端缓存问题

公开文章列表使用 `unstable_cache`，缓存时间为 5 分钟：

```ts
{ revalidate: 300, tags: ["posts", "categories"] }
```

即使数据库已经更新，列表查询仍可能返回缓存中的旧点赞数。因此点赞成功后需要主动失效文章标签：

```ts
revalidateTag("posts", { expire: 0 })
```

下一次服务端获取文章列表时会重新查询数据库。

## 客户端即时一致性

只依赖服务端缓存失效仍不够。用户从详情页返回列表时，Next.js 客户端路由缓存可能复用之前的页面结果。

列表卡片现在使用与详情点赞按钮相同的 React Query Key：

```ts
["post", postId, "likes"]
```

列表的服务端数量作为初始值，卡片挂载后请求同一个点赞 API 进行校准：

```ts
useQuery({
  queryKey: ["post", post.id, "likes"],
  initialData: { count: initialLikeCount, liked: false },
  initialDataUpdatedAt: 0,
})
```

`initialDataUpdatedAt: 0` 表示初始值需要重新验证，而不是在 5 分钟 `staleTime` 内被当作最新数据。

由于详情按钮和列表卡片共享 Query Key，详情页点赞成功后写入 React Query 缓存的数据也能被列表复用。

## 最终数据流

```text
文章列表服务端查询
  -> post_likes(count) 提供首屏数量
  -> PostCard 使用相同点赞 API 重新校准

详情页点赞
  -> POST /api/posts/:id/like
  -> 写入或删除 post_likes
  -> 数据库重新 COUNT
  -> 更新 React Query 共享缓存
  -> 失效 posts 服务端缓存标签
```

列表、详情和点赞响应最终都以 `post_likes` 为唯一数据源。

## 迁移要求

需要在对应 Supabase 项目执行：

```text
supabase/migrations/20260722000000_allow_public_post_like_counts.sql
```

如果迁移没有执行：

- 登录用户可能只能看到自己是否点过赞。
- 匿名用户可能始终看到 `0`。
- 列表和详情即使使用同一张表，也无法得到真实总数。

## 验证清单

1. 匿名访问列表和详情，两处点赞总数一致。
2. 登录用户点赞后，详情数字立即加一。
3. 返回文章列表，无需等待 5 分钟即可看到新数量。
4. 重复发送点赞请求不会重复增加数量。
5. 取消点赞后，数据库计数和两个页面同步减一。
6. 两个用户同时点赞后，总数等于 `post_likes` 的实际记录数。
7. 用户只能插入和删除自己的点赞记录。
8. `npm run build` 完成生产构建。

## 经验总结

- 同一个业务指标必须有唯一数据源，不能让新旧表长期并存于不同查询入口。
- RLS 不只影响“能否读取”，也会改变聚合函数看到的数据范围。
- 服务端最终数量应从写入后的数据库状态重新计算，不能依赖应用层 `+1/-1`。
- 数据库缓存、路由缓存和客户端查询缓存是三个不同层级，需要分别处理。
- React Query Key 是前端数据契约的一部分；列表和详情共享业务数据时应共享 Key。
- 数据修复完成后，要分别使用匿名用户、已登录用户和多用户场景验证。
