#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_PATH="${EXT_DIR}/config.js"

DEV_ENDPOINT="http://localhost:8000"
PROD_ENDPOINT="https://klartext-api.fly.dev"

if [[ ! -f "${CONFIG_PATH}" ]]; then
  echo "Error: config.js not found at ${CONFIG_PATH}" >&2
  exit 1
fi

usage() {
  cat <<'EOF'
Usage:
  ./scripts/toggle-config-env.sh dev
  ./scripts/toggle-config-env.sh prod
  ./scripts/toggle-config-env.sh status

Modes:
  dev    -> API_ENDPOINT=http://localhost:8000, DEBUG=true
  prod   -> API_ENDPOINT=https://klartext-api.fly.dev, DEBUG=false
  status -> Print current API_ENDPOINT and DEBUG
EOF
}

MODE="${1:-status}"

if [[ "${MODE}" == "status" ]]; then
  CONFIG_PATH="${CONFIG_PATH}" python3 - <<'PY'
import os
import re
from pathlib import Path

text = Path(os.environ["CONFIG_PATH"]).read_text(encoding="utf-8")
endpoint = re.search(r"API_ENDPOINT:\s*'([^']+)'", text)
debug = re.search(r"DEBUG:\s*(true|false)", text)
print(f"API_ENDPOINT={endpoint.group(1) if endpoint else 'unknown'}")
print(f"DEBUG={debug.group(1) if debug else 'unknown'}")
PY
  exit 0
fi

if [[ "${MODE}" != "dev" && "${MODE}" != "prod" ]]; then
  usage
  exit 1
fi

if [[ "${MODE}" == "dev" ]]; then
  TARGET_ENDPOINT="${DEV_ENDPOINT}"
  TARGET_DEBUG="true"
else
  TARGET_ENDPOINT="${PROD_ENDPOINT}"
  TARGET_DEBUG="false"
fi

CONFIG_PATH="${CONFIG_PATH}" TARGET_ENDPOINT="${TARGET_ENDPOINT}" TARGET_DEBUG="${TARGET_DEBUG}" python3 - <<'PY'
import os
import re
import sys
from pathlib import Path

path = Path(os.environ["CONFIG_PATH"])
target_endpoint = os.environ["TARGET_ENDPOINT"]
target_debug = os.environ["TARGET_DEBUG"]

text = path.read_text(encoding="utf-8")
updated = re.sub(
    r"API_ENDPOINT:\s*'[^']+'",
    f"API_ENDPOINT: '{target_endpoint}'",
    text,
    count=1,
)
updated = re.sub(
    r"DEBUG:\s*(true|false)",
    f"DEBUG: {target_debug}",
    updated,
    count=1,
)

if updated == text:
    print("No changes made. Could not find expected config keys.", file=sys.stderr)
    sys.exit(1)

path.write_text(updated, encoding="utf-8")
PY

echo "Updated ${CONFIG_PATH}"
"${BASH_SOURCE[0]}" status
