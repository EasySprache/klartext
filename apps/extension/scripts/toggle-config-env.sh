#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_PATH="${EXT_DIR}/config.js"
SW_PATH="${EXT_DIR}/background/service-worker.js"

DEV_ENDPOINT="http://localhost:8000"
PROD_ENDPOINT="https://klartext-api.fly.dev"

if [[ ! -f "${CONFIG_PATH}" ]]; then
  echo "Error: config.js not found at ${CONFIG_PATH}" >&2
  exit 1
fi

if [[ ! -f "${SW_PATH}" ]]; then
  echo "Error: service-worker.js not found at ${SW_PATH}" >&2
  exit 1
fi

usage() {
  cat <<'EOF'
Usage:
  ./scripts/toggle-config-env.sh dev
  ./scripts/toggle-config-env.sh prod
  ./scripts/toggle-config-env.sh status

Modes:
  dev    -> API_ENDPOINT=http://localhost:8000, DEBUG=true (config.js and service-worker.js)
  prod   -> API_ENDPOINT=https://klartext-api.fly.dev, DEBUG=false (config.js and service-worker.js)
  status -> Print current API_ENDPOINT and DEBUG from both files
EOF
}

MODE="${1:-status}"

if [[ "${MODE}" == "status" ]]; then
  CONFIG_PATH="${CONFIG_PATH}" SW_PATH="${SW_PATH}" python3 - <<'PY'
import os
import re
from pathlib import Path

config_text = Path(os.environ["CONFIG_PATH"]).read_text(encoding="utf-8")
sw_text = Path(os.environ["SW_PATH"]).read_text(encoding="utf-8")
endpoint = re.search(r"API_ENDPOINT:\s*'([^']+)'", config_text)
config_debug = re.search(r"DEBUG:\s*(true|false)", config_text)
sw_debug = re.search(r"const DEBUG = (true|false);", sw_text)
print(f"API_ENDPOINT={endpoint.group(1) if endpoint else 'unknown'}")
print(f"config.js DEBUG={config_debug.group(1) if config_debug else 'unknown'}")
print(f"service-worker.js DEBUG={sw_debug.group(1) if sw_debug else 'unknown'}")
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

CONFIG_PATH="${CONFIG_PATH}" SW_PATH="${SW_PATH}" TARGET_ENDPOINT="${TARGET_ENDPOINT}" TARGET_DEBUG="${TARGET_DEBUG}" python3 - <<'PY'
import os
import re
import sys
from pathlib import Path

config_path = Path(os.environ["CONFIG_PATH"])
sw_path = Path(os.environ["SW_PATH"])
target_endpoint = os.environ["TARGET_ENDPOINT"]
target_debug = os.environ["TARGET_DEBUG"]

config_text = config_path.read_text(encoding="utf-8")
config_updated = re.sub(
    r"API_ENDPOINT:\s*'[^']+'",
    f"API_ENDPOINT: '{target_endpoint}'",
    config_text,
    count=1,
)
config_updated = re.sub(
    r"DEBUG:\s*(true|false)",
    f"DEBUG: {target_debug}",
    config_updated,
    count=1,
)

if config_updated == config_text:
    print("No changes made. Could not find expected config keys.", file=sys.stderr)
    sys.exit(1)

sw_text = sw_path.read_text(encoding="utf-8")
sw_updated = re.sub(
    r"const DEBUG = (true|false);",
    f"const DEBUG = {target_debug};",
    sw_text,
    count=1,
)

if sw_updated == sw_text:
    print("No changes made. Could not find service-worker DEBUG flag.", file=sys.stderr)
    sys.exit(1)

config_path.write_text(config_updated, encoding="utf-8")
sw_path.write_text(sw_updated, encoding="utf-8")
PY

echo "Updated ${CONFIG_PATH}"
echo "Updated ${SW_PATH}"
"${BASH_SOURCE[0]}" status
