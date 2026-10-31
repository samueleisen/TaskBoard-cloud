# 06. Infrastructure, FinOps & Cost Model

> **Granular GCP billing analysis, Terraform HCL specifications, 3-tier budget alert policies, and 14-day log retention architecture.**

---

## 1. Line-Item Cost Architecture (<$6.00 / Month Target)

To satisfy the engineering constraint stated in `dumping.md` (*"Monthly running cost: about $6"*), every architectural component must either map to Google Cloud's **Always Free Tier** or operate within an explicitly governed compute tier.

### Granular Cost Comparison: Option 1 vs Option 2

```
┌──────────────────────────────────────┬──────────────────┬──────────────────┐
│ GCP Service Component                │ Option 1 (Decoup)│ Option 2 (Monol) │
├──────────────────────────────────────┼──────────────────┼──────────────────┤
│ Cloud Run Compute                    │ $0.00 (Free Tier)│ $0.00 (Free Tier)│
│ Cloud Run Ingress / TLS              │ $0.00 (Free Tier)│ $0.00 (Direct)   │
│ Static Frontend Hosting (CDN/Storage)│ $0.05            │ $0.00 (Embedded) │
│ Database: Cloud SQL db-f1-micro      │ $9.37 (24/7 run) │ $5.50 (Scheduled)│
│ Database: Serverless Postgres (Neon) │ N/A              │ $0.00 – $2.00    │
│ Secret Manager (Active Secrets)      │ $0.00 (Free Tier)│ $0.00 (Free Tier)│
│ Cloud Tasks & Cloud Scheduler        │ $0.00 (Free Tier)│ $0.00 (Free Tier)│
│ Cloud Logging (14-Day Sink)          │ $0.00 (Free Tier)│ $0.00 (Free Tier)│
│ Artifact Registry Storage            │ $0.05            │ $0.05            │
├──────────────────────────────────────┼──────────────────┼──────────────────┤
│ NET MONTHLY ESTIMATE                 │ ~$9.47 / month   │ ~$0.05 – $5.55/mo│
└──────────────────────────────────────┴──────────────────┴──────────────────┘
```

> **Key FinOps Takeaway**:
> In **Option 1**, running a dedicated Cloud SQL instance 24/7 brings baseline costs to ~$9.47/month. By adding an automated Cloud Scheduler script to sleep the instance during quiet hours (e.g., 00:00–08:00 UTC), Option 1 can be compressed to **~$6.50/month**.
> In **Option 2**, utilizing a Serverless PostgreSQL tier (or scheduled micro tier) easily fulfills the **$6.00/month target** while maintaining production readiness.

---

## 2. Multi-Tier Budget Alert Policy ($5, $10, $20)

