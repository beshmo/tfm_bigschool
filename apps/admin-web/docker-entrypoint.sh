#!/bin/sh
# Runs before nginx starts (installed as /docker-entrypoint.d/40-okvns-env.sh).
# The SPA cannot read container environment variables, so write the API base URL
# into env.js, which index.html loads before the app.
set -eu

API_BASE_URL="${OKVNS_API_BASE_URL:-http://localhost:3000}"
# Escape backslashes and double quotes so the value stays a valid JS string.
ESCAPED=$(printf '%s' "$API_BASE_URL" | sed 's/\\/\\\\/g; s/"/\\"/g')

printf 'window.__OKVNS_API_BASE_URL__ = "%s";\n' "$ESCAPED" > /usr/share/nginx/html/env.js
