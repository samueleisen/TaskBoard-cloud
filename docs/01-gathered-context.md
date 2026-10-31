# 01. Gathered Context & Problem Statement

> **Context synthesis from raw notes, domain requirements, FinOps guardrails, and incident learnings.**

---

## 1. Project Background & Vision

The project **TaskBoard Cloud** originated from a deliberate engineering objective:
> *"A task tracker with login, teams, and email reminders. I built it to practice running a real service, not only writing features."*

Most portfolio projects demonstrate application development (CRUD features, UI libraries, basic routing) but fail to address the realities of **running production software**: infrastructure costs, automated delivery pipelines, horizontal autoscaling caps, secrets governance, log management, backup restoration, and incident post-mortems.

TaskBoard Cloud is engineered as a **living showcase of Site Reliability Engineering (SRE), Cloud Architecture, and FinOps on Google Cloud Platform (GCP)**.

---

## 2. Source Context Synthesis (Deconstructed from `dumping.md`)

| Source Note | Engineering Implication | Technical Mandate |
| :--- | :--- | :--- |
| **"Small team task app, deployed on GCP"** | Multi-tenant domain model; 5–20 active users; moderate write load with frequent read polling. | PostgreSQL relational schema with team-scoped tenant isolation. |
| **"Live demo · Architecture diagram · Monthly running cost: about $6"** | Extremely strict cost envelope. Standard GCP patterns (such as $18/mo Application Load Balancer forwarding rules or $50/mo standard Cloud SQL instances) are strictly prohibited. | Must leverage Cloud Run free tier, Cloud SQL shared-core micro tier or serverless DB, and direct domain mapping / Cloud CDN. |
| **"Node/Postgres backend, React frontend, Cloud Run, Cloud SQL, Terraform, GitHub Actions"** | Modern, industry-standard stack with full Infrastructure as Code (IaC) and Continuous Delivery. | Modular Terraform configurations with remote state in GCS; multi-stage Docker builds. |
| **"Architecture: user → load balancer → Cloud Run → Cloud SQL, with Secret Manager and logging"** | Secure tier separation; stateless compute; centralized credentials and audit trails. | Direct Cloud Run HTTPS endpoint (or Cloud CDN) routing to containerized backend; Cloud SQL Auth Proxy; GCP Secret Manager bindings. |
| **"On push: tests run, container builds, auto-deploys to staging, prod needs manual approval. Rollback takes one command."** | GitOps-aligned multi-environment CI/CD pipeline with strict safety gates and instant rollback capability. | GitHub Actions pipeline utilizing Workload Identity Federation (keyless); Cloud Run revisions traffic shifting for sub-5-second rollbacks. |
| **"Budget alerts at $5, $10, and $20 so a mistake can’t run quietly."** | Proactive financial observability and circuit-breaking. | GCP Cloud Billing Budgets API hooked to Cloud Monitoring alert channels (Email / Webhook). |
| **"Autoscaling capped at 3 instances"** | Safeguard against runaway container billing during DDoS or algorithmic runaway loops. | Cloud Run `maxScale = 3` and `minScale = 0` (scale-to-zero when idle). |
| **"Log retention set to 14 days after I found logs were my biggest hidden cost."** | Prevent storage fee creep from default 30-day buckets and verbose stdout logs. | Custom Cloud Logging bucket with `retention_days = 14` and exclusion filters for `/health` polling. |
| **"Secrets live in Secret Manager, not in the repo."** | Strict 12-factor application security; zero credentials in git history. | Direct integration of Cloud Run container specs with Secret Manager secret references. |
| **"Daily database backups, and I tested restoring one."** | Verifiable Business Continuity & Disaster Recovery (BCDR). | Automated Cloud SQL daily backups, Point-In-Time Recovery (PITR) with a documented restore drill. |
| **"Mistake: Oversized database ran 24/7, cost ~$40 before noticed. Fixed with smaller tier, alert, and documented."** | High-value real-world learning experience and incident resolution. | Formal incident post-mortem and structural architecture changes to prevent recurrence. |

---

## 3. Functional Requirements

### 3.1. Authentication & Team Management
- **User Authentication**: Secure registration, login, logout, password reset flow. Passwords hashed using `bcrypt` (cost factor 12) or `argon2id`. Session management via signed HTTP-only cookies or short-lived JWTs.
- **Multi-Tenant Teams**:
  - Users can create one or more **Teams / Workspaces**.
  - Team invitations via email tokens.
  - Role-Based Access Control (RBAC):
    - **Owner**: Full administrative control, billing visibility, team deletion.
    - **Admin**: Member management, board creation, settings configuration.
    - **Member**: Create, edit, and assign tasks; comment and update statuses.
    - **Viewer**: Read-only access to boards and tasks.

