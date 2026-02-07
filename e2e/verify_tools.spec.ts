import { test, expect } from '@playwright/test';

test('AI can list files using fs_list_workplace', async ({ page }) => {
    // 1. Navigate to the workspace (assuming a dev workspace exists or we create one)
    // For simplicity, we'll try to use an existing one or just go to root and click one
    await page.goto('http://localhost:3000');

    // Wait for workspace list or login
    // Assuming auto-login or public
    await page.waitForTimeout(2000);

    // Click on a workspace if available, or create new
    // We'll assume the URL 'http://localhost:3000/w/DEV-123' works if we know an ID?
    // Let's just click the first workspace card
    const workspaceCard = page.locator('.workspace-card').first();
    if (await workspaceCard.isVisible()) {
        await workspaceCard.click();
    } else {
        // Create new workspace if needed?
        // Let's assume there's at least one.
        // Or just go to /login? 
        // Let's log to console
        console.log("No workspace card found, trying direct navigation or asserting failure");
    }

    await page.waitForSelector('.agent-panel-toggle', { timeout: 5000 }).catch(() => {
        // Maybe we need to sign in?
        // This test assumes authenticated session or dev environment
    });

    // Open Agent Panel
    await page.click('button[aria-label="Open AI Agent"]'); // Adjust selector as needed

    // Type query
    await page.fill('textarea[placeholder*="Ask AI"]', 'List all files in this workspace');
    await page.keyboard.press('Enter');

    // Wait for "Thinking..."
    await page.waitForSelector('text=Thinking...', { timeout: 5000 });

    // Wait for "Listing files" tool execution status
    // Our component shows "Listing files" when fs_list_directory is running/completed
    await page.waitForSelector('text=Listing files', { timeout: 15000 });

    // Wait for tool completion (green checkmark or "completed" class)
    // .tool-call-card.completed
    await page.waitForSelector('.tool-call-card.completed', { timeout: 10000 });

    // Wait for final response
    // It should contain file names like "welcome.md" or similar
    await page.waitForSelector('.agent-message', { timeout: 10000 });

    const response = await page.textContent('.agent-message');
    console.log("AI Response:", response);

    expect(response).toContain("Here are the files"); // Or similar generic response
});
