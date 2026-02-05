<div align="center">

# zerodraft.so

### Write smarter. Ship faster.

The AI-native text editor that actually gets work done.

[Get Started](#quick-start) · [Features](#what-makes-zerodraft-different) · [Documentation](SETUP.md)

---

</div>

## The Problem

You're a product manager. You have 47 browser tabs open, three different docs for the same project, and your AI assistant keeps asking you to paste context it should already have.

Sound familiar?

## The Solution

**zerodraft** is a document workspace where your AI assistant lives *inside* your files. It sees what you see. It knows your project structure. When you say "turn this PRD into user stories," it just... does it.

No copy-pasting. No "let me search for that file." No endless loops.

```
You: "Read the product brief and draft 5 user stories"

zerodraft: [reads file] → [generates stories] → done.
```

That's it. One request. One result. 

---

## What Makes zerodraft Different

**🧠 Context-aware AI**  
Your copilot reads your actual files, not just what you paste into a chat window.

**⚡ Decisive, not chatty**  
We engineered the AI to act, not deliberate. Ask for user stories, get user stories.

**🎨 Beautiful by default**  
VS Code-inspired interface. Dark mode. Minimal distractions.

**📁 Real file system**  
Create folders, move files, import Word docs and PDFs. Your workspace, organized your way.

---

## Quick Start

```bash
# Clone it
git clone https://github.com/marsalanjaved1/zerodraft.so.git
cd zerodraft.so

# Install it
npm install

# Configure it (create .env.local with your keys)
cp .env.example .env.local

# Run it
npm run dev
```

Open [localhost:3000](http://localhost:3000) and start writing.

> **Need help with setup?** Check out [SETUP.md](SETUP.md) for detailed instructions on configuring Supabase and OpenRouter.

---

## What You Can Do

| Ask zerodraft to... | What happens |
|---------------------|--------------|
| "List my files" | Shows your workspace structure |
| "Read PRD.md and summarize it" | Reads the file, gives you a summary |
| "Create a meeting agenda for sprint planning" | Writes a new document with your agenda |
| "Turn this into user stories" | Generates formatted user stories from context |

The AI uses real file operations—no smoke and mirrors.

---

## Built With

- **Next.js 16** — React framework
- **Supabase** — Auth, database, storage
- **Tiptap + Novel** — Rich text editing
- **LangChain + OpenRouter** — AI orchestration
- **TypeScript** — Type safety throughout

---

## Why We Built This

Every PM tool either:
1. Has AI bolted on as an afterthought, or
2. Requires you to manually feed context to the AI

We wanted something native. Something where the AI is a first-class citizen that understands your workspace from day one.

zerodraft is that tool.

---

## Contributing

Found a bug? Have an idea? PRs are welcome.

```bash
git checkout -b your-feature
# make changes
git commit -m "Add your feature"
git push origin your-feature
```

Open a pull request and let's talk.

---

## License

MIT. Use it, fork it, make it yours.

---

<div align="center">

**[zerodraft.so](https://zerodraft.so)** — Write smarter.

</div>
