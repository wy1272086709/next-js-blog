# 点赞功能优化说明

## 问题现象

文章详情页点击点赞时，曾出现以下问题：

- Redis 连接异常后，按钮长时间处于加载状态；
- CSRF 校验失败，接口返回 `Invalid CSRF token`；
- 点击一次后出现两个 `like` 请求；
- 单个请求耗时约 1.7 至 2.5 秒。

## 本次改动

### 1. 移除点赞主链路中的 Redis

点赞 API 不再等待 Redis 查询、写入和断线重连，直接使用 Supabase 的 `post_likes` 表作为数据来源。

Redis 断线现在不会影响点赞。数据库负责保存最终状态，避免缓存计数与实际数据不一致。

### 2. 消除点击后的重复请求

原来 POST 点赞成功后，React Query 会立即让点赞查询失效，从而自动再发送一次 GET 请求。

现在 POST 返回点赞状态和计数后，前端直接更新本地缓存，不再额外请求 GET。

页面首次打开时仍会发送一次 GET，用来获取当前点赞数和当前用户的点赞状态；点击按钮时只发送一次 POST。

### 3. 优化 CSRF 校验

CSRF token 改为 Cookie 与请求头双提交校验：

- 页面初始化时获取一次 token；
- 多个组件共享同一个初始化 Promise，避免并发重复请求；
- Cookie 有效时，点击点赞直接复用 token；
- Cookie 过期或缺失时才重新请求 `/api/csrf`；
- 点赞 POST 在 `X-CSRF-Token` Header 中携带同一个 token。

CSRF API 不再读写 Supabase 用户 metadata，因此不需要等待远程鉴权，也不会因为 Session token 与 Cookie token 更新顺序不同而校验失败。

### 4. 减少 Supabase 网络往返

原点赞流程包含多次串行操作：

1. 中间件查询用户；
2. Route 再次查询用户；
3. 查询当前点赞状态；
4. 插入或删除点赞；
5. 重新统计点赞数。

优化后：

1. 中间件只负责校验 CSRF，不重复查询用户；
2. Route 负责一次可信的用户鉴权；
3. 前端提交明确的目标状态，服务端无需先查询当前状态；
4. 用户鉴权与点赞计数并行执行；
5. 服务端执行一次插入或删除并返回结果。

## 涉及文件

- `app/api/posts/[id]/like/route.ts`：简化点赞读写和数据库查询流程；
- `hooks/use-like-mutation.ts`：移除成功后的重复 GET，提交目标点赞状态；
- `app/api/csrf/route.ts`：生成并复用 Cookie token；
- `lib/csrf/client.ts`：共享客户端 token 和初始化请求；
- `components/client-csrf-provider.tsx`：统一使用 CSRF 客户端工具；
- `proxy.ts`：API 使用 Cookie 与 `X-CSRF-Token` Header 进行 CSRF 校验。

## 优化结果

本地开发环境测量结果：

| 请求 | 优化前 | 优化后 |
| --- | ---: | ---: |
| `/api/csrf` | 约 2.48 秒 | 约 0.18 秒 |
| 点赞 GET | 约 1.28 至 1.76 秒 | 约 0.74 至 0.89 秒 |

点击点赞后不再自动追加 GET 请求，Redis 连接异常也不会阻塞点赞操作。

以上数据来自本地开发服务器，只用于本次修改前后的相对比较。生产环境耗时还会受到部署区域、Supabase 区域和网络延迟影响。
