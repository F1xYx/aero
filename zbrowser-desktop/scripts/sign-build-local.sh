#!/usr/bin/env bash
# Sign Windows builds with the Aero self-signed code-signing cert.
# Usage: ./sign-build-local.sh <path-to-exe> [<second-exe> ...]
# Requires: osslsigncode (built to ~/.local/bin) and build/signing/*.pem
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)"
SIG="$DIR/build/signing"
OSS="${HOME}/.local/bin/osslsigncode"
[ -x "$OSS" ] || OSS="$(command -v osslsigncode)"

for IN in "$@"; do
  OUT="${IN%.exe}-signed.exe"
  "$OSS" sign \
    -certs "$SIG/aero-code.crt" \
    -key "$SIG/aero-code.key.pem" \
    -n "Aero Browser" \
    -i "https://github.com/F1xYx/aero" \
    -h sha256 \
    -ts http://timestamp.digicert.com -noverifypeer \
    -in "$IN" -out "$OUT"
  mv "$OUT" "$IN"
  echo "Signed: $IN"
done
