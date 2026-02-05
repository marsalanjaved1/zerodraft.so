
# Open Source Setup Guide

To run this project locally with your own Supabase instance:

1.  **Create a Supabase Project**
    - Go to [database.new](https://database.new) and create a new project.

2.  **Get Credentials**
    - In your Supabase Dashboard, go to **Project Settings** -> **API**.
    - Copy the `Project URL` and `anon public` key.

3.  **Configure Environment Variables**
    - Copy `.env.local.example` to `.env.local`.
    - Update the variables:
        ```env
        NEXT_PUBLIC_SUPABASE_URL=your-project-url
        NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
        SUPABASE_SERVICE_ROLE_KEY=your-service-role-key # Optional, for admin tasks
        OPENROUTER_API_KEY=your-openrouter-key # Required for AI features
        ```

4.  **Storage Setup**

    1.  Format the `storage/schema.sql` (or `migrations/20240205_storage_policies.sql`) in your SQL Editor.
    2.  Ensure you have a bucket named `workspace-files`.
    3.  Run the following SQL to enable access:

    ```sql
    -- Insert Policy
    create policy "Authenticated users can upload workspace files"
    on storage.objects for insert
    to authenticated
    with check ( bucket_id = 'workspace-files' AND auth.uid() = owner );

    -- Select Policy
    create policy "Authenticated users can view workspace files"
    on storage.objects for select
    to authenticated
    using ( bucket_id = 'workspace-files' );
    ```

5.  **Run Database Migrations**
    - Go to the **SQL Editor** in your Supabase Dashboard.
    - Copy the contents of `supabase/schema.sql` from this repository.
    - Paste and run the SQL query to set up the tables and policies.

6.  **Create Storage Bucket**
    - Go to **Storage** in your Supabase Dashboard.
    - Create a new bucket named `workspace-files`.
    - Add a policy to allow authenticated users to upload/view their files (see `supabase/schema.sql` comments for guidance).

6.  **Run the App**
    - `npm install`
    - `npm run dev`
