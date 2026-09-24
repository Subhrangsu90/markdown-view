# Contributing to MarkdownView 🤝

Thank you for your interest in contributing to **MarkdownView**! Whether you are fixing bugs, proposing new features, improving documentation, or optimizing performance, your help is warmly welcomed.

---

## 📜 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please be respectful and courteous to all community members.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: `v20.x` or later (LTS recommended)
- **npm**: `v10.x` or later
- **Git**

### 1. Fork & Clone
\`\`\`bash
git clone https://github.com/<your-username>/markdown-view.git
cd markdown-view
\`\`\`

### 2. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 3. Start the Development Server
\`\`\`bash
npm start
# or
ng serve
\`\`\`
Navigate your browser to \`http://localhost:4200/\`. The application will hot-reload whenever you modify source files.

---

## 🏗️ Repository Architecture

MarkdownView is organized as a clean Angular workspace monorepo:

- \`projects/md-core/\`: **Core Reusable Library**
  - \`src/lib/components/\`: Core UI primitives (toolbar, preview, split view, table-of-contents, theme toggle)
  - \`src/lib/services/\`: State management (\`DocumentStore\`), File system access (\`LocalDirectoryService\`), Import/Export engines
  - \`src/lib/icons/\`: SVG icon registry and \`MdIcon\` component
  - \`src/lib/models/\`: Data models, starter templates, and type definitions
  - \`src/lib/styles/\`: CSS variables, themes, and shared tokens
- \`src/app/\`: **Desktop-Grade Web Application Shell**
  - \`features/editor/\`: Top bar, sidebar, slash menu, search & replace, shortcut modals, template picker

---

## 🌿 Branching Strategy

Create a dedicated feature branch from \`main\` for your work:

\`\`\`bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/issue-description
\`\`\`

Prefix your branch names with:
- \`feat/\` for new features
- \`fix/\` for bug fixes
- \`docs/\` for documentation changes
- \`perf/\` for performance improvements
- \`refactor/\` for code refactoring
- \`test/\` for adding or modifying tests

---

## 💬 Commit Conventions

We follow the [Conventional Commits specification](https://www.conventionalcommits.org/):

\`\`\`text
<type>(<scope>): <short description>

[optional body]
\`\`\`

**Examples:**
- \`feat(editor): add Zen distraction-free writing mode\`
- \`fix(preview): resolve KaTeX formula rendering with inline delimiters\`
- \`docs(readme): add architecture diagram and keyboard shortcuts\`
- \`perf(store): optimize debounced local storage writes\`

---

## 🧪 Testing & Validation

Before opening a pull request, ensure all tests pass and the build succeeds:

\`\`\`bash
# Run unit tests with Vitest
npm test

# Build the project for production
npm run build
\`\`\`

---

## 🚀 Submitting a Pull Request

1. Push your branch to your forked repository:
   \`\`\`bash
   git push origin feat/your-feature-name
   \`\`\`
2. Open a Pull Request against the \`main\` branch of \`Subhrangsu90/markdown-view\`.
3. Provide a clear description using our [PR Template](.github/PULL_REQUEST_TEMPLATE.md).
4. Link any related issues (e.g. \`Closes #12\`).
5. A maintainer will review your pull request promptly!

---

Thank you for helping make MarkdownView an awesome open-source project! 🚀
