# RSC 渲染与公开页面缓存改造设计

## 1. 背景与目标

本项目使用 Next.js 16 App Router。页面组件默认是 React Server Components（RSC），但 RSC 只说明组件在哪里执行，并不决定页面采用 SSG、SSR 还是 ISR。

本次改造目标：

1. 首页等纯静态页面继续使用 SSG。
2. 公开文章列表和详情采用 5 分钟 ISR，降低重复数据库查询与服务端渲染成本。
3. Dashboard、写作和设置等用户私有页面继续 SSR，避免跨用户缓存。
4. 将用户点赞状态、评论交互等个性化数据留在客户端/API，不污染公开页面缓存。
5. 消除渲染期间的副作用，尤其是文章详情渲染时更新浏览量。
6. 建立可重复执行的构建和 HTTP 性能测量方法。

## 2. 改造前现状

### 2.1 公开文章列表

`app/[locale]/posts/page.tsx` 在 RSC 中：

- 创建带 Cookie 的 Supabase Server Client；
- 读取 URL `searchParams`；
- 查询分类和文章；
- 根据分类再次查询数据库。

带 Cookie 的 Client 和 `searchParams` 都会使页面依赖当前请求，无法稳定预渲染。每次访问还需要至少两次数据库往返。

### 2.2 公开文章详情

`app/[locale]/posts/[id]/page.tsx` 明确设置了 `force-dynamic`，每次请求执行：

- 查询文章正文；
- 读取 Supabase 用户会话；
- 访问 Redis 查询点赞数；
- 查询当前用户是否点赞；
- 更新文章浏览量。

正文、用户状态和写操作被耦合在同一次渲染中，使公开内容无法缓存。`view_count + 1` 还是非原子读改写，并发访问可能丢失计数。

### 2.3 Locale Layout

Locale Layout 在服务端渲染期间请求自身 `/api/csrf`。构建阶段本地生产服务器尚未启动，这种自请求可能等待超时，并使所有子路由继承动态依赖。项目已经有 `ClientCSRFProvider`，所以这段服务端初始化是重复的。

## 3. 目标渲染模型

| 页面类别 | 策略 | 原因 |
| --- | --- | --- |
| 首页、登录注册外壳 | SSG | 不依赖请求和用户数据 |
| 文章列表 | ISR，300 秒 | 内容公开，允许短时间陈旧 |
| 文章详情正文 | 按需 ISR，300 秒 | 动态 ID 很多，不必全部在构建期生成 |
| 分类筛选 | 静态数据 + Hydration 后客户端筛选 | 保留现有 query-string URL，同时避免整页动态化；静态 HTML 仍包含完整列表 |
| 点赞状态与数量 | 客户端请求 API | 包含用户态，不能进入共享 HTML 缓存 |
| 评论 | 客户端 Supabase 查询 | 现阶段保留原行为，后续可迁移独立 API |
| Dashboard、写作、设置 | SSR | 数据与当前登录用户绑定 |
| AI/SSE | 动态 Route Handler | 流式请求不能静态生成 |

## 4. 数据与缓存设计

新增公共 Supabase Client：

- 不读取 Cookie；
- 不持久化 Session；
- 只使用 anon key 和数据库 RLS；
- 只允许查询已发布文章。

新增公共查询层：

- `getPublicPosts()`：缓存文章列表和分类，TTL 300 秒；
- `getPublicPost(id)`：按文章 ID 缓存详情，TTL 300 秒；
- 缓存标签为 `posts`、`categories`，后续写接口可按标签失效。

当前文章写操作仍由浏览器直接访问 Supabase，因此本次先采用 300 秒时间失效。后续把写操作收口到 Route Handler 或 Nest.js 后，应在成功写入后调用 `revalidateTag`，实现近实时刷新。

## 5. 详情页动态逻辑拆分

详情页 RSC 只负责文章正文、作者、分类和缓存中的浏览量展示。

点赞按钮挂载后调用 `GET /api/posts/:id/like`，取得点赞总数和当前用户状态。匿名用户也会发起 GET，因此不能用登录状态控制该查询。点赞写操作仍要求登录。

评论组件在客户端获取用户和评论，因而不会阻止正文 ISR。

浏览量更新已从渲染流程移除。正确实现应是独立事件接口配合 PostgreSQL 原子函数，例如：

```sql
update posts
set view_count = view_count + 1
where id = $1 and published = true;
```

在没有原子 RPC 或可信后端写接口前，不保留原来的非原子更新，避免缓存改造继续携带数据竞争问题。

## 6. 性能测量方法

### 6.1 测量原则

测试前后必须使用相同机器、生产构建、相同环境变量和相同 URL。开发服务器包含编译开销，不能用于结论。

测量分三层：

1. 构建层：`next build` 总耗时及路由分类。
2. HTTP 层：TTFB、总耗时、响应大小、缓存响应头。
3. 浏览器层：Lighthouse 的 FCP、LCP、TBT、CLS；本地无可用浏览器时不伪造该数据。

### 6.2 构建测量

```bash
/usr/bin/time -p pnpm build
```

记录：

- `real`：墙钟总耗时；
- Next 构建输出中的静态、动态和 ISR 路由标识；
- 是否发生构建超时、外部请求等待或编译错误。

### 6.3 HTTP 测量

先运行生产服务器：

```bash
pnpm start
```

单次请求：

```bash
curl -sS -o /dev/null \
  -w 'code=%{http_code} ttfb=%{time_starttransfer} total=%{time_total} size=%{size_download}\n' \
  http://127.0.0.1:3000/zh-CN/posts
```

