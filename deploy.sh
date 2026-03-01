#!/bin/bash
# Deploy IndianWhisper — build release, sign, reset TCC, launch
# Usage: ./deploy.sh         (build + deploy)
#        ./deploy.sh dmg     (build + create DMG installer)
set -e

cd "$(dirname "$0")"

APP_NAME="IndianWhisper"
BUNDLE_ID="com.indianwhisper.app"
APP_PATH="/Applications/${APP_NAME}.app"
BUILD_PATH=".build/arm64-apple-macosx/release/${APP_NAME}"

echo "Building ${APP_NAME} release..."
swift build -c release 2>&1 | tail -5

if [ "$1" = "dmg" ]; then
    # --- DMG Installer ---
    echo "Creating DMG installer..."

    DMG_DIR=".build/dmg"
    DMG_NAME="${APP_NAME}-v1.0.0.dmg"
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

    echo "DMG created: ${DMG_DIR}/${DMG_NAME}"
    open "$DMG_DIR"
    exit 0
fi

# --- Normal Deploy ---
echo "Stopping old app..."
pkill -f "$APP_NAME" 2>/dev/null || true
# Also stop old WhisperAiwithDhruv if running
pkill -f WhisperAiwithDhruv 2>/dev/null || true
sleep 1

# Create .app bundle if it doesn't exist
if [ ! -d "$APP_PATH" ]; then
    echo "Creating app bundle..."
    mkdir -p "${APP_PATH}/Contents/MacOS"
    mkdir -p "${APP_PATH}/Contents/Resources"
    cp Sources/App/Info.plist "${APP_PATH}/Contents/"
fi

echo "Deploying release binary..."
cp "$BUILD_PATH" "${APP_PATH}/Contents/MacOS/${APP_NAME}"

echo "Signing..."
codesign --force --sign - "$APP_PATH"

echo "Resetting TCC (accessibility)..."
tccutil reset Accessibility "$BUNDLE_ID" 2>/dev/null || true

echo "Launching..."
open "$APP_PATH"

echo "Done! Grant accessibility when prompted."
echo "IndianWhisper is running in your menu bar."
