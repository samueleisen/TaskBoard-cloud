# 07. CI/CD & Deployment Strategy

> **Zero-trust delivery pipeline, Workload Identity Federation, automated staging deployments, manual production gates, and 1-command instant rollbacks.**

---

## 1. Continuous Delivery Pipeline Overview

TaskBoard Cloud implements a rigorous GitOps-inspired Continuous Integration and Continuous Delivery (CI/CD) workflow complying directly with the principle defined in `dumping.md`:
> *"What happens on every push: tests run, a container builds, it deploys to staging automatically, and production needs one manual approval. A rollback takes one command."*

```
                             CI/CD WORKFLOW PIPELINE
                             
  [ Push to Main / PR ]
            │
            ▼
  ┌──────────────────┐
  │ Job 1: Test & CI │ ──> ESLint, TypeScript Type Check, Jest Unit Tests
  └────────┬─────────┘
           │ (Pass)
           ▼
  ┌──────────────────┐
  │ Job 2: Build     │ ──> Docker Multi-stage Build, Artifact Registry Push
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Job 3: Staging   │ ──> Auto-deploy to Cloud Run Staging Revision
  │ (Automatic)      │ ──> Execute DB Migrations
  └────────┬─────────┘ ──> Run Health & Smoke Tests
           │
           ▼
  ┌──────────────────┐
  │ Job 4: Prod Gate │ ──> GitHub Environment Protection Gate (Manual Approval)
  └────────┬─────────┘
           │ (Approved by Lead)
           ▼
  ┌──────────────────┐
  │ Job 5: Deploy    │ ──> Deploy to Production (Zero-downtime revision shift)
  └──────────────────┘
```

---

## 2. Security: Keyless Workload Identity Federation (WIF)

Storing service account JSON keys inside GitHub Repository Secrets presents a significant security risk (key leakage, lack of rotation). TaskBoard Cloud uses **Google Cloud Workload Identity Federation** to grant GitHub Actions short-lived OIDC tokens.

### Terraform Configuration: Workload Identity Pool

```hcl
resource "google_iam_workload_identity_pool" "github_pool" {
  workload_identity_pool_id = "github-actions-pool"
  display_name              = "GitHub Actions Pool"
}

resource "google_iam_workload_identity_pool_provider" "github_provider" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github_pool.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Actions Provider"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Bind CI/CD Service Account to GitHub Repo
resource "google_service_account_iam_member" "wif_binding" {
  service_account_id = google_service_account.cicd_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github_pool.name}/attribute.repository/${var.github_repo}"
}
```

---

## 3. Complete CI/CD Workflow (`.github/workflows/ci-cd.yml`)

