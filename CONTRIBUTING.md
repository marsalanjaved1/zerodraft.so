# Contributing to ZeroDraft

First off, thanks for taking the time to contribute! 🎉

ZeroDraft is an open-source project, and we love seeing the community get involved. Whether you're fixing a bug, improving documentation, or building a new feature, your help is welcome.

## How Can I Contribute?

### 1. Reporting Bugs
- **Check existing issues** to see if it's already reported.
- **Open a new issue** with a clear title and description.
- Include steps to reproduce, screenshots, and your environment details.

### 2. Suggesting Enhancements
- Have an idea for a new agent tool? A better UI interaction?
- Open an issue/discussion to chat about it before writing code!

### 3. Pull Requests
- **Fork the repo** and create your branch from `main`.
- If you've added code that should be tested, add tests.
- Ensure your code passes linting (`npm run lint`).
- Issue that PR!

## Development Setup

1. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/zerodraft.git
   cd zerodraft
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment**:
   See `README.md` for the required `.env.local` variables.

4. **Start the server**:
   ```bash
   npm run dev
   ```

## Project Structure

- **`src/app`**: Next.js App Router pages.
- **`src/components`**: React components (UI, Editor, Sidebar).
- **`src/lib`**: Utility functions, Supabase client, and Agent logic.
- **`src/lib/tools`**: Definitions for agent tools (fs_read, fs_write, etc.).

## Code Style
- We use **TypeScript** for everything. Please type your code.
- We use **Tailwind CSS** for styling.
- Prettier and ESLint are configured to keep things tidy.

## License
By contributing, you agree that your contributions will be licensed under its MIT License.
