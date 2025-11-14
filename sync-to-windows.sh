#!/bin/bash

# Sync script - kopieert wijzigingen naar Windows project map
TARGET_DIR="/mnt/c/Users/info/project"

echo "🔄 Syncing to Windows project folder..."
echo "Target: $TARGET_DIR"

# Check if target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo "❌ Error: Target directory does not exist!"
    echo "   Make sure Windows drive is mounted at /mnt/c/"
    exit 1
fi

# Sync all files except node_modules, dist, and git
rsync -av \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.git' \
    --exclude 'sync-to-windows.sh' \
    --delete \
    ./ "$TARGET_DIR/"

echo "✅ Sync complete!"
echo ""
echo "📦 Next steps:"
echo "   cd $TARGET_DIR"
echo "   git add ."
echo "   git commit -m 'your message'"
echo "   git push"
