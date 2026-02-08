<div align="center">

# zerodraft.so
### The Agentic AI Editor.

<p align="center">
  <img src="public/images/agent_demo.gif" alt="ZeroDraft Agent Working" width="100%">
</p>

### "It's basically Cursor, but for docs."

[Get Started](#quick-start) · [Roadmap](ROADMAP.md) · [Contribute](CONTRIBUTING.md)

</div>

---

## What is this?

**ZeroDraft** is an open-source document workspace with an embedded AI agent that lives in your file system.

Most AI writing tools just chat. You copy-paste context, get a response, and paste it back. It's friction.

ZeroDraft works differently. The agent has **tools**. It can:
- **Read** your entire project to understand context.
- **Write** new files (PRDs, specs, blog posts) directly.
- **Edit** existing documents without you lifting a finger.

It's a local-first, privacy-focused workspace for deep work.

## Features

- 🤖 **Agentic Workflow**: Don't just prompt. Give commands. "Read the transcripts in /Research and write a memo in /Drafts."
- 📂 **File System Integration**: Real folders, real files. No abstract "knowledge base" silos.
- 🔒 **Local First**: Your data stays on your machine (or your own Supabase instance). Bring your own keys.
- ⚡ **Rich Text Editor**: A Notion-style editor built for long-form writing, not just chat bubbles.
- 🛠️ **Open Source**: MIT Licensed. Hack it, extend it, make it yours.

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase Account (for auth/database)
- OpenRouter API Key (for LLMs)

### 1. Clone & Install
```bash
git clone https://github.com/marsalanjaved1/zerodraft.so.git
cd zerodraft
npm install
```

### 2. Environment Setup
Copy the example env file:
```bash
cp .env.local.example .env.local
```

Fill in your keys in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
OPENROUTER_API_KEY=your_key
```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

- `/src/components/editor`: The Tiptap-based rich text editor.
- `/src/lib/agent`: The LangChain agent logic and tool definitions.
- `/src/app/api/chat`: The Vercel AI SDK route handling streaming responses.

## Contributing

We love contributors! Whether it's fixing bugs, adding new agent tools, or improving the UI.

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to get started.

## Roadmap

We are building the future of AI-assisted writing. Check out [ROADMAP.md](ROADMAP.md) to see what's coming next (PDF reading, Web Search, and more).

## License

MIT © [Arsalan Javed](https://twitter.com/arsalanjaved)
