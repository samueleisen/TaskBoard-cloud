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

resource "google_secret_manager_secret_version" "jwt_secret_val" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = var.jwt_secret
}
