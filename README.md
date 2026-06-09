# Next.js Blog Platform

一个基于 Next.js 16 和 Supabase 构建的现代多语言博客平台，支持文章发布、分类管理、评论系统、点赞功能和 Redis 缓存优化。

## ✨ 功能特性

### 🚀 核心功能
- **多语言支持** - 中文和英文国际化（i18n）
- **文章管理** - 创建、编辑、发布、删除博客文章
- **分类系统** - 前端、后端、AI 技术分类
- **评论系统** - 文章评论功能
- **点赞功能** - 文章点赞计数
- **用户认证** - 登录/注册功能
- **AI 智能支持** - AI 辅助写作和内容优化
- **AI Markdown 流式渲染** - 支持大型文档的实时渲染

### 🚀 AI 功能
- **AI 写作助手** - 智能生成文章摘要、标题和内容建议
- **AI 内容优化** - 智能优化文章结构和表达
- **AI 代码生成** - 根据描述生成示例代码
- **AI 摘要生成** - 自动生成文章摘要
- **AI Markdown 流式渲染** - 支持大型 Markdown 文档的分块渲染，提升性能

### 🛠️ 技术栈

#### 前端框架
- **Next.js 16** - React 全栈框架
- **React 19** - 用户界面库
- **TypeScript** - 类型安全的 JavaScript

#### UI 组件
- **Radix UI** - 无样式可访问组件
- **Tailwind CSS** - 原子化 CSS 框架
- **Tailwind CSS v4** - 最新版本的 Tailwind
- **Lucide React** - 现代化图标库

#### 状态管理与数据获取
- **React Query** - 服务端状态管理和数据缓存
- **unstable_cache** - Next.js 内置数据缓存优化
- **React Hook Form** - 高性能表单库
- **Zod** - TypeScript 模式验证

#### 内容编辑
- **React Quill** - 富文本编辑器
- **React Markdown** - Markdown 渲染
- **@uiw/react-md-editor** - Markdown 编辑器
- **rehype-highlight** - 代码高亮

#### 数据库与缓存
- **Supabase** - PostgreSQL 数据库
- **Redis** - 缓存系统

#### AI 集成
- **LangChain** - AI 应用开发框架
- **OpenAI** - AI 模型集成

#### 国际化
- **next-intl** - Next.js 国际化解决方案

#### 性能优化
- **React Query** - 数据缓存、后台更新、无限滚动优化
- **unstable_cache** - Next.js 数据缓存策略，减少数据库查询
- **Redis** - 会话缓存和频繁访问数据缓存

## 📁 项目结构

```
next-js-blog/
├── app/                          # Next.js App Router
│   ├── [locale]/                # 国际化路由
│   │   ├── auth/               # 认证相关页面
│   │   ├── dashboard/          # 管理面板
│   │   │   ├── write/         # 写文章页面
│   │   │   ├── posts/         # 文章管理
│   │   │   └── settings/      # 设置页面
│   │   ├── posts/              # 博客文章页面
│   │   │   └── [id]/          # 文章详情页
│   │   ├── client-layout.tsx   # 客户端布局
│   │   ├── layout.tsx         # 布局组件
│   │   └── page.tsx          # 首页
│   └── api/                    # API 路由
├── components/                  # React 组件
│   ├── ui/                    # 基础 UI 组件（基于 Radix UI）
│   ├── react-quill-editor.tsx # 富文本编辑器组件
│   ├── post-card.tsx         # 文章卡片组件
│   ├── write-post-form.tsx   # 写文章表单
│   ├── like-button.tsx       # 点赞按钮
│   └── comment-section.tsx   # 评论组件
├── lib/                        # 工具函数和配置
│   ├── supabase/            # Supabase 配置
│   │   ├── client.ts        # 客户端实例
│   │   ├── server.ts        # 服务端实例
│   │   └── proxy.ts         # 代理配置
│   ├── auth-context.tsx     # 认证上下文
│   ├── redis.ts            # Redis 客户端
│   ├── utils.ts            # 工具函数
│   ├── ai.ts               # AI 功能
│   └── utils/profiles.ts   # 用户资料工具
├── public/                    # 静态资源
├── i18n/                      # 国际化配置
│   ├── routing.ts          # 路由配置
│   └── navigation.ts       # 导航配置
├── styles/                    # 样式文件
├── hooks/                     # 自定义 Hooks
├── docs/                      # 文档
├── scripts/                    # 脚本文件
├── supabase/                  # Supabase 迁移文件
├── components.json            # Radix UI 组件配置
├── next.config.mjs           # Next.js 配置
├── package.json              # 项目依赖
├── tailwind.config.ts        # Tailwind CSS 配置
├── tsconfig.json             # TypeScript 配置
└── vercel.json               # Vercel 部署配置
```

