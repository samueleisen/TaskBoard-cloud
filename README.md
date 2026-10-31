# TaskBoard Cloud

[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://react.dev/)
[![Cloud Run](https://img.shields.io/badge/Cloud%20Run-Serverless-4285F4.svg)](https://cloud.google.com/run)
[![FinOps](https://img.shields.io/badge/Monthly%20Budget-%7E%246%2Fmo-brightgreen.svg)](#-finops--cost-governance)

> 📋 **Looking for what to do later? See the step-by-step checklist in [`NEXT_STEPS.md`](NEXT_STEPS.md).**

A production-grade, small team task management web application engineered on **Google Cloud Platform (GCP)** with strict **FinOps governance (<$6/month budget)**, automated SRE guardrails, and keyless GitOps delivery.

---

## ⚡ Quick Start (Run Locally — No Docker or GCP Required)

The application features a built-in **dual-mode storage engine**: it runs locally out of the box using an in-memory/fallback data store pre-seeded with sample teams and tasks.

```bash
# 1. Install dependencies for root, server, and client
npm install

# 2. Start both Server (:8080) and React Client (:5173) concurrently
npm run dev
```

Open your browser at **`http://localhost:5173`**.
- Test interactive Kanban drag-and-drop between *To Do*, *In Progress*, *Review*, and *Done*.
- Create, edit, and filter tasks by priority or team member.
- Switch between team workspaces and invite new members.
- Click the **Cloud Status pill** in the navbar to open the **SRE & FinOps Inspector**, check uptime, and simulate due date email reminders!

---

## 🏛️ Architecture & System Topology

```
                               TASKBOARD ARCHITECTURE
                               
   [ Client Browser ]
         │
         │ (HTTPS / Native Cloud Run Domain Mapping - $0 Ingress)
         ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Google Cloud Run (Containerized Service)                               │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ Express / Fastify Server (:8080)                             │     │
│   │  • Serves React SPA static assets from client/dist           │     │
│   │  • REST API endpoints under /api/v1/*                         │     │
│   │  • SLA probe: GET /health (<10ms)                            │     │
│   │  • Background email reminder worker: POST /api/v1/jobs/*     │     │
│   └──────────────────────────────┬───────────────────────────────┘     │
│                                  │                                     │
│         ┌────────────────────────┼────────────────────────┐            │
│         ▼                        ▼                        ▼            │
│  ┌──────────────┐       ┌─────────────────┐      ┌─────────────────┐   │
│  │ Cloud SQL    │       │ Secret Manager  │      │ Cloud Logging   │   │
│  │ (PostgreSQL  │       │ (DB URL, JWT,   │      │ (14-day sink,   │   │
│  │  db-f1-micro)│       │  Resend Key)    │      │  /health dropped)│  │
│  └──────────────┘       └─────────────────┘      └─────────────────┘   │
│                                  ▲                                     │
│  ┌───────────────────────────────┴──────────────────────────────┐      │
│  │ Cloud Scheduler (Cron every 15m triggers email worker)       │      │
│  └──────────────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 💰 FinOps & Cost Governance (~$6/Month Target)

1. **Direct Ingress Termination**: Bypasses the GCP External Application Load Balancer, eliminating the **~$18.25/month** forwarding rule charge.
2. **True Scale-to-Zero Compute**: Cloud Run autoscaling is configured with `minScale = 0` (zero compute cost during idle night hours) and a hard ceiling of `maxScale = 3` to prevent billing runaway during DDoS or traffic surges.
3. **Optimized Database Tier**: Cloud SQL is pinned strictly to `db-f1-micro` (1 shared core, 0.6 GB RAM) with auto-resize disabled.
4. **14-Day Log Bucket & Health Filter**: Log retention is reduced from the default 30 days to 14 days, and noisy `/health` probes are excluded at the sink layer to prevent silent storage fees.
5. **3-Tier Budget Alerts**: Proactive GCP Billing Budgets trigger automated email/webhook notifications at **$5.00** (50% warning), **$10.00** (target reached), and **$20.00** (emergency ceiling).

---

## 🔄 CI/CD & 1-Command Rollback

* **Workload Identity Federation**: Zero long-lived service account JSON keys stored in GitHub Secrets.
* **Continuous Delivery**: Every push to `main` runs unit tests, compiles a multi-stage Docker container (<100MB), auto-deploys to `staging`, and gates `production` behind manual approval.
* **Sub-5-Second Rollback**: If a regression occurs, execute one command to revert 100% of production traffic:
  ```bash
  gcloud run services update-traffic taskboard-prod-app \
    --to-revisions PREVIOUS_HEALTHY_REVISION=100 \
    --region us-central1
  ```

---

## 📂 Repository Structure

```
TaskBoard-cloud/
├── client/                 # React 18 + Vite + TypeScript frontend
│   ├── src/
│   │   ├── components/     # KanbanBoard, TaskCard, TaskModal, TeamModal, CloudStatusDrawer
│   │   ├── services/       # API client with seamless fallback
│   │   └── index.css       # Vanilla CSS design system with glassmorphism
├── server/                 # Express + TypeScript backend
│   ├── src/
│   │   ├── db/             # Schema DDL and dual-mode storage engine (Postgres/Memory)
│   │   ├── routes/         # Auth, teams, boards, tasks, jobs
│   │   └── services/       # Due date email reminder worker
├── terraform/              # Complete Infrastructure as Code
│   ├── main.tf             # Root configuration and API bindings
│   └── modules/            # cloud_run, cloud_sql, secrets, monitoring
├── .github/workflows/      # ci-cd.yml & rollback.yml
├── Dockerfile              # Multi-stage production container build
├── docker-compose.yml      # Local Postgres + App stack (optional)
├── docs/                   # Complete architectural planning suite (01–08)
├── ui-context/             # Complete UI visual context & display specifications (01–08)
└── dumping.md              # Original project requirements and incident notes
```

---

## 🎨 UI Context & Display Specifications

For exhaustive documentation of the visual layout, screen wireframes, component design system, and interaction flows, explore the [`ui-context/`](ui-context/) directory:
* **[UI Context Master Guide](ui-context/README.md)** — Master screen topology and visual map.
* **[01. Design System & Styling](ui-context/01-design-system-and-styling.md)** — Dark-mode palette, glassmorphism tokens, and keyframe animations.
* **[02. App Shell & Navigation Bar](ui-context/02-app-shell-and-navbar.md)** — Top navbar, brand mark, team selector, SRE pill, and avatar.
* **[03. Board Header & Controls](ui-context/03-board-header-and-filters.md)** — Sub-header toolbar, live search, and multi-filter criteria.
* **[04. Kanban Board & Columns](ui-context/04-kanban-board-and-columns.md)** — 4-column layout, status dots, and HTML5 drag-and-drop.
* **[05. Task Card Visual Anatomy](ui-context/05-task-card-visual-anatomy.md)** — Priority pills, quick-move chevrons, and due date warning logic.
* **[06. Modals & Dialog Forms](ui-context/06-modals-and-forms.md)** — TaskModal and TeamModal member management with roles.
* **[07. SRE & FinOps Status Drawer](ui-context/07-sre-and-finops-drawer.md)** — Sliding drawer with live SLA ping, $6/mo budget gauge, and cron simulator.
* **[08. Interaction Flows & States](ui-context/08-interaction-flows-and-states.md)** — Step-by-step user journeys and state machine.

---

## 📖 In-Depth Cloud Architecture Suite

For technical blueprints, database DDL, API contracts, and cost models, explore the [`docs/`](docs/) directory:
* **[01. Gathered Context & Problem Statement](docs/01-gathered-context.md)** — Analysis of notes, SRE constraints, and the $40 oversized database post-mortem.
* **[02. Architecture Options Overview](docs/02-architecture-options-overview.md)** — Side-by-side comparison of Decoupled vs. Unified Monolith.
* **[03. Plan Option 1: Classic Decoupled](docs/03-plan-option-1-classic-decoupled.md)** — Cloud Storage/CDN + Cloud Run API + Cloud Tasks.
* **[04. Plan Option 2: Ultra-Lean Unified Monolith](docs/04-plan-option-2-lean-unified-monolith.md)** — Single container Fastify/React on Cloud Run with direct domain mapping.
* **[05. Data Model & REST API Specification](docs/05-data-model-and-api-spec.md)** — PostgreSQL 16 DDL, indexes, RBAC, and OpenAPI specs.
* **[06. Infrastructure, FinOps & Cost Model](docs/06-infrastructure-and-cost-model.md)** — Line-item cost tables, Terraform HCL, and $5/$10/$20 alert rules.
* **[07. CI/CD & Deployment Strategy](docs/07-cicd-and-deployment-strategy.md)** — GitHub Actions with Workload Identity Federation and rollback runbook.
* **[08. Decision Matrix & Recommendation](docs/08-decision-matrix-and-recommendation.md)** — Quantitative scoring, hybrid roadmap, and interview talking points.
