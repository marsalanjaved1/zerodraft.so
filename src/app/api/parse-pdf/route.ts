'use server'

import { NextRequest, NextResponse } from 'next/server'

const LLAMA_CLOUD_API_URL = 'https://api.cloud.llamaindex.ai/api/v1/parsing'

export async function POST(request: NextRequest) {
    try {
        const apiKey = process.env.LLAMA_CLOUD_API_KEY
        if (!apiKey) {
            return NextResponse.json(
                { error: 'LLAMA_CLOUD_API_KEY not configured' },
                { status: 500 }
            )
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            )
        }

        // Step 1: Upload file to LlamaParse
        const uploadFormData = new FormData()
        uploadFormData.append('file', file)

        const uploadResponse = await fetch(`${LLAMA_CLOUD_API_URL}/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            body: uploadFormData,
        })

        if (!uploadResponse.ok) {
            const error = await uploadResponse.text()
            console.error('LlamaParse upload failed:', error)
            return NextResponse.json(
                { error: `Upload failed: ${error}` },
                { status: uploadResponse.status }
            )
        }

        const { id: jobId } = await uploadResponse.json()

        // Step 2: Poll for completion
        let result = null
        let attempts = 0
        const maxAttempts = 60 // Max 60 seconds

        while (attempts < maxAttempts) {
            const statusResponse = await fetch(`${LLAMA_CLOUD_API_URL}/job/${jobId}`, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            })

            if (!statusResponse.ok) {
                throw new Error(`Status check failed: ${await statusResponse.text()}`)
            }

            const statusData = await statusResponse.json()

            if (statusData.status === 'SUCCESS') {
                // Step 3: Get the result
                const resultResponse = await fetch(`${LLAMA_CLOUD_API_URL}/job/${jobId}/result/markdown`, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                    },
                })

                if (!resultResponse.ok) {
                    throw new Error(`Result fetch failed: ${await resultResponse.text()}`)
                }

                result = await resultResponse.json()
                break
            } else if (statusData.status === 'ERROR') {
                throw new Error(`Parsing failed: ${statusData.error || 'Unknown error'}`)
            }

            // Wait 1 second before next poll
            await new Promise(resolve => setTimeout(resolve, 1000))
            attempts++
        }

        if (!result) {
            return NextResponse.json(
                { error: 'Parsing timed out' },
                { status: 408 }
            )
        }

        return NextResponse.json({
            success: true,
            markdown: result.markdown || result.text || '',
            jobId,
        })

    } catch (error) {
        console.error('PDF parsing error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to parse PDF' },
            { status: 500 }
        )
    }
}