## 🚀 快速开始

### 环境要求

- Node.js 20.x
- pnpm 或 npm
- Supabase 项目
- Redis 服务（可选，用于缓存）

### 安装依赖

```bash
# 使用 pnpm
pnpm install

# 或使用 npm
npm install
```

### 环境配置

1. 复制环境变量模板：
```bash
cp .env.local.example .env.local
```

2. 配置 `.env.local` 文件：
```env
# Redis 配置
REDIS_URL=redis://localhost:6379

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 数据库设置

1. 在 Supabase 中创建以下表：
   - `profiles` - 用户资料表
   - `categories` - 分类表
   - `posts` - 文章表
   - `comments` - 评论表
   - `likes` - 点赞表

2. 运行数据库迁移（位于 `supabase` 目录）：
```bash
supabase db push
```

### 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 🌐 国际化

项目支持中英文切换，语言前缀：
- 中文: `/zh-CN`
- 英文: `/en`

## 📖 AI 功能实现

### AI 服务集成
- `/api/ai/generate-title` - AI 生成文章标题
- `/api/ai/generate-summary` - AI 生成文章摘要
- `/api/ai/optimize-content` - AI 优化文章内容
- `/api/ai/generate-code` - AI 生成示例代码

### AI Markdown 流式渲染
- 分块加载大型 Markdown 文档
- 实时渲染预览
- 语法高亮和代码块优化
- 支持数学公式和图表渲染

## 📊 性能优化

### React Query 优化
- 自动数据缓存和失效
- 后台数据更新
- 分页和无限滚动支持
- 乐观更新优化

### unstable_cache 实现
- 缓存频繁访问的数据
- 减少数据库查询次数
- 智能缓存失效策略
- 数据预加载

## 📖 API 端点

### 文章相关
- `GET /api/posts` - 获取文章列表（支持 React Query 缓存）
- `GET /api/posts/[id]` - 获取单篇文章
- `POST /api/posts` - 创建文章
- `PUT /api/posts/[id]` - 更新文章
- `DELETE /api/posts/[id]` - 删除文章

### 点赞相关
- `POST /api/posts/[id]/like` - 点赞文章

### AI 相关
- `POST /api/ai/generate-title` - AI 生成文章标题
- `POST /api/ai/generate-summary` - AI 生成文章摘要
- `POST /api/ai/optimize-content` - AI 优化文章内容
- `POST /api/ai/generate-code` - AI 生成示例代码

## 🔧 开发脚本

```json
{
  "dev": "next dev",           # 启动开发服务器
  "build": "next build",       # 构建生产版本
  "start": "next start",       # 启动生产服务器
  "lint": "eslint ."          # 运行 ESLint
}
```

### AI 相关脚本

```json
{
  "ai:setup": "npm install openai@latest langchain @langchain/core",
  "ai:test": "node scripts/test-ai.js",
  "ai:dev": "NEXT_PUBLIC_AI=true pnpm dev"
}
```

### 缓存管理脚本

```json
{
  "cache:clear": "rm -rf .next/cache && pnpm build",
  "cache:purge": "redis-cli FLUSHDB",
  "cache:stats": "redis-cli INFO memory"
}
```

## 🚀 部署

### Vercel 部署

1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量
4. 部署

### 其他平台部署

项目使用标准 Next.js 构建，可以部署到任何支持 Node.js 的平台。

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🔬 高级特性

### AI 功能实现细节
- 使用 OpenAI API 进行内容生成和优化
- 流式式处理生成内容，提供实时预览
- 集成 LangChain 进行复杂 AI 任务编排
- 支持自定义 AI 提示词模板

### 性能优化策略
- **React Query 配置**：
  ```typescript
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5分钟
        cacheTime: 10 * 60 * 1000, // 10分钟
      },
    },
  });
  ```

- **unstable_cache 使用示例**：
  ```typescript
  const getCachedPosts = unstable_cache(
    async () => {
      const { data, error } = await supabase.from('posts').select('*');
      return data;
    },
    ['posts'],
    { revalidate: 3600 } // 1小时后重新验证
  );
  ```

### 缓存架构
- **Redis 缓存层**：存储用户会话和频繁访问的数据
- **React Query 缓存**：管理 API 请求和组件状态
- **Next.js 缓存**：静态资源和服务端渲染缓存
- **unstable_cache**：数据库查询结果缓存

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Radix UI 文档](https://www.radix-ui.com/primitives/docs/overview/introduction)
- [next-intl 文档](https://next-intl.vercel.app)
- [React Query 文档](https://tanstack.com/query/latest)
- [OpenAI API 文档](https://platform.openai.com/docs)

---

Built with ❤️ using Next.js and Supabase