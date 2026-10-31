variable "project_id" { type = string }
variable "database_connection_string" {
  type      = string
  sensitive = true
}
variable "jwt_secret" {
  type      = string
  sensitive = true
}
