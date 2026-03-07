-- 创建用户资料表
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建文章分类表
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建文章表
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image TEXT,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  published BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建点赞表
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- 启用行级安全策略
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Profiles 策略
CREATE POLICY "公开查看所有用户资料" ON profiles FOR SELECT USING (true);
CREATE POLICY "用户可以更新自己的资料" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "用户可以插入自己的资料" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Categories 策略 (所有人可查看)
CREATE POLICY "公开查看所有分类" ON categories FOR SELECT USING (true);

-- Posts 策略
CREATE POLICY "公开查看已发布的文章" ON posts FOR SELECT USING (published = true OR auth.uid() = author_id);
CREATE POLICY "用户可以创建自己的文章" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "用户可以更新自己的文章" ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "用户可以删除自己的文章" ON posts FOR DELETE USING (auth.uid() = author_id);

-- Likes 策略
CREATE POLICY "公开查看所有点赞" ON likes FOR SELECT USING (true);
CREATE POLICY "登录用户可以点赞" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "用户可以取消自己的点赞" ON likes FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "任何人可以读取公开的用户资料"
ON profiles FOR SELECT
USING (true);

-- 插入默认分类
INSERT INTO categories (name, slug, description) VALUES
  ('前端', 'frontend', '前端开发相关技术文章'),
  ('后端', 'backend', '后端开发相关技术文章'),
  ('AI', 'ai', '人工智能与机器学习相关文章');
