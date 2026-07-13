#!/bin/sh
# Generates the runtime config consumed by the SPA from the environment.
set -e
: "${OKVNS_API_BASE_URL:=http://localhost:3000}"
cat > /usr/share/nginx/html/env.js <<EOF
window.__OKVNS_API_BASE_URL__ = "${OKVNS_API_BASE_URL}";
EOF
