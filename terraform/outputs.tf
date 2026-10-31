output "cloud_run_url" {
  description = "The public URL of the TaskBoard Cloud Run service"
  value       = module.cloud_run.service_url
}

output "cloud_sql_connection_name" {
  description = "The Cloud SQL instance connection name (PROJECT_ID:REGION:INSTANCE_NAME)"
  value       = module.cloud_sql.instance_connection_name
}

output "artifact_registry_repo" {
  description = "Artifact Registry Docker repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.taskboard_repo.repository_id}"
}

output "budget_alert_name" {
  description = "Configured Billing Budget Policy"
  value       = module.monitoring.budget_display_name
}
