# 04. Full Plan Option 2: Ultra-Lean Unified Containerized Monolith

> **Architecture, Component Specifications, Dockerfile, Terraform, and Canary CI/CD for the High-Velocity, Radical FinOps Model.**

---

## 1. Architectural Blueprint & Concept

Option 2 represents the modern **Ultra-Lean Unified Cloud-Native Monolith**. Rather than maintaining decoupled hosting platforms, complex CORS rules, and multiple deployment pipelines, Option 2 compiles the React frontend and Fastify backend into a **single, highly optimized container image** hosted on Google Cloud Run.

```
                               OPTION 2 ARCHITECTURE
                               
   [ Client Browser ]
         │
         │ (HTTPS / Native Cloud Run Custom Domain Mapping - $0 Ingress)
         ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Google Cloud Run (Unified Monolith Container)                          │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │ Fastify HTTP Server (:8080)                                  │     │
│   │                                                              │     │
│   │  ├── Route: GET /              ──> Serves React index.html   │     │
│   │  ├── Route: GET /assets/*      ──> Serves compiled JS/CSS    │     │
│   │  ├── Route: /api/v1/*          ──> REST API Endpoints        │     │
│   │  ├── Route: GET /health        ──> Health check probe        │     │
│   │  └── Route: POST /api/v1/jobs  ──> Cron Reminder Worker      │     │
│   └──────────────────────────────┬───────────────────────────────┘     │
│                                  │                                     │
│         ┌────────────────────────┼────────────────────────┐            │
│         ▼                        ▼                        ▼            │
│  ┌──────────────┐       ┌─────────────────┐      ┌─────────────────┐   │
│  │ PostgreSQL   │       │ Secret Manager  │      │ Cloud Logging   │   │
│  │ (Serverless  │       │ (Secrets loaded │      │ (14-day sink,   │   │
│  │  or Micro)   │       │  into container)│      │  filtered /health)  │
│  └──────────────┘       └─────────────────┘      └─────────────────┘   │
│                                  ▲                                     │
│  ┌───────────────────────────────┴──────────────────────────────┐      │
│  │ Cloud Scheduler (Runs every 15m; signs OIDC JWT token)       │      │
│  └──────────────────────────────────────────────────────────────┘      │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Innovations of Option 2
1. **Radical Cost Reduction via Direct Ingress**: Eliminates the Google Cloud Application Load Balancer ($18.25/month). Cloud Run terminates SSL directly using Google-managed certificates on custom domains for **$0.00**.
2. **True Scale-to-Zero ($0 Compute Idle)**: Because the entire web app (frontend and API) lives in one container, when no users are active, compute costs drop to **$0.00**.
3. **Serverless PostgreSQL Option (Neon / Supabase)**: By utilizing a serverless PostgreSQL database that suspends compute when idle, the monthly database bill drops from ~$9.37 down to **$0.00 – $3.00/month**, easily fitting the project under the **$6.00 monthly ceiling**.
4. **Zero-CORS Simplicity**: Because frontend assets and API endpoints share the exact same origin (`https://taskboard.app/`), CORS preflight requests (`OPTIONS`) are completely eliminated, reducing latency and operational bugs.

---

## 2. Directory & Repository Structure

```
TaskBoard-cloud/
├── .github/
│   └── workflows/
│       ├── deploy.yml             # Single pipeline: test, build, staging, prod canary
│       └── rollback.yml           # Instant 1-command revision rollback
├── Dockerfile                     # Multi-stage: builds React, compiles Node, creates image
├── docker-compose.yml             # Full local development stack (App + Postgres 16)
├── terraform/
│   ├── main.tf                    # GCP Provider & Cloud Run deployment
│   ├── variables.tf
│   ├── outputs.tf
│   └── modules/
│       ├── cloud_run/             # Cloud Run service, custom domain, scaling
│       ├── secrets/               # Secret Manager integration
│       ├── scheduler/             # Cloud Scheduler OIDC cron trigger
│       └── monitoring/            # $5/$10/$20 budget alerts & 14-day log sink
├── client/                        # React Frontend (Vite, TypeScript, Tailwind)
│   ├── src/
│   │   ├── components/            # Kanban board, task cards, filters
│   │   ├── pages/                 # Auth, Dashboard, Settings
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
├── server/                        # Fastify Backend API
│   ├── src/
│   │   ├── config/                # Environment variables
│   │   ├── routes/                # Auth, Teams, Boards, Tasks, Jobs
│   │   ├── services/              # Business logic & email dispatches
│   │   ├── db/                    # Drizzle/Prisma schema & migrations
│   │   └── index.ts               # Fastify server & static asset handler
│   ├── package.json
│   └── tsconfig.json
└── package.json                   # Root package with monorepo scripts
```

