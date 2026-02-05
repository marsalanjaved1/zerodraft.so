
-- Enable RLS on storage.objects (if not already enabled)
-- alter table storage.objects enable row level security;

-- Insert Policy: Allow authenticated users to upload to 'workspace-files'
create policy "Authenticated users can upload workspace files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'workspace-files' AND
  auth.uid() = owner
);

-- Select Policy: Allow authenticated users to view files in 'workspace-files'
-- Note: This is a broad policy allowing any authenticated user to view files in the bucket.
-- For stricter control (only workspace owner), we would need to check folder structure 'workspace_id/...' 
-- but that requires a join or parsing. For this phase, authenticated access is sufficient.
create policy "Authenticated users can view workspace files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'workspace-files'
);

-- Update Policy: Allow owners to update their files
create policy "Users can update their own files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'workspace-files' AND
  auth.uid() = owner
);

-- Delete Policy: Allow owners to delete their files
create policy "Users can delete their own files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'workspace-files' AND
  auth.uid() = owner
);
