terraform {
  required_version = ">= 1.5.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.30"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# 1. Enable Required GCP APIs
resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudscheduler.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "billingbudgets.googleapis.com",
    "artifactregistry.googleapis.com"
  ])
  service            = each.key
  disable_on_destroy = false
}

# 2. Artifact Registry for Container Images
resource "google_artifact_registry_repository" "taskboard_repo" {
  location      = var.region
  repository_id = "taskboard"
  description   = "Docker repository for TaskBoard Cloud container images"
  format        = "DOCKER"
  depends_on    = [google_project_service.apis]
}

# 3. Secret Manager Module
module "secrets" {
  source                     = "./modules/secrets"
  project_id                 = var.project_id
  database_connection_string = module.cloud_sql.connection_string
  jwt_secret                 = var.jwt_secret
  depends_on                 = [google_project_service.apis]
}

# 4. Cloud SQL PostgreSQL Module (Enforcing db-f1-micro)
module "cloud_sql" {
  source      = "./modules/cloud_sql"
  project_id  = var.project_id
  region      = var.region
  environment = var.environment
  db_password = var.db_password
  depends_on  = [google_project_service.apis]
}

# 5. Cloud Run Application Module (Capped at 3 instances, scale-to-zero)
module "cloud_run" {
  source                     = "./modules/cloud_run"
  project_id                 = var.project_id
  region                     = var.region
  environment                = var.environment
  container_image            = var.container_image
  database_secret_id         = module.secrets.database_secret_id
  jwt_secret_id              = module.secrets.jwt_secret_id
  cloud_sql_connection_name  = module.cloud_sql.instance_connection_name
  depends_on                 = [module.secrets, module.cloud_sql]
}

# 6. SRE Observability & FinOps Budget Module ($5, $10, $20 Alerts + 14-Day Log Bucket)
module "monitoring" {
  source             = "./modules/monitoring"
  project_id         = var.project_id
  billing_account_id = var.billing_account_id
  alert_email        = var.alert_email
  cloud_run_service  = module.cloud_run.service_name
  depends_on         = [google_project_service.apis]
}
