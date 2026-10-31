output "database_secret_id" {
  value = google_secret_manager_secret.database_url.secret_id
}

output "jwt_secret_id" {
  value = google_secret_manager_secret.jwt_secret.secret_id
}
