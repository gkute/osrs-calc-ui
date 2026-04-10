locals {
  image = "us-central1-docker.pkg.dev/${var.project_id}/osrs-ui/osrs-ui:${var.image_tag}"

  # Cloudflare-backed TLS/DNS requires both a domain and a Cloudflare zone ID.
  cloudflare_enabled = var.domain != "" && var.cloudflare_zone_id != ""
  tls_enabled        = local.cloudflare_enabled

  # Use the regional Cloud Run URL format (project-number.region.run.app) for
  # internal service-to-service calls — more reliable than the hash-based global URL.
  api_url = "https://osrs-api-${data.google_project.project.number}.${var.region}.run.app"

  # ---------------------------------------------------------------------------
  # Cloudflare edge IP ranges (https://www.cloudflare.com/ips/)
  # Split into batches of ≤10 because Cloud Armor SRC_IPS_V1 rules accept at
  # most 10 ranges each. Cloud Armor's CEL expression limit (5 sub-expressions)
  # makes the single-CEL approach unworkable with all 22 Cloudflare ranges.
  # ---------------------------------------------------------------------------
  cf_ips_batch1 = [
    "173.245.48.0/20",
    "103.21.244.0/22",
    "103.22.200.0/22",
    "103.31.4.0/22",
    "141.101.64.0/18",
    "108.162.192.0/18",
    "190.93.240.0/20",
    "188.114.96.0/20",
    "197.234.240.0/22",
    "198.41.128.0/17",
  ]
  cf_ips_batch2 = [
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22",
    "2400:cb00::/32",
    "2606:4700::/32",
    "2803:f800::/32",
    "2405:b500::/32",
    "2405:8100::/32",
  ]
  cf_ips_batch3 = [
    "2a06:98c0::/29",
    "2c0f:f248::/32",
  ]
}

# Resolve the numeric project number so we can construct the regional API URL.
data "google_project" "project" {
  project_id = var.project_id
}

# ---------------------------------------------------------------------------
# Service account
# ---------------------------------------------------------------------------

resource "google_service_account" "ui" {
  account_id   = "osrs-ui-sa"
  display_name = "OSRS UI Cloud Run Service Account"
  project      = var.project_id
}

# ---------------------------------------------------------------------------
# IAM — grant the UI SA permission to invoke the internal API
# ---------------------------------------------------------------------------

# Reference the already-deployed API service so we can bind IAM without
# hard-coding resource IDs.
data "google_cloud_run_v2_service" "api" {
  name     = "osrs-api"
  location = var.region
  project  = var.project_id
}

resource "google_cloud_run_v2_service_iam_member" "ui_invokes_api" {
  project  = var.project_id
  location = var.region
  name     = data.google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.ui.email}"
}

# ---------------------------------------------------------------------------
# Cloud Run — UI service
# ---------------------------------------------------------------------------

resource "google_cloud_run_v2_service" "ui" {
  name     = "osrs-ui"
  location = var.region
  project  = var.project_id

  # Block direct *.run.app access — all traffic must enter through the load
  # balancer so Cloud Armor is always in the path.
  ingress = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  template {
    service_account = google_service_account.ui.email

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }

    containers {
      image = local.image

      ports {
        container_port = 8080
      }

      # API_URL is consumed by the OpenResty Lua BFF proxy in nginx.conf to
      # both fetch the correct audience identity token and route upstream calls.
      # Uses the regional URL format (project-number.region.run.app) which is
      # more reliable for internal Cloud Run to Cloud Run communication.
      env {
        name  = "API_URL"
        value = local.api_url
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "256Mi"
        }
        cpu_idle          = true
        startup_cpu_boost = true
      }
    }
  }

  depends_on = [google_cloud_run_v2_service_iam_member.ui_invokes_api]
}

# Public access — authentication is handled by Cloud Armor at the LB layer,
# not by Cloud Run IAM.
resource "google_cloud_run_v2_service_iam_member" "ui_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.ui.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ---------------------------------------------------------------------------
# Cloud Armor security policy
# NOTE: preconfigured WAF rules and rate-limiting require Cloud Armor Standard
# (~$5/month + per-request fees). Remove the throttle and preconfigured rules
# to stay on the free tier.
# ---------------------------------------------------------------------------