As documented in the post-mortem in [01-gathered-context.md](file:///home/sam/Code/TaskBoard-cloud/docs/01-gathered-context.md), financial observability is an SRE necessity. Budget alerts are provisioned directly via Terraform to prevent silent overruns.

```
                    3-TIER BUDGET ALERT ESCALATION
                    
  Spend: $0.00 ───────> Normal Operations
                             │
  Spend: $5.00 ───────> [ Alert 1: 50% Threshold Warning ]
                        • Informational email to engineering lead
                        • Confirms standard monthly run rate
                             │
  Spend: $10.00 ──────> [ Alert 2: 100% Target Limit Reached ]
                        • High-priority Slack/Email alert
                        • Immediate inspection required: check autoscaling,
                          storage expansion, or log volume
                             │
  Spend: $20.00 ──────> [ Alert 3: Emergency Ceiling Breach ]
                        • Critical Incident Pager
                        • Triggers Cloud Function circuit-breaker to cap
                          Cloud Run maxScale to 0 (emergency shutdown)
```

### Terraform HCL: Budget & Monitoring Alert (`terraform/modules/monitoring/budget.tf`)

```hcl
# 1. Cloud Monitoring Notification Channel (Email & Webhook)
resource "google_monitoring_notification_channel" "sre_email" {
  display_name = "TaskBoard SRE Alert Channel"
  type         = "email"
  labels = {
    email_address = var.alert_email
  }
}

# 2. GCP Billing Budget with 3 Alert Thresholds
resource "google_billing_budget" "taskboard_budget" {
  billing_account = var.billing_account_id
  display_name    = "TaskBoard Cloud Monthly Budget ($10 Target)"

  budget_filter {
    projects = ["projects/${var.project_id}"]
    credit_types_treatment = "INCLUDE_ALL_CREDITS"
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "10" # Target: $10.00 monthly baseline
    }
  }

  # Alert Tier 1: $5.00 (50% of budget)
  threshold_rules {
    threshold_percent = 0.50
    spend_basis       = "CURRENT_SPEND"
  }

  # Alert Tier 2: $10.00 (100% of budget)
  threshold_rules {
    threshold_percent = 1.00
    spend_basis       = "CURRENT_SPEND"
  }

  # Alert Tier 3: $20.00 (200% of budget - Emergency Ceiling)
  threshold_rules {
    threshold_percent = 2.00
    spend_basis       = "CURRENT_SPEND"
  }

  all_updates_rule {
    monitoring_notification_channels = [
      google_monitoring_notification_channel.sre_email.id
    ]
    disable_default_iam_recipients = false
  }
}
```

---

## 3. Autoscaling Guardrails: The Hard 3-Instance Ceiling

A frequent source of cloud billing catastrophes is unconstrained autoscaling (e.g. an infinite loop or DDoS attack causing 100 containers to spin up).

### Architectural Rules
1. **`min_instance_count = 0`**: Guarantees zero compute billing during idle night hours.
2. **`max_instance_count = 3`**: Guarantees that even under maximum saturation or external HTTP flooding, Cloud Run will never exceed 3 active instances.
3. **`cpu_idle = true`**: CPU is allocated **only** while processing incoming HTTP requests. When waiting between network packets, compute meters stop.
4. **`max_concurrency = 80`**: Each container multiplexes up to 80 concurrent HTTP requests across its Node.js event loop before triggering another instance spin-up.

```hcl
# In terraform/modules/cloud_run/main.tf
template {
  scaling {
    min_instance_count = 0
    max_instance_count = 3
  }
  containers {
    resources {
      limits = {
        cpu    = "1000m"
        memory = "512Mi"
      }
      cpu_idle = true
    }
  }
  max_instance_request_concurrency = 80
}
```

---

## 4. Log Retention & Cost Pruning (The 14-Day Sink)

### The Hidden Cost Trap
- Google Cloud Logging charges **$0.01 per GiB per month** for logs retained beyond the default 30 days.
- High-frequency health probes (`GET /health` polled every 15–30 seconds by uptime monitors) generate **~172,800 requests/month**. Ingesting and storing raw health probe JSON logs generates hundreds of megabytes of redundant log data.

### The Solution: Custom 14-Day Log Bucket & Exclusion Sink

```
  [ Cloud Run API ]
         │
         ├── Logs: /api/v1/tasks, errors, auth ──> Ingested into 14-Day Sink ($0)
         │
         └── Logs: GET /health (Uptime check) ──> EXCLUDED BY FILTER (Dropped)
```

### Terraform HCL: 14-Day Log Bucket & Filter (`terraform/modules/monitoring/logging.tf`)

```hcl
# 1. Custom Log Bucket with 14-Day Retention Limit
resource "google_logging_project_bucket_config" "fourteen_day_bucket" {
  project        = var.project_id
  location       = "global"
  bucket_id      = "taskboard-14day-logs"
  retention_days = 14 # Overrides standard 30-day default to eliminate storage charges
  description    = "14-day log retention bucket for TaskBoard production"
}

# 2. Project Sink Routing Application Logs to the Custom Bucket
resource "google_logging_project_sink" "app_log_sink" {
  name        = "taskboard-app-sink"
  destination = "logging.googleapis.com/projects/${var.project_id}/locations/global/buckets/${google_logging_project_bucket_config.fourteen_day_bucket.bucket_id}"
  filter      = "resource.type = \"cloud_run_revision\" AND resource.labels.service_name = \"taskboard-prod-api\""

  # Cost Optimization: Exclude noisy health probe logs
  exclusions {
    name        = "exclude-health-probes"
    description = "Exclude high-frequency /health uptime probes from ingestion"
    filter      = "httpRequest.requestUrl =~ \".*/health\" OR textPayload =~ \".*GET /health.*\""
  }

  unique_writer_identity = true
}
```

---

## 5. Zero-Secret-in-Git: Google Secret Manager Integration

To comply with 12-Factor application security, zero database passwords or JWT signing keys are stored in Git or GitHub Secrets.

### Terraform HCL: Secrets Provisioning (`terraform/modules/secrets/main.tf`)

```hcl
resource "google_secret_manager_secret" "database_url" {
  secret_id = "taskboard-database-url"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_url_val" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = var.database_connection_string
}

resource "google_secret_manager_secret" "jwt_secret" {
  secret_id = "taskboard-jwt-secret"
  replication {
    auto {}
  }
}

# Grant Cloud Run Service Account permission to read secrets
resource "google_secret_manager_secret_iam_member" "cloud_run_access" {
  secret_id = google_secret_manager_secret.database_url.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.cloud_run_service_account_email}"
}
```

---

## 6. Business Continuity: Database Backup & Verified Restore Runbook

As documented in `dumping.md` (*"Daily database backups, and I tested restoring one"*), backups are useless unless restore operations are verified.

### Automated Daily Snapshots
- Managed by Cloud SQL automated backup policy at **03:00 UTC**.
- Retains **7 days** of daily snapshots (included in Cloud SQL baseline storage).

### Verified Restore Procedure (Runbook)

```bash
# Step 1: Identify the backup ID to restore
gcloud sql backups list --instance=taskboard-prod-pg

# Step 2: Spin up a temporary isolated test instance to verify integrity
gcloud sql instances create taskboard-restore-test \
  --tier=db-f1-micro \
  --region=us-central1

# Step 3: Restore the snapshot into the test instance
gcloud sql backups restore BACKUP_ID \
  --restore-instance=taskboard-restore-test \
  --backup-instance=taskboard-prod-pg \
  --quiet

# Step 4: Validate row counts and table integrity
gcloud sql connect taskboard-restore-test --user=postgres
# Run: SELECT COUNT(*) FROM tasks; SELECT COUNT(*) FROM users;

# Step 5: Tear down the temporary test instance to prevent billing
gcloud sql instances delete taskboard-restore-test --quiet
```
