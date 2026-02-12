-- Document Versioning System
-- Stores snapshots of document content at each edit, enabling history/undo

create table if not exists document_versions (
    id uuid default gen_random_uuid() primary key,
    document_id uuid references documents(id) on delete cascade not null,
    version_number integer not null,
    content text,
    title text,
    created_by text default 'agent', -- 'agent' or 'user'
    change_summary text, -- brief description of what changed
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Composite unique constraint: one version number per document
create unique index if not exists idx_doc_versions_unique on document_versions(document_id, version_number);
-- Fast lookups by document
create index if not exists idx_doc_versions_document on document_versions(document_id);

-- RLS: inherit access from parent document via workspace ownership
alter table document_versions enable row level security;

create policy "Users can view versions of their documents"
    on document_versions for select
    using (
        exists (
            select 1 from documents d
            join workspaces w on w.id = d.workspace_id
            where d.id = document_versions.document_id
            and w.owner_id = auth.uid()
        )
    );

create policy "Users can insert versions of their documents"
    on document_versions for insert
    with check (
        exists (
            select 1 from documents d
            join workspaces w on w.id = d.workspace_id
            where d.id = document_versions.document_id
            and w.owner_id = auth.uid()
        )
    );

create policy "Users can delete versions of their documents"
    on document_versions for delete
    using (
        exists (
            select 1 from documents d
            join workspaces w on w.id = d.workspace_id
            where d.id = document_versions.document_id
            and w.owner_id = auth.uid()
        )
    );
