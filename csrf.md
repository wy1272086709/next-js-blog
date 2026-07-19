# 双 CSRF 防护机制实现详解

> 文档状态：本文最初记录的是 `Supabase Session metadata + Cookie + request body` 方案。该方案已经停止使用。当前实现为“双重提交 Cookie（Cookie + X-CSRF-Token Header）”。后半部分保留为历史设计记录，不代表当前代码。

## 当前实现（2026-07 更新）

### 1. 方案概述

当前方案只生成一个随机 CSRF token，但通过两个不同的请求位置提交：

1. 浏览器自动携带 `csrf_token` Cookie；
2. 前端 JavaScript 主动把相同值写入 `X-CSRF-Token` Header；
3. `proxy.ts` 对两个值进行本地比较。

这通常称为 Double Submit Cookie。这里的“双 Token”是同一个随机值的两份提交副本，并不是两个独立生成、分别存储的秘密 Token。

```text
GET /api/csrf
  -> 生成或复用 csrf_token
  -> Set-Cookie: csrf_token=<token>
  -> { token: <token> }

POST /api/...
  -> Cookie: csrf_token=<token>             浏览器自动发送
  -> X-CSRF-Token: <token>                  前端主动设置
  -> proxy.ts 比较两者，一致后放行
```

### 2. Token 生成与客户端复用

`app/api/csrf/route.ts` 优先复用现有 Cookie。Cookie 不存在时，使用 `crypto.randomUUID()` 生成新值：

```typescript
export async function GET(request: NextRequest) {
  const token = request.cookies.get('csrf_token')?.value ?? generateCSRFToken()
  const response = NextResponse.json({ token })

  response.cookies.set('csrf_token', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60,
    path: '/',
  })

  return response
}
```

`lib/csrf/client.ts` 负责客户端复用：

- Cookie 已存在时直接使用，不额外请求接口；
- 页面首次初始化时共享同一个 Promise，避免 React Strict Mode 或多个组件产生重复请求；
- Cookie 过期或不存在时，重新调用 `/api/csrf`。

### 3. 前端请求方式

受保护的写请求必须在 Header 中提交 token。业务 JSON 不再包含 `csrf_token`：

```typescript
const csrfToken = await getClientCSRFToken()

await fetch('/api/posts/123/like', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify({ liked: true }),
})
```

使用 Header 的原因：

- Proxy 不需要 `request.clone()`；
- Proxy 不需要解析 JSON、FormData 或文件上传内容；
- Route Handler 可以独立读取原始请求体；
- CSRF 校验和业务字段保持分离。

### 4. Proxy 校验

当前 `proxy.ts` 保护 `POST`、`PUT`、`PATCH`、`DELETE` API 请求：

```typescript
const cookieToken = request.cookies.get('csrf_token')?.value
const headerToken = request.headers.get('x-csrf-token')

if (!cookieToken || !headerToken || cookieToken !== headerToken) {
  return NextResponse.json(
    { error: 'Invalid CSRF token' },
    { status: 403, headers: { 'X-CSRF-Error': 'token_mismatch' } },
  )
}
```

以下端点不执行该校验：

- `/api/auth/*`；
- `/api/public/*`；
- `/api/csrf`。

CSRF 校验只证明请求方能够读取本站 token，不证明用户已经登录。需要登录的 Route Handler 仍必须调用 Supabase `getUser()` 完成身份验证。

### 5. 为什么替换旧方案

旧方案把 token 写入 `user_metadata.csrf_token`，校验时再通过 Supabase Auth 读取。它带来了以下问题：

- `/api/csrf` 需要远程调用 `getSession()` 和 `updateUser()`；
- Proxy 为每个写请求调用 `getUser()`，业务 Route 又重复鉴权；
- metadata 更新后，本地 Session/JWT 不一定立即同步；
- 并发初始化可能让 Session token 与 Cookie token 保存不同版本；
- CSRF 校验受到 Supabase 网络和服务延迟影响。

CSRF token 是请求校验数据，不是用户档案数据，没有必要持久化到 Supabase metadata。新方案在 Proxy 本地完成字符串比较，不产生远程 Auth 请求。

### 6. 安全边界

当前方案主要防御传统 CSRF：第三方网站可以诱导浏览器携带本站 Cookie，但受同源策略和 CORS 限制，无法读取 token 并设置正确的自定义 Header。

需要注意：

