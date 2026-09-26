/**
 * Welcome Document and In-App Documentation Content
 * Showcases all latest features: IndexedDB storage, image asset management,
 * PrismJS syntax highlighting, rich exports, Knowledge Graph, [[Wikilinks]],
 * Kanban/Table multi-views, Time Machine history, and client-side encryption.
 */

export const WELCOME_CONTENT = `---
title: Welcome to MarkdownView ✨
status: Done
priority: High
tags: [welcome, guide, productivity, obsidian, notion]
category: Documentation
---

# Welcome to MarkdownView ✨

> [!NOTE]
> **MarkdownView** is an open-source, privacy-first, Notion-inspired Markdown workspace with live split preview, native IndexedDB persistence, smart image asset handling, PrismJS syntax coloring, scientific math, and Obsidian-grade bidirectional linking.

---

## ⚡ Superpowers & Architecture

### 1. 🗄️ Native IndexedDB Local Storage
- **Zero-Dependency Native Storage:** All your documents, folders, tags, settings, and binary assets are stored directly in the browser's high-capacity **IndexedDB** database (\`markdown_view_db\`).
- **No 5MB Storage Limitations:** Unlike standard \`localStorage\`, IndexedDB easily holds large vaults, full document histories, and high-resolution images.
- **100% Offline & Private:** Zero telemetry, no cloud accounts required, and no tracking scripts.

### 2. 🖼️ Smart Image Pasting & Asset Management
- **No Bloated Base64 Text:** When you paste (<kbd>Ctrl+V</kbd>) or drag-and-drop images into the editor, they are automatically stored as binary blobs in IndexedDB and cleanly referenced as \`![image](assets/your-image.png)\`.
- **Instant Live Preview:** MarkdownView resolves \`assets/...\` references to temporary object URLs on-the-fly.
- **Export Portability:** When exporting to HTML or copying formatted text, images are automatically converted to self-contained Base64 data so your files look perfect anywhere.

### 3. 💻 Code Syntax Highlighting with PrismJS
Full syntax coloring for 25+ languages, line styling, and automated one-click copy buttons:

\`\`\`typescript
import { signal, computed, effect } from '@angular/core';

// Modern Reactive State with Angular Signals
const documentTitle = signal('System Architecture RFC');
const wordCount = signal(1420);

// Derived state recalculates with fine-grained reactivity
const readingTimeMinutes = computed(() => Math.ceil(wordCount() / 200));

console.log(\`Ready to read in \${readingTimeMinutes()} minutes!\`);
\`\`\`

\`\`\`rust
// Zero-cost abstractions in Rust
pub fn calculate_hash<T: std::hash::Hash>(item: &T) -> u64 {
    use std::hash::Hasher;
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    item.hash(&mut hasher);
    hasher.finish()
}
\`\`\`

---

## 🔗 Obsidian-Style [[Wikilinks]] & Knowledge Graph

- **Bidirectional [[Wikilinks]]:** Type \`[[\` anywhere in the editor to trigger the autocomplete popup and link to any document in your vault (e.g. [[Welcome to MarkdownView ✨]]).
- **Backlinks Explorer:** Click the link icon on the right to discover incoming links and references from other documents.
- **Interactive Visual Knowledge Graph:** Press <kbd>Ctrl+G</kbd> to visualize your workspace as a dynamic force-directed graph connecting notes and #tags.

---

## 🗃️ Notion-Style Multi-Views & YAML Frontmatter

Every document can include YAML Frontmatter at the top (enclosed between \`---\` fences). MarkdownView parses properties such as \`status\`, \`priority\`, \`tags\`, and \`category\`:

1. **Kanban Board View:** Switch to the Kanban view via the sidebar view switcher or Command Palette to manage notes by status columns (\`Backlog\`, \`In Progress\`, \`Done\`). Drag cards smoothly between columns to update their frontmatter.
2. **Database Table View:** Browse your documents in a structured table with editable titles, status badges, priority markers, and quick tag filters.
3. **Document Editor View:** The classic distraction-free writing environment.

---

## 🕒 Document Revision History ("Time Machine")

- Press <kbd>Ctrl+H</kbd> or click the History icon in the status bar to open the **Time Machine**.
- MarkdownView automatically records periodic snapshots of your document as you type.
- Inspect word-by-word diff summaries, browse historical timestamps, and restore any previous version with a single click.

---

## 🔒 Client-Side AES-GCM Vault Encryption

- Lock sensitive notes with password encryption using browser-native **SubtleCrypto** (AES-GCM with PBKDF2 key derivation).
- Encrypted documents cannot be inspected or read without the master passphrase.

---

## 📤 Rich Export Options

Click the **Export** menu in the top-right toolbar for tailored outputs:
- **Download Doc + Images (.zip):** Bundles the active Markdown document and its referenced local images into a standard Obsidian-compatible ZIP archive.
- **Standalone .md (Embedded Images):** Converts local \`assets/...\` references into self-contained Base64 image tags so the Markdown file can be viewed anywhere without extra folders.
- **Standalone HTML (.html):** Produces a fully self-contained HTML document with embedded styles, Base64 images, KaTeX math rendering, and offline copy buttons.
- **Copy Formatted (with Images):** Copies rich HTML to your clipboard with embedded images ready to paste directly into Google Docs, Notion, Word, or Slack.
- **Workspace ZIP Archive:** Backs up all documents preserving your custom folder hierarchy.

---

## 📊 Dynamic Mermaid.js Visual Diagrams

\`\`\`mermaid
graph LR
    A[📝 Plain Markdown] -->|IndexedDB Storage| B(md-core Reactive Store)
    B --> C{Workspace Views}
    C -->|Writing| D[🔀 Split / Preview]
    C -->|Project Mgmt| E[📋 Kanban Board]
    C -->|Catalog| F[📊 Database Table]
    C -->|Network| G[🕸️ Visual Knowledge Graph]
    B --> H[📤 Standalone HTML / ZIP Export]

    style A fill:#3b82f6,stroke:#1d4ed8,color:#fff
    style B fill:#8b5cf6,stroke:#6d28d9,color:#fff
    style D fill:#10b981,stroke:#047857,color:#fff
    style E fill:#f59e0b,stroke:#d97706,color:#fff
    style G fill:#ec4899,stroke:#db2777,color:#fff
\`\`\`

---

## 📐 Scientific Mathematics (KaTeX)

Evaluate quadratic roots with precision:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

Cauchy's integral formula for complex analysis:

$$
f(a) = \\frac{1}{2\\pi i} \\oint_\\gamma \\frac{f(z)}{z - a} dz
$$

---

## ⌨️ Essential Keyboard Shortcuts

| Shortcut | Action |
|:---------|:-------|
| <kbd>Ctrl</kbd> + <kbd>K</kbd> / <kbd>Cmd</kbd> + <kbd>K</kbd> | Open Universal Command Palette |
| <kbd>/</kbd> (on blank line) | Open Notion-Style Slash Command Menu |
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
| <kbd>Ctrl</kbd> + <kbd>/</kbd> | Open Shortcuts & Help Cheatsheet |

---

*Enjoy writing with MarkdownView! Free and open-source under the MIT License.* 🚀
`;

