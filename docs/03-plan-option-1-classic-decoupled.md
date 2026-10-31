# 03. Full Plan Option 1: Classic Decoupled Cloud-Native

> **Architecture, Component Specifications, Terraform Blueprints, and Operational Runbooks for the Decoupled Multi-Service Model.**

---

## 1. Architectural Blueprint & Data Flow

Option 1 represents the standard enterprise decoupled cloud-native architecture: the presentation layer is decoupled from compute, asynchronous work is decoupled via distributed queues, and persistent storage is managed in a relational Cloud SQL database.

```
                               OPTION 1 ARCHITECTURE
                               
   [ Client Browser ]
      │             │
      │ (Static UI) │ (REST API /api/v1/*)
      ▼             ▼
┌──────────────┐  ┌──────────────────────────────────────────────────────────────┐
│ Firebase     │  │ Google Cloud Run (Backend API Service)                       │
│ Hosting /    │  │  • Image: gcr.io/taskboard-cloud/api:sha-xxxx               │
│ Cloud CDN    │  │  • Scaling: minScale=0, maxScale=3                           │
│ (React SPA)  │  │  • CPU: 1 vCPU, Memory: 512MiB, Concurrency: 80              │
└──────────────┘  └──────┬─────────────────────┬──────────────────┬──────────────┘
                         │                     │                  │
        ┌────────────────┘                     │                  └──────────────┐
        ▼                                      ▼                                 ▼
┌───────────────────────┐           ┌───────────────────────┐         ┌───────────────────────┐
│ Cloud SQL             │           │ Secret Manager        │         │ Cloud Logging         │
│ (PostgreSQL 16)       │           │ • DATABASE_URL        │         │ • 14-day custom sink  │
│ • Tier: db-f1-micro   │           │ • JWT_SECRET          │         │ • Filtered /health    │
│ • Storage: 10GB SSD   │           │ • RESEND_API_KEY      │         │   polling logs        │
│ • Cloud SQL Proxy     │           └───────────────────────┘         └───────────────────────┘
└───────────────────────┘                      ▲
                                               │ (Dispatches Webhook)
┌───────────────────────┐           ┌──────────┴────────────┐
│ Cloud Scheduler       │ ────────> │ Cloud Tasks           │
│ (Cron: Every 15 min)  │           │ (Queue: email-tasks)  │
└───────────────────────┘           └───────────────────────┘
```

### Request Lifecycles
1. **Frontend Assets**: The user's browser requests `https://app.taskboard.com/`. Requests hit Firebase Hosting / Cloud CDN, returning cached HTML/JS/CSS bundles in **<50ms** with zero backend compute consumed.
2. **REST API Invocations**: React client sends asynchronous API calls (`fetch('/api/v1/tasks')`) to the Cloud Run custom domain. If idle, Cloud Run initiates a container cold start (~1.8s), establishes a connection pool to Cloud SQL, queries data, and returns JSON.
3. **Async Email Reminders**:
   - `Cloud Scheduler` fires an HTTP POST every 15 minutes to Cloud Run endpoint `/api/v1/internal/schedule-reminders`.
   - The backend checks for tasks due within the next 24 hours that lack a dispatched notification log.
   - For each matching task, the backend creates a task payload in **Google Cloud Tasks** (`email-tasks` queue).
   - `Cloud Tasks` rate-limits and pushes individual email payloads to `/api/v1/internal/send-email`, which invokes the email provider (Resend or SendGrid) with exponential backoff on transient errors.

---

## 2. Directory & Repository Structure

```
TaskBoard-cloud/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Linting, testing, and type checking
│       ├── deploy-frontend.yml    # Build React SPA & deploy to Firebase/CDN
│       ├── deploy-backend.yml     # Build Docker image & deploy to Cloud Run
│       └── rollback.yml           # Instant 1-command traffic split rollback
├── terraform/
│   ├── main.tf                    # GCP Provider, project bindings, backend state
│   ├── variables.tf               # Environment variables & sizing inputs
│   ├── outputs.tf                 # Cloud Run URLs, Cloud SQL connection names
│   ├── terraform.tfvars           # Environment-specific configuration values
│   └── modules/
│       ├── cloud_run/             # Cloud Run service, IAM, autoscaling caps
│       ├── cloud_sql/             # PostgreSQL db-f1-micro, users, backups
│       ├── cloud_tasks/           # Queue definition, rate limits, retry policies
│       ├── secrets/               # Secret Manager secrets and IAM bindings
│       └── monitoring/            # Budget alerts ($5/$10/$20), 14-day log sink
├── backend/
│   ├── src/
│   │   ├── config/                # Environment variables, database connection
│   │   ├── controllers/           # HTTP handlers (auth, boards, tasks, teams)
│   │   ├── middleware/            # JWT auth, RBAC guards, request logging
│   │   ├── models/                # Prisma or Drizzle schema & queries
│   │   ├── services/              # Business logic (task lifecycle, email queue)
│   │   ├── jobs/                  # Cloud Task webhook handlers
│   │   └── server.ts              # Fastify/Express initialization & health probes
│   ├── Dockerfile                 # Multi-stage production container build
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/            # Kanban board, cards, modals, navigation
│   │   ├── hooks/                 # Auth hooks, API query hooks
│   │   ├── pages/                 # Login, Dashboard, BoardView, Settings
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
└── docs/                          # Documentation suite
```

