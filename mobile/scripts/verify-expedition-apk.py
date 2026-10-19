#!/usr/bin/env python3
"""Download, authenticate and inspect the exact EAS APK selected for native QA."""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.parse import urlsplit
from uuid import UUID


ROOT = Path(__file__).resolve().parents[1]
KEYS = {"apkUrl", "sha256", "package", "version", "buildNumber", "easBuildId"}
FORBIDDEN = {
    "android.permission.RECORD_AUDIO", "android.permission.READ_EXTERNAL_STORAGE",
    "android.permission.WRITE_EXTERNAL_STORAGE", "android.permission.SYSTEM_ALERT_WINDOW",
}


def validate_manifest(value):
    if not isinstance(value, dict) or set(value) != KEYS:
        raise ValueError("Build manifest must contain exactly the six documented fields")
    if not isinstance(value["apkUrl"], str):
        raise ValueError("apkUrl must be a string")
    url = urlsplit(value["apkUrl"])
    if (url.scheme != "https" or url.netloc != "expo.dev" or url.username is not None
            or url.password is not None or url.query or url.fragment
            or not re.fullmatch(r"/artifacts/eas/[A-Za-z0-9][A-Za-z0-9/_-]*\.apk", url.path)):
        raise ValueError("apkUrl must be a credential-free https://expo.dev/artifacts/eas/...apk URL")
    # urlsplit can strip leading controls; insist that the original URL is canonical.
    if value["apkUrl"] != "https://expo.dev" + url.path:
        raise ValueError("apkUrl must not contain whitespace, controls or URL rewriting")
    if not isinstance(value["sha256"], str) or not re.fullmatch(r"[0-9a-fA-F]{64}", value["sha256"]):
        raise ValueError("sha256 must contain exactly 64 hexadecimal characters")
    if not isinstance(value["package"], str) or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)+", value["package"]):
        raise ValueError("package must be an Android application identifier")
    if not isinstance(value["version"], str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9.+_-]{0,63}", value["version"]):
        raise ValueError("version must be a nonempty, single-line version name")
    number = value["buildNumber"]
    if isinstance(number, bool) or not isinstance(number, (int, str)) or not re.fullmatch(r"[1-9][0-9]*", str(number)) or int(number) > 2100000000:
        raise ValueError("buildNumber must be a positive Android versionCode")
    if not isinstance(value["easBuildId"], str) or str(UUID(value["easBuildId"])) != value["easBuildId"]:
        raise ValueError("easBuildId must be a canonical UUID")
    return {**value, "sha256": value["sha256"].lower(), "buildNumber": int(number)}


def inspect_apk(apk, build_tools, evidence, expected):
    def capture(name, command):
        result = subprocess.run(command, capture_output=True, text=True, timeout=90)
        (evidence / name).write_text(result.stdout + result.stderr, encoding="utf-8")
        if result.returncode:
            raise RuntimeError(f"APK inspection failed: {name}; see the evidence artifact")
        return result.stdout

    capture("apksigner.txt", [str(build_tools / "apksigner"), "verify", "--verbose", "--print-certs", str(apk)])
    badging = capture("aapt-badging.txt", [str(build_tools / "aapt"), "dump", "badging", str(apk)])
    package_line = next((line for line in badging.splitlines() if line.startswith("package:")), "")
    fields = dict(re.findall(r"(\w+)='([^']*)'", package_line))
    actual = {"package": fields.get("name"), "version": fields.get("versionName"),
              "buildNumber": int(fields.get("versionCode", "-1"))}
    for key in actual:
        if actual[key] != expected[key]:
            raise ValueError(f"APK {key} does not match the build manifest")
    permissions_text = capture("aapt-permissions.txt", [str(build_tools / "aapt"), "dump", "permissions", str(apk)])
    permissions = set(re.findall(r"\bname='([^']+)'", permissions_text))
    forbidden = sorted(FORBIDDEN & permissions)
    if forbidden:
        raise ValueError("APK requests forbidden permissions: " + ", ".join(forbidden))
    return {**actual, "signatureVerified": True, "permissions": sorted(permissions)}


def main():
    evidence = Path(os.environ["MADGER_ANDROID_EVIDENCE_DIR"]).resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    report = {"status": "failed"}
    try:
        manifest = validate_manifest(json.loads((ROOT / "expedition-preview-build.json").read_text(encoding="utf-8")))
        (evidence / "build-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        apk = Path(os.environ["MADGER_ANDROID_APK"]).resolve()
        apk.parent.mkdir(parents=True, exist_ok=True)
        # Expo may redirect the validated artifact URL to its HTTPS artifact CDN.
        # curl's protocol restriction applies to every redirect and TLS verification stays enabled.
        subprocess.run([
            "curl", "--disable", "--fail", "--silent", "--show-error", "--location",
            "--proto", "=https", "--proto-redir", "=https", "--max-redirs", "5",
            "--connect-timeout", "20", "--max-time", "300", "--retry", "3",
            "--max-filesize", "536870912", "--output", str(apk), manifest["apkUrl"],
        ], check=True, timeout=1250)
        checksum = hashlib.sha256()
        with apk.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                checksum.update(chunk)
        report.update({"sha256": checksum.hexdigest(), "easBuildId": manifest["easBuildId"], "apkBytes": apk.stat().st_size})
        if checksum.hexdigest() != manifest["sha256"]:
            raise ValueError("Downloaded APK SHA-256 does not match the build manifest")
        sdk = os.environ.get("ANDROID_SDK_ROOT") or os.environ["ANDROID_HOME"]
        report.update(inspect_apk(apk, Path(sdk) / "build-tools" / "36.0.0", evidence, manifest))
        with Path(os.environ["GITHUB_ENV"]).open("a", encoding="utf-8") as env:
            env.write(f"MADGER_ANDROID_PACKAGE={manifest['package']}\nMADGER_ANDROID_APK={apk}\n")
        report["status"] = "passed"
        print(f"Verified {manifest['package']} {manifest['version']} ({manifest['buildNumber']}); SHA-256 {checksum.hexdigest()}")
        return 0
    except Exception as error:
        report["error"] = str(error)
        print(f"APK verification failed: {error}", file=sys.stderr)
        return 1
    finally:
        (evidence / "apk-verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    raise SystemExit(main())
