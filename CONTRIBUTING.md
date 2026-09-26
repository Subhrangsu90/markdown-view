# Contributing to MarkdownView 🤝

Thank you for your interest in contributing to **MarkdownView**! Whether you are fixing bugs, proposing new features, improving documentation, or optimizing performance, your help is warmly welcomed.

---

## 📑 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [How Can I Contribute?](#-how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
- [Development Setup](#-development-setup)
  - [Prerequisites](#prerequisites)
  - [1. Fork & Clone](#1-fork--clone)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Build the Core Library](#3-build-the-core-library)
  - [4. Start the Development Server](#4-start-the-development-server)
- [Repository Architecture](#-repository-architecture)
- [Branching Strategy](#-branching-strategy)
- [Commit Conventions](#-commit-conventions)
- [Testing & Code Quality](#-testing--code-quality)
- [Submitting a Pull Request](#-submitting-a-pull-request)

---

## 📜 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please be respectful and courteous to all community members.

---

## 💡 How Can I Contribute?

### Reporting Bugs

Before creating an issue, please check the [existing issues](https://github.com/Subhrangsu90/markdown-view/issues) to ensure the bug hasn't already been reported.

When reporting a bug using our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md), please include:
- A clear, descriptive title.
- Steps to reproduce the behavior.
- Expected vs. actual behavior.
- Screenshots or screen recordings (if applicable).
- Environment details (OS, browser and version).

### Suggesting Enhancements

Feature requests are welcome! Use our [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md) to explain:
- The problem you are trying to solve or the motivation behind the suggestion.
- Proposed solution or expected user experience.
- Any alternative solutions or workarounds you've considered.

---

## 🛠️ Development Setup

### Prerequisites

- **Node.js**: `v20.x` or `v22.x+` (LTS recommended)
- **npm**: `v10.x` or later (configured for `npm@11.x`)
- **Git**

### 1. Fork & Clone

Fork the repository on GitHub, then clone your fork locally:

```bash
git clone https://github.com/<your-username>/markdown-view.git
cd markdown-view
```

Add the upstream repository to keep your local fork synchronized:

```bash
git remote add upstream https://github.com/Subhrangsu90/markdown-view.git
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Core Library

MarkdownView is built with an Angular monorepo containing a reusable core library (`projects/md-core`). Build the library before starting the application:

```bash
npm run build:lib
```

### 4. Start the Development Server

```bash
npm start
# or
npx ng serve
```

Navigate your browser to `http://localhost:4200/`. The application will hot-reload whenever you modify source files.

---

## 🏗️ Repository Architecture

MarkdownView is organized as a clean Angular workspace monorepo:

- `projects/md-core/`: **Core Reusable Library**
  - `src/lib/components/`: Core UI primitives (toolbar, preview, split view, table-of-contents, theme toggle)
  - `src/lib/services/`: State management (`DocumentStore`), File system access (`LocalDirectoryService`), Import/Export engines
  - `src/lib/pipes/`: Custom utility pipes (e.g., `time-ago`)
  - `src/lib/icons/`: SVG icon registry and `MdIcon` component
  - `src/lib/models/`: Data models, starter templates, and type definitions
  - `src/lib/styles/`: CSS variables, themes, and shared tokens
- `src/app/`: **Desktop-Grade Web Application Shell**
  - `features/editor/`: Top bar, sidebar, slash menu, search & replace, shortcut modals, template picker
  - `app.config.ts` & `app.routes.ts`: Application bootstrap, routing, and SSR configuration

---

## 🌿 Branching Strategy

Always create a dedicated branch from `main` for your changes:

```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/issue-description
```

Prefix your branch names based on the nature of your change:
- `feat/` for new features
- `fix/` for bug fixes
- `docs/` for documentation updates
- `perf/` for performance improvements
- `refactor/` for code refactoring
- `test/` for adding or modifying tests
- `chore/` for tooling, dependency, or maintenance updates

To keep your branch up to date with upstream changes:

```bash
git fetch upstream
git rebase upstream/main
```

---

## 💬 Commit Conventions

We follow the [Conventional Commits specification](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <short description>

[optional body]
[optional footer(s)]
```

### Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation-only changes
- `style`: Changes that do not affect the meaning of the code (formatting, white-space)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts
- `chore`: Other changes that don't modify src or test files

### Common Scopes
- `editor`: Editor features, slash menu, toolbar, shortcuts
- `preview`: Live preview, KaTeX, Mermaid rendering
- `sidebar`: File tree, folder explorer, document navigation
- `store`: Local document storage, state management
- `export`: HTML, Markdown, and PDF export engines
- `deps`: Dependency updates

**Examples:**
- `feat(editor): add Zen distraction-free writing mode`
- `fix(preview): resolve KaTeX formula rendering with inline delimiters`
- `docs(readme): add architecture diagram and keyboard shortcuts`
- `perf(store): optimize debounced local storage writes`
- `chore(deps): update Angular dependencies to v22.1`

---

## 🧪 Testing & Code Quality

Before opening a pull request, ensure all tests pass, formatting adheres to guidelines, and the build succeeds:

```bash
# 1. Run unit tests
npm test -- --no-watch

# 2. Check code formatting with Prettier
npx prettier --check .

# (Optional) Auto-format code if needed
npx prettier --write .

# 3. Build the core library
npm run build:lib

# 4. Build the application for production
npm run build
```

---

## 🚀 Submitting a Pull Request

1. Push your branch to your forked repository:
   ```bash
   git push origin feat/your-feature-name
   ```
2. Open a Pull Request against the `main` branch of [`Subhrangsu90/markdown-view`](https://github.com/Subhrangsu90/markdown-view).
3. Fill out the [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md) with details about your change.
4. Link any related issues (e.g., `Closes #12` or `Fixes #45`).
5. Ensure CI checks pass on your PR.
6. A maintainer will review your pull request promptly!

---

Thank you for helping make MarkdownView an awesome open-source project! 🚀
