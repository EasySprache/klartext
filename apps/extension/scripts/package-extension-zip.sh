#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
MANIFEST_PATH="${EXT_DIR}/manifest.json"

if [[ ! -f "${MANIFEST_PATH}" ]]; then
  echo "Error: manifest.json not found at ${MANIFEST_PATH}" >&2
  exit 1
fi

VERSION="$(
  MANIFEST_PATH="${MANIFEST_PATH}" python3 - <<'PY'
import json
import os
from pathlib import Path

manifest = Path(os.environ["MANIFEST_PATH"])
data = json.loads(manifest.read_text(encoding="utf-8"))
print(data["version"])
PY
)"

DIST_DIR="${EXT_DIR}/dist"
ZIP_NAME="klartext-extension-v${VERSION}.zip"
ZIP_PATH="${DIST_DIR}/${ZIP_NAME}"

mkdir -p "${DIST_DIR}"
rm -f "${ZIP_PATH}"

cd "${EXT_DIR}"

zip -r "${ZIP_PATH}" . \
  -x "*.DS_Store" \
  -x "*.zip" \
  -x "dist/*" \
  -x "archive/*" \
  -x "logs/*" \
  -x "*.md" \
  -x "scripts/*" \
  -x ".git/*" \
  -x ".gitignore"

ZIP_PATH="${ZIP_PATH}" python3 - <<'PY'
import os
import sys
import zipfile

zip_path = os.environ["ZIP_PATH"]
with zipfile.ZipFile(zip_path, "r") as zf:
    names = set(zf.namelist())
if "manifest.json" not in names:
    print("Error: packaged ZIP does not contain manifest.json", file=sys.stderr)
    sys.exit(1)
PY

echo "Created ${ZIP_PATH}"
echo "Verified archive contains manifest.json"
