import { IconName } from '../icons/icon-registry';
import { WELCOME_CONTENT, DOCUMENTATION_CONTENT } from './welcome.content';

export interface DocumentTemplate {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  category: 'Engineering' | 'Product' | 'Science & Math' | 'Personal';
  content: string;
}

export const STARTER_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'welcome-guide',
    title: 'Welcome to MarkdownView Guide',
    description: 'Interactive introduction to IndexedDB, image pasting, PrismJS syntax, exports, and multi-views.',
    icon: 'sparkles',
    category: 'Product',
    content: WELCOME_CONTENT,
  },
  {
    id: 'tech-documentation',
    title: 'MarkdownView Technical & Architecture Manual',
    description: 'Comprehensive technical reference covering storage schema, [[Wikilinks]], encryption, and API pipeline.',
    icon: 'book',
    category: 'Engineering',
    content: DOCUMENTATION_CONTENT,
  },
  {
    id: 'system-architecture',
    title: 'System Architecture Spec',
    description: 'Technical RFC specification with Mermaid sequence diagram, tech stack table, and API specs.',
    icon: 'flowchart',
    category: 'Engineering',
    content: `# RFC-042: High-Performance Event Streaming Engine

> [!NOTE]
> **Status:** Proposed | **Author:** Lead Architect | **Target Release:** v2.4.0

## 1. Executive Summary

This document outlines the architecture for our next-generation distributed event streaming pipeline capable of handling 500k+ events/second with sub-5ms p99 latency.

## 2. System Architecture

\`\`\`mermaid
sequenceDiagram
    autonumber
    actor Client
    participant API as API Gateway
    participant Ingest as Ingestion Service
    participant Queue as Kafka Cluster
    participant Worker as Stream Processor
    participant DB as Distributed Storage

    Client->>API: POST /api/v1/events (Batch)
    API->>API: Validate & Rate Limit
    API->>Ingest: Stream payload
    Ingest->>Queue: Publish to topic [events-raw]
    Queue-->>Ingest: ACK (Leader replica)
    Ingest-->>Client: 202 Accepted { batchId, count }

    Worker->>Queue: Poll batches
    Worker->>Worker: Deduplicate & Enrich
    Worker->>DB: Bulk Upsert (Parquet format)
    DB-->>Worker: Commit OK
\`\`\`

## 3. Component Specifications

| Component | Technology | Scaling Strategy | SLA Target |
|:----------|:-----------|:-----------------|:-----------|
| **Gateway** | Envoy / Rust | CPU-based HPA (70%) | 99.99% |
| **Ingestion Engine** | Go 1.24 (Fiber) | KEDA Queue Metric | 99.99% |
| **Message Broker** | Apache Kafka | Cluster Partition Sharding | 99.999% |
| **Stream Workers** | Apache Flink | Memory & Backpressure Aware | 99.95% |

## 4. Benchmark & Latency Targets

\`\`\`typescript
interface PipelineBenchmark {
  throughputRps: number;
  p50LatencyMs: number;
  p99LatencyMs: number;
  errorRateThreshold: number;
}

const targetSLA: PipelineBenchmark = {
  throughputRps: 500_000,
  p50LatencyMs: 1.2,
  p99LatencyMs: 4.8,
  errorRateThreshold: 0.0001,
};
\`\`\`

> [!TIP]
> Ensure compression is set to \`zstd\` on all Kafka producer clients for optimal throughput-to-CPU ratio.
`,
  },
  {
    id: 'product-roadmap',
    title: 'Product Roadmap & Sprint Tracker',
    description: 'Quarterly roadmap featuring deliverables, release dates, priority badges, and interactive checklists.',
    icon: 'rocket',
    category: 'Product',
    content: `# Q4 Product Roadmap & Sprint Board 🚀

> [!IMPORTANT]
> **North Star Metric:** Increase weekly active creators by 45% through enhanced collaborative workflows.

## 🎯 Strategic Priorities

- [x] **Phase 1: Performance Foundation** — Native WASM markdown parser & sub-millisecond AST builds
- [x] **Phase 2: Mathematical & Diagram Engine** — KaTeX & Mermaid.js deep integration
- [ ] **Phase 3: Real-Time Local Sync** — Bidirectional File System Access API integration
- [ ] **Phase 4: Collaborative Workspace** — Peer-to-peer WebRTC live editing

---

## 📋 Sprint Deliverables (Sprint 24)

### 🔴 High Priority
- [x] Implement offline auto-saving with debounced storage engine
- [x] Add multi-format export: Markdown, Standalone HTML, and Print PDF
- [ ] Finalize end-to-end Vitest test suite for document store

### 🟡 Medium Priority
- [x] Notion-style slash command palette (\`/\`)
- [ ] Custom keybinding customization modal
- [ ] Document version history snapshot viewer

### 🟢 Low Priority / Polishing
- [x] Dark & Light theme token harmonization
- [x] Distraction-free Zen writing mode
- [ ] Custom font family selector in editor settings

---

## 📊 Milestone Summary

| Milestone | Target Date | Owner | Status |
|:----------|:------------|:------|:-------|
| **Core Engine v1.0** | Nov 15 | Engineering | 🟢 Done |
| **Math & Diagram Ext** | Dec 01 | Core Team | 🟢 Done |
| **Open Source Launch** | Jan 10 | DevRel | 🟡 In Progress |
`,
  },
  {
    id: 'math-science-notes',
    title: 'Scientific Research & Math Lab',
    description: 'Comprehensive math paper with LaTeX KaTeX formulas, matrices, integrals, and proofs.',
    icon: 'math',
    category: 'Science & Math',
    content: `# Mathematical Physics: Field Equations & Integral Transforms 📐

## 1. The Gaussian Integral

The classic Gaussian integral in Euclidean space is given by:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

### Proof via Polar Coordinates
By evaluating the square of the integral over $\\mathbb{R}^2$:

$$
I^2 = \\left( \\int_{-\\infty}^{\\infty} e^{-x^2} dx \\right) \\left( \\int_{-\\infty}^{\\infty} e^{-y^2} dy \\right) = \\int_{-\\infty}^{\\infty} \\int_{-\\infty}^{\\infty} e^{-(x^2+y^2)} dx dy
$$

Converting to polar coordinates $(r, \\theta)$ with $x^2 + y^2 = r^2$ and Jacobian $dx dy = r dr d\\theta$:

$$
I^2 = \\int_0^{2\\pi} d\\theta \\int_0^{\\infty} r e^{-r^2} dr = 2\\pi \\left[ -\\frac{1}{2} e^{-r^2} \\right]_0^{\\infty} = 2\\pi \\left( 0 - \\left( -\\frac{1}{2} \\right) \\right) = \\pi
$$

Therefore, $I = \\sqrt{\\pi}$. $\\blacksquare$

---

## 2. Einstein's General Relativity Field Equations

The spacetime geometry and energy-momentum relation:

$$
G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}
$$

Where:
- $G_{\\mu\\nu} \\equiv R_{\\mu\\nu} - \\frac{1}{2} R g_{\\mu\\nu}$ is the Einstein tensor
- $\\Lambda$ is the cosmological constant
- $T_{\\mu\\nu}$ represents the stress-energy tensor

---

## 3. Matrix Transformations & Eigenvalue Decomposition

Consider an operator represented by matrix $\\mathbf{A}$:

$$
\\mathbf{A} = \\begin{pmatrix} a_{11} & a_{12} & \\cdots & a_{1n} \\\\ a_{21} & a_{22} & \\cdots & a_{2n} \\\\ \\vdots & \\vdots & \\ddots & \\vdots \\\\ a_{n1} & a_{n2} & \\cdots & a_{nn} \\end{pmatrix}
$$

Characteristic polynomial equation:

$$
\\det(\\mathbf{A} - \\lambda \\mathbf{I}) = 0
$$

> [!TIP]
> Use inline math $f(x) = \\sum_{k=0}^\\infty \\frac{f^{(k)}(a)}{k!} (x-a)^k$ seamlessly within paragraphs.
`,
  },
  {
    id: 'meeting-notes',
    title: 'Executive Team Meeting & Actions',
    description: 'Structured team sync notes with attendees, agenda items, decisions, and action trackers.',
    icon: 'note',
    category: 'Engineering',
    content: `# Weekly Engineering Sync ☕

**Date:** September 25, 2026 | **Time:** 10:00 AM UTC  
**Facilitator:** Sarah Connor | **Note-taker:** Alex Rivers  

---

## 👥 Attendees
- [x] Alex Rivers (Staff Frontend)
- [x] Sarah Connor (Lead Platform)
- [x] Elena Rostova (Product Manager)
- [ ] Marcus Vance (Security Architecture - Out of Office)

---

## 📌 Agenda & Discussion Notes

### 1. File System Access API vs. Cloud Sync
- **Consensus:** Retain 100% offline-first privacy guarantee. Users should have the option to pick a folder on their local hard drive for seamless bi-directional disk saving.
- **Security:** Ensure sandboxed permissions are explicitly re-prompted when tabs reload.

### 2. Standalone Markdown Core Package
- The \`md-core\` package is ready to be published as an independent open-source library for the Angular ecosystem.
- Clean separation between core renderer/store and the editor shell application.

> [!NOTE]
> All unit tests are passing in Vitest with 94% branch coverage.

---

## ✅ Decisions & Action Items

| Action Item | Assignee | Due Date | Status |
|:------------|:---------|:---------|:-------|
| Write comprehensive README and CONTRIBUTING guide | Alex | Friday | 🟡 In Progress |
| Configure GitHub Actions CI workflow | Sarah | Thursday | 🟡 In Progress |
| Release v1.0.0 Open Source bundle | Elena | Next Monday | ⚪ Pending |
`,
  },
  {
    id: 'oss-readme',
    title: 'Open Source Project Template',
    description: 'Gold-standard open source README template with badges, quick start, architecture, and contribution guide.',
    icon: 'brand',
    category: 'Engineering',
    content: `# AwesomeProject 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](#)

A modern, fast, and extensible solution for developers. Built with precision and care.

## ✨ Features

- ⚡ **Ultra Fast** — Zero bloated dependencies
- 🔒 **Privacy First** — No telemetry, no external trackers
- 🎨 **Beautiful UI** — Modern dark and light themes
- 🛠️ **Developer Friendly** — Comprehensive TypeScript types and clean architecture

## 🚀 Quick Start

\`\`\`bash
# Clone the repository
git clone https://github.com/username/awesome-project.git

# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`

## 🤝 Contributing

Contributions are always welcome! Please check out [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on branch naming, commit standards, and pull request workflows.

## 📄 License

This project is licensed under the [MIT License](LICENSE).
`,
  },
];
