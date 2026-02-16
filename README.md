<div align="center">

# ZeroDraft
### The Agentic AI Editor for Local-First Deep Work

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![LangChain](https://img.shields.io/badge/LangChain-1C3C3C?logo=langchain&logoColor=white)](https://js.langchain.com/)

<p align="center">
  <img src="public/images/agent_demo.gif" alt="ZeroDraft Agent Refactoring Documentation" width="100%">
</p>

[Get Started](#quick-start) · [Roadmap](ROADMAP.md) · [Contribute](CONTRIBUTING.md)

</div>

---

## Overview

**ZeroDraft** is an open-source, agentic document workspace designed for complex writing tasks. Unlike chat-based AI tools that require constant context switching and copy-pasting, ZeroDraft embeds an autonomous agent directly into your file system.

It reads your entire project context, writes valid files (markdown, specs, code), and edits existing documents in place. It brings the power of "Cursor" to technical documentation, fiction writing, and research.

### Why ZeroDraft?

-   **Context Awareness:** The agent reads your full directory structure (`src/`, `chapters/`, `notes/`) to understand the broader context of your work.
-   **Local-First Privacy:** Your data remains on your machine or your private Supabase instance. Support for local LLMs ensures confidentiality for sensitive legal or proprietary documents.
-   **Agentic Workflow:** ZeroDraft doesn't just chat; it executes tools. It can create file structures, refactor outlines, and generate comprehensive drafts autonomously.

## Key Features

-   **Autonomous File Management:** Give high-level commands like "Read the specs in `/docs` and generate a `README.md`," and watch the agent execute file system operations.
-   **Rich Text Editor:** A polished, Tiptap-based writing environment that supports standard markdown, slash commands, and seamless AI integration.
-   **Loop Detection & Correction:** Advanced logic to prevent agentic loops, ensuring reliable execution of complex multi-step tasks.
-   **Cross-Model Support:** Integration with Vercel AI SDK allows you to bring your own API keys for OpenAI, Anthropic, or local models via OpenRouter.

## Quick Start

### Prerequisites

-   Node.js 18+
-   Supabase Account (for authentication and database)
-   LLM API Key (OpenAI, Anthropic, or OpenRouter)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/marsalanjaved1/zerodraft.so.git
    cd zerodraft
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure environment:**
    Copy the example credentials file:
    ```bash
    cp .env.local.example .env.local
    ```
    Populate `.env.local` with your API keys:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your_process_url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
    OPENROUTER_API_KEY=your_llm_api_key
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Navigate to [http://localhost:3000](http://localhost:3000) to access the application.

## Use Cases

-   **Technical Product Managers:** Keep PRDs, RFCs, and Architecture specs in sync with your codebase.
-   **Fiction Authors:** Maintain a living "Series Bible" where characters and plot points update automatically as you write.
-   **Legal & Academic Professionals:** Summarize and synthesize sensitive PDF case files locally without exposing data to public cloud training.

## Contributing

We welcome contributions from the community. Whether you are fixing bugs, designing new agent tools, or improving the editor UI, your help is appreciated.

Please read our [Contributing Guidelines](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## Roadmop

See [ROADMAP.md](ROADMAP.md) for our future plans, including:
-   Web Search Tool integration.
-   PDF/Docx file ingestion.
-   Enhanced "Consult Writer" persona modes.

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">
  Built with ❤️ by <a href="https://twitter.com/arsalanjaved">Arsalan Javed</a>
</div>
