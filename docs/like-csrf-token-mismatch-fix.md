# 点赞请求 CSRF Token 不一致问题修复说明

## 1. 问题现象

用户登录后点击文章点赞按钮，偶尔会收到 `403` 响应：

```json
{
  "error": "Invalid CSRF token"
}
```

这个问题通常出现在以下场景：

- 页面打开时间超过 CSRF Cookie 的有效期；
- Cookie 被刷新、清理或重新设置，但页面没有重新加载；
- 页面初始化期间有多个组件同时获取 CSRF token；
- 客户端内存中保留的 token 与浏览器当前 Cookie 不一致。

点赞 API 本身没有执行到业务逻辑。请求先在 `proxy.ts` 的 CSRF 校验阶段被拒绝，因此也不会写入 `post_likes` 表。

## 2. CSRF 校验方式

项目使用 Double Submit Cookie：

1. 浏览器自动在请求中携带 `csrf_token` Cookie；
2. 客户端读取相同 token，并主动写入 `X-CSRF-Token` Header；
3. `proxy.ts` 比较 Cookie 和 Header，只有两者存在且相等时才放行。

```text
Cookie: csrf_token=token-a
X-CSRF-Token: token-a
                    -> 校验通过

Cookie: csrf_token=token-b
X-CSRF-Token: token-a
                    -> 403 token_mismatch
```

Proxy 在拒绝请求时还会返回：

```http
X-CSRF-Error: token_mismatch
```

客户端可以据此区分 CSRF token 不一致和普通的业务 `403`。

## 3. 根本原因

旧版客户端使用模块级 `csrfRequest` 缓存 token 初始化 Promise，以合并并发请求。问题是成功完成的 Promise 也可能被长期保留。

CSRF Cookie 的有效期是 1 小时。当 Cookie 过期或服务器重新设置 Cookie 后，页面内存仍可能从已完成的 Promise 中获得旧 token：

```text
页面初始化：Cookie 和内存都是 token-a
       ↓
Cookie 过期或更新为 token-b
       ↓
点赞请求仍从缓存 Promise 得到 token-a
       ↓
Cookie=token-b，Header=token-a
       ↓
Proxy 返回 403
```

原点赞请求只获取一次 token 并发送一次请求。即使服务端明确返回 `token_mismatch`，客户端也不会恢复，只能等用户刷新页面或手动清理状态。

## 4. 修复方案

### 4.1 每次优先读取当前 Cookie

`lib/csrf/client.ts` 新增 `readCSRFCookie()`。`getClientCSRFToken()` 每次调用时都优先读取浏览器当前的 `csrf_token` Cookie，并同步更新 `window.csrfToken`。

这样 Cookie 发生变化后，后续写请求不会继续使用内存中的旧值。

### 4.2 初始化 Promise 只用于并发去重

`csrfRequest` 现在只合并同一时刻发生的初始化请求。请求结束后通过 `finally` 清空，不再把已完成 Promise 当作长期 token 缓存。

```typescript
csrfRequest = requestCSRFToken().finally(() => {
  queueMicrotask(() => {
    csrfRequest = null
  })
})
```

token 的事实来源是 Cookie，而不是模块内存。

### 4.3 支持强制刷新 Token

`GET /api/csrf?refresh=1` 会忽略旧 Cookie，生成新的随机 token，并把同一个值同时写入响应 JSON 和 `csrf_token` Cookie。

普通的 `GET /api/csrf` 仍优先复用已有 Cookie，避免并发初始化时反复生成不同 token。

### 4.4 封装带恢复能力的请求

`lib/csrf/client.ts` 新增 `fetchWithCSRF()`：

1. 获取当前 Cookie token；
2. 写入 `X-CSRF-Token` Header；
3. 发送业务请求；
4. 仅当响应是 `403` 且带有 `X-CSRF-Error: token_mismatch` 时，强制刷新 token；
5. 使用新 token 自动重试原请求一次。

只重试一次可以恢复 token 失效，同时避免配置错误或持续异常造成无限循环。

### 4.5 点赞请求统一使用封装

`hooks/use-like-mutation.ts` 中的点赞 POST 请求由手动拼接 Header 改为调用 `fetchWithCSRF()`：

```typescript
const response = await fetchWithCSRF(`/api/posts/${postId}/like`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ liked }),
})
```

点赞 hook 仍负责业务错误处理和乐观更新回滚，token 同步与重试由 CSRF 客户端统一负责。

## 5. 修复后的请求流程

```text
用户点击点赞
    ↓
读取当前 csrf_token Cookie
    ↓
设置 X-CSRF-Token 并发送 POST
    ↓
┌ 校验成功：进入点赞 API，更新数据库并返回结果
│
└ 403 + token_mismatch
    ↓
调用 /api/csrf?refresh=1
    ↓
生成新 token 并同步 Cookie
    ↓
携带新 Header 自动重试一次
```

## 6. 为什么不能对所有 403 都重试

`403` 也可能表示功能被关闭、权限不足或其他业务限制。对所有 `403` 刷新 token 并重试会掩盖真实错误，还可能重复发送业务请求。

因此自动恢复必须同时满足：

- HTTP 状态码为 `403`；
- 响应头 `X-CSRF-Error` 等于 `token_mismatch`。

由于第一次请求在 Proxy 阶段已经被拦截，没有进入点赞 Route Handler，所以重试不会造成第一次请求已经写库的重复点赞问题。数据库中的点赞记录仍应保留用户与文章的唯一约束，作为最终幂等保障。

## 7. 验证方法

### 正常请求

1. 登录后打开文章详情页；
2. 点击点赞和取消点赞；
3. 确认请求成功，计数和按钮状态与服务端响应一致；
4. 确认 POST 请求中的 Cookie token 与 `X-CSRF-Token` 相同。

### Token 不一致恢复

1. 保持文章页面打开；
2. 在浏览器开发者工具中删除或修改 `csrf_token` Cookie；
3. 点击点赞；
4. 确认首次不一致请求收到 `403` 和 `X-CSRF-Error: token_mismatch`；
5. 确认客户端调用 `/api/csrf?refresh=1`；
6. 确认原点赞请求只重试一次并成功；
7. 确认数据库只产生预期的一次状态变更。

### 非 CSRF 的 403

构造一个不带 `X-CSRF-Error: token_mismatch` 的 `403` 响应，确认客户端不会刷新 token，也不会自动重试。

## 8. 涉及文件

- `proxy.ts`：比较 Cookie 与 Header，并返回可识别的错误响应头；
- `app/api/csrf/route.ts`：复用或强制刷新 token；
- `lib/csrf/client.ts`：读取 Cookie、并发去重、刷新及单次重试；
- `hooks/use-like-mutation.ts`：点赞请求接入 `fetchWithCSRF()`。

