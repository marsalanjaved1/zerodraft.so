
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
    const bucketName = 'workspace-files';

    console.log(`Checking if bucket '${bucketName}' exists...`);
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
        console.error("Error listing buckets:", listError);
        return;
    }

    const bucket = buckets.find(b => b.name === bucketName);

    if (bucket) {
        console.log(`Bucket '${bucketName}' already exists.`);
        // Assuming policies are handled elsewhere or manually, but we can verify public toggle
        if (bucket.public !== true) {
            console.log(`Updating bucket '${bucketName}' to be public...`);
            const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
                public: true
            });
            if (updateError) console.error("Error updating bucket:", updateError);
            else console.log("Bucket updated to public.");
        }
    } else {
        console.log(`Bucket '${bucketName}' not found. Creating...`);
        const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
            public: true, // We want public URLs for current implementation
            fileSizeLimit: 10485760, // 10MB limit example
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        });

        if (createError) {
            console.error("Error creating bucket:", createError);
            return;
        }
        console.log(`Bucket '${bucketName}' created successfully.`);
    }

    // Note: Creating RLS policies for storage usually requires SQL execution via Dashboard or migrations.
    // The Service Role key bypasses RLS, so this script works. 
    // BUT user uploads from the client (or Next.js actions using user auth) WILL fail if policies aren't there.
    // Since our 'importDocument' action runs on the server, does it use the Service Role or the User Client?
    // Let's check: src/lib/supabase/server.ts usually uses the User's session.
    // If it uses the User session, we NEED storage policies.
}

setupStorage();
