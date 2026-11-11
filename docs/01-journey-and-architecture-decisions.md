# Journey & Architecture Decisions

> **A chronological retrospective of how this project evolved from a complex Kanban task tracker into a lean, 24/7 cloud showcase running on Google Cloud Platform at $0.00 / month.**

---

## 1. The Starting Point: TaskBoard Kanban App

The project originated as **TaskBoard Cloud**—a full-stack team task management system modeled after Jira/Trello:
* **Backend**: Express + TypeScript with authentication (JWT, bcrypt), team workspaces, column-based task lists (*To Do*, *In Progress*, *Review*, *Done*), and an automated email reminder cron service (Resend API).
* **Storage Layer**: Dual-mode storage featuring an in-memory mock engine pre-seeded with sample users/tasks, alongside an enterprise PostgreSQL DDL schema (`server/src/db/schema.sql`).
* **Planned Infrastructure**: Multi-container setup designed for Google Cloud Run + Google Cloud SQL (PostgreSQL) managed through Terraform and Docker.

---

## 2. The Core Pivot: Why We Shifted Focus

### The Problem
During development, we asked a fundamental question:
> *"If someone visits this website, what are we really showcasing? A generic task board demo, or the engineering feat of deploying and running a real, resilient service on Google Cloud for $0?"*

Task boards are common portfolio projects. What is rare and valuable is proving **real cloud operational ownership**:
1. Deploying a live web service on Google Cloud Platform.
2. Managing real Linux infrastructure, process managers, and firewalls.
3. Achieving **100% continuous 24/7 uptime** without paying cloud bills.
4. Implementing live Site Reliability Engineering (SRE) telemetry to prove it.

### The Decision
We chose to **fully immerse the project in its cloud identity**:
* Completely removed the task board UI, kanban columns, modals, task cards, and mock database queries.
* Replaced it with a single, laser-focused **Cloud Hosted Website** showcase.
* The web page now communicates one clear message: **"This website is running live on Google Cloud Platform 24/7 at $0.00 / month."**

---

## 3. Key Architectural Decisions & Rationale

### Decision 1: Single `e2-micro` Compute Engine VM vs. Cloud Run + Cloud SQL

| Dimension | Cloud Run + Cloud SQL (Original Plan) | Compute Engine `e2-micro` VM (Adopted) |
| :--- | :--- | :--- |
| **Monthly Cost** | **$15 – $45 / month** (Cloud SQL db-f1-micro baseline + disk + cross-service egress) | **$0.00 / month** (100% covered under GCP Always Free Tier) |
| **Compute Quota** | Scale-to-zero cold starts (1.5s–3s lag on first visitor) | Always warm, persistent Node.js runtime with instant response (<30ms) |
| **Infrastructure Control** | Container abstraction | Real Linux VM (Ubuntu 24.04), systemd, swap, and PM2 process management |
| **Simplicity** | Requires Secret Manager, VPC connector, Cloud SQL Auth Proxy | Unified single instance: Node.js serves SPA assets and telemetry directly |

**Verdict**: The `e2-micro` instance in `us-central1` meets all Always Free Tier criteria (1 shared vCPU, 1 GB RAM, up to 30 GB standard disk). It provides a persistent, zero-cold-start runtime with $0 infrastructure spend.

---

### Decision 2: Unified Monolith Static Delivery

Instead of setting up an expensive Google Cloud Load Balancer ($18/mo minimum) or separate Cloud Storage bucket CDN:
* Express delivers the pre-compiled Vite React SPA from `client/dist`.
* API telemetry (`GET /health`) runs on the exact same HTTP origin.
* **Benefits**: Zero CORS preflight latency (`OPTIONS` requests eliminated), unified SSL/port handling, zero separate hosting bills.

---

### Decision 3: Language & Framing Shift (Eliminating "Free Tier")

During the redesign, we performed a deliberate messaging audit across the entire codebase to **remove all occurrences of "Free Tier"**:

* **Why**: The phrase *"Free Tier"* gives off a hobbyist, trial, or coupon vibe—as if the project relies on a temporary promo or toy tier.
* **The Reality**: The project is free because of **deliberate architectural tuning, lean resource allocation, and FinOps discipline**.
* **What we changed it to**:
  * Before: `"Running entirely within GCP's Always Free Tier — no billing surprises."`
  * After: **`"Engineered for 24/7 reliability with zero wasted infrastructure cost."`**
  * Before: `"Running on Google Cloud Platform · e2-micro · us-central1 · Free Tier"`
  * After: **`"Running on Google Cloud Platform · e2-micro · us-central1 · $0.00 Running Cost"`**

---

### Decision 4: Decoupling Real-Time UX Ticking from Server Polling

In early iterations, the live uptime display (`11m 19s`) appeared frozen unless the user manually refreshed the browser.

* **The SRE Dilemma**:
  * Pinging `/health` every 1 second from every open browser tab would generate 86,400 HTTP requests per day per tab, quickly exhausting GCP's 1 GB monthly free egress limit and burning shared CPU credits on the `e2-micro` instance.
  * Pinging every 30 seconds made the UI clock look dead and static.
* **The Solution (Client-Side Separation of Concerns)**:
  1. **UX Presentation (Local 1-second tick)**: Runs entirely in browser JavaScript memory at **0 cost, 0 network bandwidth, and 0 VM CPU**. The clock ticks second-by-second (`11m 19s` ➔ `11m 20s` ➔ `11m 21s`).
  2. **Network Telemetry (3-second probe)**: Runs in the background to calculate actual network round-trip ping (ms) and re-synchronize the baseline server uptime.
  3. **Visual Stability**: Applied `font-variant-numeric: tabular-nums` and a reserved `min-width: 105px` on the metric strip so expanding digits never cause layout shift or horizontal jumping.

---

### Decision 5: "Signal Lens" Hero Effect vs. Heavy WebGL Engines

When designing the animated hero background, we evaluated full WebGL fluid physics engines (e.g., Navier-Stokes solvers, Three.js):
* **Why we rejected heavy WebGL**:
  * 3D shader libraries add **500 KB to 1.5 MB** to the JavaScript bundle. At that size, GCP's 1 GB free egress quota would be consumed after only ~600 visits.
  * Heavy canvas physics spin up laptop fans and drain mobile batteries.
* **The "Signal Lens" Solution**:
  * Pure hardware-accelerated CSS and lightweight `requestAnimationFrame` tracking.
  * Only animates `transform: translate3d()`—running 100% on the visitor's GPU compositor with zero browser reflows.
  * Replaced expensive `filter: blur(80px)` with zero-cost soft radial gradient masks.
  * Uses `IntersectionObserver` to automatically pause the animation loop whenever the user scrolls past the hero, conserving client battery.
  * **Bundle impact**: Under **0.6 KB** (gzipped). 60 FPS guaranteed on all devices.
