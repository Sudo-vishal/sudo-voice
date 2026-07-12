#!/bin/bash
# Fetch the sherpa-onnx Android AAR (offline Whisper inference engine).
# The AAR is ~large and lives in GitHub releases, not Maven Central, so it is
# gitignored and downloaded on demand (CI runs this before building).
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="1.12.14"
DEST="app/libs/sherpa-onnx-${VERSION}.aar"
URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/v${VERSION}/sherpa-onnx-${VERSION}.aar"

if [ -f "$DEST" ]; then
    echo "sherpa-onnx AAR already present: $DEST"
    exit 0
fi

mkdir -p app/libs
echo "Downloading sherpa-onnx v${VERSION} AAR..."
curl -fL --retry 3 -o "$DEST" "$URL"
echo "Done: $DEST ($(du -h "$DEST" | cut -f1))"
