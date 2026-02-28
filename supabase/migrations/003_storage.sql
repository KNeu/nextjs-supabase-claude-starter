-- =============================================================================
-- Migration 003: Storage Buckets & Policies
-- =============================================================================
-- Creates Supabase Storage buckets for user avatars.
-- Bucket policies follow the same least-privilege principle as RLS.
-- =============================================================================

-- =============================================================================
-- AVATARS BUCKET
-- Stores user profile pictures. Images are publicly readable (for display)
-- but only the owner can upload/replace/delete their own avatar.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,    -- publicly readable so avatar URLs work in <img> tags without auth
  2097152, -- 2 MB limit per file
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Allow authenticated users to upload avatars to their own folder
-- File path convention: avatars/{user_id}/avatar.{ext}
create policy "avatars: upload own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update (replace) their own avatar
create policy "avatars: update own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own avatar
create policy "avatars: delete own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read (bucket is public=true, but policy is still required)
create policy "avatars: public read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
