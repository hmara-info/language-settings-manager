#!/bin/bash

# Check if convert (from ImageMagick) is installed
if ! command -v magick &> /dev/null
then
    echo "magick (from ImageMagick) could not be found. Please install it."
    echo "On macOS, you can install it with: brew install imagemagick"
    exit
fi

SOURCE_SVG="src/img/hmara-green-bg.svg"
FILES=(
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/LargeIcon.imageset/icon-128.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-128@2x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-256@2x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/universal-icon-1024@1x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-512@1x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-32@2x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-16@2x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-32@1x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-16@1x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-512@2x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-256@1x.png"
    "./safari/Лагідна Українізація/Shared (App)/Assets.xcassets/AppIcon.appiconset/mac-icon-128@1x.png"
    "./src/img/icon-64.png"
    "./src/img/icon-128.png"
    "./src/img/icon-32.png"
    "./safari/Лагідна Українізація/Shared (App)/Resources/Icon.png"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        width=$(sips -g pixelWidth "$file" | awk '/pixelWidth/ {print $2}')
        height=$(sips -g pixelHeight "$file" | awk '/pixelHeight/ {print $2}')
        echo "Regenerating $file with dimensions ${width}x${height}"
        echo magick "$SOURCE_SVG" -background none -resize "${width}x${height}" -gravity center -extent "${width}x${height}" "$file"
        magick "$SOURCE_SVG" -background none -resize "${width}x${height}" -gravity center -extent "${width}x${height}" "$file"
    else
        echo "File not found: $file"
    fi
done

echo "Done."
