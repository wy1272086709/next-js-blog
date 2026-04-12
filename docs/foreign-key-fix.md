# Foreign Key Constraint Fix

## Problem

When users try to submit comments, they encounter the following error:

```
Key is not present in table "profiles".
```

This error occurs because:
1. The `comments` table has a foreign key constraint `comments_author_id_fkey` that references `profiles(id)`
2. When a comment is submitted, the code uses `user.id` (from `auth.users`) as the `author_id`
3. But if that user doesn't have a corresponding record in the `profiles` table, the insert fails

## Solution

The fix involves three components:

### 1. Profile Creation Utility

Created `lib/utils/profiles.ts` with a function to ensure user profiles exist:

```typescript
export async function ensureUserProfile(userId: string) {
  const supabase = await createServerClient()

  // Check if profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single()

  // If profile doesn't exist, create it
  if (!profile) {
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        username: `用户${userId.slice(-6)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (error) throw error
  }

  return profile
}
```

### 2. Updated Comment Submission Logic

Modified `components/comment-section.tsx` to check/create profiles before submitting comments:

```typescript
// Before inserting comment, ensure profile exists
try {
  await ensureUserProfile(user.id)
} catch (error) {
  console.error('Error creating user profile:', error)
  return
}
```

### 3. Database Trigger

Created `scripts/003-create-profile-trigger.sql` to automatically create profiles when users sign up:

```sql
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
```

## Migration Steps

1. Run the SQL script to create the trigger:
   ```bash
   supabase db execute scripts/003-create-profile-trigger.sql
   ```

2. Update the comment submission component to use the new profile check

3. Ensure existing users have profiles:
   ```sql
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
   ```

## Testing

After applying the fix:
1. New users who sign up will automatically get profiles created
2. Existing users who try to comment will have profiles created on-demand
3. Comment submissions should work without foreign key errors