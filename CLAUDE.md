# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 在此代码库中工作时提供指导。

## 项目概述

这是一个基于 Next.js 16、React 19、TypeScript 和 Tailwind CSS v4 构建的现代化博客平台。平台支持多种语言（中文和英文）、用户认证、文章管理、评论和点赞功能。使用 Supabase 作为后端数据库，Redis 用于缓存。

## 知识库

项目在 `docs/knowledge/` 目录中包含了一个全面的知识库，详细记录了关键方面：

### [API 端点](docs/knowledge/api-endpoints.md)
- 所有端点的完整 API 文档
- 请求/响应格式
- 认证要求
- 错误处理

### [数据库架构](docs/knowledge/database-schema.md)
- Supabase 表结构
- 表之间的关系
- 常见 SQL 查询
- 安全考虑

### [组件模式](docs/knowledge/component-patterns.md)
- UI 组件模式（Radix UI + shadcn/ui）
- 应用组件结构
- 自定义钩子
- 样式约定

### [认证流程](docs/knowledge/authentication-flow.md)
- Supabase Auth 实现
- 会话管理
- 受保护的路由
- 安全考虑

## 核心技术

- **框架**: Next.js 16 与 App Router
- **语言**: TypeScript
- **样式**: Tailwind CSS v4 (PostCSS 插件)
- **UI 组件**: Radix UI 与 shadcn/ui 组件
- **国际化**: next-intl 与语言前缀路由
- **数据库**: Supabase (PostgreSQL)
- **缓存**: Redis
- **认证**: Supabase Auth
- **表单处理**: React Hook Form 与 Zod 验证
- **富文本编辑器**: React Quill
- **Markdown**: React Markdown 与 rehype-highlight

## 开发命令

```bash
# 开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 代码检查
pnpm lint

# 安装依赖
pnpm install
```

## 架构概览

### 路由结构
- 使用 Next.js App Router 与基于语言的路由
- 语言前缀始终必需：`/zh-CN` 或 `/en`
- Dashboard 路由已本地化：`/{locale}/dashboard/*`
- API 路由未本地化：`/api/*`

### 组件组织
- `components/ui/` - 通过 shadcn/ui 配置的 Radix UI 组件
- `components/` - 应用特定组件（post-card、write-post-form 等）
- 组件使用 Tailwind CSS 类和 class-variance-authority 实现变体
- 图标来自 Lucide React

### 数据流
- **认证**: Supabase Auth 与 `lib/auth-context.tsx` 中的上下文提供者
- **数据库**: 在 `lib/supabase/` 中直接使用 Supabase 客户端
- **缓存**: 在 `lib/redis.ts` 中使用 Redis 客户端缓存频繁访问的数据
- **国际化**: next-intl 与基于请求的语言检测

### 关键功能实现

#### 文章管理
- 文章存储在 Supabase `posts` 表中
- 通过 `app/api/posts/` 中的 API 路由进行 CRUD 操作
- 使用 React Quill 进行富文本编辑
- 支持 Markdown 预览

#### 用户认证
- 使用 Supabase Auth
- 认证上下文在组件间提供用户状态
- 通过 HOC 模式保护路由

#### 国际化
- 消息以 JSON 文件存储，遵循 next-intl 约定
- 默认语言：中文 ("zh-CN")
- 始终启用语言前缀
- 通过语言感知路由切换翻译

### 配置说明

- 生产环境中忽略 TypeScript 构建错误（`next.config.mjs`）
- 图片未优化（在 `next.config.mjs` 中设置为 true）
- ESLint 配置未明确设置，使用 Next.js 默认值
- PostCSS 配置为 Tailwind CSS v4（非 v3）

### 文件结构约定

- 使用 `@/*` 路径别名进行导入
- 组件文件使用 `.tsx` 扩展名
- 工具函数在 `lib/utils.ts` 中
- 类型定义在实现内联或相邻位置
- API 路由遵循 REST 约定

### 所需环境变量

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
REDIS_URL= # 可选，用于缓存
```

### 部署

- 配置为 Vercel 部署
- 构建命令：`next build`
- 安装命令：`pnpm install`
- 框架：`nextjs`

### 常见模式

- 使用 `createServerComponentClient` 进行服务端 Supabase 访问
- 使用 `createClientComponentClient` 进行客户端 Supabase 访问
- 使用 React Hook Form 和 Zod 模式进行表单验证
- 使用 React Suspense 处理加载状态
- 使用错误边界处理组件级错误