---

## 3. Infrastructure as Code: Terraform Blueprint

### 3.1. Cloud SQL Micro Module (`terraform/modules/cloud_sql/main.tf`)
Enforces the single-zone `db-f1-micro` tier, restricts disk growth, and enables automated daily backups.

```hcl
resource "google_sql_database_instance" "postgres" {
  name             = "taskboard-${var.environment}-pg"
  database_version = "POSTGRES_16"
  region           = var.region
  deletion_protection = var.environment == "prod" ? true : false

  settings {
    tier                        = "db-f1-micro" # Strict cost control: 1 shared core, 0.6 GB RAM
    availability_type           = "ZONAL"       # Avoid HA to eliminate 2x compute cost
    disk_size                   = 10            # Minimum 10 GB SSD
    disk_type                   = "PD_SSD"
    disk_autoresize             = false         # Prevent silent runaway storage costs

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"   # Run daily at 03:00 UTC
      point_in_time_recovery_enabled = false     # Disable WAL archiving to save storage
      transaction_log_retention_days = 1
      backup_retention_settings {
        retained_backups = 7                     # Retain 7 daily backups
      }
    }

    ip_configuration {
      ipv4_enabled = true # Connect via Cloud SQL Auth Proxy over secure public endpoint
    }

    database_flags {
      name  = "max_connections"
      value = "30" # Enforce strict limit for 0.6 GB memory tier
    }
  }
}

resource "google_sql_database" "taskboard_db" {
  name     = "taskboard_${var.environment}"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "app_user" {
  name     = "taskboard_app"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}
```

### 3.2. Cloud Run Backend Service (`terraform/modules/cloud_run/main.tf`)
Enforces the hard autoscaling ceiling of 3 instances, scale-to-zero, and connects to Cloud SQL via the built-in Cloud SQL connector.

```hcl
resource "google_cloud_run_v2_service" "api_service" {
  name     = "taskboard-${var.environment}-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = 0 # Scale to zero when idle ($0 compute)
      max_instance_count = 3 # Hard ceiling: prevents runaway billing
    }

    containers {
      image = var.container_image
      
      resources {
        limits = {
          cpu    = "1000m" # 1 vCPU
          memory = "512Mi" # 512 MB RAM
        }
        cpu_idle = true    # CPU allocated ONLY during request processing
      }

      env {
        name  = "NODE_ENV"
        value = var.environment
      }

      # Mount Secret Manager secrets as environment variables
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.database_secret_id
            version = "latest"
          }
        }
      }

      env {
        name = "JWT_SECRET"
        value_source {
          secret_key_ref {
            secret  = var.jwt_secret_id
            version = "latest"
          }
        }
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 8080
        }
        period_seconds   = 30
        failure_threshold = 3
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [var.cloud_sql_connection_name]
      }
    }
  }
}
```

### 3.3. Cloud Tasks Queue Module (`terraform/modules/cloud_tasks/main.tf`)
Configures rate-limited task execution with exponential backoff to protect third-party email APIs and internal database connections.

```hcl
resource "google_cloud_tasks_queue" "email_queue" {
  name     = "taskboard-${var.environment}-email-queue"
  location = var.region

  rate_limits {
    max_concurrent_dispatches = 3   # Protect Cloud Run from email spikes
    max_dispatches_per_second = 5.0
  }

  retry_config {
    max_attempts       = 5
    min_backoff        = "5s"
    max_backoff        = "300s"
    max_doublings      = 4
  }
}
```

---

## 4. Multi-Stage Dockerfile (Backend API)

```dockerfile
# Stage 1: Build & compile TypeScript
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build
RUN npm prune --production

# Stage 2: Minimal runtime image
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER appuser
EXPOSE 8080
CMD ["node", "dist/server.js"]
```

---

## 5. Continuous Delivery & GitHub Actions Workflow

### Staging Auto-Deploy + Production Manual Approval Gate
The pipeline uses **GitHub Environments** to enforce manual approval before deploying to production:

