output "budget_display_name" {
  value = google_billing_budget.taskboard_budget.display_name
}

output "log_bucket_id" {
  value = google_logging_project_bucket_config.fourteen_day_bucket.bucket_id
}
