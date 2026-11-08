#!/usr/bin/env python3
"""Fail closed when the Android APK is missing its GL loader in either supported ABI."""
import argparse
import json
import sys
import zipfile

REQUIRED_LIBRARIES = ("libexpo-gl.so", "libexpo-modules-core.so", "libreactnative.so")

def validate(apk_path, architectures):
    if not architectures or len(set(architectures)) != len(architectures):
        raise ValueError("A non-empty unique ABI list is required")
    with zipfile.ZipFile(apk_path, "r") as archive:
        sizes = {item.filename: item.file_size for item in archive.infolist()}
    missing = []
    for arch in architectures:
        if "/" in arch or "\\" in arch or not arch:
            raise ValueError("Invalid ABI name")
        for library in REQUIRED_LIBRARIES:
            name = f"lib/{arch}/{library}"
            if sizes.get(name, 0) <= 0:
                missing.append(name)
    if missing:
        raise RuntimeError("Missing required Android native libraries: " + ", ".join(missing))
    return {"status": "passed", "apk": apk_path, "abi_sizes":
            {arch: {library: sizes[f"lib/{arch}/{library}"] for library in REQUIRED_LIBRARIES}
             for arch in architectures}}

def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("apk")
    parser.add_argument("--abis", default="arm64-v8a,x86_64",
                        help="Required APK native ABIs; default is both GitHub CI targets")
    args = parser.parse_args(argv)
    try:
        result = validate(args.apk, args.abis.split(","))
    except (OSError, ValueError, RuntimeError, zipfile.BadZipFile) as error:
        print(f"BLOCKED: {error}", file=sys.stderr)
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
