#!/bin/bash
# Deploy IndianWhisper — build release, sign, reset TCC, launch
# Usage: ./deploy.sh             (build + deploy locally)
#        ./deploy.sh dmg         (build + create DMG + generate release manifest)
#        ./deploy.sh release     (dmg + copy to website for deployment)
set -e
set -o pipefail     # without this, `swift build ... | tail -5` silently swallows build failures

cd "$(dirname "$0")"

APP_NAME="IndianWhisper"
BUNDLE_ID="com.indianwhisper.app"
APP_PATH="/Applications/${APP_NAME}.app"
BUILD_PATH=".build/arm64-apple-macosx/release/${APP_NAME}"
WEBSITE_DIR="../website/public/releases"
ICON_SRC="assets/AppIcon.icns"

# Read version from Info.plist
VERSION=$(plutil -extract CFBundleShortVersionString raw Sources/App/Info.plist 2>/dev/null || echo "1.0.0")

echo "Building ${APP_NAME} v${VERSION} release..."
swift build -c release 2>&1 | tail -5

if [ "$1" = "dmg" ] || [ "$1" = "release" ]; then
    # --- DMG Installer ---
    echo "Creating DMG installer..."

    DMG_DIR=".build/dmg"
    DMG_NAME="${APP_NAME}-v${VERSION}.dmg"
    STAGING="${DMG_DIR}/staging"

    rm -rf "$DMG_DIR"
    mkdir -p "$STAGING"

    # Create .app bundle structure
    APP_BUNDLE="${STAGING}/${APP_NAME}.app"
    mkdir -p "${APP_BUNDLE}/Contents/MacOS"
    mkdir -p "${APP_BUNDLE}/Contents/Resources"

    cp "$BUILD_PATH" "${APP_BUNDLE}/Contents/MacOS/${APP_NAME}"
    cp Sources/App/Info.plist "${APP_BUNDLE}/Contents/"

    # Sign
    codesign --force --sign - "$APP_BUNDLE"

    # Create DMG
    if command -v create-dmg &>/dev/null; then
        create-dmg \
            --volname "$APP_NAME" \
            --window-pos 200 120 \
            --window-size 600 400 \
            --icon-size 100 \
            --icon "$APP_NAME.app" 175 190 \
            --app-drop-link 425 190 \
            --no-internet-enable \
            "${DMG_DIR}/${DMG_NAME}" \
            "$STAGING"
    else
        # Fallback: basic DMG with hdiutil
        ln -s /Applications "${STAGING}/Applications"
        hdiutil create -volname "$APP_NAME" \
            -srcfolder "$STAGING" \
            -ov -format UDZO \
            "${DMG_DIR}/${DMG_NAME}"
    fi

    # Compute SHA256
    SHA256=$(shasum -a 256 "${DMG_DIR}/${DMG_NAME}" | cut -d' ' -f1)
    DMG_SIZE=$(stat -f%z "${DMG_DIR}/${DMG_NAME}")

    echo ""
    echo "DMG created: ${DMG_DIR}/${DMG_NAME}"
    echo "  Size: ${DMG_SIZE} bytes"
    echo "  SHA256: ${SHA256}"

    if [ "$1" = "release" ]; then
        # --- Copy to website + generate manifest ---
        echo ""
        echo "Preparing website release..."
        mkdir -p "$WEBSITE_DIR"

        cp "${DMG_DIR}/${DMG_NAME}" "$WEBSITE_DIR/"

        # Read release notes
        NOTES="Bug fixes and improvements."
        if [ -f "RELEASE_NOTES.md" ]; then
            NOTES=$(cat RELEASE_NOTES.md)
        fi

        # Escape newlines and quotes for JSON
        NOTES_JSON=$(echo "$NOTES" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read().strip()))")

        # Generate latest.json
        cat > "$WEBSITE_DIR/latest.json" << MANIFEST
{
  "version": "${VERSION}",
  "minimumOS": "14.0",
  "releaseDate": "$(date -u +%Y-%m-%d)",
  "downloadURL": "https://indianwhisper.com/releases/${DMG_NAME}",
  "releaseNotes": ${NOTES_JSON},
  "sha256": "${SHA256}"
}
MANIFEST

        echo "Release v${VERSION} ready!"
        echo "  DMG: ${WEBSITE_DIR}/${DMG_NAME}"
        echo "  Manifest: ${WEBSITE_DIR}/latest.json"
        echo ""
        echo "Next steps:"
        echo "  1. cd ../website && git add -A && git commit -m 'release v${VERSION}'"
        echo "  2. npx vercel --prod --yes"
        echo "  3. git push"
    fi

    open "$DMG_DIR"
    exit 0
fi

# --- Normal Deploy ---
echo "Stopping old app..."
pkill -f "$APP_NAME" 2>/dev/null || true
pkill -f WhisperAiwithDhruv 2>/dev/null || true
sleep 1

# Ensure bundle skeleton exists
mkdir -p "${APP_PATH}/Contents/MacOS"
mkdir -p "${APP_PATH}/Contents/Resources"

# Always refresh Info.plist so Info.plist edits (icon, version, entitlements)
# actually land in /Applications — earlier guarded-copy meant Info.plist changes
# silently stayed in source.
echo "Refreshing Info.plist..."
cp Sources/App/Info.plist "${APP_PATH}/Contents/"

echo "Deploying release binary..."
cp "$BUILD_PATH" "${APP_PATH}/Contents/MacOS/${APP_NAME}"

if [ -f "$ICON_SRC" ]; then
    echo "Copying app icon..."
    mkdir -p "${APP_PATH}/Contents/Resources"
    cp "$ICON_SRC" "${APP_PATH}/Contents/Resources/AppIcon.icns"
    # Force Finder/Dock to re-read the icon (macOS caches aggressively)
    touch "$APP_PATH"
fi

echo "Signing..."
# Use stable self-signed identity if present so TCC (Accessibility/Mic) persists
# across rebuilds. Falls back to ad-hoc if identity missing. Run ./setup-signing.sh
# once to create the identity.
SIGN_ID=$(security find-certificate -c "IndianWhisper Dev" -Z 2>/dev/null | awk '/SHA-1 hash/{print $NF}')
if [ -n "$SIGN_ID" ]; then
    echo "  Using stable identity: $SIGN_ID (IndianWhisper Dev)"
    codesign --force --sign "$SIGN_ID" "$APP_PATH"
else
    echo "  No stable identity found — ad-hoc signing (run ./setup-signing.sh to fix)"
    codesign --force --sign - "$APP_PATH"
fi

# NOTE: Intentionally NOT resetting TCC on every deploy.
# Reason: wiping accessibility permission every rebuild makes auto-type silently
# stop working until the user manually re-grants the permission in System Settings.
# If the codesign identity ever changes and auto-type breaks, uncomment below to reset.
# tccutil reset Accessibility "$BUNDLE_ID" 2>/dev/null || true

echo "Launching..."
open "$APP_PATH"

echo "Done! Grant accessibility when prompted."
echo "IndianWhisper v${VERSION} is running in your menu bar."
