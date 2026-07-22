-- Like totals are public article metadata. Mutations remain restricted to the
-- authenticated user's own rows by the existing INSERT and DELETE policies.
DROP POLICY IF EXISTS "Users can view their own likes" ON post_likes;
DROP POLICY IF EXISTS "Anyone can view post likes" ON post_likes;

CREATE POLICY "Anyone can view post likes" ON post_likes
  FOR SELECT USING (true);
