# CSRF Protection Implementation

> 历史文档：本文描述的 Supabase Session metadata + Cookie + Form Token 方案已经停止使用。当前实现采用 Cookie + `X-CSRF-Token` Header 双重提交校验，请以根目录 `csrf.md` 的“当前实现（2026-07 更新）”为准。

本项目实现了完整的 CSRF（跨站请求伪造）防护机制。

## 🛡️ 安全机制

### 1. 双重提交 Cookie 模式

- **Session Token**: 存储在 Supabase session 的 user_metadata 中
- **Cookie Token**: 存储在短期 cookie 中（5分钟过期）
- **Form Token**: 包含在每个表单的隐藏字段中

### 2. 验证流程

```
1. 用户访问页面 → 生成/获取 CSRF token
2. 表单提交 → 包含 csrf_token 字段
3. Middleware → 验证 token 匹配
4. API Route → 再次验证 token
```

## 📁 文件结构

```
├── lib/csrf/
│   ├── utils.ts          # CSRF 工具函数
│   └── validate.ts       # CSRF 验证逻辑
├── components/
│   ├── csrf-provider.tsx  # CSRF Token 提供者
│   ├── csrf-form.tsx      # 自动添加 CSRF token 的表单
│   └── create-post-form.tsx # 使用示例
├── middleware.ts         # 全局 CSRF 保护中间件
└── app/api/posts/         # API 路由示例
```

## 🚀 使用方法

### 1. 在布局中集成 CSRF Provider

```tsx
// app/[locale]/layout.tsx
import { CSRFProvider } from "@/components/csrf-provider"

export default function LocaleLayout({ children }) {
  return (
    <CSRFProvider>
      {children}
    </CSRFProvider>
  )
}
```

### 2. 使用 CSRF Form 组件

```tsx
import { CSRFForm } from '@/components/csrf-form'

export function MyForm() {
  return (
    <CSRFForm action="/api/posts" method="POST">
      <input type="text" name="title" />
      <button type="submit">Submit</button>
    </CSRFForm>
  )
}
```

### 3. API 路由自动保护

中间件会自动保护所有敏感操作：

```tsx
// POST /api/posts - 自动受到 CSRF 保护
export async function POST(request) {
  // 验证逻辑已由中间件处理
  // 直接处理业务逻辑
}
```

## 🔧 配置

### 环境变量

确保 `.env.local` 中包含：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

### 中间件配置

默认保护以下操作：
- `POST`, `PUT`, `DELETE`, `PATCH` 方法
- 排除 `/api/auth/` 和 `/api/public/` 路径

## 📝 API 路由示例

### 创建文章

```tsx
// app/api/posts/route.ts
export async function POST(request) {
  // 1. 中间件已验证 CSRF token
  // 2. 验证用户认证
  const { data: { user } } = await supabase.auth.getUser()
  
  // 3. 获取请求体（包含 csrf_token）
  const body = await request.json()
  
  // 4. 处理业务逻辑
  const { data } = await supabase
    .from('posts')
    .insert({ title: body.title, content: body.content })
    
  return NextResponse.json({ data })
}
```

## ⚠️ 注意事项

1. **Token 生成**: 每个 session 只生成一个 CSRF token
2. **Cookie 设置**: 使用 `SameSite=Lax` 策略
3. **过期时间**: Cookie token 5分钟后过期
4. **并发安全**: 支持多标签页使用

## 🧪 测试

### 1. 正常流程

1. 用户登录
2. 访问页面获得 CSRF token
3. 提交表单 → 成功

### 2. 攻击模拟

1. 未登录用户访问 API → 401
2. 无 CSRF token 的请求 → 403
3. 错误 CSRF token 的请求 → 403

## 📊 性能考虑

- **Cookie 大小**: CSRF token 约 36 字节
- **验证开销**: 微秒级，可忽略不计
- **缓存策略**: 短期 cookie 减少服务器验证

## 🔒 安全最佳实践

1. **HTTPS**: 始终使用 HTTPS
2. **SameSite**: 设置正确的 SameSite 属性
3. **Token 长度**: 使用 UUID 确保唯一性
4. **过期时间**: 合理设置过期时间
