# Redis 快速参考指南

## 📦 已安装的包
- `ioredis` v5.10.0 - Redis 客户端库（比原生 redis 包功能更完整）

## 📁 新增文件

### 1. `/lib/redis.ts`
Redis 客户端封装，提供以下方法：

**字符串操作**
```typescript
await redis.set(key, value, { EX: 60 })  // 设置值（60秒过期）
await redis.get(key)                      // 获取值
await redis.getJson<T>(key)               // 获取并解析 JSON
await redis.del(...keys)                  // 删除键
await redis.exists(...keys)               // 检查键是否存在
```

**计数操作** (适用于点赞数、浏览数)
```typescript
await redis.incr(key)                     // 增加 1
await redis.decr(key)                     // 减少 1
await redis.incrBy(key, 10)               // 增加指定数值
await redis.ttl(key)                      // 获取剩余过期时间
await redis.expire(key, seconds)          // 设置过期时间
```

**Hash 操作** (适用于存储对象)
```typescript
await redis.hSet(key, field, value)       // 设置字段
await redis.hGet(key, field)              // 获取字段值
await redis.hGetAll(key)                  // 获取所有字段
await redis.hDel(key, ...fields)          // 删除字段
```

**List 操作** (适用于评论、消息队列)
```typescript
await redis.lPush(key, ...values)         // 左端插入
await redis.lRange(key, 0, 9)             // 获取范围值
await redis.lLen(key)                     // 获取长度
```

**Set 操作** (适用于唯一项集合)
```typescript
await redis.sAdd(key, ...members)         // 添加成员
await redis.sMembers(key)                 // 获取所有成员
await redis.sIsMember(key, member)        // 检查成员是否存在
```

## 🚀 快速开始

### 本地开发
```bash
# 1. 安装 Redis（macOS）
brew install redis
brew services start redis

# 2. 创建 .env.local
echo "REDIS_URL=redis://localhost:6379" > .env.local

# 3. 启动开发服务器
pnpm dev
```

### Vercel 部署
1. 登录 [Vercel 控制面板](https://vercel.com/dashboard)
2. 进入项目 → **Storage** → **Create Database**
3. 选择 **Redis** → 选择区域 → **Create**
4. 复制生成的 `REDIS_URL`
5. 在 **Project Settings** → **Environment Variables** 中添加：
   - Key: `REDIS_URL`
   - Value: `redis://default:password@host:port`
6. 部署即可自动使用 Redis

## 💡 使用示例

### 示例 1：点赞计数
```typescript
import { redis } from '@/lib/redis'

// 增加点赞数
const newCount = await redis.incr(`post:123:likes`)

// 获取点赞数
const likes = await redis.get(`post:123:likes`)
```

### 示例 2：用户点赞追踪
```typescript
// 标记用户已点赞（30天过期）
await redis.set(`post:123:user:user-id:liked`, '1', { EX: 86400 * 30 })

// 检查用户是否已点赞
const hasLiked = await redis.exists(`post:123:user:user-id:liked`)
```

### 示例 3：缓存热点文章
```typescript
const cacheKey = `post:${postId}:detail`

// 先查 Redis
let post = await redis.getJson(cacheKey)

if (!post) {
  // Redis 未命中，从数据库查询
  post = await supabase.from('posts').select().eq('id', postId)
  
  // 缓存 24 小时
  await redis.set(cacheKey, post, { EX: 86400 })
}
```

### 示例 4：API 路由集成
查看 `/app/api/posts/[id]/like.ts` 了解完整的点赞 API 实现

## 🎯 键命名规范

推荐使用以下格式确保项目一致性：

```
post:{postId}:likes              // 文章点赞数
post:{postId}:user:{userId}:liked // 用户是否已点赞
post:{postId}:views              // 文章浏览数
post:{postId}:detail             // 文章详情缓存
user:{userId}:profile            // 用户资料缓存
session:{sessionId}              // 用户会话
cache:{category}:{name}          // 其他缓存数据
```

## ⚙️ ioredis vs redis 包对比

| 特性 | redis | ioredis |
|------|-------|---------|
| 官方支持 | ✅ | ❌ |
| 自动重连 | 需手动配置 | ✅ 内置 |
| 故障转移 | ❌ | ✅ |
| Cluster 支持 | 基础 | ✅ 完整 |
| Sentinel 支持 | ❌ | ✅ |
| 性能 | 较好 | 稍好 |
| Vercel 兼容性 | ✅ | ✅✅ (推荐) |
| 包体积 | 较小 | 较大 |

**选择 ioredis 的原因：**
- 更好的错误恢复机制
- Vercel Serverless 环境更稳定
- 自动重连和连接复用更优秀
- 无需手动处理连接断开重连

## 🔧 环境变量配置

**本地开发** (`.env.local`)
```env
REDIS_URL=redis://localhost:6379
```

**Vercel 部署** (Project Settings → Environment Variables)
```
REDIS_URL=redis://default:your-password@your-host:your-port
```

## ⚠️ 常见问题

**Q: "Redis 连接 URL 未配置"**
- 检查 `.env.local` 文件是否存在且包含 `REDIS_URL`

**Q: "connect ECONNREFUSED"**
- Redis 服务未运行，执行 `redis-server` 或 `brew services start redis`

**Q: 在 Vercel 上连接超时**
- 确保 REDIS_URL 环境变量已正确设置
- 检查网络连接
- 增加超时时间配置（已在 `/lib/redis.ts` 中优化）

**Q: 如何查看 Redis 中的数据？**
```bash
# 本地
redis-cli
> KEYS *
> GET post:123:likes

# Vercel
# 登录控制面板 → Storage → Redis → Analytics
```

## 📚 相关文件

- `/lib/redis.ts` - Redis 客户端封装
- `/app/api/posts/[id]/like.ts` - 点赞 API 示例
- `/REDIS_SETUP.md` - 详细配置指南
- `/.env.local.example` - 环境变量模板
- `/vercel.json` - Vercel 配置文件

## 🔗 外部资源

- [ioredis GitHub](https://github.com/luin/ioredis)
- [Redis 命令文档](https://redis.io/commands)
- [Vercel Redis 文档](https://vercel.com/docs/storage/redis)

---

✨ 现在你可以在项目中使用 Redis 了！祝你编码愉快！
