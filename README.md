# 📝 MarkdownView

<p align="center">
  <strong>The open-source, privacy-first, Notion-style Markdown workspace.</strong><br>
  Built with Angular 22, Tailwind CSS 4, KaTeX scientific math, Mermaid.js diagrams, and native local filesystem sync.
</p>

<p align="center">
  <a href="https://github.com/Subhrangsu90/markdown-view/releases"><img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version 1.0.0" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License: MIT" /></a>
  <a href="https://angular.dev"><img src="https://img.shields.io/badge/Angular-22.1-dd0031.svg?logo=angular" alt="Angular 22" /></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind_CSS-v4.1-38bdf8.svg?logo=tailwind-css" alt="Tailwind CSS" /></a>
  <a href="https://katex.org"><img src="https://img.shields.io/badge/KaTeX-0.16-3298dc.svg" alt="KaTeX Math" /></a>
  <a href="https://mermaid.js.org"><img src="https://img.shields.io/badge/Mermaid-11.x-ff3670.svg" alt="Mermaid.js" /></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" /></a>
  <a href="#"><img src="https://img.shields.io/badge/privacy-100%25_offline-purple.svg" alt="100% Offline" /></a>
</p>

---

## 🌟 Overview

**MarkdownView** bridges the gap between the structured ease of modern productivity suites (like Notion) and the uncompromised ownership and speed of raw Markdown editors (like Obsidian, MarkText, and Typora).

It runs **100% in your browser** with zero external trackers, telemetry, or server database lock-in. Your documents are stored safely in your browser's local database or saved directly to any folder on your computer's hard drive using the modern **Web File System Access API**.

---

## ✨ Superpowers & Highlights

### ⚡ Notion-Style Slash Commands (`/`)
Hit `/` anywhere on a blank line to pop up an interactive command palette. Insert headings, code blocks, tables, task lists, blockquotes, math formulas, and diagrams without memorizing complex syntax.

### 🔀 Synchronized Live Split-View
Work in raw Markdown on the left while watching pixel-perfect rendered output on the right. Scroll positions stay effortlessly synchronized in real time. Switch between **Edit**, **Split**, and **Preview** with instant hotkeys.

### 📐 Scientific Math via KaTeX ($\LaTeX$)
Render publication-grade mathematical equations with full $\LaTeX$ syntax support. Use inline expressions like $E = mc^2$ or full block equations:

$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

### 📊 Dynamic Mermaid.js Visual Diagrams
Generate flowcharts, sequence diagrams, state machines, entity relationship diagrams, and Gantt charts directly from plain text:

```mermaid
graph LR
    A[Plain Markdown] --> B(AST Parser)
    B --> C{Output Target}
    C -->|Web| D[Interactive Live Preview]
    C -->|File| E[Standalone HTML / PDF]
    C -->|Disk| F[Local Folder Sync]
```

### 💻 Syntax Highlighting & Copy Buttons (PrismJS)
Code blocks support 40+ programming languages with line formatting, syntax highlighting, and an automated one-click copy button.

### 🗂️ Hierarchical File & Folder Management
- Create, rename, and drag-to-reorder folders and pages
- Pin favorites to the top of your workspace
- Multi-select batch mode: bulk delete, bulk move, or bulk export to ZIP
- Custom document emoji/icon cycling

### 📁 Native Local Hard Drive Sync
MarkdownView leverages the **Web File System Access API**. Choose any folder on your machine (e.g. your Obsidian vault or GitHub docs directory) to auto-save and sync documents directly to disk.

### 🧘 Distraction-Free Focus (Zen) Mode
Enter full-screen zen mode (`F11` or shortcut button) to eliminate chrome and sidebars for an immersive writing experience.

### 📚 Pre-Built Starter Templates
Choose from high-utility starter templates:
- **System Architecture RFC Spec** (with Mermaid sequence diagrams)
- **Product Roadmap & Sprint Board** (with task checklists)
- **Mathematical Physics Lab Notes** (with KaTeX proofs)
- **Executive Team Meeting Sync** (with action item assignments)
- **Open Source Project README**

### 📤 Multi-Format Export
- **Download Markdown (`.md`)**
- **Standalone HTML (`.html`)**: Self-contained file with embedded styles, KaTeX, and Mermaid support
- **Print to PDF**: Clean CSS print stylesheets optimized for document printing
- **Bulk ZIP Archive**: Download all pages organized neatly by folder structure

