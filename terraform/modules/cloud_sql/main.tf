resource "google_sql_database_instance" "postgres" {
  name                = "taskboard-${var.environment}-pg"
  database_version    = "POSTGRES_16"
  region              = var.region
  deletion_protection = var.environment == "prod" ? true : false

  settings {
    tier              = "db-f1-micro" # Shared core, 0.6 GB RAM: Strictly cost-governed
    availability_type = "ZONAL"       # Single zone: Eliminates 2x HA redundancy surcharge
    disk_size         = 10            # 10 GB SSD base
    disk_type         = "PD_SSD"
    disk_autoresize   = false         # Prevents silent disk runaway growth

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = false
      transaction_log_retention_days = 1
      backup_retention_settings {
        retained_backups = 7
      }
    }

    ip_configuration {
      ipv4_enabled = true # Accessed securely via Cloud SQL Auth Proxy
    }

    database_flags {
      name  = "max_connections"
      value = "30" # Safeguard for micro memory tier
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