### 3.2. Task & Board Engine
- **Kanban Structure**: Teams contain multiple **Boards**; boards contain **Lists / Columns** (e.g., `Backlog`, `To Do`, `In Progress`, `Review`, `Done`).
- **Task Lifecycle**:
  - Title, rich text description (Markdown support), priority (`Low`, `Medium`, `High`, `Urgent`).
  - Due date with time zone awareness.
  - Assignee(s) linked to team members.
  - Labels / Tags (customizable per board).
  - Drag-and-drop position ordering (using float/lexicographical sorting or integer position re-indexing).
- **Activity & Audit Trail**: Real-time record of who created, moved, edited, or completed any task.

### 3.3. Asynchronous Email Reminders
- **Automated Alerts**:
  - **Upcoming Due Date**: Notification dispatched 24 hours prior to deadline.
  - **Overdue Notice**: Alert sent when a task passes its due date without entering `Done`.
  - **Task Assignment**: Instant notification when a task is assigned to a team member.
- **Idempotency & Deduping**: Reminders must track dispatch state to guarantee no user receives duplicate emails due to worker restarts or retry loops.

---

## 4. Non-Functional Requirements (SRE & System Quality Attributes)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SRE QUALITY ATTRIBUTES                          │
├───────────────────────┬────────────────────────────────────────────────┤
│ Metric                │ Target SLO / Constraint                        │
├───────────────────────┼────────────────────────────────────────────────┤
│ Monthly Cloud Budget  │ Strict target: ~$6.00 / month                  │
│ Budget Alert Levels   │ $5.00 (50% warning), $10.00 (soft ceiling),    │
│                       │ $20.00 (critical hard incident alert)          │
│ Service Availability  │ 99.5% uptime (monthly downtime budget: ~3.6h) │
│ Latency (API p95)     │ < 250ms for authenticated CRUD operations      │
│ Cold Start Tolerance  │ < 2.5 seconds on Cloud Run scale-from-zero     │
│ Concurrency & Scale   │ Auto-scale 0 to 3 container instances          │
│ Recovery Point (RPO)  │ < 24 hours (daily automated database snapshot) │
│ Recovery Time (RTO)   │ < 30 minutes (tested manual or automated drill)│
│ Log Retention Window  │ Exactly 14 days (cost-optimized sink)          │
│ Secrets Hygiene       │ 0 secrets in repository; 100% Secret Manager   │
└───────────────────────┴────────────────────────────────────────────────┘
```

---

## 5. FinOps Analysis: Anatomy of the ~$6/Month GCP Budget

Achieving a ~$6/month run rate on Google Cloud requires understanding both **Free Tier allowances** and **billable baseline infrastructure**:

### 5.1. Where Costs Usually Explode (The Traps)
1. **Google Cloud External HTTP(S) Load Balancer**: Forwarding rules cost ~$18.25/month minimum regardless of traffic. *Must be avoided or replaced by Cloud Run direct domain mapping / Firebase Hosting.*
2. **Cloud SQL Enterprise / Multi-Zone Instances**: A 1 vCPU / 3.75 GB RAM instance with HA costs ~$55+/month. Even a standard single-zone custom instance is ~$30+/month.
3. **Cloud Logging Retention & Volume**: Default retention is 30 days. Verbose health check polling (e.g. Gatus checking `/health` every 15s = 172,800 requests/month) can generate gigabytes of log storage charges if not excluded.
4. **VPC Serverless Access Connector**: A standard Serverless VPC Access connector requires 2 micro/f1 VMs running 24/7 (~$12–$16/month) if used for private IP Cloud SQL! *Must use Cloud SQL Auth Proxy over Unix sockets / public IP with SSL or serverless database connector.*

### 5.2. The ~$6/Month Target Allocation Table

| Service | Allocation / Tier | Free Tier Applied | Estimated Monthly Cost |
| :--- | :--- | :--- | :--- |
| **Cloud Run (Compute)** | 1 vCPU, 512 MB RAM, scale 0–3, CPU throttled when idle | First 2M requests/mo, 360k GB-sec, 180k vCPU-sec free | **$0.00** (covered by free tier) |
| **Cloud SQL (PostgreSQL)** | `db-f1-micro` (1 shared vCPU, 0.6 GB RAM, 10 GB SSD, single-zone, non-HA) | No free tier for Cloud SQL | Compute: ~$7.67<br>Storage (10GB): ~$1.70<br>**Total: ~$5.50 – $8.00** *(or <$3.00 with scheduled off-peak downscaling or Serverless Postgres)* |
| **Secret Manager** | ~6 active secret versions, <10,000 accesses/mo | 6 versions free; $0.03 / 10k operations | **$0.00 – $0.05** |
| **Cloud Logging** | Custom sink with 14-day retention; `/health` logs excluded | First 50 GB ingestion free/mo | **$0.00** |
| **Artifact Registry** | Multi-stage slim Docker image (~50MB) | 0.5 GB storage free/mo | **$0.00 – $0.05** |
| **Cloud Scheduler + Tasks** | 3 scheduled jobs; <1,000 task dispatches/month | 3 free scheduler jobs/mo; 100k free tasks/mo | **$0.00** |
| **Cloud Monitoring / Budgets** | Uptime check + 3 budget alert rules | Free tier metrics & alert policies | **$0.00** |
| **Estimated Net Monthly Total** | — | — | **~$5.50 – $6.50 / month** |

---

## 6. Post-Mortem Case Study: "The $40 Oversized Database Incident"

One of the foundational experiences documented in `dumping.md` is an early architectural misstep that incurred an unexpected $40 cloud bill in a single month. This incident represents an exemplary engineering case study in FinOps.

```
                    INCIDENT CHRONOLOGY & RESOLUTION
                    
  [ Day 1: Deploy ] ──> Cloud SQL provisioned with default standard tier
                        (db-custom-1-3840 @ ~$50/mo, 24/7 run time)
                             │
                             ▼
  [ Day 15: Runaway ] ─> No budget alerts configured;
                        Instance runs silently at 100% cost with 0.1% CPU load.
                             │
                             ▼
  [ Day 30: The Bill ] ─> Monthly GCP invoice arrives: ~$40.00 charge.
                             │
                             ▼
  [ Remediation ] ─────> 1. Resized to db-f1-micro (~$7.67/mo).
                        2. Provisioned 3-tier budget alerts ($5, $10, $20).
                        3. Established log retention rule (14 days).
                        4. Added automated restore testing drill.
