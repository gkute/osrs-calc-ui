output "load_balancer_ip" {
  description = "Static external IP of the load balancer — set this as the A record value in Cloudflare (Terraform manages this automatically via cloudflare_record)"
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

output "api_url" {
  description = "Resolved API Cloud Run URL injected as API_URL into the UI container"
  value       = local.api_url
}

output "cloudflare_record" {
  description = "Cloudflare DNS A record hostname (null when Cloudflare is not enabled)"
  value       = local.tls_enabled ? cloudflare_record.ui_a[0].hostname : null
}
