output "instance_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "database_name" {
  value = google_sql_database.taskboard_db.name
}

output "connection_string" {
  value     = "postgresql://${google_sql_user.app_user.name}:${var.db_password}@localhost:5432/${google_sql_database.taskboard_db.name}?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
  sensitive = true
}
