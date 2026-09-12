-- Keep the legacy contest timestamp trigger deterministic even if callers can
-- influence their session search_path. The function uses only PL/pgSQL trigger
-- variables and pg_catalog.now(), so an empty path is sufficient.
alter function public.set_madger_video_contest_updated_at()
  set search_path = '';