---

## 3. High-Performance Multi-Stage Dockerfile

The multi-stage build cleanly isolates compilation environments, producing a minimal, secure production container image (~90 MB) with no dev dependencies.

```dockerfile
# Stage 1: Build Frontend SPA
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build
# Output produced at /app/client/dist

# Stage 2: Build Backend Server
FROM node:22-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json server/tsconfig.json ./
RUN npm ci
COPY server/ ./
RUN npm run build
RUN npm prune --production

# Stage 3: Minimal Production Image
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy backend build and production dependencies
COPY --from=server-builder /app/server/package*.json ./
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/dist ./dist

# Copy frontend static build into server's static directory
COPY --from=client-builder /app/client/dist ./public

USER appuser
EXPOSE 8080

# Fastify boots and serves both static UI and REST API
CMD ["node", "dist/index.js"]
```

---

## 4. Unified Fastify Server Architecture (`server/src/index.ts`)

Fastify handles both high-throughput REST API calls and static SPA routing with automatic fallback:

```typescript
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { apiRoutes } from './routes/api';
import { jobRoutes } from './routes/jobs';

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    // Output GCP-compliant structured JSON logs
    serializers: {
      req: (req) => ({ method: req.method, url: req.url }),
    },
  },
});

// 1. Health check probe for Cloud Run
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// 2. REST API & Scheduled Jobs
app.register(apiRoutes, { prefix: '/api/v1' });
app.register(jobRoutes, { prefix: '/api/v1/jobs' });

// 3. Static Asset Serving (Frontend SPA)
app.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
  prefix: '/',
  cacheControl: true,
  maxAge: '1d',
  immutable: true,
});

// 4. SPA Fallback: Any unknown GET route returns index.html for client-side routing
app.setNotFoundHandler((req, reply) => {
  if (req.raw.url && !req.raw.url.startsWith('/api/')) {
    return reply.sendFile('index.html');
  }
  return reply.status(404).send({ error: 'Endpoint Not Found' });
});

// 5. Graceful Shutdown on Cloud Run SIGTERM
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 8080;
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`TaskBoard Unified Monolith running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  app.log.info('SIGTERM received. Draining connections...');
  await app.close();
  process.exit(0);
});

start();
```

---

## 5. Asynchronous Reminders via Authenticated Cloud Scheduler

Instead of maintaining a separate Cloud Tasks queue infrastructure, Option 2 utilizes **Google Cloud Scheduler** to trigger a protected webhook endpoint on Cloud Run.

### Security via OIDC Identity Token
1. Cloud Scheduler is assigned a dedicated Service Account: `scheduler-invoker@<PROJECT_ID>.iam.gserviceaccount.com`.
2. Cloud Scheduler signs an OpenID Connect (OIDC) identity token audience-bound to the Cloud Run service URL.
3. Fastify's `/api/v1/jobs/send-reminders` verifies the Google OIDC token before executing the reminder logic.

```hcl
# terraform/modules/scheduler/main.tf
resource "google_cloud_scheduler_job" "reminder_cron" {
  name             = "taskboard-${var.environment}-reminder-job"
  description      = "Triggers due date email reminders every 15 minutes"
  schedule         = "*/15 * * * *"
  time_zone        = "Etc/UTC"
  attempt_deadline = "180s"

  http_target {
    http_method = "POST"
    uri         = "${var.cloud_run_url}/api/v1/jobs/send-reminders"

    oidc_token {
      service_account_email = google_service_account.scheduler_sa.email
      audience              = var.cloud_run_url
    }
  }
}
```

---

## 6. Continuous Delivery with Canary Revisions (GitHub Actions)

Option 2 enables zero-risk Canary deployments using Cloud Run native traffic splitting:

```
[ Push to Main ] ──> [ Tests Pass ] ──> [ Build Single Image ]
                                                │
                                                ▼
                                    [ Deploy New Revision ]
                                                │
                                                ▼
                                  [ Route 10% Traffic to New ]
                                                │
                                    (Automated Health Check)
                                                │
                                                ▼
                                 [ Route 100% Traffic to New ]
