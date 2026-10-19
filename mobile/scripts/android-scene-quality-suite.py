#!/usr/bin/env python3
"""Run unchanged native suites, optionally selecting Softer through the UI."""

from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys
import time


def main() -> int:
    required = ("MADGER_ANDROID_APK", "MADGER_ANDROID_PACKAGE", "MADGER_ANDROID_EVIDENCE_DIR")
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        print("Verify the APK first; required environment: " + ", ".join(missing), file=sys.stderr)
        return 2

    scripts = Path(__file__).resolve().parent
    evidence = Path(os.environ["MADGER_ANDROID_EVIDENCE_DIR"]).resolve()
    evidence.mkdir(parents=True, exist_ok=True)
    report_path = evidence / "suite-report.json"
    report = {
        "status": "running",
        "package": os.environ["MADGER_ANDROID_PACKAGE"],
        "apk": os.environ["MADGER_ANDROID_APK"],
        "suites": [],
    }

    def save_report() -> None:
        report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    save_report()
    suites = (
        ("expedition", "android-expedition-quality-smoke.py" if os.environ.get("MADGER_ANDROID_SCENE_QUALITY") == "softer" else "android-expedition-smoke.py", evidence),
        ("legacy-burrow", "android-preview-smoke.py", evidence / "legacy-burrow"),
    )
    for name, script, output in suites:
        output.mkdir(parents=True, exist_ok=True)
        log_path = output / (name + "-console.log")
        env = dict(os.environ)
        if name == "legacy-burrow":
            env["MADGER_ANDROID_LEGACY_EVIDENCE_DIR"] = str(output)
            # Compatibility is checked without clearing the prior suite's data.
            env["MADGER_ANDROID_RESET"] = "0"
        print("Running " + name + "; evidence: " + str(output), flush=True)
        started = time.monotonic()
        timed_out = False
        with log_path.open("w", encoding="utf-8") as log:
            try:
                result = subprocess.run(
                    [sys.executable, "-u", str(scripts / script)],
                    env=env,
                    stdout=log,
                    stderr=subprocess.STDOUT,
                    timeout=600,
                    check=False,
                )
                exit_code = result.returncode
            except subprocess.TimeoutExpired:
                timed_out, exit_code = True, 124
                log.write("\nSuite exceeded its 600-second limit.\n")
            except OSError as error:
                exit_code = 127
                log.write("\nCould not run suite: " + str(error) + "\n")
        # Retain the full output, including embedded image previews, in the
        # artifact. Keep the Actions console useful for actual test diagnostics.
        for line in log_path.read_text(encoding="utf-8", errors="replace").splitlines():
            if not line.startswith("NATIVE_VISUAL_QA "):
                print("[" + name + "] " + line, flush=True)
        report["suites"].append({
            "name": name,
            "status": "passed" if exit_code == 0 else "failed",
            "exit_code": exit_code,
            "timed_out": timed_out,
            "duration_s": round(time.monotonic() - started, 3),
            "evidence_dir": str(output),
            "console_log": str(log_path),
        })
        save_report()
        print(name + " exited " + str(exit_code), flush=True)

    failed = any(suite["exit_code"] != 0 for suite in report["suites"])
    report["status"] = "failed" if failed else "passed"
    save_report()
    print("Native suite " + report["status"] + "; report: " + str(report_path), flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