export const DOCUMENTATION_CONTENT = `---
title: MarkdownView Documentation & Architecture Manual 📚
status: Done
priority: High
tags: [docs, architecture, manual, guide, typescript]
category: Documentation
---

# MarkdownView Comprehensive Documentation & Technical Manual 📚

Welcome to the definitive user and architectural reference for **MarkdownView**, the modern open-source markdown workspace.

---

## 1. Core Architecture & Storage Model

### 1.1 Zero-Dependency Native IndexedDB
MarkdownView operates with an offline-first storage engine powered by the browser's native **IndexedDB** API.
- **Database Name:** \`markdown_view_db\` (Version 1)
- **Object Stores:**
  - \`documents\`: Stores all document objects with keyPath \`id\`.
  - \`assets\`: Stores binary image Blobs with keyPath \`name\` (\`assets/img-...\`).
  - \`history\`: Stores document snapshot collections with keyPath \`docId\`.
  - \`settings\`: Stores workspace preferences such as active document, custom folders, and UI state.
- **Storage Limits:** Unlike \`localStorage\` (capped at 5MB), IndexedDB can store gigabytes of documents and high-resolution images safely on your device.

### 1.2 Binary Asset Management Pipeline
1. **User Action:** Image is pasted from clipboard (<kbd>Ctrl+V</kbd>) or dragged into editor.
2. **Storage:** Image is extracted as a \`Blob\` and written directly into the \`assets\` object store in IndexedDB.
3. **Reference:** Markdown text receives a clean URI: \`![image](assets/pasted-image-12345.png)\`.
4. **Rendering:** Preview resolves \`assets/...\` to high-speed in-memory Object URLs with automatic revocation caching.
5. **Disk Sync:** When a local directory is connected, assets are mirrored to the \`assets/\` subfolder on your physical hard drive.

---

## 2. Editing & Productivity Features

### 2.1 Notion-Style Slash Commands (\`/\`)
Type \`/\` on an empty line in the editor to summon the quick-insert menu:
- \`/h1\`, \`/h2\`, \`/h3\` — Headers
- \`/todo\` — Interactive task checklists
- \`/code\` — Multi-language syntax highlighted code block
- \`/table\` — Structured markdown table
- \`/math\` — KaTeX LaTeX equation block
- \`/mermaid\` — Flowchart / sequence diagram
- \`/callout\` — GitHub-style alert callout

### 2.2 Obsidian-Style [[Wikilinks]] & Backlinks
- **Insert Links:** Type \`[[\` in the editor to display an autocompleting list of all notes in your workspace.
- **Backlinks Panel:** Open the backlinks panel in the sidebar to view all documents referencing the active note.

### 2.3 Universal Command Palette (<kbd>Ctrl+K</kbd> / <kbd>Cmd+K</kbd>)
- Quickly search across all documents and trigger every editor command without lifting your fingers from the keyboard.

### 2.4 Multi-Views: Document, Kanban, and Database Table
- **YAML Frontmatter:** Add metadata to your notes:
  \`\`\`yaml
  ---
  title: Feature Planning
  status: In Progress
  priority: High
  tags: [roadmap, core]
  ---
  \`\`\`
- **Kanban Board:** Organize notes visually into status columns. Drag and drop cards to update document metadata in real-time.
- **Table View:** Inspect and filter your workspace items in an editable tabular format.

### 2.5 Revision History ("Time Machine")
- Access via <kbd>Ctrl+H</kbd>.
- Review automatic incremental snapshots.
- Track word and character diffs over time.
- Roll back to any previous version with a single click.

### 2.6 Local Vault Encryption
- Protect private notes using browser-native Web Cryptography (SubtleCrypto).
- Uses **AES-GCM (256-bit)** encryption with **PBKDF2** key derivation (100,000 iterations).

---

## 3. Export & Interoperability

| Export Option | Best For | Details |
|:--------------|:---------|:--------|
| **Standalone HTML** | Web Sharing & Archiving | Embeds all CSS styles, KaTeX math, PrismJS colors, offline copy scripts, and inlines all images as Base64 data URIs. |
| **Doc + Images (.zip)** | Obsidian Vaults | Bundles the Markdown file and its referenced \`assets/\` into a ZIP archive for seamless Obsidian compatibility. |
| **Standalone .md** | Single-file Markdown | Replaces \`assets/...\` references with inline Base64 images for portable viewing without companion folders. |
| **Copy Formatted** | Pasting into Docs | Copies rich HTML directly to your clipboard with all images embedded for Google Docs, Word, or Notion. |
| **Workspace ZIP** | Full Backup | Archives all notes and folders preserving folder hierarchy. |

---

## 4. Syntax Highlighting Support

MarkdownView includes **PrismJS** with syntax coloring for:
- TypeScript, JavaScript, JSX, TSX
- HTML, CSS, SCSS, JSON, YAML
- Python, Rust, Go, Java, Kotlin, Swift
- C, C++, C#, PHP, Ruby, Bash, Shell
- SQL, GraphQL, Markdown, LaTeX

Code blocks also feature an automatic **Copy** button and dark/light adaptive styling.

---

## 5. Keyboard Shortcuts Reference

| Shortcut | Description |
|:---------|:------------|
| <kbd>Ctrl</kbd> + <kbd>K</kbd> | Universal Command Palette |
| <kbd>/</kbd> | Notion Slash Command Menu |
| <kbd>Ctrl</kbd> + <kbd>\\</kbd> | Synchronized Split View |
| <kbd>Ctrl</kbd> + <kbd>E</kbd> | Editor-Only Mode |
| <kbd>Ctrl</kbd> + <kbd>P</kbd> | Preview-Only Mode |
| <kbd>Ctrl</kbd> + <kbd>B</kbd> | Toggle Navigation Sidebar |
| <kbd>Ctrl</kbd> + <kbd>G</kbd> | Interactive Knowledge Graph |
| <kbd>Ctrl</kbd> + <kbd>H</kbd> | Version History (Time Machine) |
| <kbd>Ctrl</kbd> + <kbd>O</kbd> | Document Outline / TOC |
| <kbd>Ctrl</kbd> + <kbd>F</kbd> | Find & Replace Bar |
| <kbd>Ctrl</kbd> + <kbd>J</kbd> | Template Library |
| <kbd>F11</kbd> | Distraction-Free Focus Mode |
| <kbd>Ctrl</kbd> + <kbd>/</kbd> | Shortcuts & Help Modal |
`;
