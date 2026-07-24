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
find . -name "*.json" | while read file; do
    if python -m json.tool "$file" >/dev/null 2>&1; then
        echo "✓ $file"
    else
        echo "✗ $file"
    fi
done

echo
echo "Done."