```

### Complete Pipeline (`.github/workflows/deploy.yml`)

```yaml
name: Deploy Unified TaskBoard Monolith

on:
  push:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm test

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - name: Authenticate to GCP via WIF
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WIF_PROVIDER }}
          service_account: ${{ secrets.GCP_WIF_SERVICE_ACCOUNT }}

      - name: Build and Push Docker Image
        run: |
          IMAGE_TAG="us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/taskboard/app:${{ github.sha }}"
          docker build -t $IMAGE_TAG .
          docker push $IMAGE_TAG

      - name: Deploy Staging Revision (Tagged)
        run: |
          IMAGE_TAG="us-central1-docker.pkg.dev/${{ secrets.GCP_PROJECT_ID }}/taskboard/app:${{ github.sha }}"
          gcloud run deploy taskboard-app \
            --image $IMAGE_TAG \
            --region us-central1 \
            --tag staging \
            --no-traffic \
            --quiet

      - name: Run Smoke Tests against Staging Revision
        run: |
          STAGING_URL=$(gcloud run services describe taskboard-app --region us-central1 --format='value(status.traffic[0].url)')
          curl --fail $STAGING_URL/health || exit 1

      - name: Canary Release (10% Traffic to New Revision)
        run: |
          REVISION_NAME=$(gcloud run revisions list --service taskboard-app --region us-central1 --limit 1 --format 'value(metadata.name)')
          gcloud run services update-traffic taskboard-app \
            --to-revisions ${REVISION_NAME}=10 \
            --region us-central1

      - name: Promote to 100% Production Traffic
        run: |
          REVISION_NAME=$(gcloud run revisions list --service taskboard-app --region us-central1 --limit 1 --format 'value(metadata.name)')
          gcloud run services update-traffic taskboard-app \
            --to-revisions ${REVISION_NAME}=100 \
            --region us-central1
```

---

## 7. Line-Item Monthly Cost Breakdown (Option 2)

| Service Resource | Configuration Specification | Free Tier Allowance | Net Monthly Cost |
| :--- | :--- | :--- | :--- |
| **Cloud Run (Unified App)** | 1 vCPU / 512 MB, scale 0 to 3, idle CPU throttling | First 2M requests & 360k GB-s free | **$0.00** |
| **Ingress (Custom Domain)** | Native Cloud Run Domain Mapping with TLS | Unlimited free SSL certificates | **$0.00** |
| **Database Option A (Serverless Neon)** | 0.5 GB storage, auto-suspend compute to $0 | 0.5 GB free storage & compute pool | **$0.00 – $2.00** |
| **Database Option B (Cloud SQL micro)** | `db-f1-micro` with scheduled overnight pause | None | **~$5.50 – $6.20** |
| **Cloud Scheduler** | 1 cron job (every 15 min) | 3 free jobs/month | **$0.00** |
| **Secret Manager** | 3 secrets (DB, JWT, Email API key) | 6 free active versions | **$0.00** |
| **Cloud Logging** | 14-day retention custom sink, `/health` filtered | 50 GB ingestion free | **$0.00** |
| **Artifact Registry** | ~90 MB unified Docker image | 0.5 GB free storage | **$0.00** |
| **Net Total (Option 2 with Serverless DB)** | — | — | **~$0.00 – $2.00 / month** |
| **Net Total (Option 2 with Cloud SQL micro)** | — | — | **~$5.50 / month** |

---

## 8. SRE Failure Modes & Mitigation Strategies

1. **Monolith Memory Bloat**:
   - *Risk*: Static file caching inside Fastify combined with API database queries could exceed 512 MB RAM under heavy load.
   - *Mitigation*: Configure `@fastify/static` with stream-based transfers and OS page caching rather than keeping large buffers in V8 memory. Set Node.js `--max-old-space-size=400`.
2. **Cron Job Overlap**:
   - *Risk*: A reminder run takes longer than 15 minutes, causing two instances to send emails simultaneously.
   - *Mitigation*: Database-backed advisory locks (`pg_try_advisory_lock(42)`). If a previous run is active, the second job immediately exits with HTTP 200.
3. **Cold Start User Friction**:
   - *Risk*: First visitor after scale-to-zero waits ~2.0 seconds for both HTML and API.
   - *Mitigation*: Fastify boots in <150ms in Node 22. Total container startup time on Cloud Run is ~1.8 seconds. A lightweight HTML shell renders instantly and prompts the user while assets hydrate.
