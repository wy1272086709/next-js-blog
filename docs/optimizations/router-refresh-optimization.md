# Router Refresh 优化

## 问题描述

在 `write-post-form.tsx` 中，提交文章后使用了 `router.push(path)` + `router.refresh()` 的组合。这种方式的缺点：

1. 性能开销：`router.refresh()` 会重新获取整个页面的数据，造成不必要的延迟
2. 用户体验：用户需要等待整个页面刷新才能看到结果
3. 资源浪费：服务器端数据被重新获取，可能不是必需的

## 优化方案

### 1. 移除 `router.refresh()`

**原因**：
- `router.push()` 已经导航到了新页面
- 新页面 `/dashboard/posts` 在挂载时会自动获取最新数据
- 避免了重复的数据获取

### 2. 使用 API 类封装数据库操作

创建了 `lib/api/posts.ts` 文件，封装了所有文章相关的 API 操作：

```typescript
export class PostsAPI {
  async createPost(data: CreatePostData & { author_id: string }) {
    // 创建文章逻辑
  }
  
  async updatePost(data: UpdatePostData & { author_id: string }) {
    // 更新文章逻辑
  }
  
  async invalidateUserPostsCache(userId: string) {
    // 清除缓存逻辑
  }
}
```

### 3. 添加成功提示组件

创建了 `components/ui/success-toast.tsx`，提供即时反馈：

- 自动消失（3秒后）
- 手动关闭功能
- 成功/错误状态支持

### 4. 优化后的提交流程

```typescript
// 1. 创建 API 实例
const postsAPI = new PostsAPI()

// 2. 执行创建/更新操作
if (post) {
  result = await postsAPI.updatePost({ ...postData, id: post.id })
} else {
  result = await postsAPI.createPost(postData)
}

// 3. 清除缓存
await postsAPI.invalidateUserPostsCache(userId)

// 4. 显示成功提示
setSuccessMessage(message)
setShowSuccessToast(true)

// 5. 立即导航
router.push(path)

// 6. 不需要 router.refresh()
```

## 性能提升

1. **减少网络请求**：避免了不必要的页面数据重新获取
2. **更快导航**：直接导航，无需等待刷新完成
3. **更好的用户体验**：即时成功反馈，无需等待

## 注意事项

1. **数据一致性**：确保新页面在挂载时会获取最新数据
2. **错误处理**：保持原有的错误处理逻辑
3. **缓存策略**：对于复杂应用，可能需要更精细的缓存控制

## 代码文件变更

- ✅ `components/write-post-form.tsx` - 优化提交逻辑
- ✅ `lib/api/posts.ts` - 新增 API 类
- ✅ `components/ui/success-toast.tsx` - 新增提示组件

## 测试建议

1. 测试创建文章后的导航
2. 测试编辑文章后的导航
3. 验证文章列表是否显示最新数据
4. 测试成功提示的显示和自动消失