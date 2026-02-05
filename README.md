# 🚀 zerodraft.so

**An AI-Powered Agentic Text Editor for Product Managers**

zerodraft.so is a next-generation document workspace that combines the power of AI agents with a beautiful, VS Code-inspired interface. Built for product managers, writers, and teams who want to work faster with intelligent assistance.

![zerodraft.so](https://img.shields.io/badge/Next.js-16.1-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Powered-green?style=flat-square&logo=supabase)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

---

## ✨ Features

### 🤖 **AI Copilot**
- **Intelligent File Operations**: Read, write, update, and list files using natural language
- **Context-Aware**: The AI understands your workspace structure and file contents
- **Multi-Step Workflows**: Generate PRDs, user stories, meeting agendas, and more
- **No Loops**: Advanced prompt engineering prevents agent loops and ensures decisive responses

### 📝 **Rich Text Editor**
- **Novel Editor Integration**: Beautiful, distraction-free writing experience
- **Slash Commands**: Quick access to formatting and AI features
- **Real-time Collaboration**: Built on Tiptap for extensibility
- **Markdown Support**: Write in markdown, export to any format

### 🗂️ **Workspace Management**
- **VS Code-Inspired UI**: Familiar file explorer, tabs, and editor layout
- **Drag & Drop**: Organize files and folders effortlessly
- **Context Menus**: Right-click for quick actions (rename, delete, move)
- **File Import**: Support for DOCX, PDF, Markdown, and Google Docs

### 🔐 **Authentication & Storage**
- **Supabase Backend**: Secure authentication and database
- **File Storage**: Upload and manage documents with ease
- **Row-Level Security**: Your data is protected by default

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Next.js 16.1 (App Router) |
| **Language** | TypeScript 5.0 |
| **Styling** | Tailwind CSS 4.0 |
| **Database** | Supabase (PostgreSQL) |
| **AI** | LangChain + OpenRouter |
| **Editor** | Tiptap + Novel |
| **UI Components** | Radix UI |
| **Drag & Drop** | dnd-kit |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm/yarn/pnpm
- Supabase account ([sign up here](https://supabase.com))
- OpenRouter API key ([get one here](https://openrouter.ai))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/marsalanjaved1/zerodraft.so.git
   cd zerodraft.so
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

   # AI
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```

4. **Set up Supabase database**
   
   Run the SQL migrations in your Supabase dashboard:
   ```bash
   # Navigate to SQL Editor in Supabase dashboard
   # Run the contents of:
   supabase/schema.sql
   supabase/migrations/20240205_add_file_structure.sql
   supabase/migrations/20240205_storage_policies.sql
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📖 Usage

### Creating Your First Workspace
1. Sign up or log in
2. Click "Create Workspace" on the dashboard
3. Start adding documents or use the AI Copilot

### Using the AI Copilot
Open the Copilot panel (right side) and try:
- `"List all files in my workspace"`
- `"Read PRD.md and generate 3 user stories"`
- `"Create a meeting agenda for tomorrow's sprint planning"`
- `"Compare design_v1.md and design_v2.md"`

### Importing Documents
- **DOCX**: Click the upload icon and select your Word document
- **PDF**: Upload PDFs for reference (view-only)
- **Google Docs**: Paste the share link to import

---

## 🏗️ Project Structure

```
zerodraft.so/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Authentication pages
│   │   ├── api/chat/        # AI Copilot API route
│   │   ├── dashboard/       # Workspace dashboard
│   │   └── w/[workspaceId]/ # Workspace editor
│   ├── components/
│   │   ├── CommandCenter.tsx   # AI Copilot UI
│   │   ├── Editor.tsx          # Rich text editor
│   │   ├── FileExplorer.tsx    # File tree sidebar
│   │   └── novel/              # Novel editor integration
│   └── lib/
│       ├── client-tools.ts     # Client-side tool execution
│       ├── supabase/           # Supabase clients
│       └── importers.ts        # DOCX/PDF import logic
├── supabase/
│   ├── schema.sql              # Database schema
│   └── migrations/             # SQL migrations
└── SETUP.md                    # Detailed setup guide
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org) - The React framework
- [Supabase](https://supabase.com) - Open source Firebase alternative
- [Tiptap](https://tiptap.dev) - Headless editor framework
- [Novel](https://novel.sh) - Beautiful editor UI
- [LangChain](https://langchain.com) - AI orchestration
- [Radix UI](https://radix-ui.com) - Accessible components

---

## 📧 Contact

**Arsalan Javed** - [@marsalanjaved1](https://github.com/marsalanjaved1)

**Project Link**: [https://github.com/marsalanjaved1/zerodraft.so](https://github.com/marsalanjaved1/zerodraft.so)

---

<p align="center">Made with ❤️ for product managers everywhere</p>
