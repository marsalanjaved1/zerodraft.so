# ZeroDraft AI Agent Test Cases

This document outlines scenarios to verify the AI Agent's "Antigravity" capabilities—specifically its ability to autonomously explore, read, and manipulate the workspace using the `fs_*` toolset.

## 🟢 Level 1: Basic Exploration (Single Tool)
These tests verify that basic server-side tools are functioning correctly.

### 1. File Listing
- **Prompt:** "List all files in the current workspace."
- **Expected Behavior:** Agent calls `fs_list_workplace` and displays a list of files.
- **Success Criteria:** Response contains correct file names (e.g., `welcome.md`, `PRD.docx`).

### 2. File Reading
- **Prompt:** "Read the content of `welcome.md`."
- **Expected Behavior:** Agent calls `fs_read_file` with the correct path/name.
- **Success Criteria:** Response displays the actual text content of the file.

### 3. Content Search
- **Prompt:** "Search for any file that mentions 'competitor'."
- **Expected Behavior:** Agent calls `fs_search_content` with query "competitor".
- **Success Criteria:** Agent returns a list of files (and snippets) containing the term.

---

## 🟡 Level 2: Content Creation & Manipulation
These tests verify the Agent's ability to modify the file system.

### 4. Create New File
- **Prompt:** "Create a new file called `notes/ideas.md` with a list of 3 app ideas."
- **Expected Behavior:** Agent calls `fs_create_file` (or `fs_write_file`).
- **Success Criteria:** File appears in the file explorer (if real-time) or subsequent `fs_list` confirms its existence.

### 5. Rename/Move (Multi-step)
- **Prompt:** "Rename `notes/ideas.md` to `notes/brainstorming.md`."
- **Expected Behavior:** Since there is no direct rename tool, Agent should infer `fs_read` -> `fs_create` (new name) -> `fs_delete` (old name), or `fs_move` if implemented.
- **Success Criteria:** `ideas.md` is gone, `brainstorming.md` exists with same content.

---

## 🔴 Level 3: Complex Reasoning (The "Antigravity" Loop)
These tests require the Agent to "think", chain multiple tools, and maintain context.

### 6. "Find and Fix" (Research -> Edit)
- **Prompt:** "I think there's a typo in the PRD about the 'Login' feature. Can you find the PRD file and fix it to say 'Single Sign-On' instead?"
- **Expected Chain:**
    1.  **Thought:** "I need to find the PRD file first."
    2.  **Action:** `fs_find_file(pattern="PRD")`
    3.  **Observation:** Found `docs/PRD.md`.
    4.  **Action:** `fs_read_file(path="docs/PRD.md")`
    5.  **Action:** `suggest_edit(original="Login feature", suggested="Single Sign-On feature")`
- **Success Criteria:** Agent locates the file without being told the exact path, reads it, and proposes the correct inline edit.

### 7. Contextual Analysis (Read Multiple -> Synthesize)
- **Prompt:** "Read the `api_config.json` and the `frontend_constants.ts` and tell me if the API endpoints match."
- **Expected Chain:**
    1.  `fs_read_file("api_config.json")`
    2.  `fs_read_file("frontend_constants.ts")`
    3.  **Synthesize:** Compare the contents in memory.
- **Success Criteria:** Agent reads both files and provides a logical comparison.

### 8. Ambiguous Request (Clarification)
- **Prompt:** "Update the user profile component."
- **Expected Behavior:** Agent should NOT just guess. It should check if multiple files match "user profile" or ask which aspect to update.
- **Expected Chain:**
    1.  `fs_find_file("user profile")` or `fs_search_content("user profile")`
    2.  **Response:** "I found `UserProfile.tsx` and `UserProfile.css`. Which one specifically do you want me to update, and what changes are needed?"

---

## 🟣 Level 4: "Power User" Workflow
Tests the full loop of detailed interaction.

### 9. Feature Implementation Plan
- **Prompt:** "I want to add a 'Dark Mode' toggle. Check the `globals.css` to see our variables, then check the `Header.tsx` component, and propose a plan."
- **Expected Chain:**
    1.  `fs_read_file("globals.css")`
    2.  `fs_read_file("Header.tsx")`
    3.  **Response:** "I've checked the CSS variables and the Header component. Here is a plan to implement Dark Mode: ..."

---

## 🔵 Complex Test Cases for Debugging

These tests specifically target the "think -> act" loop with multiple tool calls.

### Test A: Create-Then-Find
- **Step 1 Prompt:** "Create a file called 'test_login.md' with the content: 'The Login feature is essential for security.'"
- **Step 1 Expected:** Agent calls `fs_write_file` and confirms creation.
- **Step 2 Prompt:** "Now find the file you just created and change 'Login' to 'SSO'."
- **Step 2 Expected Chain:**
    1.  `fs_search_content("Login")` OR `fs_find_file("test_login")`
    2.  `fs_read_file("test_login.md")`
    3.  `suggest_edit(original="Login", suggested="SSO")`
- **Why This Works:** The Agent creates the file in Supabase first, so it can find it later.

### Test B: Multi-File Read and Synthesize
- **Prompt:** "Read the PRD and the meeting agenda and tell me if they are aligned."
- **Expected Chain:**
    1.  `fs_find_file("PRD")`
    2.  `fs_read_file("PRD.docx")`
    3.  `fs_find_file("agenda")`
    4.  `fs_read_file("meeting_agenda.md")`
    5.  **Synthesize:** Compare contents and provide analysis.
- **Success Criteria:** Agent reads both files and provides a logical comparison.

### Test C: Search-Then-Edit
- **Prompt:** "Search all files for the word 'competitor' and summarize what you find."
- **Expected Chain:**
    1.  `fs_search_content("competitor")`
    2.  **Response:** List of files and snippets containing "competitor".

### Test D: Clarification Request
- **Prompt:** "Update the config file."
- **Expected Behavior:** Agent should ask for clarification (which config? what changes?).
- **Success Criteria:** Agent does NOT blindly try to edit, but asks questions first.

### Test E: Full Edit Loop (End-to-End)
- **Step 1:** Ask Agent to create `notes/typo_test.md` with content "The Lgoin feature is broken."
- **Step 2:** Ask Agent to "Find and fix the typo in the notes folder."
- **Expected:** Agent finds the file, reads it, and suggests "Lgoin" -> "Login".