- `httpOnly: false` 是必要设置，因为前端需要读取 token 并写入 Header；
- CSRF token 不能防御 XSS。攻击者一旦能在本站执行 JavaScript，也能读取 token；
- 生产环境必须使用 HTTPS，并保留 `Secure` 和 `SameSite` Cookie 属性；
- CORS 不应允许不可信来源携带凭证并发送 `X-CSRF-Token`；
- 高风险系统可使用服务端 Session 中保存的 synchronizer token，但应放在低延迟 Session 存储中，而不是用户 metadata。

### 7. 当前涉及文件

- `app/api/csrf/route.ts`：生成或复用 Cookie token；
- `lib/csrf/client.ts`：客户端 token 读取与请求去重；
- `components/client-csrf-provider.tsx`：页面初始化；
- `proxy.ts`：Cookie 与 Header 校验；
- 各客户端写请求：设置 `X-CSRF-Token` Header。

---

## 历史方案：Session Token + Cookie Token

以下内容用于解释项目之前的实现及其设计思路，当前代码不再采用该方案。

## 📋 历史概述

本项目实现了一套完整的双 CSRF（跨站请求伪造）防护机制，采用"Session Token + Cookie Token"双重验证策略，有效防止 CSRF 攻击，同时确保用户体验的安全性。

---

## 🔥 金字塔结构

### 1️⃣ 顶层：实现目标
- **安全性**：防止 CSRF 攻击，保护用户数据和操作安全
- **可靠性**：双重验证机制，提高攻击门槛
- **用户体验**：透明的安全验证，不影响正常使用
- **合规性**：符合 Web 安全最佳实践

### 2️⃣ 第二层：核心实现原理

#### 2.1 双重 Token 机制
- **Session Token**：存储在用户 Session 的 `user_metadata` 中
- **Cookie Token**：存储在浏览器 Cookie 中（`httpOnly: false`）
- **关联验证**：两个 Token 必须同时存在且完全匹配

#### 2.2 防护范围
```typescript
// 保护的方法类型
const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

// 保护的路由
- 所有 API 路由（/api/*）
- 排除：认证相关（/api/auth/）、公共接口（/api/public/）、CSRF 获取接口（/api/csrf）
```

#### 2.3 安全措施
- **SameSite='lax'**：防止跨站请求携带 Cookie
- **Secure**：生产环境启用 HTTPS-only
- **短时效**：Token 5分钟过期
- **随机生成**：使用 `crypto.randomUUID()` 生成不可预测的 Token

### 3️⃣ 第三层：具体实现步骤

#### 步骤 1：Token 生成与分发
```typescript
// 生成 CSRF Token
export function generateCSRFToken() {
  return crypto.randomUUID()
}

// API 路由：/api/csrf
export async function GET() {
  const token = generateCSRFToken()
  
  // 1. 存储 Session Token
  await setCSRFToken(token)
  
  // 2. 设置 Cookie Token
  response.cookies.set('csrf_token', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/'
  })
  
  return NextResponse.json({ token })
}
```

#### 步骤 2：Token 存储（双存储）
```typescript
// Session 存储（user_metadata）
export async function setCSRFToken(token: string) {
  const supabase = createServerClient(...)
  
  await supabase.auth.updateUser({
    data: {
      csrf_token: token
    }
  })
}

// Cookie 存储（由 Next.js 自动处理）
```

#### 步骤 3：中间件验证
```typescript
// 关键验证逻辑
const csrfTokenFromSession = user?.user_metadata?.csrf_token;
const csrfTokenFromCookie = request.cookies.get('csrf_token')?.value;

// 严格验证
if (!csrfTokenFromSession || !csrfTokenFromCookie || 
    csrfTokenFromSession !== csrfTokenFromCookie) {
  return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
}

// JSON 请求额外验证
if (contentType?.includes('application/json')) {
  const body = await request.clone().json()
  const csrfTokenFromBody = body?.csrf_token
  
  if (csrfTokenFromBody !== csrfTokenFromSession) {
    return NextResponse.json({ error: 'CSRF token mismatch' }, { status: 403 })
  }
}
```

