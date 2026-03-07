-- 将 posts.author_id 从引用 auth.users 改为引用 profiles
-- 这样 Supabase/PostgREST 才能正确识别 posts -> profiles 的关联，支持 profiles:author_id 嵌入查询
--
-- 执行前请确保：所有 posts 的 author_id 在 profiles 表中都有对应记录
-- 若有缺失，可先执行：INSERT INTO profiles (id, username) SELECT DISTINCT author_id, '用户' FROM posts ON CONFLICT (id) DO NOTHING;

-- 1. 删除原有的 author_id -> auth.users 外键
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_author_id_fkey;

-- 2. 添加 author_id -> profiles 外键（profiles.id 与 auth.users.id 相同，数据兼容）
ALTER TABLE posts
  ADD CONSTRAINT posts_author_id_profiles_fkey
  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
