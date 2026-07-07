#!/bin/bash
# One-time: create a stable self-signed codesigning identity so TCC permissions
# (Accessibility, Microphone) survive every rebuild.
#
# Background: ad-hoc signing (`codesign --sign -`) produces a new cdhash every
# build, and macOS TCC keys permissions off that hash. Result: users have to
# re-grant Accessibility after every `./deploy.sh`, and the auto-type silently
# stops working.
#
# Fix: generate a persistent self-signed certificate. Every subsequent build
# signs with the SAME identity, so TCC recognizes the app across rebuilds.

set -e
set -o pipefail

CERT_NAME="SudoVoice Dev"
KEYCHAIN_NAME="sudovoice-signing.keychain-db"
KEYCHAIN_PATH="$HOME/Library/Keychains/$KEYCHAIN_NAME"
KEYCHAIN_PASSWORD="sudovoice-local"

# Already set up? Skip.
if security find-identity -v -p codesigning "$KEYCHAIN_PATH" 2>/dev/null | grep -q "$CERT_NAME"; then
    echo "Signing identity already exists:"
    security find-identity -v -p codesigning "$KEYCHAIN_PATH" | grep "$CERT_NAME"
    exit 0
fi

echo "Creating dedicated keychain at $KEYCHAIN_PATH..."
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME" 2>/dev/null || true
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME"
# Keep unlocked during dev — no auto-lock/auto-relock
security set-keychain-settings "$KEYCHAIN_NAME"

# Add to search list so codesign sees it
EXISTING=$(security list-keychains -d user | tr -d ' "')
security list-keychains -d user -s "$KEYCHAIN_NAME" $EXISTING

echo "Generating self-signed certificate..."
TMP=$(mktemp -d)
cat > "$TMP/csr.conf" << 'CONF'
[ req ]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req
[ dn ]
CN = SudoVoice Dev
O = AIwithVishal
[ v3_req ]
basicConstraints = critical, CA:FALSE
keyUsage = critical, digitalSignature
extendedKeyUsage = codeSigning
CONF

openssl req -x509 -newkey rsa:2048 \
    -keyout "$TMP/key.pem" -out "$TMP/cert.pem" \
    -days 3650 -nodes -config "$TMP/csr.conf" \
    -extensions v3_req 2>&1 | tail -3

openssl pkcs12 -export -legacy \
    -inkey "$TMP/key.pem" -in "$TMP/cert.pem" \
    -out "$TMP/cert.p12" -name "$CERT_NAME" \
    -passout pass:x

echo "Importing certificate + key into keychain..."
security import "$TMP/cert.p12" -k "$KEYCHAIN_NAME" -P x -A -T /usr/bin/codesign -T /usr/bin/security

# Allow codesign to use the private key without password prompts
security set-key-partition-list -S apple-tool:,apple:,codesign: \
    -s -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_NAME" >/dev/null 2>&1 || true

rm -rf "$TMP"

echo ""
echo "Done. Installed identity:"
security find-identity -v -p codesigning "$KEYCHAIN_PATH" | grep "$CERT_NAME"
echo ""
echo "You can now run ./deploy.sh normally. Every build signs with the same"
echo "identity, so TCC permissions (Accessibility, Microphone) persist across"
echo "rebuilds. Grant once, works forever."