#### 步骤 4：前端组件集成
```typescript
// CSRFForm 组件
export function CSRFForm({ action, method, useSessionToken = false }) {
  const [csrfToken, setCSRFToken] = useState('')
  
  // 获取 Token
  useEffect(() => {
    if (useSessionToken) {
      // 从 API 获取 Session Token
      fetch('/api/csrf', { credentials: 'include' })
        .then(res => res.json())
        .then(data => setCSRFToken(data.token))
    } else {
      // 从全局变量获取 Cookie Token
      setCSRFToken((window as any).csrfToken || '')
    }
  }, [])
  
  return (
    <form action={action} method={method}>
      <input type="hidden" name="csrf_token" value={csrfToken} readOnly />
      {children}
    </form>
  )
}
```

### 4️⃣ 第四层：实现细节

#### 4.1 Token 生命周期
```
1. 初始访问：用户访问页面时，Token 不存在
2. 获取 Token：前端调用 /api/csrf 接口
3. 双重存储：同时存储到 Session 和 Cookie
4. 验证请求：每次敏感操作时验证双 Token
5. 自动过期：5分钟后 Token 失效，需重新获取
```

#### 4.2 安全配置
```typescript
// Cookie 安全设置
{
  httpOnly: false,  // 允许 JavaScript 访问
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,  // 允许跨站导航请求
  maxAge: 300,      // 5分钟过期
  path: '/'         // 全站可用
}
```

#### 4.3 排除的端点
- `/api/auth/*` - 认证相关接口
- `/api/public/*` - 公共接口
- `/api/csrf` - CSRF Token 获取接口

### 5️⃣ 第五层：达到的效果

#### 5.1 安全防护效果
- ✅ 防止 CSRF 攻击：攻击者无法伪造有效的双 Token
- ✅ 防止 Token 泄露：两个 Token 存储在不同的位置
- ✅ 防止重放攻击：每次请求都是唯一的随机 Token
- ✅ 防止跨站请求：SameSite=lax 阻止跨站 POST 请求

#### 5.2 开发体验
- ✅ 自动化验证：中间件自动处理，无需手动检查
- ✅ 透明集成：组件封装，开发无感知
- ✅ 调试友好：详细的错误信息和响应头
- ✅ 国际化支持：支持多语言路由的 CSRF 保护

#### 5.3 性能影响
- ✅ 轻量级验证：内存中的字符串比较
- ✅ 缓存友好：Token 有效期内无需重复获取
- ✅ 异步处理：非阻塞的验证流程

---

## 🛡️ 防护原理详解

### 为什么需要双 CSRF 机制？

#### 传统 CSRF 防护的不足
1. **Cookie-only**：依赖 SameSite 属性，可能被绕过
2. **Token-only**：Session Token 可能被 XSS 攻击获取
3. **单点验证**：一旦一个 token 泄露，防护失效

#### 双 CSRF 的优势
```
攻击场景分析：

1. 攻击者获取 Cookie Token：
   - 通过 XSS 攻击获取 Cookie 中的 Token
   - 但无法获取 Session Token（受浏览器安全限制）
   - 验证失败 ❌

2. 攻击者获取 Session Token：
   - 通过 API 调用获取 Session Token
   - 但无法设置对应的 Cookie（同源策略）
   - 验证失败 ❌

3. 同时获取双 Token：
   - 需要同时攻破 XSS 和同源策略
   - 攻击成本极高 ✅
```

### 双 CSRF 如何防止攻击？

#### 防护机制说明
1. **隔离存储**：Session Token 和 Cookie Token 存储在不同位置
2. **双重验证**：必须同时满足两个 Token 才能通过验证
3. **动态更新**：每次请求使用新的随机 Token
4. **时效控制**：限制 Token 的有效时间

#### 攻击成本分析
| 攻击方式 | 需要条件 | 攻击难度 | 防护效果 |
|---------|---------|---------|---------|
| CSRF | 仅需 Cookie | 低 | 传统 CSRF 防护 |
| 双 CSRF | 需要 Cookie + Session | 极高 | 有效防护 |
| XSS + CSRF | 需要 XSS + Cookie | 高 | 仍有防护 |
| XSS + 双 CSRF | 需要 XSS + Cookie + Session | 极高 | 依然安全 |

---

## 🔍 前端使用示例

### 基本用法
```typescript
// 使用 CSRFForm 组件
<CSRFForm action="/api/comments" method="POST">
  <textarea name="content" />
  <button type="submit">提交评论</button>
</CSRFForm>
```

