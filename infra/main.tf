locals {
  image = "us-central1-docker.pkg.dev/${var.project_id}/osrs-ui/osrs-ui:${var.image_tag}"

  # Cloudflare-backed TLS/DNS requires both a domain and a Cloudflare zone ID.
  cloudflare_enabled = var.domain != "" && var.cloudflare_zone_id != ""
  # Google-managed SSL + Cloud DNS are used when a domain is set but Cloudflare is not.
  gcp_dns_enabled    = var.domain != "" && var.cloudflare_zone_id == ""
  # TLS (HTTPS) is active whenever a domain is provided, regardless of which DNS path.
  tls_enabled        = var.domain != ""

  # Cloud DNS zone name — Cloud Domains names the zone after the apex domain
  # with dots replaced by dashes (e.g. osrscalctool.com → osrscalctool-com).
  dns_zone_name = var.dns_zone_name != "" ? var.dns_zone_name : replace(var.domain, ".", "-")

  # Use the project-number URL format for the API.
  # data.google_cloud_run_v2_service.api.uri returns the hash-based URL
  # (e.g. osrs-api-hkv2km5d5q-uc.a.run.app) which is the old v1-style default
  # and resolves differently. The project-number format
  # (osrs-api-PROJECT_NUMBER.REGION.run.app) is the stable v2 URL and is what
  # Cloud Run IAM treats as the canonical audience for OIDC token verification.
  api_url = "https://osrs-api-${data.google_project.project.number}.${var.region}.run.app"
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

# Used to derive the project number for the API's canonical Cloud Run URL.
# The project-number URL format (osrs-api-PROJECT_NUMBER.REGION.run.app) is
# the stable v2 URL; .uri from the Cloud Run data source can return the
# hash-based v1 URL which resolves differently.
data "google_project" "project" {
  project_id = var.project_id
}

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

  # Ingress gating depends on which origin-lock mechanism is active:
  #   cloudflare_enabled → INGRESS_TRAFFIC_ALL: Cloudflare reaches Cloud Run
  #     directly via the custom domain mapping. The OpenResty BFF rejects any
  #     request missing the X-Origin-Auth shared secret injected by the
  #     Cloudflare Transform Rule, so direct *.run.app hits get 403.
  #   else → INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER: only the GCP LB can reach
  #     the service; Cloud Armor on the LB enforces WAF/rate-limit rules.
  ingress = local.cloudflare_enabled ? "INGRESS_TRAFFIC_ALL" : "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

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

      # ORIGIN_AUTH_SECRET — only injected when Cloudflare is in front.
      # OpenResty checks the X-Origin-Auth header against this value and
      # returns 403 if it doesn't match. The header is set by a Cloudflare
      # Transform Rule (see cloudflare_ruleset.origin_auth_header).
      dynamic "env" {
        for_each = local.cloudflare_enabled ? [1] : []
        content {
          name  = "ORIGIN_AUTH_SECRET"
          value = random_password.origin_auth[0].result
        }
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

# Shared secret injected by Cloudflare on every request (via Transform Rule)
# and verified by the OpenResty BFF. Replaces Cloud Armor's Cloudflare-IP
# whitelist as the origin-lock mechanism, saving ~$27/month in LB + Armor
# baseline charges. To rotate: tofu taint random_password.origin_auth[0]
# then re-apply; the Cloudflare rule and Cloud Run env var update atomically.
resource "random_password" "origin_auth" {
  count   = local.cloudflare_enabled ? 1 : 0
  length  = 48
  special = false
}

# Cloud Run domain mapping — gives osrscalctool.com a valid Google-issued
# origin cert and resolves via ghs.googlehosted.com. Replaces the GCP global
# HTTPS LB on the Cloudflare path. Requires the domain to be verified in
# Google Search Console under the project owner's account before first apply.
resource "google_cloud_run_domain_mapping" "ui" {
  count    = local.cloudflare_enabled ? 1 : 0
  name     = var.domain
  location = var.region
  project  = var.project_id

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.ui.name
  }
}

# Public access — origin lock is enforced upstream of Cloud Run IAM:
# Cloudflare path: X-Origin-Auth header check in the OpenResty BFF (nginx.conf)
# Non-Cloudflare path: Cloud Armor + INTERNAL_LOAD_BALANCER ingress on the LB.
resource "google_cloud_run_v2_service_iam_member" "ui_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.ui.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ---------------------------------------------------------------------------
# Cloud Armor security policy — only provisioned on the non-Cloudflare path.
# When Cloudflare is in front, Cloudflare's edge handles WAF and rate-limiting
# and the origin lock is enforced via a shared-secret header check in the
# OpenResty BFF, eliminating the need for Cloud Armor (~$8.50/month).
# NOTE: preconfigured WAF rules and rate-limiting require Cloud Armor Standard
# (~$5/month + per-request fees).
# ---------------------------------------------------------------------------

resource "google_compute_security_policy" "ui" {
  count   = local.cloudflare_enabled ? 0 : 1
  name    = "osrs-ui-armor"
  project = var.project_id

  # Rate limiting — ban IPs that exceed 500 requests/minute for 60 seconds
  rule {
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
# Global external HTTPS load balancer with Cloud Armor — non-Cloudflare path
# only. When Cloudflare is enabled, traffic flows directly to Cloud Run via
# the domain mapping above, avoiding ~$18.60/month in LB baseline charges.
# ---------------------------------------------------------------------------

# Static external IP — point your DNS A record here after the first apply.
resource "google_compute_global_address" "ui" {
  count   = local.cloudflare_enabled ? 0 : 1
  name    = "osrs-ui-ip"
  project = var.project_id
}

# Serverless NEG — maps the global LB backend to the regional Cloud Run service
resource "google_compute_region_network_endpoint_group" "ui" {
  count                 = local.cloudflare_enabled ? 0 : 1
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
  count                 = local.cloudflare_enabled ? 0 : 1
  name                  = "osrs-ui-backend"
  project               = var.project_id
  protocol              = "HTTPS"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  security_policy       = google_compute_security_policy.ui[0].id

  backend {
    group = google_compute_region_network_endpoint_group.ui[0].id
  }
}

resource "google_compute_url_map" "ui" {
  count           = local.cloudflare_enabled ? 0 : 1
  name            = "osrs-ui-url-map"
  project         = var.project_id
  default_service = google_compute_backend_service.ui[0].id
}

# ---------------------------------------------------------------------------
# TLS — Google-managed SSL cert on the non-Cloudflare LB path. The Cloudflare
# path uses the Cloud Run domain mapping's auto-provisioned cert instead, so
# no GCP cert resources are needed there.
# ---------------------------------------------------------------------------

resource "google_compute_managed_ssl_certificate" "ui" {
  count   = local.gcp_dns_enabled ? 1 : 0
  name    = "osrs-ui-managed-cert"
  project = var.project_id

  managed {
    domains = [var.domain]
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_compute_target_https_proxy" "ui" {
  count            = local.gcp_dns_enabled ? 1 : 0
  name             = "osrs-ui-https-proxy"
  project          = var.project_id
  url_map          = google_compute_url_map.ui[0].id
  ssl_certificates = [google_compute_managed_ssl_certificate.ui[0].id]
}

resource "google_compute_global_forwarding_rule" "ui_https" {
  count                 = local.gcp_dns_enabled ? 1 : 0
  name                  = "osrs-ui-https"
  project               = var.project_id
  ip_address            = google_compute_global_address.ui[0].address
  port_range            = "443"
  target                = google_compute_target_https_proxy.ui[0].id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# ---------------------------------------------------------------------------
# HTTP — omitted when Cloudflare is enabled because Cloudflare's
# always_use_https = "on" zone setting redirects HTTP → HTTPS at the edge
# before traffic ever reaches the GCP load balancer. Creating the forwarding
# rule when Cloudflare is active would bill ~$18/month for a rule that is
# never exercised. When Cloudflare is not in front, the rule is created so
# direct HTTP clients are redirected to HTTPS (or served directly if no TLS).
# ---------------------------------------------------------------------------

resource "google_compute_url_map" "ui_http_redirect" {
  count   = (local.tls_enabled && !local.cloudflare_enabled) ? 1 : 0
  name    = "osrs-ui-http-redirect"
  project = var.project_id

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "ui" {
  count   = local.cloudflare_enabled ? 0 : 1
  name    = "osrs-ui-http-proxy"
  project = var.project_id
  url_map = local.tls_enabled ? google_compute_url_map.ui_http_redirect[0].id : google_compute_url_map.ui[0].id
}

resource "google_compute_global_forwarding_rule" "ui_http" {
  count                 = local.cloudflare_enabled ? 0 : 1
  name                  = "osrs-ui-http"
  project               = var.project_id
  ip_address            = google_compute_global_address.ui[0].address
  port_range            = "80"
  target                = google_compute_target_http_proxy.ui[0].id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# ---------------------------------------------------------------------------
# Cloud DNS — A record (created when domain is set but Cloudflare is NOT used)
# ---------------------------------------------------------------------------

data "google_dns_managed_zone" "ui" {
  count   = local.gcp_dns_enabled ? 1 : 0
  name    = local.dns_zone_name
  project = var.project_id
}

resource "google_dns_record_set" "ui_a" {
  count        = local.gcp_dns_enabled ? 1 : 0
  name         = "${var.domain}."
  type         = "A"
  ttl          = 300
  managed_zone = data.google_dns_managed_zone.ui[0].name
  project      = var.project_id
  rrdatas      = [google_compute_global_address.ui[0].address]
}

# ---------------------------------------------------------------------------
# Cloudflare DNS + zone settings (created only when cloudflare_zone_id is set)
# ---------------------------------------------------------------------------

# Cloud Run domain mapping IPs — static Google anycast addresses returned by
# `gcloud run domain-mappings describe`. Apex domains require A/AAAA records;
# a CNAME is not valid at the zone apex in standard DNS.
# NOTE: cert provisioning requires proxy=false (grey cloud) so Google's ACME
# challenge can reach the origin. Re-enable proxied=true after first provision.
locals {
  cf_domain_mapping_ipv4 = local.cloudflare_enabled ? toset([
    "216.239.32.21", "216.239.34.21", "216.239.36.21", "216.239.38.21",
  ]) : toset([])
  cf_domain_mapping_ipv6 = local.cloudflare_enabled ? toset([
    "2001:4860:4802:32::15", "2001:4860:4802:34::15",
    "2001:4860:4802:36::15", "2001:4860:4802:38::15",
  ]) : toset([])
}

resource "cloudflare_record" "ui_a" {
  for_each        = local.cf_domain_mapping_ipv4
  zone_id         = var.cloudflare_zone_id
  name            = "@"
  type            = "A"
  content         = each.value
  proxied         = true
  ttl             = 1 # Must be 1 (auto) when proxied = true
  allow_overwrite = true

  depends_on = [google_cloud_run_domain_mapping.ui]
}

resource "cloudflare_record" "ui_aaaa" {
  for_each        = local.cf_domain_mapping_ipv6
  zone_id         = var.cloudflare_zone_id
  name            = "@"
  type            = "AAAA"
  content         = each.value
  proxied         = true
  ttl             = 1 # Must be 1 (auto) when proxied = true
  allow_overwrite = true

  depends_on = [google_cloud_run_domain_mapping.ui]
}

# Encrypt origin traffic with Full (Strict) — Cloud Run presents a valid
# public cert for the custom domain via its domain mapping, so strict mode
# is appropriate and rejects any cert mismatch. always_use_https redirects
# HTTP → HTTPS at the edge.
resource "cloudflare_zone_settings_override" "ui" {
  count   = local.cloudflare_enabled ? 1 : 0
  zone_id = var.cloudflare_zone_id

  settings {
    ssl              = "strict"
    always_use_https = "on"
    min_tls_version  = "1.2"
  }
}

# Cache /api/images/* responses at Cloudflare's edge.
# Cloudflare can only have one ruleset per cache phase, so both the API image
# rule and the static asset rule live here.
resource "cloudflare_ruleset" "cache_api_images" {
  count   = local.cloudflare_enabled ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "Cache rules"
  kind    = "zone"
  phase   = "http_request_cache_settings"

  # API icon responses — data URIs returned by /api/images/*.
  # First-time users trigger one request per icon; edge caching prevents that
  # burst from hitting Cloud Run on every new edge node.
  rules {
    ref         = "cache_api_images"
    description = "Cache icon data URIs at the edge for 1 year"
    expression  = "(starts_with(http.request.uri.path, \"/api/images/\"))"
    action      = "set_cache_settings"
    enabled     = true

    action_parameters {
      edge_ttl {
        mode    = "override_origin"
        default = 31536000
      }

      browser_ttl {
        mode    = "override_origin"
        default = 31536000
      }
    }
  }

  # Angular static assets — JS/CSS/font/image files with content-hashed
  # filenames. Safe for a 1-year TTL because Angular's build appends a hash
  # to every filename (e.g. main.4f3a2b1c.js); a new deploy changes the hash
  # so Cloudflare has no cache entry for the new filename.
  # index.html is intentionally excluded — it has no hash and must stay fresh.
  rules {
    ref         = "cache_static_assets"
    description = "Cache hashed Angular static assets for 1 year"
    expression  = "http.request.uri.path matches \"\\.(js|css|woff2?|ttf|eot|ico|svg|png|jpg|jpeg|gif|webp)(\\?.*)?$\""
    action      = "set_cache_settings"
    enabled     = true

    action_parameters {
      edge_ttl {
        mode    = "override_origin"
        default = 31536000
      }

      browser_ttl {
        mode    = "override_origin"
        default = 31536000
      }
    }
  }
}

# Inject a shared-secret header on every request reaching the origin so the
# OpenResty BFF can verify the request came via Cloudflare. Replaces the
# Cloud Armor Cloudflare-IP whitelist that previously enforced origin lock.
# The matching check lives in osrs-calc-ui/nginx.conf (access_by_lua_block).
resource "cloudflare_ruleset" "origin_auth_header" {
  count   = local.cloudflare_enabled ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "Inject origin auth header"
  kind    = "zone"
  phase   = "http_request_late_transform"

  rules {
    ref         = "origin_auth_header"
    description = "Add shared secret so origin can verify request came via Cloudflare"
    expression  = "true"
    action      = "rewrite"
    enabled     = true

    action_parameters {
      headers {
        name      = "X-Origin-Auth"
        operation = "set"
        value     = random_password.origin_auth[0].result
      }
    }
  }
}
