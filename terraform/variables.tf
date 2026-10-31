variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region (Default us-central1 for lowest tier pricing)"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment identifier (staging or prod)"
  type        = string
  default     = "prod"
}

variable "billing_account_id" {
  description = "GCP Billing Account ID for budget alerts"
  type        = string
}

variable "alert_email" {
  description = "Email address for $5, $10, and $20 budget alerts"
  type        = string
}

variable "db_password" {
  description = "Password for the Cloud SQL PostgreSQL application user"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Secret key for signing application JWT tokens (min 32 chars)"
  type        = string
  sensitive   = true
}

variable "container_image" {
  description = "Full Docker image URI in Artifact Registry to deploy"
  type        = string
  default     = "us-central1-docker.pkg.dev/taskboard-cloud/taskboard/app:latest"
}