resource "google_compute_security_policy" "ui" {
  name    = "osrs-ui-armor"
  project = var.project_id

  # ---------------------------------------------------------------------------
  # Cloudflare-enabled mode: allow only Cloudflare edge IPs, deny everything
  # else. Cloud Armor SRC_IPS_V1 rules accept ≤10 CIDR ranges each, so the
  # 22 Cloudflare ranges are spread across three allow rules (100–102). A
  # catch-all deny at priority 200 blocks any non-Cloudflare source.
  # Rate-limiting and WAF are omitted here — Cloudflare handles both at the
  # edge before traffic even reaches GCP.
  # ---------------------------------------------------------------------------

  dynamic "rule" {
    for_each = local.cloudflare_enabled ? [1] : []
    content {
      priority    = 100
      action      = "allow"
      description = "Allow Cloudflare edge IPs batch 1/3"
      match {
        versioned_expr = "SRC_IPS_V1"
        config { src_ip_ranges = local.cf_ips_batch1 }
      }
    }
  }

  dynamic "rule" {
    for_each = local.cloudflare_enabled ? [1] : []
    content {
      priority    = 101
      action      = "allow"
      description = "Allow Cloudflare edge IPs batch 2/3"
      match {
        versioned_expr = "SRC_IPS_V1"
        config { src_ip_ranges = local.cf_ips_batch2 }
      }
    }
  }

  dynamic "rule" {
    for_each = local.cloudflare_enabled ? [1] : []
    content {
      priority    = 102
      action      = "allow"
      description = "Allow Cloudflare edge IPs batch 3/3"
      match {
        versioned_expr = "SRC_IPS_V1"
        config { src_ip_ranges = local.cf_ips_batch3 }
      }
    }
  }

  dynamic "rule" {
    for_each = local.cloudflare_enabled ? [1] : []
    content {
      priority    = 200
      action      = "deny(403)"
      description = "Block all traffic not originating from Cloudflare"
      match {
        versioned_expr = "SRC_IPS_V1"
        config { src_ip_ranges = ["*"] }
      }
    }
  }

  # ---------------------------------------------------------------------------
  # Direct (non-Cloudflare) mode: rate-limit and WAF rules apply when Cloudflare
  # is not in front. These are skipped when Cloudflare is enabled because
  # Cloudflare's edge handles rate-limiting and WAF before traffic reaches GCP.
  # ---------------------------------------------------------------------------

  # Rate limiting — ban IPs that exceed 500 requests/minute for 60 seconds
  dynamic "rule" {
    for_each = local.cloudflare_enabled ? [] : [1]
    content {
      priority    = 1000
      action      = "rate_based_ban"
      description = "Ban IPs exceeding 500 req/min for 60 s"
      match {
        versioned_expr = "SRC_IPS_V1"
        config { src_ip_ranges = ["*"] }
      }
      rate_limit_options {
        rate_limit_threshold {
          count        = 500
          interval_sec = 60
        }
        ban_duration_sec = 60
        conform_action   = "allow"
        exceed_action    = "deny(429)"
        enforce_on_key   = "IP"
      }
    }
  }

  # OWASP core WAF rules — blocks XSS, SQLi, LFI, RFI, scanner probes
  dynamic "rule" {
    for_each = local.cloudflare_enabled ? [] : [1]
    content {
      priority    = 2000
      action      = "deny(403)"
      description = "OWASP core WAF rules"
      match {
        expr {
          expression = join(" || ", [
            "evaluatePreconfiguredExpr('xss-v33-stable')",
            "evaluatePreconfiguredExpr('sqli-v33-stable')",
            "evaluatePreconfiguredExpr('lfi-v33-stable')",
            "evaluatePreconfiguredExpr('rfi-v33-stable')",
            "evaluatePreconfiguredExpr('scannerdetection-v33-stable')",
          ])
        }
      }
    }
  }

  # Default allow — required by Cloud Armor as the lowest-priority rule
  rule {
    priority    = 2147483647
    action      = "allow"
    description = "Default allow"
    match {
      versioned_expr = "SRC_IPS_V1"
      config { src_ip_ranges = ["*"] }
    }
  }
}

# ---------------------------------------------------------------------------
# Global external HTTPS load balancer with Cloud Armor
# ---------------------------------------------------------------------------

# Static external IP — point your DNS A record here after the first apply.
resource "google_compute_global_address" "ui" {
  name    = "osrs-ui-ip"
  project = var.project_id
}

# Serverless NEG — maps the global LB backend to the regional Cloud Run service
resource "google_compute_region_network_endpoint_group" "ui" {
  name                  = "osrs-ui-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  project               = var.project_id

  cloud_run {
    service = google_cloud_run_v2_service.ui.name
  }
}

# Backend service — attaches Cloud Armor and references the serverless NEG
resource "google_compute_backend_service" "ui" {
  name                  = "osrs-ui-backend"
  project               = var.project_id
  protocol              = "HTTPS"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  security_policy       = google_compute_security_policy.ui.id

  backend {
    group = google_compute_region_network_endpoint_group.ui.id
  }
}

resource "google_compute_url_map" "ui" {
  name            = "osrs-ui-url-map"
  project         = var.project_id
  default_service = google_compute_backend_service.ui.id
}

