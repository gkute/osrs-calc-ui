# Build stage
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime stage — OpenResty (nginx + LuaJIT) for GCP SA identity-token proxy
FROM openresty/openresty:alpine-fat AS runtime

# Install lua-resty-http so Lua code can call the GCP metadata server and
# the upstream API over HTTPS. Install ca-certificates so OpenResty can
# verify TLS certs when ssl_verify = true (not present in Alpine by default).
RUN apk add --no-cache ca-certificates && opm get ledgetech/lua-resty-http

COPY --from=build /app/dist/osrs-calc-ui/browser /usr/share/nginx/html

# Replace the default OpenResty nginx.conf with ours (includes http-level
# lua_shared_dict and the /api BFF proxy block).
COPY nginx.conf /usr/local/openresty/nginx/conf/nginx.conf

EXPOSE 8080

CMD ["openresty", "-g", "daemon off;"]