```yaml
name: Deploy Backend Service

on:
  push:
    branches: [ main ]
    paths:
      - 'backend/**'
      - '.github/workflows/deploy-backend.yml'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: cd backend && npm ci && npm test

  build-and-deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    environment: staging
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - name: Authenticate to GCP via Workload Identity
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WIF_PROVIDER }}
          service_account: ${{ secrets.GCP_WIF_SERVICE_ACCOUNT }}
      - name: Build & Push Container to Artifact Registry
        run: |
          gcloud auth configure-docker us-central1-docker.pkg.dev
          docker build -t us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/taskboard/api:${{ github.sha }} ./backend
          docker push us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/taskboard/api:${{ github.sha }}
      - name: Deploy to Cloud Run Staging
        run: |
          gcloud run deploy taskboard-staging-api \
            --image us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/taskboard/api:${{ github.sha }} \
            --region us-central1 \
            --quiet

  deploy-production:
    needs: build-and-deploy-staging
    runs-on: ubuntu-latest
    environment: production # Requires manual approval in GitHub repo settings
    permissions:
      contents: read
      id-token: write
    steps:
      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WIF_PROVIDER }}
          service_account: ${{ secrets.GCP_WIF_SERVICE_ACCOUNT }}
      - name: Deploy to Cloud Run Production
        run: |
          gcloud run deploy taskboard-prod-api \
            --image us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/taskboard/api:${{ github.sha }} \
            --region us-central1 \
            --quiet
```

---

## 6. One-Command Instant Rollback Runbook

If a production release introduces a critical regression, rollback takes **one command** via Cloud Run traffic shifting:

```bash
# 1. List the last 5 revisions of the production service
gcloud run revisions list --service=taskboard-prod-api --region=us-central1 --limit=5

# 2. Instantly shift 100% of traffic back to the previous healthy revision (takes ~2 seconds)
gcloud run services update-traffic taskboard-prod-api \
  --to-revisions=taskboard-prod-api-00042-xyz=100 \
  --region=us-central1
```

---

## 7. Line-Item Monthly Cost Breakdown (Option 1)

| Service Resource | Configuration Specification | Free Tier Allowance | Net Monthly Cost |
| :--- | :--- | :--- | :--- |
| **Cloud SQL (PostgreSQL)** | `db-f1-micro` (1 shared core, 0.6 GB RAM, 10 GB SSD) | None | Compute: $7.67<br>Storage: $1.70<br>**Subtotal: $9.37** |
| **Cloud Run (Backend API)** | 1 vCPU / 512 MB, scale 0 to 3, idle CPU throttling | 2,000,000 requests & 360k GB-s free | **$0.00** |
| **Firebase / CDN (Frontend)** | React static files (<5 GB bandwidth/mo) | 10 GB transfer/month free | **$0.00** |
| **Cloud Tasks & Scheduler** | 1 queue, 3 cron jobs, <1,000 dispatches/mo | 3 jobs free; 100k tasks/mo free | **$0.00** |
| **Secret Manager** | 4 secrets (DB, JWT, Resend, App Key) | 6 active secret versions free | **$0.00** |
| **Cloud Logging** | Custom 14-day sink, health check logs excluded | 50 GB ingestion free | **$0.00** |
| **Artifact Registry** | ~90 MB Docker image storage | 0.5 GB free | **$0.00** |
| **Net Total (Option 1)** | — | — | **~$9.37 / month** |

> **Cost Optimization Tip for Option 1**:
> If running continuous 24/7 Cloud SQL exceeds the strict $6.00 target, a simple Cloud Scheduler job can pause the `db-f1-micro` instance for 8 hours overnight in personal development environments, reducing compute cost by 33% to **~$6.80/month**.

---

## 8. SRE Failure Modes & Mitigation Strategies

1. **Cloud SQL Memory Exhaustion (`OOM`)**:
   - *Risk*: `db-f1-micro` only has 614 MB RAM. Opening too many backend connections crashes PostgreSQL.
   - *Mitigation*: Hardcode PostgreSQL `max_connections = 30`. In the Node.js connection pool (Prisma/pg), set `connection_limit = 6` per container. With `maxScale = 3`, max active connections can never exceed `18`, leaving headroom for admin tools.
2. **Cold Start Latency**:
   - *Risk*: First user visit after idle experiences a 1.8-second delay while Cloud Run boots.
   - *Mitigation*: Keep container images lean (<90 MB) using Alpine. Bundle only required dependencies (`npm prune --production`). The React frontend renders immediately from CDN cache, displaying a skeleton loader while the API boots.
3. **Cloud Tasks Email Retry Storm**:
   - *Risk*: If third-party email provider returns 500, Cloud Tasks retries immediately, hammering the API.
   - *Mitigation*: Configure `min_backoff = 5s` and `max_attempts = 5` in the queue definition. Implement task deduplication IDs to guarantee idempotency.
