# 02. Architecture Options Overview

> **Comparative analysis of two distinct production-grade architectures designed to operate within a ~$6/month GCP budget.**

---

## 1. The Core Architectural Trade-Off

When architecting a small-to-medium team cloud service like **TaskBoard Cloud** on Google Cloud Platform, an engineer encounters a fundamental design dilemma:

```
    OPTION 1: DECOUPLED MULTI-SERVICE             OPTION 2: ULTRA-LEAN UNIFIED MONOLITH
    
    [Browser]                                    [Browser]
        │                                            │
        ├───────────────┐                            │ (HTTPS / Direct Cloud Run)
        ▼               ▼                            ▼
  [Cloud Storage] [Cloud Run API]              ┌─────────────────────────────────────┐
  (React SPA)     (Node.js Backend)            │ Google Cloud Run Container          │
        │               │                      │  ├─ Fastify Web Server              │
        │               ▼                      │  ├─ Static React Assets (/dist)     │
        │         [Cloud SQL]                  │  ├─ REST API Endpoints (/api/v1)    │
        │         (db-f1-micro)                │  └─ Background Job Webhook Handler  │
        ▼               ▲                      └──────────────────┬──────────────────┘
  [Cloud Tasks / Scheduler]                                       ▼
  (Async Worker Queues)                                    [PostgreSQL Database]
                                                           (Cloud SQL micro / Serverless)
```

- **Option 1 (Decoupled Multi-Service)** embodies the **enterprise cloud-native standard**: frontend and backend are completely decoupled, static assets are offloaded to object storage / CDN edge, async processing uses managed queues (Cloud Tasks), and database interactions use dedicated Cloud SQL connectors.
- **Option 2 (Ultra-Lean Unified Monolith)** embodies the **high-efficiency modern developer standard**: a single, ultra-optimized container serves pre-compiled frontend assets, processes REST API requests, and executes cron-triggered background jobs. Ingress costs are slashed to zero by utilizing Cloud Run’s native custom domain mapping.

---

## 2. High-Level Summary of Options

### Option 1: Classic Decoupled Cloud-Native Stack
* **Frontend**: React Single-Page Application (SPA) built with Vite & TypeScript, uploaded to a Google Cloud Storage bucket and served globally via Cloud CDN or Firebase Hosting edge.
* **Backend**: Node.js (TypeScript + Fastify/Express + Prisma ORM) container running on Cloud Run, auto-scaling from 0 to 3 instances.
* **Database**: Dedicated Google Cloud SQL PostgreSQL instance (`db-f1-micro`, 1 shared vCPU, 0.6 GB RAM, 10 GB SSD, single-zone).
* **Asynchronous Jobs**: Google Cloud Scheduler publishing to Google Cloud Tasks, which dispatches rate-limited HTTP webhook calls to a dedicated worker endpoint on Cloud Run for email delivery.
* **Infrastructure as Code**: Multi-module Terraform configuring GCP storage buckets, Cloud Run IAM, Cloud SQL instance, Cloud Tasks queues, Secret Manager, and Cloud Monitoring alert policies.
* **CI/CD**: Dual-pipeline GitHub Actions workflow deploying frontend assets to Cloud Storage and backend images to Artifact Registry / Cloud Run.

### Option 2: Ultra-Lean Unified Containerized Stack
* **Architecture**: Modular Monolith packaged into a single multi-stage Docker container. Fastify serves optimized static React frontend assets from `/dist` on root paths (`/`) and routes API traffic under `/api/v1/*`.
* **Edge & Ingress**: Cloud Run Direct Domain Mapping (or regional HTTPS URL) with automated GCP-managed TLS certificates. **Zero Load Balancer cost ($0 vs ~$18/mo).**
* **Database**: PostgreSQL with connection pooling (either Cloud SQL `db-f1-micro` with scheduled off-hours stop/start or Serverless PostgreSQL like Neon with scale-to-zero compute).
* **Asynchronous Jobs**: Cloud Scheduler cron hitting an authenticated Cloud Run webhook endpoint `/api/v1/jobs/send-reminders` secured by OIDC service account tokens.
* **Infrastructure as Code**: Streamlined Terraform module provisioning a single Cloud Run service, database instance, Secret Manager secrets, and Cloud Scheduler triggers.
* **CI/CD**: Single GitHub Actions pipeline utilizing Docker build caching, deploying to staging automatically, and routing production traffic via Canary revisions (10% → 100%) with 1-command instant rollback.

---

## 3. Side-by-Side Comprehensive Comparison Matrix

