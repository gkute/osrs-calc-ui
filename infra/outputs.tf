output "load_balancer_ip" {
  description = "Static external IP of the GCP load balancer (null on the Cloudflare path, which bypasses the LB and routes via Cloud Run domain mapping)"
  value       = local.cloudflare_enabled ? null : google_compute_global_address.ui[0].address
}

output "ui_url" {
  description = "Public URL of the UI"
  value       = local.tls_enabled ? "https://${var.domain}" : "http://${google_compute_global_address.ui[0].address}"
}

output "service_account_email" {
  description = "Service account email running the UI container"
  value       = google_service_account.ui.email
}

output "api_url" {
  description = "Resolved API Cloud Run URL injected as API_URL into the UI container"
  value       = local.api_url
}

output "dns_mode" {
  description = "Active DNS/TLS mode: 'cloudflare', 'gcp-dns', or 'ip-only'"
  value       = local.cloudflare_enabled ? "cloudflare" : (local.gcp_dns_enabled ? "gcp-dns" : "ip-only")
}

output "cloudflare_record" {
  description = "Cloudflare DNS A record hostname (null when Cloudflare is not enabled)"
  value       = local.cloudflare_enabled ? cloudflare_record.ui_a[0].hostname : null
}

output "gcp_dns_nameservers" {
  description = "Cloud DNS nameservers for the domain zone (null when using Cloudflare or ip-only mode)"
  value       = local.gcp_dns_enabled ? data.google_dns_managed_zone.ui[0].name_servers : null
}