```

### 6.1. Incident Summary
- **Symptom**: Cloud bill jumped from an expected <$5.00 to ~$40.00.
- **Root Cause**: The Cloud SQL instance was initially created using GCP default template configurations (`db-custom-1-3840`: 1 dedicated vCPU, 3.84 GB memory) instead of a shared-core micro instance (`db-f1-micro`). Additionally, auto-storage increase was unconstrained, and no budget notification channel was active.
- **Detection Lag**: 28 days elapsed before detection because monitoring was focused entirely on application errors rather than infrastructure billing meters.

### 6.2. The 5 Whys Analysis
1. *Why did the bill hit $40?* Cloud SQL instance ran continuously on an oversized compute tier.
2. *Why was it oversized?* Default CLI/console presets were used without explicitly specifying the shared-core micro tier in Terraform.
3. *Why wasn't it noticed sooner?* Cloud Billing alerts were not enabled on the GCP billing account.
4. *Why weren't alerts enabled?* Billing was treated as a separate administrative concern rather than an integral part of application deployment (FinOps).
5. *Why did it happen in development?* Lack of automated IaC policy checks validating machine types against approved budgets.

### 6.3. Permanent Corrective Actions Implemented
1. **Infrastructure as Code Enforcement**: Locked Cloud SQL tier strictly to `db-f1-micro` in Terraform variables with validation rules.
2. **Multi-Tier Automated Budget Alerts**:
   - **$5.00 Alert (50% Warning)**: Triggers an email alert to the lead engineer when projected spend exceeds $5.
   - **$10.00 Alert (100% Target Met)**: Triggers an alert requiring active inspection of resource consumption.
   - **$20.00 Alert (Emergency Ceiling)**: Triggers high-priority notifications and optional automated scale-down scripts.
3. **Log Storage Pruning**: Replaced default 30-day retention with a custom 14-day log bucket and filtered out noisy health-probe entries.
4. **Disaster Recovery Validation**: Executed and verified a manual backup-and-restore drill to ensure the smaller database tier could restore a production snapshot within 15 minutes.

---

## 7. Cloud Platform & Regional Selection

- **Recommended Primary Region**: `us-central1` (Iowa) or `europe-west1` (Belgium).
  - *Rationale*: Lowest tier-1 pricing across GCP for Compute Engine, Cloud Run, and Cloud SQL; full feature availability for Cloud Run direct domain mapping, Cloud Scheduler, and Secret Manager.
- **Alternative Regional Candidate**: `asia-southeast1` (Singapore) if user locality demands minimal network latency in Southeast Asia (pricing is approximately 10–15% higher; adjust budget alerts to $6, $12, $24).
- **Free Tier Eligibility**: All choices leverage Google Cloud's permanent Free Tier (Always Free) provisions for Cloud Run, Cloud Tasks, and Cloud Logging.
