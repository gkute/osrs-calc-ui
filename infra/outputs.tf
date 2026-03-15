output "service_url" {
  description = "Direct Cloud Run URL (blocked externally — traffic must go through the load balancer)"
  value       = google_cloud_run_v2_service.ui.uri
}

output "load_balancer_ip" {
  description = "Static external IP of the load balancer — create an A record pointing your domain here"
  value       = google_compute_global_address.ui.address
}

output "ui_url" {
  description = "Public URL of the UI"
  value       = local.tls_enabled ? "https://${var.domain}" : "http://${google_compute_global_address.ui.address}"
}

output "service_account_email" {
  description = "Service account email running the UI container"
  value       = google_service_account.ui.email
}
