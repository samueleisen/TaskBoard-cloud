# 1. Cloud Monitoring Alert Channel (Email)
resource "google_monitoring_notification_channel" "sre_email" {
  display_name = "TaskBoard SRE Alert Channel"
  type         = "email"
  labels = {
    email_address = var.alert_email
  }
}

# 2. GCP Billing Budget with 3 Alert Thresholds ($5, $10, $20)
resource "google_billing_budget" "taskboard_budget" {
  billing_account = var.billing_account_id
  display_name    = "TaskBoard Cloud Monthly Budget ($10 Target)"

  budget_filter {
    projects               = ["projects/${var.project_id}"]
    credit_types_treatment = "INCLUDE_ALL_CREDITS"
  }

  amount {
    specified_amount {
      currency_code = "USD"
      units         = "10" # Baseline target: $10.00
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

# 3. Custom Log Bucket with 14-Day Retention Limit
resource "google_logging_project_bucket_config" "fourteen_day_bucket" {
  project        = var.project_id
  location       = "global"
  bucket_id      = "taskboard-14day-logs"
  retention_days = 14 # Overrides default 30 days to eliminate storage charges
  description    = "14-day log retention bucket for TaskBoard production"
}

# 4. Project Sink Routing Application Logs with Health Probe Exclusion
resource "google_logging_project_sink" "app_log_sink" {
  name        = "taskboard-app-sink"
  destination = "logging.googleapis.com/projects/${var.project_id}/locations/global/buckets/${google_logging_project_bucket_config.fourteen_day_bucket.bucket_id}"
  filter      = "resource.type = \"cloud_run_revision\" AND resource.labels.service_name = \"${var.cloud_run_service}\""

  # Cost Optimization: Exclude noisy health probe logs
  exclusions {
    name        = "exclude-health-probes"
    description = "Exclude high-frequency /health uptime probes from log storage"
    filter      = "httpRequest.requestUrl =~ \".*/health\" OR textPayload =~ \".*GET /health.*\""
  }

  unique_writer_identity = true
}
