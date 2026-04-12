-- 创建触发器函数：当新用户注册时自动创建对应的 profiles 记录
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', '用户' || substring(NEW.id from 9 for 6)),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器：在 auth.users 表插入新记录时自动调用
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 更新现有用户，确保他们都有 profiles 记录
-- 这应该一次性执行，为所有现有用户创建 profiles
INSERT INTO public.profiles (id, username, created_at, updated_at)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'username', '用户' || substring(id from 9 for 6)),
  NOW(),
  NOW()
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE profiles.id = auth.users.id
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);