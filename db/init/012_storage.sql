-- Uploaded files (transfer receipts, group photos, avatars) live in Supabase Storage, in one PRIVATE bucket:
-- archivos/comprobantes/<pedido>-<ms>.<ext>, archivos/grupos/<uuid>.<ext>, archivos/avatares/<uuid>.<ext>.
-- Only the server touches it, with the secret key (lib/uploads.ts); it serves files through /api/* after checking the
-- app's own session and role. No storage.objects policies on purpose: anon/authenticated can't read or write anything.
-- Size and type limits are enforced here too, not only in the app. No-op without Supabase Storage (local docker).
-- Idempotent.

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL THEN RETURN; END IF;
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('archivos', 'archivos', false, 10 * 1024 * 1024,
          ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
  ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit,
                                 allowed_mime_types = EXCLUDED.allowed_mime_types;
END $$;
