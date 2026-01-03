#!/bin/bash

# Check if rsvg-convert is installed (primary tool for SVG rendering)
if ! command -v rsvg-convert &> /dev/null
then
    echo "rsvg-convert (from librsvg) could not be found. Please install it."
    echo "On macOS, you can install it with: brew install librsvg"
    exit 1
fi

SOURCE_SVG="src/img/hmara-green-bg.svg"

# Generate PDF for vector-based launch screen (no pixelation at any size)
echo "Generating vector PDF for launch screen..."
rsvg-convert -f pdf "$SOURCE_SVG" \
    -o "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/LargeIcon.imageset/icon.pdf"
echo "✅ Generated PDF using rsvg-convert"

FILES=(
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-128@2x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-256@2x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-512@1x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-32@2x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-16@2x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-32@1x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-16@1x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-512@2x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-256@1x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-128@1x.png"
    "./src/img/icon-64.png"
    "./src/img/icon-128.png"
    "./src/img/icon-32.png"
    "./safari/Лагідна Українізація/Shared (App)/Resources/Icon.png"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        width=$(sips -g pixelWidth "$file" | awk '/pixelWidth/ {print $2}')
        height=$(sips -g pixelHeight "$file" | awk '/pixelHeight/ {print $2}')
        echo "Regenerating $file with dimensions ${width}x${height}"
        rsvg-convert -f png "$SOURCE_SVG" \
                     -o "$file" \
                     -w "$width" \
                     -h "$height"

    else
        echo "File not found: $file"
    fi
done

# Generate large app icon with white background for App Store submission
LARGE_ICON="./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/universal-icon-1024@1x.png"
if [ -f "$LARGE_ICON" ]; then
    width=$(sips -g pixelWidth "$LARGE_ICON" | awk '/pixelWidth/ {print $2}')
    height=$(sips -g pixelHeight "$LARGE_ICON" | awk '/pixelHeight/ {print $2}')
    echo "Regenerating $LARGE_ICON with dimensions ${width}x${height} on white background"

    # Create temporary transparent PNG, then composite onto white background
    tmp_png=$(mktemp).png
    rsvg-convert -f png "$SOURCE_SVG" \
                 -o "$tmp_png" \
                 -w "$width" \
                 -h "$height"

    # Use ImageMagick to add white background
    if command -v magick &> /dev/null; then
        magick "$tmp_png" -background white -flatten "$LARGE_ICON"
    else
        convert "$tmp_png" -background white -flatten "$LARGE_ICON"
    fi

    rm "$tmp_png"
    echo "✅ Generated large app icon with white background"
else
    echo "File not found: $LARGE_ICON"
fi

echo "Done."
