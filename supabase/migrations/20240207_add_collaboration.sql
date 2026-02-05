-- Migration: Add collaboration features - sharing, permissions, comments
-- Run this in Supabase SQL Editor

-- Workspace members table for sharing
CREATE TABLE IF NOT EXISTS workspace_members (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
    invited_by uuid REFERENCES auth.users(id),
    invited_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    accepted_at timestamp with time zone,
    UNIQUE(workspace_id, user_id)
);

-- Share links for public/link sharing
CREATE TABLE IF NOT EXISTS share_links (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
    document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
    created_by uuid REFERENCES auth.users(id) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at timestamp with time zone,
    access_level text NOT NULL DEFAULT 'view' CHECK (access_level IN ('view', 'comment', 'edit')),
    password_hash text,
    is_active boolean DEFAULT true,
    view_count integer DEFAULT 0,
    token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    CHECK (workspace_id IS NOT NULL OR document_id IS NOT NULL)
);

-- Document comments
CREATE TABLE IF NOT EXISTS comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
    content text NOT NULL,
    position_start integer,
    position_end integer,
    resolved_at timestamp with time zone,
    resolved_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Document versions for history
CREATE TABLE IF NOT EXISTS document_versions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id uuid REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    content jsonb NOT NULL,
    title text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    version_number integer NOT NULL,
    change_summary text,
    UNIQUE(document_id, version_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_comments_document ON comments(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_document ON document_versions(document_id, version_number DESC);

-- RLS Policies for workspace_members
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of workspaces they belong to"
    ON workspace_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm
            WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM workspaces w
            WHERE w.id = workspace_members.workspace_id
            AND w.owner_id = auth.uid()
        )
    );

CREATE POLICY "Workspace owners can manage members"
    ON workspace_members FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspaces w
            WHERE w.id = workspace_members.workspace_id
            AND w.owner_id = auth.uid()
        )
    );

-- RLS Policies for share_links
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own share links"
    ON share_links FOR ALL
    USING (created_by = auth.uid());

CREATE POLICY "Users can view share links for their workspaces"
    ON share_links FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspaces w
            WHERE w.id = share_links.workspace_id
            AND w.owner_id = auth.uid()
        )
    );

-- RLS Policies for comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on documents they can access"
    ON comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN workspaces w ON w.id = d.workspace_id
            WHERE d.id = comments.document_id
            AND (
                w.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM workspace_members wm
                    WHERE wm.workspace_id = w.id
                    AND wm.user_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can create comments on documents they can access"
    ON comments FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM documents d
            JOIN workspaces w ON w.id = d.workspace_id
            WHERE d.id = comments.document_id
            AND (
                w.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM workspace_members wm
                    WHERE wm.workspace_id = w.id
                    AND wm.user_id = auth.uid()
                    AND wm.role IN ('owner', 'editor')
                )
            )
        )
    );

CREATE POLICY "Users can edit their own comments"
    ON comments FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments"
    ON comments FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for document_versions
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view versions of documents they can access"
    ON document_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM documents d
            JOIN workspaces w ON w.id = d.workspace_id
            WHERE d.id = document_versions.document_id
            AND (
                w.owner_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM workspace_members wm
                    WHERE wm.workspace_id = w.id
                    AND wm.user_id = auth.uid()
                )
            )
        )
    );

-- Function to auto-create version on document update
CREATE OR REPLACE FUNCTION create_document_version()
RETURNS TRIGGER AS $$
DECLARE
    next_version integer;
BEGIN
    -- Only create version if content changed
    IF OLD.content IS DISTINCT FROM NEW.content THEN
        SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
        FROM document_versions
        WHERE document_id = NEW.id;
        
        INSERT INTO document_versions (document_id, user_id, content, title, version_number)
        VALUES (NEW.id, auth.uid(), OLD.content, OLD.title, next_version);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-versioning
DROP TRIGGER IF EXISTS document_version_trigger ON documents;
CREATE TRIGGER document_version_trigger
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION create_document_version();
