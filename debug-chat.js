// Native fetch in Node 18+

// Native fetch in Node 18+
const POST = async (messages) => {
    const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            messages,
            projectId: 'default-project',
            model: 'anthropic/claude-haiku-4.5'
        })
    });

    if (!response.ok) {
        console.error('Error:', response.status, await response.text());
        return null;
    }

    return response.body; // Stream
};

async function run() {
    console.log("--- Step 1: User Request 'Read PRD' ---");
    const messages = [{ role: 'user', content: 'Read the PRD' }];

    const stream1 = await POST(messages);
    if (!stream1) return;

    let buffer = '';
    let toolCallData = null;
    let assistantContent = "";

    for await (const chunk of stream1) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line

        for (const line of lines) {
            console.log('Received:', line);
            if (line.startsWith('9:')) {
                toolCallData = JSON.parse(line.slice(2));
                console.log("-> Tool Proposal Detected:", toolCallData);
            } else if (line.startsWith('0:')) {
                assistantContent += JSON.parse(line.slice(2));
            }
        }
    }

    if (!toolCallData) {
        console.error("No tool call proposed!");
        return;
    }

    console.log("\n--- Step 2: Approving Tool Call ---");
    // Construct history with the detected tool call
    // Note: In route.ts we sanitized this, so we should mimic what frontend sends
    const history = [
        ...messages,
        {
            role: 'assistant',
            content: assistantContent,
            tool_calls: [ // Frontend sends strictly typed array map
                {
                    id: toolCallData.toolCallId,
                    type: 'function',
                    function: {
                        name: toolCallData.toolName,
                        arguments: JSON.stringify(toolCallData.args)
                    }
                }
            ],
            // Frontend sends these for mapping, but route.ts might clean them
            toolCallId: toolCallData.toolCallId,
            tool_call_id: toolCallData.toolCallId
        }
    ];

    console.log("Sending History Payload:", JSON.stringify(history, null, 2));

    const stream2 = await POST(history);
    if (!stream2) return;

    let buffer2 = '';
    for await (const chunk of stream2) {
        buffer2 += chunk.toString();
        const lines = buffer2.split('\n');
        buffer2 = lines.pop();

        for (const line of lines) {
            console.log('Received (Step 2):', line);
        }
    }
}

run().catch(console.error);
