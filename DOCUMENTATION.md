# 📖 MarkdownView Documentation & Architecture Manual

<p align="center">
  <strong>Complete user guide, developer reference, and architectural manual for MarkdownView.</strong><br>
  Privacy-first, zero-telemetry, Notion-inspired Markdown workspace with native IndexedDB persistence and Obsidian-grade bidirectional linking.
</p>

---

## 📑 Table of Contents

1. [🌟 Architecture Overview](#-architecture-overview)
2. [🗄️ Native IndexedDB Storage Engine](#️-native-indexeddb-storage-engine)
3. [🖼️ Smart Image Asset Pipeline](#️-smart-image-asset-pipeline)
4. [💻 Code Syntax Highlighting (PrismJS)](#-code-syntax-highlighting-prismjs)
5. [🔗 Obsidian-Style [[Wikilinks]] & Knowledge Graph](#-obsidian-style-wikilinks--knowledge-graph)
6. [🗃️ Notion-Style Multi-Views & YAML Frontmatter](#️-notion-style-multi-views--yaml-frontmatter)
7. [🕒 Document Revision History ("Time Machine")](#-document-revision-history-time-machine)
8. [🔒 Local Vault Encryption (AES-GCM)](#-local-vault-encryption-aes-gcm)
9. [📤 Comprehensive Export Options](#-comprehensive-export-options)
10. [📁 Native Local Filesystem Sync](#-native-local-filesystem-sync)
11. [⌨️ Keyboard Shortcuts Reference](#️-keyboard-shortcuts-reference)
12. [🛠️ Developer Setup & Monorepo Structure](#️-developer-setup--monorepo-structure)

---

## 🌟 Architecture Overview

MarkdownView is built with modern Angular (Signals, Standalone Components, and fine-grained reactivity) in a clean monorepo architecture:

- **`projects/md-core`**: A standalone, reusable Markdown library package containing:
  - **Models**: `MarkdownDocument`, `STARTER_TEMPLATES`, `WELCOME_CONTENT`, Frontmatter parser (`frontmatter.util.ts`).
  - **Services**: `IndexedDbService`, `DocumentStore`, `DocumentHistoryService`, `EncryptionService`, `FileExportService`, `FileImportService`, `LocalDirectoryService`, `SyntaxHighlighterService`, and `ThemeService`.
  - **Components**: `MarkdownPreview`, `SplitView`, `Toolbar`, `TableOfContents`, and `ThemeToggle`.
  - **Icon Registry**: Strongly-typed SVG icon collection and `MdIcon` component.
- **`src/app`**: The application shell providing:
  - Synchronized dual-pane editor with live scrolling.
  - Notion-style Slash command menu (`/`).
  - Universal Command Palette (<kbd>Ctrl+K</kbd>).
  - Multi-views: Editor view, Kanban Board, and Database Table view.
  - Interactive Visual Knowledge Graph (<kbd>Ctrl+G</kbd>).
  - Document revision history modal (<kbd>Ctrl+H</kbd>).
  - Find & Replace toolbar (<kbd>Ctrl+F</kbd>).

---

## 🗄️ Native IndexedDB Storage Engine

MarkdownView uses the browser's native **IndexedDB API** (`markdown_view_db`, version 1) with **zero external NPM database libraries** for ultra-fast, quota-free storage:

### Object Stores

| Store Name | Key Path | Description |
|:-----------|:---------|:------------|
| `documents` | `id` | All workspace notes including titles, content, frontmatter, tags, icons, and lock state. |
| `assets` | `name` | Binary media assets (PNG, JPEG, WebP, GIF, SVG) stored as native `Blob` objects. |
| `history` | `docId` | Historical snapshot collections containing word/char counts and timestamps. |
| `settings` | `key` | User settings, custom folder order, active document pointer, and view modes. |

### Migration from Legacy LocalStorage
On initial launch, `DocumentStore` automatically detects any pre-existing `localStorage` documents, imports them into IndexedDB, and purges the legacy keys to free browser storage.

---

## 🖼️ Smart Image Asset Pipeline

In many Markdown editors, pasting an image dumps a massive Base64 string directly into the text editor, freezing the UI and making the raw Markdown unreadable.

MarkdownView solves this with a clean, high-performance pipeline:

1. **Paste or Drop**: When you paste (<kbd>Ctrl+V</kbd>) or drag an image into the editor, the file is intercepted and written directly to IndexedDB's `assets` store as a binary `Blob`.
2. **Clean Reference**: The editor inserts a lightweight relative Markdown link:
   ```markdown
   ![Pasted Image](assets/pasted-image-1727351234567.png)
   ```
3. **In-Memory Blob URL Resolution**: `MarkdownPreview` dynamically resolves `assets/...` references into cached `URL.createObjectURL(blob)` instances with automatic garbage collection.
4. **Universal Export Support**:
   - When generating standalone HTML, referenced assets are automatically converted to inline Base64 data URIs.
   - When exporting to ZIP, an `assets/` subfolder is created containing all the binary images.
   - When copying formatted text to the clipboard, all images are converted into inline data so you can paste into Google Docs or Slack without broken image links.

---

## 💻 Code Syntax Highlighting (PrismJS)

Code blocks are automatically highlighted using **PrismJS** with custom CSS tokens matching both dark and light themes:

### Supported Languages (25+)
- **Web**: TypeScript (`ts`, `typescript`), JavaScript (`js`, `javascript`), JSX, TSX, HTML, CSS, SCSS, JSON, YAML
- **Systems & Backend**: Rust (`rs`, `rust`), Go (`golang`), Python (`py`, `python`), Java, Kotlin, Swift, C, C++, C# (`cs`, `csharp`), PHP, Ruby
- **Shell & Query**: Bash (`sh`, `bash`, `shell`), SQL, GraphQL, Markdown, LaTeX

### Key Features
- **Normalized Language Aliases**: Language identifiers like `ts`, `py`, `golang`, or `sh` are automatically mapped to Prism canonical names.
- **Copy Code Button**: Every rendered code block has a hoverable copy button with instant checkmark feedback.
- **Offline Self-Contained HTML**: Standalone HTML export includes embedded copy scripts and complete Prism styles so exported files work completely offline.

---

## 🔗 Obsidian-Style [[Wikilinks]] & Knowledge Graph

### Bidirectional Linking
- **Trigger**: Type `[[` anywhere in the editor to pop up the document selector.
- **Selection**: Filter by title and press <kbd>Enter</kbd> to insert `[[Target Note Title]]`.
- **Navigation**: Clicking any wikilink in preview mode opens that document instantly.

### Backlinks Explorer
- Click the link icon on the right edge of the editor to toggle the **Backlinks Panel**.
- Discover every document across your entire vault that references the current note.

### Interactive Knowledge Graph (<kbd>Ctrl+G</kbd>)
- Visualizes your workspace as a force-directed node graph.
- Blue nodes represent documents; purple nodes represent tags (`#tag`).
- Edges depict wikilink references and tag relationships.
- Drag nodes to explore clusters, adjust zoom with scroll, and click any node to navigate directly to that document.

---

## 🗃️ Notion-Style Multi-Views & YAML Frontmatter

Every document can optionally include YAML frontmatter at the top:

```yaml
---
title: Q4 Product Launch
status: In Progress
priority: High
tags: [launch, product, roadmap]
category: Engineering
---
```

MarkdownView extracts these properties to power multiple workspace views:

### 1. Document View (Standard)
The distraction-free live editing environment with split-view and synchronized scrolling.

### 2. Kanban Board View
- Notes are organized into status columns: **Backlog**, **In Progress**, and **Done**.
- Smooth drag-and-drop moves cards between columns and automatically updates the underlying document's YAML frontmatter.

### 3. Database Table View
- A structured tabular view showing Title, Folder, Status badge, Priority badge, and Tags.
- Filter by tag, sort by columns, and edit metadata directly from the table.

---

## 🕒 Document Revision History ("Time Machine")

- Press <kbd>Ctrl+H</kbd> or click the history icon in the status bar.
- Automatic snapshotting records incremental drafts as you type.
- View timeline timestamps, word count deltas, and character count diffs.
- Restore any previous version with a single click.

---

## 🔒 Local Vault Encryption (AES-GCM)

- Protect sensitive notes with password encryption.
- Uses the browser's native **Web Cryptography API (SubtleCrypto)**:
  - **Cipher**: AES-GCM (256-bit key)
  - **Key Derivation**: PBKDF2 with SHA-256 and 100,000 iterations
  - **Salt**: 16-byte cryptographically secure random salt
  - **IV**: 12-byte initialization vector
- Documents remain locked and unreadable in IndexedDB until unlocked with the correct password.

---

## 📤 Comprehensive Export Options

Access the export menu from the top-right toolbar:

1. **Download Doc + Images (.zip)**: Exports the current note as `.md` along with all referenced images into an `assets/` directory (Obsidian format).
2. **Standalone .md (Embedded Images)**: Replaces `assets/...` image links with inline Base64 data so the Markdown file can be read anywhere as a single file.
3. **Standalone HTML (.html)**: Complete self-contained HTML page containing all styles, KaTeX math scripts, PrismJS colors, offline copy buttons, and Base64-embedded images.
4. **Copy Formatted (with Images)**: Copies rich HTML directly to your clipboard for pasting into Google Docs, Word, or Slack.
5. **Print to PDF**: Uses dedicated CSS `@media print` rules for clean document printing.
6. **Workspace ZIP**: Archives your entire vault preserving custom folders and all media assets.

---

## 📁 Native Local Filesystem Sync

MarkdownView connects directly to your hard drive using the **Web File System Access API**:
- Click **Connect Local Folder** in the sidebar.
- Choose any directory on your computer (e.g. an existing Obsidian vault or Git repo).
- Documents and their `assets/` subfolder are written directly to your local disk whenever edits are made.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action |
|:---------|:-------|
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>Cmd</kbd> + <kbd>K</kbd> | Open Universal Command Palette |
| <kbd>/</kbd> (on blank line) | Open Notion-Style Slash Commands |
| <kbd>Ctrl</kbd> + <kbd>\\</kbd> | Toggle Synchronized Split View |
| <kbd>Ctrl</kbd> + <kbd>E</kbd> | Switch to Editor-Only View |
| <kbd>Ctrl</kbd> + <kbd>P</kbd> | Switch to Preview-Only View |
| <kbd>Ctrl</kbd> + <kbd>B</kbd> | Toggle Navigation Sidebar |
| <kbd>Ctrl</kbd> + <kbd>G</kbd> | Open Interactive Knowledge Graph |
| <kbd>Ctrl</kbd> + <kbd>H</kbd> | Open Document Version History (Time Machine) |
| <kbd>Ctrl</kbd> + <kbd>O</kbd> | Open Document Outline (Table of Contents) |
| <kbd>Ctrl</kbd> + <kbd>F</kbd> | Open Find & Replace Bar |
| <kbd>Ctrl</kbd> + <kbd>J</kbd> | Open Starter Templates Library |
| <kbd>F11</kbd> | Toggle Distraction-Free Focus (Zen) Mode |
| <kbd>Ctrl</kbd> + <kbd>/</kbd> | Open Shortcuts & Cheatsheet Modal |

---

## 🛠️ Developer Setup & Monorepo Structure

### Prerequisites
- Node.js v20.x or later
- npm v10.x or later

### Common Commands
```bash
# Install dependencies
npm install

# Start development server (http://localhost:4200)
npm start

# Run unit tests with Vitest
npm test

# Build production distribution
npm run build

# Build reusable core library
npx ng build md-core
```
