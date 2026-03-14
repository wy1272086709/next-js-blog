# Redis 配置指南 - Vercel 部署

## 📋 概述

本项目使用 `ioredis` 作为 Redis 客户端库，支持：
- ✅ 本地开发（localhost Redis）
- ✅ Vercel Redis（官方托管服务）
- ✅ 自定义 Redis 服务器

## 🚀 快速开始

### 1. 本地开发环境

#### 安装 Redis
```bash
# macOS（使用 Homebrew）
brew install redis
brew services start redis

# 或者使用 Docker
docker run -d -p 6379:6379 redis:latest
```

#### 配置环境变量
在 `.env.local` 文件中添加：
```env
REDIS_URL=redis://localhost:6379
```

#### 测试连接
```bash
redis-cli ping
# 输出: PONG
```

### 2. Vercel Redis 部署

#### 步骤 1：登录 Vercel
访问 [Vercel Console](https://vercel.com/dashboard)

#### 步骤 2：创建 Redis 数据库
1. 进入项目 → Storage → Create Database
2. 选择 Redis
3. 选择区域（建议选择离用户最近的区域）
4. 点击 Create

#### 步骤 3：获取连接字符串
创建完成后，你会看到 `.env.local` 内容：
```env
REDIS_URL=redis://default:password@host:port
KV_URL=redis://...  # 备用变量名
```

复制这个环境变量到 Vercel 项目设置中

#### 步骤 4：部署
```bash
# 推送代码到 GitHub
git push

# Vercel 会自动部署
# 环境变量会自动注入
```

## 🔧 高级配置

### Vercel Redis 环境变量
Vercel 会自动创建以下变量：
- `REDIS_URL` - Redis 连接字符串
- `KV_URL` - 备用名称（某些情况下使用）

### ioredis 配置详解

```typescript
{
  // Vercel 必需：禁用每个请求的重试
  maxRetriesPerRequest: null,
  
  // 重连策略（毫秒）
  retryStrategy: (times) => Math.min(times * 50, 2000),
  
  // 连接超时（毫秒）
  connectTimeout: 10000,
  
  // 命令超时（毫秒）
  commandTimeout: 5000,
  
  // 启用离线队列
  enableOfflineQueue: true,
  
  // 错误重连策略
  reconnectOnError: (err) => {
    if (err.message.includes('READONLY')) {
      return true  // 重新连接
    }
    return false
  }
}
```

## 💻 API 使用示例

### 字符串操作
```typescript
import { redis } from '@/lib/redis'

// 设置值（60秒过期）
await redis.set('user:1:name', 'John', { EX: 60 })

// 获取值
const name = await redis.get('user:1:name')

// 自动 JSON 序列化
await redis.set('user:1:profile', { age: 30, city: 'NYC' })
const profile = await redis.getJson('user:1:profile')
```

### 计数操作（适用于点赞数）
```typescript
// 增加计数
await redis.incr('post:123:likes')

// 增加指定数值
await redis.incrBy('post:123:views', 10)

// 获取当前值
const likes = await redis.get('post:123:likes')
```

### Hash 操作（用户信息）
```typescript
// 存储用户数据
await redis.hSet('user:1', 'name', 'John')
await redis.hSet('user:1', 'email', 'john@example.com')

// 获取单个字段
const email = await redis.hGet('user:1', 'email')

// 获取所有字段
const userInfo = await redis.hGetAll('user:1')
```

### List 操作（评论列表）
```typescript
// 添加评论到列表
await redis.lPush('post:123:comments', 'comment1', 'comment2')

// 获取最新 10 条评论
const comments = await redis.lRange('post:123:comments', 0, 9)
```

### Set 操作（唯一项集合）
```typescript
// 添加用户到集合
await redis.sAdd('active:users', 'user1', 'user2', 'user3')

// 获取所有成员
const users = await redis.sMembers('active:users')

// 检查成员是否存在
const exists = await redis.sIsMember('active:users', 'user1')
```

### 过期时间管理
```typescript
// 设置过期时间
await redis.set('session:abc123', 'data', { EX: 3600 }) // 1小时

// 查询剩余时间
const ttl = await redis.ttl('session:abc123') // 返回剩余秒数

// 删除键
await redis.del('session:abc123')
```

## 🎯 实际应用案例

### 1. 点赞功能（like-button.tsx）
```typescript
import { redis } from '@/lib/redis'

export async function updateLikes(postId: string) {
  // 增加点赞数
  const likes = await redis.incr(`post:${postId}:likes`)
  
  // 设置 1 小时过期（缓存）
  await redis.expire(`post:${postId}:likes`, 3600)
  
  return likes
}
```

### 2. 用户会话（认证）
```typescript
const sessionKey = `session:${sessionId}`
await redis.set(sessionKey, JSON.stringify(userData), { EX: 7200 }) // 2小时

// 验证会话
const session = await redis.getJson(sessionKey)
if (!session) {
  // 会话已过期
}
```

### 3. 实时排行榜
```typescript
// 使用 Sorted Set（需扩展）
// 暂时使用 Hash 实现
await redis.hSet('leaderboard:monthly', 'user:1', 1000)
await redis.hSet('leaderboard:monthly', 'user:2', 950)

const leaderboard = await redis.hGetAll('leaderboard:monthly')
```

### 4. 缓存热点文章
```typescript
const cacheKey = `post:${postId}:detail`

// 先查 Redis
let post = await redis.getJson(cacheKey)

if (!post) {
  // Redis 未命中，查数据库
  post = await db.posts.findById(postId)
  
  // 存入 Redis，24小时过期
  await redis.set(cacheKey, post, { EX: 86400 })
}

return post
```

## ⚠️ 常见问题

### Q: 连接失败："Redis 连接 URL 未配置"
**A:** 确保环境变量已设置：
```bash
# 本地开发
echo "REDIS_URL=redis://localhost:6379" > .env.local

# Vercel 部署
# 在 Project Settings → Environment Variables 中添加
```

### Q: "connect ECONNREFUSED"
**A:** Redis 服务未运行：
```bash
# 启动 Redis
redis-server

# 或 Docker
docker ps | grep redis
```

### Q: 在 Vercel 上连接超时
**A:** 这是正常的 Serverless 行为。确保：
1. Redis URL 正确
2. 网络连接正常
3. 增加超时配置：`connectTimeout: 15000`

### Q: 如何监控 Redis 使用情况？
**A:** 
- 本地：`redis-cli info stats`
- Vercel：登录控制面板 → Storage → Redis → Analytics

## 🔐 安全建议

1. **永远不要提交 `.env.local`**
   ```bash
   # .gitignore 中已包含
   echo ".env.local" >> .gitignore
   ```

2. **使用强密码**
   - Vercel Redis 自动生成强密码

3. **限制连接**
   - 设置合理的 `connectTimeout` 和 `commandTimeout`

4. **监控连接数**
   - ioredis 使用单例模式，避免连接泄漏

## 📊 性能优化

### 1. 使用连接池（可选）
当前实现已使用单例模式，生产环境已足够

### 2. 批量操作
```typescript
// 使用 pipeline 提高性能
const client = redis.getClient()
const pipeline = client.pipeline()

pipeline.set('key1', 'val1')
pipeline.set('key2', 'val2')
pipeline.set('key3', 'val3')

await pipeline.exec()
```

### 3. 键命名规范
```typescript
// 推荐格式: namespace:id:field
post:123:likes        // 文章点赞数
user:456:email        // 用户邮箱
session:abc:token     // 会话令牌
cache:trending:week   // 周热榜缓存
```

## 📚 相关资源

- [ioredis 文档](https://github.com/luin/ioredis)
- [Redis 命令参考](https://redis.io/commands)
- [Vercel Redis 文档](https://vercel.com/docs/storage/redis)
- [Redis 最佳实践](https://redis.io/docs/management/best-practices)

## 🛠️ 故障排查

### 查看详细日志
```typescript
const client = redis.getClient()

client.on('error', (err) => {
  console.error('[Redis Error]', err)
})

client.on('close', () => {
  console.log('[Redis] 连接已关闭')
})
```

### 本地测试
```bash
# 启动 Redis CLI
redis-cli

# 测试命令
> PING
PONG

> SET test "hello"
OK

> GET test
"hello"
```

---

✨ **祝你使用愉快！如有问题，查看上面的常见问题部分。**