# ---------------------------------------------------------------------------
# TLS — self-signed origin certificate (created when Cloudflare is enabled).
#
# Cloudflare terminates public TLS at the edge using its own auto-managed cert.
# The GCP load balancer needs a certificate only for the Cloudflare → origin
# leg. A self-signed cert is sufficient here because:
#   - Cloudflare "Full" SSL mode encrypts the origin connection without
#     requiring a public-CA-issued cert (Full strict requires a recognised CA).
#   - Only Cloudflare edge IPs can reach this load balancer (Cloud Armor rules
#     100–200 allow only Cloudflare ranges and deny everything else).
#
# SECURITY NOTE: the RSA private key is stored in the OpenTofu state file
# (GCS bucket oldschoolrunescapetool-tofu-state). Ensure the bucket has tight
# IAM controls (Storage Object Admin limited to the deploy service account).
# To rotate: taint tls_private_key.origin[0] and tls_self_signed_cert.origin[0]
# then re-apply.
# ---------------------------------------------------------------------------

# Remove the old Google-managed SSL cert from state without destroying it in
# GCP. The cert will remain in GCP until manually deleted; it is no longer
# attached to the HTTPS proxy after this apply.
removed {
  from = google_compute_managed_ssl_certificate.ui
  lifecycle {
    destroy = false
  }
}

resource "tls_private_key" "origin" {
  count     = local.tls_enabled ? 1 : 0
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_self_signed_cert" "origin" {
  count           = local.tls_enabled ? 1 : 0
  private_key_pem = tls_private_key.origin[0].private_key_pem

  subject {
    common_name = var.domain
  }

  dns_names             = [var.domain, "*.${var.domain}"]
  validity_period_hours = 87600 # 10 years
  is_ca_certificate     = false

  allowed_uses = ["key_encipherment", "digital_signature", "server_auth"]
}

# Upload the self-signed cert + private key to GCP for the HTTPS proxy.
resource "google_compute_ssl_certificate" "ui" {
  count        = local.tls_enabled ? 1 : 0
  name_prefix  = "osrs-ui-origin-cert-"
  project      = var.project_id
  private_key  = tls_private_key.origin[0].private_key_pem
  certificate  = tls_self_signed_cert.origin[0].cert_pem

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_compute_target_https_proxy" "ui" {
  count   = local.tls_enabled ? 1 : 0
  name    = "osrs-ui-https-proxy"
  project = var.project_id
  url_map = google_compute_url_map.ui.id

  ssl_certificates = [google_compute_ssl_certificate.ui[0].id]
}

resource "google_compute_global_forwarding_rule" "ui_https" {
  count                 = local.tls_enabled ? 1 : 0
  name                  = "osrs-ui-https"
  project               = var.project_id
  ip_address            = google_compute_global_address.ui.address
  port_range            = "443"
  target                = google_compute_target_https_proxy.ui[0].id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# ---------------------------------------------------------------------------
# HTTP — always created; redirects to HTTPS when TLS is enabled
# ---------------------------------------------------------------------------

resource "google_compute_url_map" "ui_http_redirect" {
  count   = local.tls_enabled ? 1 : 0
  name    = "osrs-ui-http-redirect"
  project = var.project_id

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "ui" {
  name    = "osrs-ui-http-proxy"
  project = var.project_id
  url_map = local.tls_enabled ? google_compute_url_map.ui_http_redirect[0].id : google_compute_url_map.ui.id
}

resource "google_compute_global_forwarding_rule" "ui_http" {
  name                  = "osrs-ui-http"
  project               = var.project_id
  ip_address            = google_compute_global_address.ui.address
  port_range            = "80"
  target                = google_compute_target_http_proxy.ui.id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# ---------------------------------------------------------------------------
# Cloudflare DNS + zone settings (created only when var.cloudflare_zone_id is set)
# ---------------------------------------------------------------------------

# Apex A record in Cloudflare pointing to the GCP load balancer IP.
# proxied = true routes traffic through Cloudflare's edge (CDN + DDoS protection).
resource "cloudflare_record" "ui_a" {
  count           = local.tls_enabled ? 1 : 0
  zone_id         = var.cloudflare_zone_id
  name            = "@"
  type            = "A"
  content         = google_compute_global_address.ui.address
  proxied         = true
  ttl             = 1 # Must be 1 (auto) when proxied = true
  allow_overwrite = true
}

# Encrypt origin traffic (Full SSL — accepts self-signed origin cert), always
# redirect HTTP → HTTPS, and require TLS 1.2+ across the zone.
resource "cloudflare_zone_settings_override" "ui" {
  count   = local.tls_enabled ? 1 : 0
  zone_id = var.cloudflare_zone_id

  settings {
    ssl              = "full"
    always_use_https = "on"
    min_tls_version  = "1.2"
  }
}
