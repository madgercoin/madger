#!/data/data/com.termux/files/usr/bin/bash

echo "Checking repository..."

echo
echo "Directories:"
for dir in token launch docs scripts .github; do
    if [ -d "$dir" ]; then
        echo "✓ $dir"
    else
        echo "✗ Missing: $dir"
    fi
done

echo
echo "JSON validation:"
find . \
    -path "./node_modules" -prune -o \
    -name "*.json" -type f -print | while IFS= read -r file; do
        if node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" "$file" >/dev/null 2>&1; then
            echo "✓ $file"
        else
            echo "✗ $file"
        fi
    done

echo
echo "Done."