### 🌓 Adaptive Modern Themes
Switch seamlessly between dark and light modes. Every token is carefully tuned with HSL CSS variables for maximum contrast and zero eye fatigue.

---

## 🏗️ Architecture & Monorepo Structure

MarkdownView is built with modern Angular (Signals, Standalone Components, Control Flow syntax) in a clean monorepo architecture:

```
markdown-view/
├── projects/
│   └── md-core/                     # Reusable Core Markdown Library
│       ├── src/lib/
│       │   ├── components/          # UI Primitives (preview, split-view, toolbar, TOC)
│       │   ├── icons/               # Centralized SVG Icon Registry & MdIcon component
│       │   ├── models/              # Document types, starter templates, interfaces
│       │   ├── services/            # DocumentStore (Signals), LocalDirectoryService, Exporters
│       │   └── styles/              # Global theme tokens, variables, & typography
│       └── public-api.ts            # Public API exports for npm publishing
├── src/
│   └── app/                         # Desktop-Grade SPA Application
│       └── features/editor/         # Editor view, sidebar, slash menu, search & replace
├── .github/                         # Workflows, issue templates, PR template
├── README.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
└── LICENSE                          # MIT License
```

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v20.x or later (LTS recommended)
- [npm](https://www.npmjs.com/) v10.x or later

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Subhrangsu90/markdown-view.git
   cd markdown-view
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm start
   # or
   ng serve
   ```

4. **Open in your browser:**
   Open `http://localhost:4200/` and start writing!

---

## 💻 Available Scripts

| Command | Purpose |
|:--------|:--------|
| `npm start` | Runs the Angular development server on `http://localhost:4200` |
| `npm run build` | Compiles the production application bundle into `dist/` |
| `npm test` | Runs unit tests using the [Vitest](https://vitest.dev/) test runner |
| `npm run watch` | Builds library and app in watch mode for development |
| `npx ng build md-core` | Builds only the reusable `md-core` library package |

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Description |
|:---------|:------------|
| <kbd>Ctrl</kbd> + <kbd>E</kbd> / <kbd>Cmd</kbd> + <kbd>E</kbd> | Switch to **Edit Mode** |
| <kbd>Ctrl</kbd> + <kbd>P</kbd> / <kbd>Cmd</kbd> + <kbd>P</kbd> | Switch to **Preview Mode** |
| <kbd>Ctrl</kbd> + <kbd>\</kbd> / <kbd>Cmd</kbd> + <kbd>\</kbd> | Switch to **Split View Mode** |
| <kbd>Ctrl</kbd> + <kbd>B</kbd> / <kbd>Cmd</kbd> + <kbd>B</kbd> | Toggle Navigation Sidebar |
| <kbd>Ctrl</kbd> + <kbd>F</kbd> / <kbd>Cmd</kbd> + <kbd>F</kbd> | Open Find & Replace Bar |
| <kbd>Ctrl</kbd> + <kbd>O</kbd> / <kbd>Cmd</kbd> + <kbd>O</kbd> | Open Document Outline (Table of Contents) |
| <kbd>Ctrl</kbd> + <kbd>J</kbd> / <kbd>Cmd</kbd> + <kbd>J</kbd> | Open **Template Library** |
| <kbd>F11</kbd> | Toggle **Distraction-Free Focus (Zen) Mode** |
| <kbd>Esc</kbd> | Exit Focus Mode / Close active modal or dropdown |
| <kbd>Ctrl</kbd> + <kbd>/</kbd> / <kbd>Cmd</kbd> + <kbd>/</kbd> | Open Keyboard Shortcuts & Help Modal |
| <kbd>/</kbd> (on blank line) | Open Notion-Style Slash Command Menu |

---

## 🤝 Contributing

We welcome contributions of all kinds! Please review our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting pull requests.

1. Fork the repo & create your feature branch: `git checkout -b feat/my-cool-feature`
2. Commit your changes: `git commit -m 'feat(editor): add my cool feature'`
3. Push to your branch: `git push origin feat/my-cool-feature`
4. Open a Pull Request!

---

## 🛡️ Privacy Commitment

MarkdownView operates on a strict **zero telemetry, zero tracking, zero external database** policy:
- No remote analytics or trackers are loaded.
- All notes persist inside your browser's private indexed/local storage.
- When using folder sync, files are read and written strictly through the browser's native sandboxed File System Access API.

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).

---

<p align="center">
  Crafted with ❤️ by Subhrangsu and the open-source community.
</p>
