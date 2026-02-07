import { test, expect } from '@playwright/test';

test('AI can find and create a file (Reasoning Loop)', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Enter workspace
    const workspaceCard = page.locator('.workspace-card').first();
    if (await workspaceCard.isVisible()) {
        await workspaceCard.click();
    }

    // Open Agent Panel
    await page.click('button[aria-label="Open AI Agent"]');

    // Prompt: Level 2 task - Create a file
    const prompt = "Create a new file called 'meeting_agenda.md' with today's date and a list of 3 items.";
    await page.fill('textarea[placeholder*="Ask AI"]', prompt);
    await page.keyboard.press('Enter');

    // Verify multiple steps:
    // 1. "Thinking..."
    await page.waitForSelector('text=Thinking...', { timeout: 10000 });

    // 2. Tool execution: fs_create_file or fs_write_file
    // The panel shows "Writing to file" or similar
    await page.waitForSelector('text=Writing to file', { timeout: 20000 });

    // 3. Tool Completion
    await page.waitForSelector('.tool-call-card.completed', { timeout: 10000 });

    // 4. File Explorer update? 
    // We can check if the file appears in the file explorer sidebar
    // Selector might be specific to file node
    await page.waitForSelector('text=meeting_agenda.md', { timeout: 10000 });

    console.log("File creation verified!");
});