### 高级用法（使用 Session Token）
```typescript
// 对于敏感操作，使用 Session Token
<CSRFForm 
  action="/api/posts" 
  method="POST"
  useSessionToken={true}
>
  <input name="title" type="text" />
  <input name="content" type="hidden" />
  <button type="submit">创建文章</button>
</CSRFForm>
```

### 在 Server Actions 中使用
```typescript
// 1. 获取 Token
const csrfToken = await getCSRFToken()

// 2. 在 API 端点验证
export async function POST(request: Request) {
  const body = await request.json()
  
  // 验证 Token
  const sessionToken = await getCSRFToken()
  if (body.csrf_token !== sessionToken) {
    return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 })
  }
  
  // 继续处理业务逻辑
  // ...
}
```

---

## 📊 监控与调试

### 错误响应示例
```json
{
  "error": "Invalid CSRF token",
  "details": {
    "session_token": "present",
    "cookie_token": "missing"
  }
}
```

### 调试响应头
```http
X-CSRF-Token: abc123-def456-ghi789-jkl012
X-CSRF-Source: both-cookie-and-session
X-CSRF-Error: invalid_token
X-CSRF-Session: abc123-def456-ghi789-jkl012
X-CSRF-Cookie: missing
```

### 常见错误排查
1. **Token 不匹配**：检查前端是否正确传递了 Token
2. **Token 过期**：重新获取 Token
3. **CORS 问题**：确保 API 调用使用 `credentials: 'include'`
4. **SameSite 问题**：检查浏览器 SameSite 策略

---

## 🎯 面试可能追问

### 基础问题
1. **什么是 CSRF 攻击？**
   - 答：跨站请求伪造，攻击者诱导用户在已认证的网站上执行非预期操作

2. **为什么需要 CSRF 防护？**
   - 答：防止攻击者利用用户的认证状态执行恶意操作，如删除数据、修改信息等

3. **传统的 CSRF 防护方式有哪些？**
   - 答：SameSite Cookie、CSRF Token、双重提交 Cookie 等

### 技术实现问题
1. **为什么选择双 CSRF 而不是单 Token？**
   - 答：双 CSRF 提供更强的安全保障，即使一个 Token 泄露，另一个 Token 仍然可以保护系统

2. **如何防止 Token 被窃取？**
   - 答：使用随机 UUID、短时效、HTTPS、SameSite=lax 等措施

3. **为什么 Cookie 设置 `httpOnly: false`？**
   - 答：需要前端 JavaScript 能够访问和传递 Token，但增加了 XSS 风险，所以有双 Token 机制保护

4. **Token 过期时间为什么是 5 分钟？**
   - 答：平衡安全性和用户体验，太短频繁影响使用，太长增加安全风险

### 安全设计问题
1. **这种防护机制能防止哪些攻击？**
   - 答：CSRF 攻击、部分 XSS 攻击、Token 重放攻击

2. **有哪些绕过这种防护的方式？**
   - 答：XSS 攻击同时攻破两个 Token、中间人攻击、浏览器漏洞等

3. **如何进一步提升安全性？**
   - 答：启用 CSP 防止 XSS、使用短时效 Token、增加 IP 检查、实现请求签名等

### 架构设计问题
1. **为什么选择在中间件中进行验证而不是在每个 API 中？**
   - 答：避免代码重复、统一验证逻辑、易于维护和更新

2. **如何处理国际化路由中的 CSRF 验证？**
   - 答：在中间件中重写路由，移除语言前缀后再进行验证

3. **Token 存储在 user_metadata 中有什么优势？**
   - 答：与用户认证绑定、持久化存储、不易丢失、便于管理

### 性能优化问题
1. **CSRF 验证对性能有什么影响？**
   - 答：影响极小，主要是字符串比较操作，可以在微秒级完成

2. **如何优化 Token 的获取流程？**
   - 答：使用缓存、合理设置过期时间、减少不必要的 Token 获取

3. **在高并发场景下如何保证性能？**
   - 答：Token 生成是 CPU 密集型操作，可以考虑预生成或使用更高效的随机数生成器

---

## 🚀 总结

本项目的双 CSRF 防护机制是一个完整、安全、易用的解决方案：

1. **安全性**：双重验证机制大幅提高了攻击门槛
2. **可靠性**：自动化验证，减少人为错误
3. **易用性**：组件封装，开发无感知
4. **可维护性**：集中管理，易于扩展

这种实现方式既考虑了安全性，又兼顾了用户体验，是现代 Web 应用中 CSRF 防护的最佳实践之一。
