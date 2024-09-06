#!/bin/bash

# TODO: add safari support
# Check if version is provided
if [ -z "$1" ]; then
  echo "Please provide a new version number (e.g., 1.2.3)"
  exit 1
fi

# Store the new version
NEW_VERSION=$1

# Check if package.json exists
if [ ! -f "package.json" ]; then
  echo "package.json not found!"
  exit 1
fi

CURRENT_VERSION=$(jq -rc .version package.json)

echo "Bumping up version from '$CURRENT_VERSION' to '$NEW_VERSION'"

# Use jq to update the version in package.json
jq ".version = \"$NEW_VERSION\"" package.json > tmp.json && mv tmp.json package.json

for file in features/${CURRENT_VERSION}-*.json;
do
    echo "# copy $file -> ${file/$CURRENT_VERSION/$NEW_VERSION}";
    cp "$file" "${file/$CURRENT_VERSION/$NEW_VERSION}";
done

# Check if the operation was successful
if [ $? -eq 0 ]; then
  echo "Version updated to $NEW_VERSION in package.json"
else
  echo "Failed to update version"
  exit 1
fi