```yaml
name: Continuous Integration & Continuous Delivery

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

permissions:
  contents: read
  id-token: write

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  REGION: us-central1
  REPOSITORY: taskboard
  SERVICE_NAME: taskboard-app

jobs:
  # -------------------------------------------------------------
  # STAGE 1: Code Quality, Unit Tests, and Linting
  # -------------------------------------------------------------
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Type Check & Lint
        run: |
          npm run lint
          npm run typecheck

      - name: Execute Unit & Integration Tests
        run: npm test -- --coverage

  # -------------------------------------------------------------
  # STAGE 2: Build & Push Container with Layer Caching
  # -------------------------------------------------------------
  build-and-push:
    needs: quality-check
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    outputs:
      image_tag: ${{ steps.image-info.outputs.tag }}
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WIF_PROVIDER }}
          service_account: ${{ secrets.GCP_WIF_SERVICE_ACCOUNT }}

      - name: Configure Docker Credential Helper
        run: gcloud auth configure-docker ${{ env.REGION }}-docker.pkg.dev --quiet

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Set Image Tag Output
        id: image-info
        run: echo "tag=${{ env.REGION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/app:${{ github.sha }}" >> $GITHUB_OUTPUT

      - name: Build and Push Docker Image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.image-info.outputs.tag }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # -------------------------------------------------------------
  # STAGE 3: Automated Staging Deployment & Smoke Testing
  # -------------------------------------------------------------
  deploy-staging:
    needs: build-and-push
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WIF_PROVIDER }}
          service_account: ${{ secrets.GCP_WIF_SERVICE_ACCOUNT }}

      - name: Deploy Revision to Staging
        run: |
          gcloud run deploy ${{ env.SERVICE_NAME }} \
            --image ${{ needs.build-and-push.outputs.image_tag }} \
            --region ${{ env.REGION }} \
            --tag staging \
            --no-traffic \
            --quiet

      - name: Run Database Migrations on Staging
        run: |
          echo "Running database schema migrations..."
          npm run db:migrate:staging

      - name: Execute Automated Smoke Tests
        run: |
          STAGING_URL=$(gcloud run services describe ${{ env.SERVICE_NAME }} --region ${{ env.REGION }} --format='value(status.traffic[?(@.tag=="staging")].url)')
          echo "Verifying health on $STAGING_URL"
          curl --fail --retry 3 --retry-delay 5 "$STAGING_URL/health" || exit 1

  # -------------------------------------------------------------
  # STAGE 4: Production Deployment (Manual Approval Gated)
  # -------------------------------------------------------------
  deploy-production:
    needs: [build-and-push, deploy-staging]
    runs-on: ubuntu-latest
    environment: production # Requires manual approval from repo admin
    steps:
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WIF_PROVIDER }}
          service_account: ${{ secrets.GCP_WIF_SERVICE_ACCOUNT }}

      - name: Promote Tagged Revision to 100% Production Traffic
        run: |
          # Fetch the revision name created during staging deployment
          REVISION_NAME=$(gcloud run revisions list --service ${{ env.SERVICE_NAME }} --region ${{ env.REGION }} --limit 1 --format 'value(metadata.name)')
          
          echo "Migrating 100% traffic to production revision: $REVISION_NAME"
          gcloud run services update-traffic ${{ env.SERVICE_NAME }} \
            --to-revisions ${REVISION_NAME}=100 \
            --region ${{ env.REGION }}

      - name: Verify Production Health
        run: |
          PROD_URL=$(gcloud run services describe ${{ env.SERVICE_NAME }} --region ${{ env.REGION }} --format='value(status.url)')
          curl --fail --retry 5 --retry-delay 3 "$PROD_URL/health" || exit 1
```

---

## 4. The 1-Command Rollback Runbook

If a critical bug or performance degradation slips past staging into production, TaskBoard provides **sub-5-second instantaneous rollback**.

### CLI Execution (Single Command)

```bash
# Shift 100% of production traffic back to the previous known good revision
gcloud run services update-traffic taskboard-app \
  --to-revisions PREVIOUS_HEALTHY_REVISION_NAME=100 \
  --region us-central1
```

### GitHub Actions Rollback Workflow (`.github/workflows/rollback.yml`)
For engineers without local `gcloud` CLI access, rollbacks can be executed via a manual click in the GitHub UI with revision selection:

```yaml
name: Emergency Production Rollback

on:
  workflow_dispatch:
    inputs:
      target_revision:
        description: 'Specific Cloud Run revision name to restore (leave blank to restore previous)'
        required: false
        type: string

permissions:
  contents: read
  id-token: write

jobs:
  execute-rollback:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.GCP_WIF_PROVIDER }}
          service_account: ${{ secrets.GCP_WIF_SERVICE_ACCOUNT }}

      - name: Execute Traffic Rollback
        run: |
          SERVICE_NAME="taskboard-app"
          REGION="us-central1"

          if [ -z "${{ github.event.inputs.target_revision }}" ]; then
            # Determine the second most recent revision
            TARGET_REV=$(gcloud run revisions list --service $SERVICE_NAME --region $REGION --limit 2 --format 'value(metadata.name)' | tail -n 1)
          else
            TARGET_REV="${{ github.event.inputs.target_revision }}"
          fi

          echo "Initiating instant rollback to revision: $TARGET_REV"
          gcloud run services update-traffic $SERVICE_NAME \
            --to-revisions ${TARGET_REV}=100 \
            --region $REGION
          
          echo "Rollback complete. Verifying health status..."
          curl --fail https://taskboard.app/health || exit 1
```

---

## 5. Forward-Compatible Database Migration Rules

To ensure instantaneous rollbacks never crash the application due to schema mismatches:
1. **Never drop columns in a release that adds features**. (Expand and Contract pattern).
2. **Migrations must be backward-compatible**:
   - *Phase 1 (Release N)*: Add new column as nullable. Deploy code that writes to both old and new columns.
   - *Phase 2 (Release N+1)*: Backfill historical records.
   - *Phase 3 (Release N+2)*: Deploy code reading exclusively from new column. Drop old column.
3. If an instant Cloud Run traffic rollback occurs, the previous code continues functioning because existing columns were never dropped.
