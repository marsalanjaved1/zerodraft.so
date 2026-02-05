<div align="center">

# zerodraft.so

### Your documents. Your AI. One workspace.

[Get Started](#quick-start) · [How It Works](#how-it-works) · [Documentation](SETUP.md)

---

</div>

## What is this?

**zerodraft** is a document workspace with an embedded AI that can read, write, and edit your files directly.

No extensions. No plugins. No "paste your document here." 

You open a file. You ask the AI to do something with it. It does it.

---

## How It Works

The AI has four tools:

| Tool | What it does |
|------|-------------|
| `read` | Opens and reads any file in your workspace |
| `write` | Creates a new file with content you specify |
| `update` | Finds and replaces text in existing files |
| `list` | Shows all files in your workspace |

That's it. Simple tools. Real actions.

**Example:**

```
You: "Turn the product brief into user stories"

AI: [reads product_brief.md]
    [writes user_stories.md with 5 formatted stories]
    
Done. New file in your sidebar.
```

---

## Why This Exists

Most AI writing tools work like this:
1. Copy your document
2. Paste into ChatGPT
3. Get output
4. Copy that back
5. Paste into your doc
6. Repeat forever

We got tired of that loop.

zerodraft puts the AI *inside* your file system. It reads what you're working on. It writes directly to new files. No clipboard gymnastics.

---

## What You Get

- **A file explorer** — folders, files, drag-and-drop
- **A rich text editor** — markdown, formatting, the basics done well
- **An AI sidebar** — type commands, get results
- **File import** — drop in Word docs, PDFs, whatever you have

Built with Next.js, Supabase, and Tiptap. Runs locally or deploy it yourself.

---

## Quick Start

```bash
git clone https://github.com/marsalanjaved1/zerodraft.so.git
cd zerodraft.so
npm install
```

Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
OPENROUTER_API_KEY=your_openrouter_key
```

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000).

> Full setup guide in [SETUP.md](SETUP.md)

---

## Stack

Next.js 16 · TypeScript · Supabase · Tiptap · LangChain · OpenRouter

---

## License

MIT

---

<div align="center">

**[zerodraft.so](https://zerodraft.so)**

</div>