冷请求定义为启动服务器后对目标 URL 的第一次请求；热请求是在不重启服务器的情况下连续请求 10 次。报告中使用热请求的平均值，并同时保存最小值和最大值，避免单次抖动误导结论。

同时检查：

```bash
curl -sSI http://127.0.0.1:3000/zh-CN/posts
```

重点观察 `Cache-Control`、`Age`、`x-nextjs-cache`（若环境提供）等响应头。本地 `next start` 与 Vercel CDN 的命中头不完全相同，所以本地结果用于前后对比，不直接推断全球 CDN 延迟。

### 6.4 本次基线记录

改造前生产构建在 `Creating an optimized production build` 阶段持续 233.16 秒无新输出，之后手动终止：

```text
real 233.16
user 26.09
sys 2.70
exit 130 (manual stop)
```

因此无法取得可信的改造前 HTTP 生产基线。代码检查发现 Locale Layout 在构建时请求尚未启动的本地 `/api/csrf`，同时 Turbopack 错误推断了上级 workspace root。这两个问题均已纳入改造。该结果应如实记为“基线构建未完成”，不能编造前后百分比。

## 7. 验收标准

1. `pnpm lint` 通过，或明确记录已有错误。
2. `pnpm build` 在合理时间内完成。
3. 构建输出显示文章列表为静态/ISR，而不是每请求动态渲染。
4. 任意有效文章 ID 首次访问可生成，后续访问复用缓存。
5. 分类 query 参数仍能正确过滤文章。
6. 匿名用户能看到点赞总数，登录用户能看到并切换自己的点赞状态。
7. Dashboard 的认证与 SSR 行为保持不变。

## 8. 后续工作

1. 将文章创建、更新、删除收口到服务端，并在成功后按标签失效。
2. 用 PostgreSQL RPC 实现原子浏览量递增，再增加客户端事件上报。
3. 统一 `likes` 与 `post_likes` 两套历史表和对应 RLS。
4. 将评论查询改为后端聚合接口，避免客户端拉取全部 `comment_likes`。
5. 在 Vercel Preview 环境运行 Lighthouse 和真实 CDN 缓存命中测试。

## 9. 改造后实测结果

### 9.1 构建

受限网络环境中的默认 Turbopack 构建在 353.35 秒后仍停留于优化阶段，手动终止。使用 webpack 后明确暴露出 `next/font` 无法访问 `fonts.googleapis.com`；允许生产构建访问字体资源后成功完成：

```text
Compiled successfully: 10.7s
Static pages generated: 29/29 in 2.9s
real: 24.88s
user: 45.96s
sys: 6.38s
```

路由分类符合设计：

```text
/[locale]/posts       SSG/ISR, revalidate 5m
/[locale]/posts/[id]  on-demand static
/[locale]/dashboard   dynamic SSR
```

这说明公开内容与私有页面的缓存边界已经生效。Turbopack 的等待属于构建环境网络诊断问题，不计作应用运行时性能提升。

### 9.2 本地生产 HTTP

环境：本机 `next start`，端口 3100，使用 curl，未经过公网、TLS 和 Vercel CDN。

| 页面 | 首次请求 | 后续 10 次平均 | 响应大小 | 缓存结果 |
| --- | ---: | ---: | ---: | --- |
| `/zh-CN/posts` | 98.5 ms | 7.2 ms | 52,042 B | HIT |
| `/zh-CN/posts/:id` | 312.4 ms | 6.7 ms | 89,511 B | HIT |

两个页面的响应头均包含：

```text
x-nextjs-cache: HIT
x-nextjs-prerender: 1
x-nextjs-stale-time: 300
Cache-Control: s-maxage=300, stale-while-revalidate=31535700
```

详情页首次请求包含生成按需静态页面的成本，所以明显较慢；此次最终复测复用了持久化的数据缓存。此前清洁数据缓存下的首次详情请求为 1,821.8 ms，因此应把首位访客成本理解为约 0.3 至 1.8 秒，取决于数据缓存是否已经存在。后续请求直接命中页面缓存。生产环境可通过构建期预生成热门文章进一步降低首位访客延迟。

由于改造前生产构建无法完成，本报告不能给出可信的前后百分比。可以确认的结果是：改造前详情明确 `force-dynamic`，每次请求都执行数据库、认证和 Redis 工作；改造后同一详情的热请求约 6.7 ms，并有明确缓存命中证据。列表响应变大是预期结果：静态 HTML 现在包含文章内容，而不是 `useSearchParams` 触发的客户端空洞，有利于首屏内容与 SEO。

### 9.3 功能与静态检查

- 最终生产构建成功，29 个静态页面全部生成。
- 文章列表的静态 HTML 包含真实文章 ID，确认不是仅客户端渲染的空壳。
- `GET /api/posts/:id/like` 返回 `200`、零重定向及 `{ count, liked }`；同时修复了 API 被国际化中间件重定向循环的问题。
- `git diff --check` 通过。
- `pnpm lint` 无法执行：项目声明了 lint 脚本，但没有安装 `eslint`。
- `pnpm exec tsc --noEmit` 仍有既有错误，集中在 Dashboard、评论、点赞 demo 和 Markdown Renderer；本次修改涉及的 Route Handler 参数类型错误已修复。
- `next.config.mjs` 当前设置 `ignoreBuildErrors: true`，所以生产构建不会把上述既有类型错误作为失败条件。这是需要单独偿还的工程风险。
