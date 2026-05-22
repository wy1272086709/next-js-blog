# 认证流程知识文档

## 概述
本文档描述了博客平台中实现的认证系统，使用 Supabase Auth，包括登录、注册、会话管理和受保护路由。

## 认证架构

### 使用的技术
- **Supabase Auth**：基于 JWT 的认证
- **Supabase Client**：React hooks 用于认证状态
- **自定义上下文**：全局认证状态管理
- **受保护路由**：HOC 模式

## 认证上下文

### AuthContext.tsx
位于 `lib/auth-context.tsx`，提供全局认证状态。

```tsx
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}
```

**关键功能**：
- 管理整个应用的认证状态
- 处理加载状态
- 提供认证方法
- 在页面刷新之间保持会话

## 认证流程

### 1. 初始认证检查

应用加载时：
1. AuthProvider 初始化
2. 检查 localStorage 中的现有会话
3. 调用 Supabase 验证会话
4. 设置用户状态

```tsx
// AuthProvider 初始化
const [user, setUser] = useState<User | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  // 检查现有会话
  const initializeAuth = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    setUser(user);
    setLoading(false);
  };
  
  initializeAuth();
}, []);
```

### 2. 登录流程

#### 邮箱/密码登录
```tsx
async function login(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    setUser(data.user);
  } catch (error) {
    throw error;
  }
}
```

**步骤**：
1. 用户输入凭据
2. 调用 `supabase.auth.signInWithPassword`
3. 成功后更新认证上下文
4. 重定向到仪表板
5. 在 localStorage 中存储会话

#### OAuth 提供商（未来增强）
- Google
- GitHub
- Twitter

### 3. 注册流程

```tsx
async function signUp(email: string, password: string, username: string) {
  try {
    // 1. 创建用户
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });
    
    if (authError) throw authError;
    
    // 2. 如果注册成功，创建用户配置文件
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          username,
          full_name: username
        });
        
      if (profileError) throw profileError;
    }
  } catch (error) {
    throw error;
  }
}
```

**步骤**：
1. 用户填写注册表单
2. 调用 `supabase.auth.signUp`
3. 如果成功，创建用户配置文件
4. 注册后自动登录
5. 重定向到引导页面

### 4. 会话管理

#### 会话持久化
```tsx
// AuthProvider 监听认证状态变化
supabase.auth.onAuthStateChange(async (event, session) => {
  setUser(session?.user ?? null);
  
  // 持久化会话
  if (session) {
    localStorage.setItem('supabase.auth.token', JSON.stringify(session));
  } else {
    localStorage.removeItem('supabase.auth.token');
  }
});
```

#### 会话验证
```tsx
// 在应用挂载时验证会话
const validateSession = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    // 清除无效会话
    localStorage.removeItem('supabase.auth.token');
    return null;
  }
  
  return user;
};
```

### 5. 登出流程

```tsx
async function logout() {
  try {
    await supabase.auth.signOut();
    setUser(null);
    // 清除任何用户特定数据
    // 清除缓存
    // 重定向到首页
  } catch (error) {
    console.error('登出错误:', error);
  }
}
```

## 受保护路由

### HOC 模式
```tsx
function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthComponent(props: P) {
    const { user, loading } = useAuth();
    
    if (loading) {
      return <LoadingSpinner />;
    }
    
    if (!user) {
      return <Navigate to="/auth/login" replace />;
    }
    
    return <Component {...props} />;
  };
}
```

### 路由使用
```tsx
// 受保护的仪表板路由
const DashboardPage = withAuth(() => (
  <DashboardLayout>
    <DashboardContent />
  </DashboardLayout>
));

// 在路由中的使用
<Route 
  path="/dashboard" 
  element={<DashboardPage />} 
/>
```

## 认证状态

### 加载状态
```tsx
if (loading) {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner />
    </div>
  );
}
```

### 已认证状态
```tsx
if (user) {
  return (
    <App>
      <UserAvatar user={user} />
      <ProtectedRoutes />
    </App>
  );
}
```

### 未认证状态
```tsx
if (!user && !loading) {
  return (
    <AuthFlow>
      <PublicRoutes />
    </AuthFlow>
  );
}
```

## 安全考虑

### JWT 令牌
- 存储在 localStorage 中（不安全 - 考虑使用 HttpOnly cookies）
- 配置过期时间（默认 2 小时）
- 刷新令牌自动续期
- 所有受保护路由的服务器端验证

### Supabase RLS（行级安全）
```sql
-- posts 表示例 RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 用户可以查看所有已发布文章
CREATE POLICY "查看已发布文章" ON posts
  FOR SELECT USING (published = true);

-- 用户可以查看自己的草稿文章
CREATE POLICY "查看自己的草稿文章" ON posts
  FOR SELECT USING (auth.uid() = author_id AND published = false);

-- 用户可以创建文章
CREATE POLICY "创建文章" ON posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- 用户可以更新自己的文章
CREATE POLICY "更新自己的文章" ON posts
  FOR UPDATE USING (auth.uid() = author_id);

-- 用户可以删除自己的文章
CREATE POLICY "删除自己的文章" ON posts
  FOR DELETE USING (auth.uid() = author_id);
```

### 密码安全
- Supabase 处理密码哈希（bcrypt）
- 密码重置功能
- 邮件验证（可选增强）

## 常见问题

### 会话持久化
- **问题**：页面刷新时丢失会话
- **解决方案**：检查 localStorage 并用 Supabase 重新验证

### 受保护路由绕过
- **问题**：用户可以直接访问受保护路由
- **解决方案**：使用带适当加载状态的 HOC

### OAuth 集成
- **问题**：未配置 OAuth 提供商
- **解决方案**：在 Supabase 仪表板中添加 OAuth 配置

## 未来增强

1. **多因素认证**
2. **社交登录（Google、GitHub）**
3. **邮件验证**
4. **无密码认证**
5. **会话管理仪表板**
6. **API 密钥认证**（管理 API）