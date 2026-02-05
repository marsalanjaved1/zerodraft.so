
-- Add support for folders and hierarchy
alter table documents add column if not exists type text default 'file' check (type in ('file', 'folder'));
alter table documents add column if not exists parent_id uuid references documents(id) on delete cascade;

-- Verify policy to ensure recursion works or is not blocked (standard RLS usually fine with self-referencing if based on workspace_id which is on the row)
-- ensuring parent_id belongs to same workspace would be good application logic or deeper check, 
-- but existing policy checks workspace_id on the row itself, so as long as we set workspace_id correctly for children, it's fine.
