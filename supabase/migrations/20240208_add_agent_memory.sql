-- Agent Memory (Reflection) System
-- Stores extracted user preferences, style insights, and factual knowledge

create table if not exists agent_memories (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users on delete cascade not null,
    workspace_id uuid references workspaces(id) on delete cascade,
    category text not null check (category in ('style', 'preference', 'fact', 'instruction')),
    content text not null,
    source text, -- e.g. 'reflection', 'explicit' (user told us directly)
    confidence real default 0.8, -- 0.0 to 1.0, how confident we are in this memory
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast lookups
create index if not exists idx_agent_memories_user_id on agent_memories(user_id);
create index if not exists idx_agent_memories_workspace on agent_memories(workspace_id);
create index if not exists idx_agent_memories_category on agent_memories(category);

-- RLS
alter table agent_memories enable row level security;

create policy "Users can view their own memories"
    on agent_memories for select
    using ( auth.uid() = user_id );

create policy "Users can insert their own memories"
    on agent_memories for insert
    with check ( auth.uid() = user_id );

create policy "Users can update their own memories"
    on agent_memories for update
    using ( auth.uid() = user_id );

create policy "Users can delete their own memories"
    on agent_memories for delete
    using ( auth.uid() = user_id );
