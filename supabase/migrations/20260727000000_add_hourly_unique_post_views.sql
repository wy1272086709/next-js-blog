CREATE TABLE IF NOT EXISTS public.post_view_windows (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, ip_hash)
);

CREATE INDEX IF NOT EXISTS idx_post_view_windows_viewed_at
  ON public.post_view_windows(viewed_at);

ALTER TABLE public.post_view_windows ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.register_post_view(
  p_post_id UUID,
  p_ip_hash TEXT
)
RETURNS TABLE(counted BOOLEAN, current_view_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.posts
    WHERE id = p_post_id AND published = TRUE
  ) THEN
    RETURN QUERY SELECT FALSE, NULL::INTEGER;
    RETURN;
  END IF;

  RETURN QUERY
  WITH accepted AS (
    INSERT INTO public.post_view_windows (post_id, ip_hash, viewed_at)
    VALUES (p_post_id, p_ip_hash, NOW())
    ON CONFLICT (post_id, ip_hash) DO UPDATE
      SET viewed_at = EXCLUDED.viewed_at
      WHERE post_view_windows.viewed_at <= NOW() - INTERVAL '1 hour'
    RETURNING 1
  ),
  updated AS (
    UPDATE public.posts AS post
    SET view_count = COALESCE(post.view_count, 0) + 1
    WHERE post.id = p_post_id
      AND EXISTS (SELECT 1 FROM accepted)
    RETURNING post.view_count
  )
  SELECT
    EXISTS (SELECT 1 FROM accepted),
    COALESCE(
      (SELECT updated.view_count FROM updated),
      (SELECT post.view_count FROM public.posts AS post WHERE post.id = p_post_id),
      0
    );
END;
$$;

REVOKE ALL ON FUNCTION public.register_post_view(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_post_view(UUID, TEXT) TO anon, authenticated;