| Evaluation Dimension | Option 1: Classic Decoupled | Option 2: Ultra-Lean Unified Monolith |
| :--- | :--- | :--- |
| **Monthly Cost (Baseline)** | **$6.50 – $8.50 / month**<br>*(Cloud SQL: ~$7.70, Storage/CDN: ~$0.10, Cloud Run: $0)* | **$2.50 – $6.00 / month**<br>*(Cloud SQL with sleep or Serverless DB: $2–$5, Cloud Run: $0)* |
| **Ingress Cost (ALB vs Direct)** | $0.00 – $0.50 (Firebase Hosting / CDN edge)<br>*(Avoids $18/mo ALB)* | **$0.00** (Cloud Run native custom domain mapping) |
| **Container Footprint** | Separate API container (~85 MB) + static frontend bundle (~1.5 MB) | Single unified multi-stage container (~95 MB total) |
| **Deployment Complexity** | Medium-High (2 build targets: frontend build & upload + Docker build & Cloud Run deploy) | **Low-Medium (Single atomic Docker build and deploy)** |
| **Cold Start Impact** | Frontend: 0ms (served from CDN cache)<br>Backend API: ~1.8s on scale-from-zero | Frontend + API: ~2.0s on first load after complete idle |
| **Blast Radius & Fault Isolation** | High (Frontend static site stays up even if backend container crashes) | Medium (Container crash affects both UI rendering and API endpoints) |
| **CORS Configuration** | Required (Frontend domain differs from Backend Cloud Run domain) | **Eliminated (Same-origin for frontend and API)** |
| **Local Development Experience** | Requires running Vite dev server (`:5173`) + Backend server (`:8080`) with proxy | Run Vite in dev, or run unified Fastify container (`docker compose up`) |
| **Rollback Complexity** | Must coordinate frontend bucket revert with Cloud Run revision rollback | **1-Command revision rollback (`gcloud run services update-traffic`)** |
| **Async Task Architecture** | Cloud Scheduler → Cloud Tasks → Cloud Run endpoint (Enterprise grade) | Cloud Scheduler → Authenticated Cloud Run endpoint (Lightweight) |
| **Terraform Resource Count** | ~28 Terraform resources (Storage, CDN, IAM, Tasks, Cloud Run, SQL) | **~15 Terraform resources (Cloud Run, SQL, Scheduler, Secrets, IAM)** |
| **Portfolio & Resume Value** | **Maximum Enterprise Signaling**: Demonstrates CDN offloading, Cloud Tasks queues, decoupled services. | **Maximum FinOps & High-Velocity Signaling**: Demonstrates radical simplicity, cost minimization, and atomic releases. |

---

## 4. Key Architectural Insights

### Insight 1: Eliminating the $18/Month Cloud Load Balancer Trap
In standard GCP enterprise tutorials, users are instructed to set up an External HTTP(S) Load Balancer (Global Application Load Balancer) with Serverless NEGs (Network Endpoint Groups). 
- **The Financial Reality**: A GCP Application Load Balancer charges **$0.025 per hour** for the first 5 forwarding rules = **~$18.25/month**, even if traffic is zero!
- **The Solution**: Both Option 1 and Option 2 strictly bypass the Application Load Balancer:
  - In Option 1, the frontend is served via Cloud Storage/CDN or Firebase Hosting (which includes global SSL and CDN routing on the free tier), and the backend is reached via direct Cloud Run URLs or Firebase rewrites.
  - In Option 2, Cloud Run's native domain mapping directly terminates TLS using Google-managed certificates at **$0.00 cost**.

### Insight 2: The Database Sizing & Concurrency Reality
A `db-f1-micro` instance on Cloud SQL provides:
- **1 shared vCPU** (throttled burstable compute)
- **614 MB of RAM**
- **Maximum recommended connections: 25**
In both options, running Node.js with a naive connection pool (e.g. 50 connections per container × 3 containers = 150 connections) will cause PostgreSQL memory exhaustion (`OOM`) and crash the database. 
- **Mandatory Configuration**: The backend connection pool must be capped at **5–8 connections per container instance**. With `maxScale = 3`, peak connections equal `3 × 8 = 24`, fitting safely within the 25-connection threshold of `db-f1-micro`.

---

## 5. Next Steps & Detailed Blueprints

- For the step-by-step implementation plan of the decoupled multi-tier architecture, see **[03-plan-option-1-classic-decoupled.md](file:///home/sam/Code/TaskBoard-cloud/docs/03-plan-option-1-classic-decoupled.md)**.
- For the step-by-step implementation plan of the unified lean container architecture, see **[04-plan-option-2-lean-unified-monolith.md](file:///home/sam/Code/TaskBoard-cloud/docs/04-plan-option-2-lean-unified-monolith.md)**.
- For the database schema and API contracts shared by both options, see **[05-data-model-and-api-spec.md](file:///home/sam/Code/TaskBoard-cloud/docs/05-data-model-and-api-spec.md)**.
