-- Migration: Add tags, favorites, and metadata to documents
-- Run this in Supabase SQL Editor

-- Add new columns to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_opened_at timestamp with time zone;

-- Create index for faster tag searches
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);

-- Create index for favorites filtering
CREATE INDEX IF NOT EXISTS idx_documents_favorite ON documents(is_favorite) WHERE is_favorite = true;

-- Create index for recent files ordering
CREATE INDEX IF NOT EXISTS idx_documents_last_opened ON documents(last_opened_at DESC NULLS LAST);

-- Optional: Create a templates table
CREATE TABLE IF NOT EXISTS templates (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    content jsonb,
    description text,
    icon text DEFAULT '📄'
);

-- RLS for templates
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create templates in their workspaces"
    ON templates FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = templates.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view templates in their workspaces"
    ON templates FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = templates.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update templates in their workspaces"
    ON templates FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = templates.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete templates in their workspaces"
    ON templates FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = templates.workspace_id
            AND workspaces.owner_id = auth.uid()
        )
    );
