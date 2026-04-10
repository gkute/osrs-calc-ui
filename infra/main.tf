locals {
  image = "us-central1-docker.pkg.dev/${var.project_id}/osrs-ui/osrs-ui:${var.image_tag}"

  # TLS requires both a domain and a Cloudflare zone ID.
  cloudflare_enabled = var.cloudflare_zone_id != ""
  tls_enabled        = var.domain != "" && local.cloudflare_enabled

  # Use the regional Cloud Run URL format (project-number.region.run.app) for
  # internal service-to-service calls — more reliable than the hash-based global URL.
  api_url = "https://osrs-api-${data.google_project.project.number}.${var.region}.run.app"

  # ---------------------------------------------------------------------------
  # Cloudflare edge IP ranges (https://www.cloudflare.com/ips/)
  # Used to restrict Cloud Armor ingress to Cloudflare-only traffic so that
  # the GCP load balancer cannot be reached directly, bypassing Cloudflare.
  # Review and update these when Cloudflare publishes new ranges.
  # ---------------------------------------------------------------------------
  cf_ipv4 = [
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
    "162.158.0.0/15",
    "104.16.0.0/13",
    "104.24.0.0/14",
    "172.64.0.0/13",
    "131.0.72.0/22",
  ]
  cf_ipv6 = [
    "2400:cb00::/32",
    "2606:4700::/32",
    "2803:f800::/32",
    "2405:b500::/32",
    "2405:8100::/32",
    "2a06:98c0::/29",
    "2c0f:f248::/32",
  ]

  # CEL expression that is TRUE when origin.ip is NOT a Cloudflare edge IP.
  # Embedded in the Cloud Armor deny rule to block direct LB access.
  non_cloudflare_expr = "!(${join(" || ", concat(
    [for cidr in local.cf_ipv4 : "inIpRange(origin.ip,'${cidr}')"],
    [for cidr in local.cf_ipv6 : "inIpRange(origin.ip,'${cidr}')"],
  ))})"
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

  # Block any request that does NOT originate from a Cloudflare edge IP.
  # This prevents clients from reaching the GCP load balancer directly and
  # bypassing Cloudflare's DDoS protection and WAF.
  # Only active when Cloudflare is enabled (var.cloudflare_zone_id is set).
  dynamic "rule" {
    for_each = local.cloudflare_enabled ? [1] : []
    content {
      priority    = 100
      action      = "deny(403)"
      description = "Block traffic not originating from Cloudflare"

      match {
        expr {
          expression = local.non_cloudflare_expr
        }
      }
    }
  }

  # Rate limiting — ban IPs that exceed 500 requests/minute for 60 seconds
  rule {
    priority    = 1000
    action      = "rate_based_ban"
    description = "Ban IPs exceeding 500 req/min for 60 s"

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }

    rate_limit_options {
      rate_limit_threshold {
        count        = 500
        interval_sec = 60
      }
      ban_duration_sec   = 60
      conform_action     = "allow"
      exceed_action      = "deny(429)"
      enforce_on_key     = "IP"
    }
  }

  # OWASP core WAF rules — blocks XSS, SQLi, LFI, RFI, scanner probes
  rule {
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

  # Default allow
  rule {
    priority    = 2147483647
    action      = "allow"
    description = "Default allow"

    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
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
# TLS — Cloudflare Origin CA certificate (created only when var.domain +
# var.cloudflare_zone_id are set).
#
# Cloudflare terminates public TLS at the edge. The GCP load balancer needs its
# own certificate for the Cloudflare → origin leg (Full-strict SSL mode).
# A Cloudflare Origin CA cert is trusted by Cloudflare and never expires for
# up to 15 years, so it is the correct credential here.
# ---------------------------------------------------------------------------

resource "tls_private_key" "origin_ca" {
  count     = local.tls_enabled ? 1 : 0
  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_cert_request" "origin_ca" {
  count           = local.tls_enabled ? 1 : 0
  private_key_pem = tls_private_key.origin_ca[0].private_key_pem

  subject {
    common_name = var.domain
  }

  dns_names = [var.domain, "*.${var.domain}"]
}

resource "cloudflare_origin_ca_certificate" "ui" {
  count              = local.tls_enabled ? 1 : 0
  csr                = tls_cert_request.origin_ca[0].cert_request_pem
  hostnames          = [var.domain, "*.${var.domain}"]
  request_type       = "origin-rsa"
  requested_validity = 5475 # 15 years
}

# Upload the Origin CA cert + private key to GCP so the HTTPS proxy can serve it.
resource "google_compute_ssl_certificate" "ui" {
  count        = local.tls_enabled ? 1 : 0
  name_prefix  = "osrs-ui-origin-cert-"
  project      = var.project_id
  private_key  = tls_private_key.origin_ca[0].private_key_pem
  certificate  = cloudflare_origin_ca_certificate.ui[0].certificate

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
  count   = local.tls_enabled ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "@"
  type    = "A"
  value   = google_compute_global_address.ui.address
  proxied = true
  ttl     = 1 # Must be 1 (auto) when proxied = true
}

# Enforce Full (strict) SSL so Cloudflare validates the Origin CA cert, always
# redirect HTTP → HTTPS, and require TLS 1.2+ across the zone.
resource "cloudflare_zone_settings_override" "ui" {
  count   = local.tls_enabled ? 1 : 0
  zone_id = var.cloudflare_zone_id

  settings {
    ssl              = "strict"
    always_use_https = "on"
    min_tls_version  = "1.2"
  }
}
