
-- Create a table for public profiles using the auth.users table properties
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,

  constraint username_length check (char_length(username) >= 3)
);

-- Set up Row Level Security!
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- This triggers a function every time a user is created
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Workspaces
create table workspaces (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    name text not null,
    owner_id uuid references auth.users not null
);

alter table workspaces enable row level security;

create policy "Users can populate their own workspaces"
    on workspaces for insert
    with check ( auth.uid() = owner_id );

create policy "Users can view workspaces they own"
    on workspaces for select
    using ( auth.uid() = owner_id );

create policy "Users can update workspaces they own"
    on workspaces for update
    using ( auth.uid() = owner_id );

create policy "Users can delete workspaces they own"
    on workspaces for delete
    using ( auth.uid() = owner_id );

-- Documents
create table documents (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    workspace_id uuid references workspaces(id) on delete cascade not null,
    title text default 'Untitled',
    content jsonb,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table documents enable row level security;

-- Policies for Documents (Child of Workspaces)
-- We check if the user is the owner of the parent workspace
create policy "Users can create documents in their workspaces"
    on documents for insert
    with check (
        exists (
            select 1 from workspaces
            where workspaces.id = documents.workspace_id
            and workspaces.owner_id = auth.uid()
        )
    );

create policy "Users can view documents in their workspaces"
    on documents for select
    using (
        exists (
            select 1 from workspaces
            where workspaces.id = documents.workspace_id
            and workspaces.owner_id = auth.uid()
        )
    );

create policy "Users can update documents in their workspaces"
    on documents for update
    using (
        exists (
            select 1 from workspaces
            where workspaces.id = documents.workspace_id
            and workspaces.owner_id = auth.uid()
        )
    );

create policy "Users can delete documents in their workspaces"
    on documents for delete
    using (
        exists (
            select 1 from workspaces
            where workspaces.id = documents.workspace_id
            and workspaces.owner_id = auth.uid()
        )
    );

-- Storage Bucket Setup (This usually needs to be done in Supabase Dashboard, but documenting policies here)
-- Bucket name: 'workspace-files'

-- policy: "Workspace owners can upload files"
-- storage.objects for insert
-- with check ( bucket_id = 'workspace-files' and auth.uid() = owner ) 
-- Note: 'owner' column in storage.objects is the user uuid who uploaded it.

-- For more complex permissioning (sharing workspaces), we'd need a workspace_members table.
-- But for "Users can login, have workspaces(s), create new workspace," this simpler model works first.
