
const LLAMA_CLOUD_API_URL = 'https://api.cloud.llamaindex.ai/api/v1/parsing';

export async function parsePdfWithLlamaCloud(file: File | Blob): Promise<string> {
    const apiKey = process.env.LLAMA_CLOUD_API_KEY;
    if (!apiKey) {
        throw new Error('LLAMA_CLOUD_API_KEY not configured');
    }

    // Step 1: Upload file to LlamaParse
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const uploadResponse = await fetch(`${LLAMA_CLOUD_API_URL}/upload`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
        body: uploadFormData,
    });

    if (!uploadResponse.ok) {
        const error = await uploadResponse.text();
        console.error('LlamaParse upload failed:', error);
        throw new Error(`Upload failed: ${error}`);
    }

    const { id: jobId } = await uploadResponse.json();

    // Step 2: Poll for completion
    let result = null;
    let attempts = 0;
    const maxAttempts = 60; // Max 60 seconds

    while (attempts < maxAttempts) {
        const statusResponse = await fetch(`${LLAMA_CLOUD_API_URL}/job/${jobId}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });

        if (!statusResponse.ok) {
            throw new Error(`Status check failed: ${await statusResponse.text()}`);
        }

        const statusData = await statusResponse.json();

        if (statusData.status === 'SUCCESS') {
            // Step 3: Get the result
            const resultResponse = await fetch(`${LLAMA_CLOUD_API_URL}/job/${jobId}/result/markdown`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            });

            if (!resultResponse.ok) {
                throw new Error(`Result fetch failed: ${await resultResponse.text()}`);
            }

            result = await resultResponse.json();
            break;
        } else if (statusData.status === 'ERROR') {
            throw new Error(`Parsing failed: ${statusData.error || 'Unknown error'}`);
        }

        // Wait 1 second before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
    }

    if (!result) {
        throw new Error('Parsing timed out');
    }

    return result.markdown || result.text || '';
}
