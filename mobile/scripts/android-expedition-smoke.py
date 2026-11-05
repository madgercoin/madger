#!/usr/bin/env python3
"""Exercise the installed Android Expedition through its real UI.

Dependencies: Python 3.10+, adb, uiautomator2, Pillow.
Run: MADGER_ANDROID_APK=/path/preview.apk python scripts/android-expedition-smoke.py

Environment:
  MADGER_ANDROID_PACKAGE       com.madgercoin.expedition.preview
  MADGER_ANDROID_APK           <mobile>/madger-expedition-preview.apk
  MADGER_ANDROID_SERIAL        adb serial; ANDROID_SERIAL is also supported
  MADGER_ANDROID_SKIP_INSTALL  1 to exercise an already installed APK
  MADGER_ANDROID_RESET         1 to clear this test app before starting
  MADGER_ANDROID_EVIDENCE_DIR  output directory (PNG, XML, logcat, JSON)

Use a dedicated emulator/test profile. Data is preserved by default; a previous
unfinished run requires an explicit reset for the fresh-run part of this test.
No deep links, debug globals, storage edits, or engine/state injection are used.
"""

from __future__ import annotations

import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import traceback
import xml.etree.ElementTree as ET
from datetime import datetime, timezone


ROOT = Path(__file__).resolve().parents[1]
PACKAGE = os.environ.get("MADGER_ANDROID_PACKAGE", "com.madgercoin.expedition.preview")
APK = Path(os.environ.get("MADGER_ANDROID_APK", str(ROOT / "madger-expedition-preview.apk")))
STAMP = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
OUT = Path(os.environ.get("MADGER_ANDROID_EVIDENCE_DIR", str(ROOT / "expedition-evidence" / "android-smoke" / STAMP)))
ENTRY = "Start expedition"
HUD = re.compile(r"Expedition distance (\d+) meters; lane (-?\d); (jumping|burrowing|running); route (main|hollow|grotto|rootway|ridge|deep|mosswalk|root-arch|log-crossing|causeway|watchtower|gearworks|mudslide|crystal-vein|ancient-vault)$")
SCORE = re.compile(r"Current expedition score (\d+)")
ERROR_LABELS = (
    "The 3D view did not start.", "The 3D view needs a restart.",
    "Saved expedition could not be loaded.", "Progress is in memory only.",
    "Your saved Expedition could not be loaded", "native backup could not be updated",
    "The offline game sent an invalid local save", "The 3D graphics process stopped",
    "Unable to load script", "Uncaught Error", "keeps stopping",
)


class Smoke:
    def __init__(self):
        self.serial = os.environ.get("MADGER_ANDROID_SERIAL") or os.environ.get("ANDROID_SERIAL")
        self.device = None
        self.log = None
        self.log_file = None
        self.pids: set[str] = set()
        self.started = time.monotonic()
        self.last_observation = None
        self.control_bounds = {}
        self.control_run_id = None
        self.current_pids = set()
        self.clock_calibration = None
        self.road_samples = []
        self.road_cue_samples = []
        self.road_responses = []
        self.report = {"status": "running", "package": PACKAGE, "started_utc": STAMP,
                       "steps": [], "states": {}, "frames": {}, "errors": [], "automation_calls": []}

    def timed(self, name, call):
        started = time.monotonic()
        try:
            return call()
        finally:
            self.report["automation_calls"].append({"name": name,
                "start_s": round(started - self.started, 3),
                "duration_ms": round((time.monotonic() - started) * 1000, 2)})

    def observation(self, nodes, labels):
        match = next((HUD.search(value) for value in labels if HUD.search(value)), None)
        score = next((SCORE.search(value) for value in labels if SCORE.search(value)), None)
        hud = None if not match or not score else {"distance_m": int(match[1]), "lane": int(match[2]),
            "action": match[3], "route": match[4], "score": int(score[1])}
        phase = "paused" if "Your run is safe." in labels else "countdown" if "FOLLOW THE GOLD" in labels else "running" if self.label_node(nodes, "Pause expedition", clickable=True) else "other"
        return {"phase": phase, "hud": hud, "elapsed_s": round(time.monotonic() - self.started, 3)}

    def adb(self, *args, timeout=40, check=True):
        command = [os.environ.get("ADB", "adb")]
        if self.serial:
            command += ["-s", self.serial]
        result = subprocess.run(command + list(args), capture_output=True, text=True,
                                encoding="utf-8", errors="replace", timeout=timeout)
        if check and result.returncode:
            raise AssertionError(f"adb {' '.join(args[:4])} failed: {result.stderr or result.stdout}")
        return result.stdout.strip()

    def mark(self, name, **details):
        self.report["steps"].append({"name": name, "elapsed_s": round(time.monotonic() - self.started, 3), **details})
        print(name, flush=True)

    def tree(self):
        # Long scans may add load; RPC duration alone does not prove a frame stall.
        # Required accessible labels and bounds are still checked by every caller.
        # Keep Android's normal tree: flattening accessibility descendants adds
        # synchronous work while the 3D view is rendering on software GPUs.
        xml = self.timed("hierarchy", lambda: self.device.dump_hierarchy(compressed=False))
        nodes = list(ET.fromstring(xml).iter("node"))
        labels = [node.get(key, "") for node in nodes for key in ("text", "content-desc")]
        self.last_observation = self.observation(nodes, labels)
        controls = {label: self.label_node(nodes, label, clickable=True)
                    for label in ("LEFT", "RIGHT", "JUMP", "BURROW", "Pause expedition")}
        if all(controls.values()) and self.last_observation["phase"] == "running":
            self.control_bounds = {label: value[0] for label, value in controls.items()}
            self.control_run_id = None
        else:
            self.control_bounds = {}
            self.control_run_id = None
        for bad in ERROR_LABELS:
            if any(bad.lower() in value.lower() for value in labels):
                raise AssertionError(f"App displayed an error: {bad}")
        return xml, nodes, labels

    @staticmethod
    def bounds(node):
        numbers = re.findall(r"\d+", node.get("bounds", ""))
        if len(numbers) != 4:
            return None
        x1, y1, x2, y2 = map(int, numbers)
        return (x1, y1, x2, y2) if x2 > x1 and y2 > y1 else None

    def label_node(self, nodes, label, enabled=True, clickable=False):
        matches = []
        for node in nodes:
            if label not in (node.get("text"), node.get("content-desc")):
                continue
            if enabled and node.get("enabled") == "false":
                continue
            if clickable and node.get("clickable") != "true":
                continue
            bounds = self.bounds(node)
            if bounds:
                matches.append((bounds, node))
        # Resume exists as both a small HUD icon and a full modal button.
        return max(matches, key=lambda pair: (pair[0][2] - pair[0][0]) * (pair[0][3] - pair[0][1]), default=None)

    def dismiss_quickstep_anr(self, nodes):
        """Dismiss only an Android-owned Quickstep launcher ANR, never a game ANR.

        Cold software emulators can show this system dialog over a healthy
        running app. A missing/mismatched Close app control remains a failure.
        """
        launcher_anr = any(
            node.get("text") == "Quickstep isn't responding"
            and node.get("package") == "android"
            and node.get("resource-id") == "android:id/alertTitle"
            for node in nodes
        )
        if not launcher_anr:
            return False
        if len(self.report.get("system_dialog_dismissals", [])) >= 2:
            raise AssertionError("Repeated Quickstep launcher ANRs; emulator is unstable")
        close = next((
            node for node in nodes
            if node.get("text") == "Close app"
            and node.get("package") == "android"
            and node.get("resource-id") == "android:id/aerr_close"
            and node.get("clickable") == "true"
            and node.get("enabled") == "true"
        ), None)
        bounds = self.bounds(close) if close is not None else None
        if not bounds:
            raise AssertionError("Quickstep ANR was visible without a safe system Close app action")
        x1, y1, x2, y2 = bounds
        self.timed("dismiss:android-quickstep-anr",
                   lambda: self.device.click((x1 + x2) // 2, (y1 + y2) // 2))
        self.report.setdefault("system_dialog_dismissals", []).append({
            "dialog": "Quickstep isn't responding", "action": "Close app",
            "elapsed_s": round(time.monotonic() - self.started, 3),
        })
        print("[emulator] Dismissed Android Quickstep launcher ANR", flush=True)
        return True

    def wait_label(self, label, timeout=20, enabled=True, clickable=False):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            _, nodes, _ = self.tree()
            if self.dismiss_quickstep_anr(nodes):
                continue
            found = self.label_node(nodes, label, enabled, clickable)
            if found:
                return found
            time.sleep(.12)
        raise AssertionError(f"Visible {'enabled ' if enabled else ''}UI label not found: {label}")

    def calibrate_android_clock(self):
        samples = []
        for _ in range(3):
            before = time.monotonic()
            raw = self.adb("shell", "date", "+%s%3N")
            after = time.monotonic()
            if not re.fullmatch(r"\d{13}", raw):
                raise AssertionError(f"Android millisecond clock unavailable: {raw!r}")
            samples.append({"android_ms": int(raw), "host_mid_s": (before + after) / 2,
                            "rtt_ms": (after - before) * 1000})
        best = min(samples, key=lambda sample: sample["rtt_ms"])
        if best["rtt_ms"] > 400:
            raise AssertionError(f"Android clock calibration RTT too uncertain: {best}")
        self.clock_calibration = best
        self.report.setdefault("android_clock_calibrations", []).append({"selected": best, "samples": samples})

    @staticmethod
    def validate_frame(proof, android_now_low, android_now_high):
        """Validate observed post-draw evidence; never repair or synthesize it."""
        fields = ("runId", "mode", "distance_m", "lane", "action", "route", "score")
        if not isinstance(proof, dict):
            raise AssertionError("Frame proof is not an object")
        observed = proof.get("observedAt")
        rendered, current = proof.get("rendered"), proof.get("current")
        if not isinstance(rendered, dict) or not isinstance(current, dict):
            raise AssertionError("Frame proof lacks current/rendered objects")
        at = rendered.get("at")
        for value in (observed, at):
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not (0 < value < float('inf')):
                raise AssertionError("Frame timestamp is invalid")
        if observed > android_now_high or at > observed:
            raise AssertionError("Frame proof has a future timestamp")
        # Upper clock bound includes calibration RTT uncertainty; never accept
        # an observation whose true age could exceed two seconds.
        if android_now_high - observed > 2000:
            raise AssertionError("Foreground frame heartbeat is stale (>2 seconds)")
        if any(key not in rendered or key not in current or rendered[key] != current[key] for key in fields):
            raise AssertionError("Current state differs from the actually rendered frame")
        # Optional for older fixtures. This is the same generated player-facing
        # cue, not proof of the exact React text painted at that instant.
        if "hint" in rendered or "hint" in current:
            if (not isinstance(current.get("hint"), str)
                    or len(current["hint"]) > 240
                    or rendered.get("hint") != current["hint"]):
                raise AssertionError("Visible hint differs from the actually rendered frame")
        if "jumpAt" in rendered or "jumpAt" in current:
            values = (rendered.get("jumpAt"), current.get("jumpAt"))
            if (any(isinstance(value, bool) or not isinstance(value, (int, float))
                    or not (-float('inf') < value < float('inf')) for value in values)
                    or values[0] != values[1]):
                raise AssertionError("Genuine jump time differs from the actually rendered frame")
        if current["mode"] != "paused" and android_now_high - at > 2000:
            raise AssertionError("Rendered live frame is stale (>2 seconds)")
        if not isinstance(current["runId"], str) or not current["runId"]:
            raise AssertionError("Frame lacks run identity")
        if current["mode"] not in ("ready", "countdown", "running", "paused", "fork", "chamber", "upgrade", "won", "lost"):
            raise AssertionError("Unknown frame mode")
        for key in ("distance_m", "score", "lane"):
            if type(current[key]) is not int:
                raise AssertionError(f"Invalid frame integer {key}")
        if current["distance_m"] < 0 or current["score"] < 0 or current["lane"] not in (-1, 0, 1):
            raise AssertionError("Frame HUD values outside valid bounds")
        hud_label = f'Expedition distance {current["distance_m"]} meters; lane {current["lane"]}; {current["action"]}; route {current["route"]}'
        if not HUD.fullmatch(hud_label):
            raise AssertionError("Invalid frame action/route")
        return {key: current[key] for key in ("distance_m", "lane", "action", "route", "score")}

    def read_frame(self):
        if not self.clock_calibration:
            raise AssertionError("Android clock was not calibrated")
        if self.log and self.log.poll() is not None:
            raise AssertionError("Logcat collector stopped; live frame observation unavailable")
        path = OUT / "logcat.txt"
        if not path.exists():
            return None
        with path.open("rb") as stream:
            stream.seek(0, 2)
            size = stream.tell()
            stream.seek(max(0, size - 262144))
            raw = stream.read().decode("utf-8", errors="replace")
        # Ignore the last incomplete write, never interpret partial JSON.
        lines = raw.splitlines() if raw.endswith("\n") else raw.splitlines()[:-1]
        latest = None
        for line in reversed(lines):
            parsed = re.match(r"\d\d-\d\d\s+[\d:.]+\s+(\d+)\s+\d+\s+I\s+MadgerOfflineGame\s*:\s*(.*)", line)
            if not parsed or parsed[1] not in self.current_pids:
                continue
            if re.search(r"^ERROR:|MADGER_RENDER_START_ERROR|MADGER_RENDER_FRAME_ERROR", parsed[2]):
                raise AssertionError("Offline renderer reported an error: " + parsed[2])
            marker = parsed[2].find("MADGER_OFFLINE_FRAME ")
            if marker < 0:
                continue
            try:
                latest = json.JSONDecoder().raw_decode(parsed[2][marker + len("MADGER_OFFLINE_FRAME "):])[0]
            except ValueError as error:
                raise AssertionError("Malformed latest frame telemetry") from error
            # Newest complete proof only; never fall back past a rejected frame.
            break
        if latest is None:
            return None
        calibration = self.clock_calibration
        now = calibration["android_ms"] + (time.monotonic() - calibration["host_mid_s"]) * 1000
        uncertainty = calibration["rtt_ms"] / 2
        state = self.validate_frame(latest, now - uncertainty, now + uncertainty)
        self.last_observation = {"phase": latest["current"]["mode"], "hud": state,
            "run_id": latest["current"]["runId"], "elapsed_s": round(time.monotonic() - self.started, 3),
            "source": "app-PID scoped native post-draw log telemetry (not accessibility HUD)",
            "hint": latest["current"].get("hint"),
            "proof": latest, "age_upper_ms": round(now + uncertainty - latest["observedAt"], 3)}
        return state

    def tap(self, label, timeout=20):
        if label in ("LEFT", "RIGHT", "JUMP", "BURROW", "Pause expedition"):
            self.hud()
            self.require_running_observation(self.last_observation, "Cached-control input")
            run_id = self.last_observation["run_id"]
            if not self.control_bounds or self.control_run_id not in (None, run_id):
                # Refresh only after a layout/run transition. Geometry comes
                # from actual visible Android XML, never guessed coordinates.
                self.tree()
                self.hud()
                self.require_running_observation(self.last_observation, "Control layout refresh")
            if label not in self.control_bounds:
                raise AssertionError(f"Visible gameplay control missing: {label}")
            self.control_run_id = self.last_observation["run_id"]
            x1, y1, x2, y2 = self.control_bounds[label]
            self.timed("click:" + label, lambda: self.device.click((x1+x2)//2, (y1+y2)//2))
            return
        bounds, _ = self.wait_label(label, timeout, clickable=True)
        x1, y1, x2, y2 = bounds
        self.timed("click:" + label, lambda: self.device.click((x1+x2)//2, (y1+y2)//2))

    def hud(self):
        state = self.read_frame()
        if state is None:
            self.last_observation = {"phase": "unobserved", "hud": None,
                "source": "no fresh native post-draw telemetry"}
        return state

    def wait_hud(self, predicate, description, timeout=8):
        deadline = time.monotonic() + timeout
        last = None
        while time.monotonic() < deadline:
            last = self.hud()
            if last and predicate(last):
                return last
            time.sleep(.06)
        raise AssertionError(f"Observed post-draw frame did not show {description}; last state: {last}; observation: {self.last_observation}")

    def wait_startup_frame(self, expected_phase, timeout=45):
        """Allow bounded renderer initialization, never stale/live-state grace.

        The renderer's own startup guard is 45 s. No gameplay is resumed here;
        once a proof exists, read_frame applies the same two-second freshness,
        exact current/rendered identity and future-timestamp checks as always.
        """
        deadline = time.monotonic() + timeout
        self.report.setdefault("startup_frame_waits", []).append({
            "expected_phase": expected_phase, "timeout_s": timeout,
            "started_s": round(time.monotonic() - self.started, 3)})
        record = self.report["startup_frame_waits"][-1]
        while time.monotonic() < deadline:
            state = self.hud()
            if state is not None and self.last_observation["phase"] == expected_phase:
                record["completed_s"] = round(time.monotonic() - self.started, 3)
                record["observation"] = self.last_observation
                return state
            time.sleep(.06)
        raise AssertionError(f"Renderer startup produced no valid {expected_phase} frame within {timeout}s")

    def capture(self, name, require_running=False):
        if require_running:
            return self.capture_running_window(name, [name], [.55])[0]
        image = self.timed("screenshot:uiautomator:" + name, self.device.screenshot).convert("RGB")
        image.save(OUT / f"{name}.png")
        xml, _, _ = self.tree()
        (OUT / f"{name}.xml").write_text(xml, encoding="utf-8")
        return image

    def capture_adb_png(self, name):
        command = [os.environ.get("ADB", "adb"), "-s", self.serial, "exec-out", "screencap", "-p"]
        result = self.timed("screenshot:adb:" + name, lambda: subprocess.run(command, capture_output=True, check=True, timeout=30))
        return result.stdout

    def capture_adb_raw(self, name):
        command = [os.environ.get("ADB", "adb"), "-s", self.serial, "exec-out", "screencap"]
        result = self.timed("screenshot:adb-raw:" + name, lambda: subprocess.run(
            command, capture_output=True, check=True, timeout=30))
        return result.stdout

    @staticmethod
    def raw_screencap_png(raw):
        """Decode exact Android raw layouts; never guess offsets or silently retry."""
        import struct
        from PIL import Image
        if len(raw) < 12:
            raise AssertionError("Truncated raw screencap header")
        width, height, pixel_format = struct.unpack_from("<III", raw)
        formats = {1: ("RGBA", 4), 2: ("RGBX", 4), 3: ("RGB", 3),
                   4: ("BGR;16", 2), 5: ("BGRA", 4)}
        if not 0 < width <= 8192 or not 0 < height <= 8192 or pixel_format not in formats:
            raise AssertionError("Unsupported raw screencap dimensions or pixel format")
        mode, size = formats[pixel_format]
        header = len(raw) - width * height * size
        if header not in (12, 16):
            raise AssertionError("Unexpected raw screencap payload size")
        image = Image.frombytes("RGBA" if pixel_format in (1, 5) else "RGB",
                                (width, height), raw[header:], "raw", mode).convert("RGB")
        output = io.BytesIO()
        image.save(output, format="PNG")
        return output.getvalue()

    def capture_adb(self, name):
        from PIL import Image
        png = self.capture_adb_png(name)
        (OUT / f"{name}.png").write_bytes(png)
        return Image.open(io.BytesIO(png)).convert("RGB")

    @staticmethod
    def require_running_observation(observation, context):
        hud = observation.get("hud") if observation else None
        if not observation or observation.get("phase") != "running" or not hud or any(
                key not in hud for key in ("distance_m", "lane", "action", "route", "score")):
            raise AssertionError(f"{context} must show a running phase and complete HUD; observed {observation}")

    def capture_running_window(self, name, frame_names, quiet_waits, targeted=False):
        """Bracket untouched gameplay with explicit phase/HUD observations.

        No UI input, hierarchy scans, or PNG decoding occur between endpoints.
        Paused runs cannot resume themselves, so either non-running endpoint
        rejects the entire window. A later phase never labels an earlier PNG.
        Raw ADB captures may still add graphics load; they are not free probes.
        """
        from PIL import Image
        if not frame_names or len(frame_names) != len(quiet_waits):
            raise ValueError("Each motion frame requires an explicit preceding quiet wait")
        raw_capture = os.environ.get("MADGER_ANDROID_RAW_CAPTURE") == "1"
        window = {"frames": list(frame_names), "quiet_waits_s": list(quiet_waits),
                  "capture_method": "adb exec-out screencap" if raw_capture else "adb exec-out screencap -p",
                  "phase_and_progress_passed": False}
        self.report.setdefault("motion_windows", {})[name] = window
        if targeted:
            self.hud()
            (OUT / f"{name}-before.json").write_text(json.dumps(self.last_observation, indent=2), encoding="utf-8")
        else:
            xml, _, _ = self.tree()
            (OUT / f"{name}-before.xml").write_text(xml, encoding="utf-8")
        window["before"] = self.last_observation
        self.require_running_observation(window["before"], f"Motion window {name} start")
        raw_frames = []
        window["sampling_start_s"] = round(time.monotonic() - self.started, 3)
        try:
            for frame_name, delay in zip(frame_names, quiet_waits):
                if delay:
                    time.sleep(delay)
                raw_frames.append((frame_name, self.capture_adb_raw(frame_name) if raw_capture else self.capture_adb_png(frame_name)))
            window["sampling_end_s"] = round(time.monotonic() - self.started, 3)
            if targeted:
                self.hud()
                (OUT / f"{name}-after.json").write_text(json.dumps(self.last_observation, indent=2), encoding="utf-8")
            else:
                xml, _, _ = self.tree()
                (OUT / f"{name}-after.xml").write_text(xml, encoding="utf-8")
            window["after"] = self.last_observation
        finally:
            # Preserve raw evidence even if the final observation or capture fails.
            # Encoding/decoding and image analysis stay outside the sampled window.
            for index, (frame_name, data) in enumerate(raw_frames):
                if raw_capture:
                    (OUT / f"{frame_name}.raw").write_bytes(data)
                    data = self.raw_screencap_png(data)
                    raw_frames[index] = (frame_name, data)
                (OUT / f"{frame_name}.png").write_bytes(data)
        self.require_running_observation(window["after"], f"Motion window {name} end")
        progress = window["after"]["hud"]["distance_m"] - window["before"]["hud"]["distance_m"]
        window["distance_delta_m"] = progress
        if progress <= 0:
            raise AssertionError(f"Motion window {name} did not advance distance: {window['before']} -> {window['after']}")
        window["phase_and_progress_passed"] = True
        return [Image.open(io.BytesIO(png)).convert("RGB") for _, png in raw_frames]

    def startup_diagnostic(self, original_error):
        """One visible resume for evidence only. The caller always rethrows failure."""
        from PIL import ImageChops, ImageStat
        diagnostic = {"original_failure": str(original_error), "resume_attempts": 0,
            "affects_acceptance": False, "quiet_before_resume_s": 3, "quiet_after_resume_s": 4}
        self.report["startup_diagnostic"] = diagnostic
        self.capture("startup-failure")
        diagnostic["initial"] = self.last_observation
        time.sleep(3)
        _, nodes, _ = self.tree()
        diagnostic["before_resume"] = self.last_observation
        found = self.label_node(nodes, "Resume expedition", clickable=True)
        if self.last_observation["phase"] != "paused" or not found:
            diagnostic["outcome"] = "No visible paused Resume button; no diagnostic input performed"
            return
        (x1, y1, x2, y2), _ = found
        diagnostic["resume_attempts"] = 1
        self.timed("click:diagnostic Resume expedition", lambda: self.device.click((x1 + x2) // 2, (y1 + y2) // 2))
        diagnostic["quiet_start_s"] = round(time.monotonic() - self.started, 3)
        time.sleep(4)  # No hierarchy, screenshots, shell calls, or input during this interval.
        diagnostic["quiet_end_s"] = round(time.monotonic() - self.started, 3)
        first = self.capture_adb("startup-quiet-a")
        time.sleep(.55)
        second = self.capture_adb("startup-quiet-b")
        xml, _, _ = self.tree()
        (OUT / "startup-after-quiet.xml").write_text(xml, encoding="utf-8")
        diagnostic["after_capture"] = self.last_observation
        before, after = diagnostic["before_resume"]["hud"], self.last_observation["hud"]
        diagnostic["distance_delta_m"] = after["distance_m"] - before["distance_m"] if before and after else None
        diagnostic["raw_frame_difference"] = round(sum(ImageStat.Stat(ImageChops.difference(self.game_crop(first), self.game_crop(second))).mean) / 3, 3)
        diagnostic["outcome"] = "Paused again at observation after one resume and a quiet interval" if self.last_observation["phase"] == "paused" else "Observed " + self.last_observation["phase"] + " after one resume and a quiet interval"
        diagnostic["interpretation_limit"] = "Raw captures can add load and their phase is not bracketed; these frames never satisfy the motion gate. RPC durations do not prove RAF blocking. Original failure is preserved."

    @staticmethod
    def game_crop(image):
        width, height = image.size
        # Excludes the HUD, most transient banners, Android bars, and controls.
        return image.crop((int(width * .10), int(height * .46), int(width * .90), int(height * .78))).resize((240, 160))

    def rendered(self, name, image):
        from PIL import ImageStat
        crop = self.game_crop(image)
        variation = max(ImageStat.Stat(crop).stddev)
        colors = len(set(tuple(channel // 16 for channel in pixel) for pixel in crop.getdata()))
        self.report["frames"][name] = {"rgb_stddev_max": round(variation, 3), "quantized_colors": colors,
                                        "image": f"{name}.png", "roi": [.10, .46, .90, .78]}
        if variation < 4 or colors < 18:
            raise AssertionError(f"Game field appears blank/flat in {name}: stddev={variation:.2f}, colors={colors}")

    def launch(self, cold=False):
        self.control_bounds = {}
        self.control_run_id = None
        if cold:
            self.adb("shell", "am", "force-stop", PACKAGE)
        self.adb("shell", "am", "start", "-W", "-n", self.component)
        self.current_pids = set(self.adb("shell", "pidof", PACKAGE, check=False).split())
        self.pids.update(self.current_pids)
        self.calibrate_android_clock()

    def paused_state(self, name, cold_startup=False):
        self.wait_label("Your run is safe.")
        self.wait_label("Recovery point saved on this device.", timeout=15)
        before = (self.wait_startup_frame("paused") if cold_startup else
                  self.wait_hud(lambda _: self.last_observation["phase"] == "paused", "paused run"))
        time.sleep(.8)
        after = self.hud()
        if before != after:
            raise AssertionError(f"Run changed while paused: {before} -> {after}")
        self.report["states"][name] = after
        self.capture(name)
        return after

    def run(self):
        import uiautomator2 as u2
        from PIL import ImageChops, ImageStat
        if not self.serial:
            available = [line.split()[0] for line in self.adb("devices").splitlines()[1:] if line.endswith("\tdevice")]
            if len(available) != 1:
                raise AssertionError(f"Expected one adb device; set MADGER_ANDROID_SERIAL. Found: {available}")
            self.serial = available[0]
        self.report["serial"] = self.serial
        self.report["android_version"] = self.adb("shell", "getprop", "ro.build.version.release")
        self.report["display_size"] = self.adb("shell", "wm", "size")
        self.report["display_density"] = self.adb("shell", "wm", "density")
        if os.environ.get("MADGER_ANDROID_SKIP_INSTALL") != "1":
            if not APK.is_file():
                raise AssertionError(f"APK not found: {APK}. Set MADGER_ANDROID_APK or MADGER_ANDROID_SKIP_INSTALL=1.")
            self.report["apk"] = str(APK.resolve())
            checksum = hashlib.sha256()
            with APK.open("rb") as stream:
                for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                    checksum.update(chunk)
            self.report["apk_sha256"] = checksum.hexdigest()
            result = self.adb("install", "-r", str(APK), timeout=180)
            if "Success" not in result:
                raise AssertionError(f"APK installation was not successful: {result}")
        if os.environ.get("MADGER_ANDROID_RESET") == "1":
            if "Success" not in self.adb("shell", "pm", "clear", PACKAGE):
                raise AssertionError("Explicit test-data reset failed")
        resolved = self.adb("shell", "cmd", "package", "resolve-activity", "--brief", "-a", "android.intent.action.MAIN", "-c", "android.intent.category.LAUNCHER", PACKAGE)
        self.component = next((line.strip() for line in reversed(resolved.splitlines()) if line.startswith(PACKAGE + "/")), None)
        if not self.component:
            raise AssertionError(f"No launcher activity for {PACKAGE}: {resolved}")
        self.device = u2.connect(self.serial)
        self.device.jsonrpc.setConfigurator({"waitForIdleTimeout": 0, "waitForSelectorTimeout": 0})
        self.log_file = (OUT / "logcat.txt").open("w", encoding="utf-8")
        self.log = subprocess.Popen([os.environ.get("ADB", "adb"), "-s", self.serial, "logcat", "-v", "threadtime", "-T", "1"], stdout=self.log_file, stderr=subprocess.STDOUT)
        self.launch(cold=True)
        self.wait_label(ENTRY, timeout=60)
        self.capture("01-home")
        _, _, launch_labels = self.tree()
        if "Play Burrow Run" in launch_labels or "Keep digging." in launch_labels:
            raise AssertionError("Cold launch exposed the archived Home instead of the 3D Expedition")
        self.wait_label("Classic games", clickable=True)
        self.mark("Cold launch opens the 3D Expedition lobby directly")
        self.capture("02-expedition-ready")
        self.tap("Start expedition")
        try:
            initial = self.wait_hud(lambda state: self.last_observation["phase"] == "running" and state["distance_m"] >= 2, "running distance after countdown", timeout=12)
        except Exception as original_error:
            try:
                self.startup_diagnostic(original_error)
            except Exception as diagnostic_error:
                self.report.setdefault("startup_diagnostic", {})["diagnostic_error"] = str(diagnostic_error)
            raise
        frame_names = ["03-running-a", "04-running-b", "04-sustained-motion-1", "04-sustained-motion-2"]
        motion_frames = self.capture_running_window("initial-running", frame_names, [0, .55, .4, .4], targeted=True)
        for name, image in zip(frame_names, motion_frames):
            self.rendered(name, image)
        first, second = motion_frames[:2]
        movement = sum(ImageStat.Stat(ImageChops.difference(self.game_crop(first), self.game_crop(second))).mean) / 3
        self.report["frames"]["motion_mean_difference"] = round(movement, 3)
        if movement < .8:
            # Diagnose slow GPU presentation or screenshot-layer caching without
            # accepting a failed motion check or changing the expected threshold.
            samples = []
            previous = second
            for index in range(3):
                time.sleep(1)
                name = f"motion-diagnostic-{index + 1}"
                direct = self.capture_adb(name + "-adb")
                automation = self.capture(name + "-automation")
                samples.append({"elapsed_s": round(time.monotonic() - self.started, 3),
                    "hud": self.hud(),
                    "adb_motion_from_previous": round(sum(ImageStat.Stat(ImageChops.difference(self.game_crop(previous), self.game_crop(direct))).mean) / 3, 3),
                    "capture_method_difference": round(sum(ImageStat.Stat(ImageChops.difference(self.game_crop(direct), self.game_crop(automation))).mean) / 3, 3),
                    "adb_image": name + "-adb.png", "automation_image": name + "-automation.png"})
                previous = direct
            self.report["motion_diagnostics"] = samples
            raise AssertionError(f"3D game field did not visibly animate: mean pixel change={movement:.3f}")
        self.report["sustained_motion_differences"] = [round(movement, 3)]
        for index, next_frame in enumerate(motion_frames[2:]):
            difference = sum(ImageStat.Stat(ImageChops.difference(self.game_crop(second), self.game_crop(next_frame))).mean) / 3
            self.report["sustained_motion_differences"].append(round(difference, 3))
            if difference < .8:
                raise AssertionError(f"3D presentation stopped during sustained motion: mean pixel change={difference:.3f}")
            second = next_frame
        self.mark("3D game field renders nonblank geometry and animates", initial_state=initial)

        self.tap("LEFT")
        approach = self.wait_hud(lambda state: state["lane"] == -1, "live left approach")
        if approach["route"] != "main" or approach["distance_m"] >= 140:
            raise AssertionError(f"Rootway steering was not observed before the junction: {approach}")
        selected = self.wait_hud(lambda state: state['route'] == 'rootway', 'live Rootway branch', timeout=30)
        if selected["distance_m"] <= approach["distance_m"]:
            raise AssertionError("Live route selection did not preserve forward progress")
        self.mark("Live steering selects Rootway before the junction without a fork menu")
        # The fork recenters the runner. Exercise both directions on this route.
        self.tap("LEFT")
        self.wait_hud(lambda state: state["lane"] == -1, "left lane")
        self.tap("RIGHT")
        self.wait_hud(lambda state: state["lane"] == 0, "return to center lane")
        self.tap("JUMP")
        self.wait_hud(lambda state: state["action"] == "jumping", "jump response", timeout=2)
        self.wait_hud(lambda state: state["action"] == "running", "landing")
        self.tap("BURROW")
        self.wait_hud(lambda state: state["action"] == "burrowing", "burrow response", timeout=2)
        _, _, labels = self.tree()
        charge = next((label for label in labels if re.fullmatch(r"Activate burst, \d+ percent charged", label)), None)
        if not charge:
            raise AssertionError("Burst control and its charge announcement are absent")
        self.report["burst_scope"] = "Control and charge label checked; burst activation is not exercised by this short route."
        self.mark("Left, right, jump, and burrow respond in observed post-draw state", burst_control=charge)

        self.tap("Pause expedition")
        paused = self.paused_state("05-manual-pause")
        self.mark("Manual pause freezes distance, score, lane, and action")
        # Collect the requested real-input Deep scene before process recreation.
        # This changes evidence order only: background/cold recovery below remain
        # mandatory, now comparing the same paused Deep checkpoint end-to-end.
        paused = self.deep_reference_run()
        self.tap("Resume expedition")
        self.wait_hud(lambda state: state["distance_m"] > paused["distance_m"], "progress after resume")
        self.device.press("home")
        time.sleep(1.2)
        self.launch()
        background = self.paused_state("06-background-return")
        self.mark("Backgrounding saves and returns to a paused run")

        self.launch(cold=True)
        # Expedition is the launcher; saved runs must restore without old Home.
        restored = self.paused_state("07-cold-restored", cold_startup=True)
        if background != restored:
            raise AssertionError(f"Cold checkpoint changed: before={background}, restored={restored}")
        self.mark("Force-stop and cold launch restore the same saved run", restored_state=restored)
        self.tap("Resume expedition")
        self.wait_hud(lambda state: state["distance_m"] > restored["distance_m"], "progress after cold restore")
        image = self.capture("08-restored-running", require_running=True)
        self.rendered("08-restored-running", image)
        self.tap("Pause expedition")
        self.paused_state("09-final-paused")
        self.mark("Restored run resumes with a nonblank 3D view")

    @staticmethod
    def visible_road_cue(hint):
        """Parse only player-visible road warnings, never hints about secrets."""
        actions = {
            "LOW ROOT CANOPY": "BURROW", "LOW FLYING DRONE": "BURROW",
            "BROKEN TRAIL": "JUMP", "DEEP MUD": "JUMP",
            "ROLLING BOULDER": "JUMP OR BURST", "SPINNING SAW": "JUMP OR BURST",
            "STEAM VENT": "JUMP OR BURST", "BARRICADE": "JUMP OR BURST",
        }
        if not isinstance(hint, str):
            raise AssertionError("Visible road cue is missing")
        parts = hint.split(" · ")
        if not parts or parts[0] not in actions:
            return None
        if (len(parts) != 3 or parts[1] != actions[parts[0]]
                or not re.fullmatch(r"[1-9][0-9]?m", parts[2])):
            raise AssertionError("Malformed visible road warning: " + hint)
        metres = int(parts[2][:-1])
        if metres > 32:
            raise AssertionError("Road warning exceeds visible approach range: " + hint)
        return {"name": parts[0], "control": "BURROW" if parts[1] == "BURROW" else "JUMP",
                "remaining_m": metres, "visible_text": hint}

    def observed_road_speed(self, observation):
        """Estimate pace only from already validated, genuinely rendered progress."""
        sample = (observation["proof"]["rendered"]["at"], observation["hud"]["distance_m"])
        if not self.road_samples or sample[0] > self.road_samples[-1][0]:
            self.road_samples.append(sample)
        self.road_samples = [old for old in self.road_samples if sample[0] - old[0] <= 1400]
        candidates = [(sample[1] - old[1]) * 1000 / (sample[0] - old[0])
                      for old in self.road_samples
                      if 350 <= sample[0] - old[0] <= 1400 and sample[1] - old[1] >= 3]
        return sorted(candidates)[len(candidates) // 2] if candidates else None

    def observed_cue_closing_speed(self, observation, cue):
        # Moving rockfalls approach faster than the runner. Measure the visible
        # countdown itself when enough matching observations are available.
        at = observation["proof"]["rendered"]["at"]
        row = observation["hud"]["distance_m"] + cue["remaining_m"]
        identity = (observation["run_id"], observation["hud"]["route"], cue["name"])
        sample = (at, cue["remaining_m"], row, identity)
        if not self.road_cue_samples or at > self.road_cue_samples[-1][0]:
            self.road_cue_samples.append(sample)
        self.road_cue_samples = [old for old in self.road_cue_samples if at - old[0] <= 1400]
        rates = [(old[1] - cue["remaining_m"]) * 1000 / (at - old[0])
                 for old in self.road_cue_samples if old[3] == identity
                 and abs(old[2] - row) <= 8 and 350 <= at - old[0] <= 1400
                 and old[1] - cue["remaining_m"] >= 3]
        return sorted(rates)[len(rates) // 2] if rates else None

    @staticmethod
    def observed_jump_time(observation):
        value = observation.get("proof", {}).get("current", {}).get("jumpAt")
        if (isinstance(value, bool) or not isinstance(value, (int, float))
                or not (-float('inf') < value < float('inf'))):
            raise AssertionError("Road JUMP requires genuine jump-event evidence")
        return value

    @staticmethod
    def confirmed_road_response(before, after, control):
        if (not after or after.get("phase") != "running"
                or after.get("run_id") != before.get("run_id")):
            return False
        expected = "burrowing" if control == "BURROW" else "jumping"
        if control == "JUMP":
            # Hurt recoil also raises y. Only a new real jump event can satisfy
            # the input check; no bounce or older jump can substitute for it.
            advanced = Smoke.observed_jump_time(after) > Smoke.observed_jump_time(before)
            return advanced and after.get("hud", {}).get("action") == expected
        return after.get("hud", {}).get("action") == expected

    def respond_to_visible_road_cue(self, observation):
        self.require_running_observation(observation, "Visible road response")
        speed = self.observed_road_speed(observation)
        cue = self.visible_road_cue(observation.get("hint"))
        if cue is None:
            return False
        closing_speed = self.observed_cue_closing_speed(observation, cue)
        speed = closing_speed or speed
        if speed is None:
            return False
        state = observation["hud"]
        row_estimate = state["distance_m"] + cue["remaining_m"]
        if any(response["run_id"] == observation["run_id"]
               and response["route"] == state["route"]
               and response["name"] == cue["name"]
               and abs(response["row_estimate_m"] - row_estimate) <= 4
               for response in self.road_responses):
            return False
        # HUD distances are rounded, and log receipt is later than the frame.
        # Recheck each heartbeat instead of sleeping to a hidden course row.
        frame_age_s = max(0, (observation["age_upper_ms"]
                             - self.clock_calibration["rtt_ms"] / 2) / 1000)
        clicks = [call["duration_ms"] / 1000 for call in self.report["automation_calls"]
                  if call["name"].startswith("click:")][-3:]
        input_s = sorted(clicks)[len(clicks) // 2] if clicks else .1
        lead_s = (.3 if cue["control"] == "BURROW" else .4) + input_s
        remaining_m = cue["remaining_m"] - .5 - speed * frame_age_s
        if remaining_m > speed * lead_s or state["action"] != "running":
            return False
        if remaining_m <= .5:
            raise AssertionError("Visible road warning arrived too late for a verified response: " + cue["visible_text"])
        if cue["control"] == "JUMP":
            self.observed_jump_time(observation)  # Fail closed before sending input.
        response = {**cue, "run_id": observation["run_id"], "route": state["route"],
                    "row_estimate_m": row_estimate, "observed_speed_mps": round(speed, 3),
                    "pace_source": "visible warning countdown" if closing_speed else "rendered distance",
                    "estimated_remaining_m": round(remaining_m, 3),
                    "frame_age_s": round(frame_age_s, 3), "input_budget_s": round(input_s, 3),
                    "before": observation}
        self.road_responses.append(response)
        self.tap(cue["control"])
        expected = "burrowing" if cue["control"] == "BURROW" else "jumping"
        self.wait_hud(lambda _: self.confirmed_road_response(observation, self.last_observation, cue["control"]),
                      "real " + expected + " response to the visible road warning", timeout=2)
        response["after"] = self.last_observation
        self.report.setdefault("visible_road_responses", []).append(response)
        self.mark("Deep visible road response", warning=cue["visible_text"], control=cue["control"],
                  observed_speed_mps=round(speed, 3))
        return True

    def resume_observed_run(self):
        """Confirm an intentional resume before judging later lifecycle pauses.

        Android may return the prior pause dialog immediately after the tap.
        Only fresh, matching current/rendered proof can establish resumed
        gameplay; neither another tap nor a relaxed freshness limit is used.
        """
        before = self.hud()
        observation = self.last_observation
        if not before or observation["phase"] != "paused":
            raise AssertionError("Intentional resume requires an observed paused run")
        run_id = observation["run_id"]
        saw_running = False

        def progressed(state):
            nonlocal saw_running
            current = self.last_observation
            if current["run_id"] != run_id:
                raise AssertionError("Resume changed the observed run identity")
            if current["phase"] == "paused":
                if saw_running:
                    raise AssertionError("Resumed run paused again before verified progress")
                return False
            self.require_running_observation(current, "Intentional resume")
            saw_running = True
            return state["distance_m"] > before["distance_m"]

        self.tap("Resume expedition")
        state = self.wait_hud(progressed, "same-run progress after Resume expedition")
        self.report.setdefault("resume_observations", []).append({
            "before": observation, "after": self.last_observation})
        return run_id, state

    def confirm_no_unexpected_pause(self, run_id):
        """Disambiguate transition-stale XML without resuming a stopped run."""
        state = self.hud()
        current = self.last_observation
        if not state or current.get("run_id") != run_id:
            raise AssertionError("Cannot verify prior run after a visible pause label")
        if current["phase"] == "paused":
            raise AssertionError("Prior run unexpectedly paused while waiting for its normal result")
        self.report.setdefault("stale_pause_labels", []).append(current)

    def deep_reference_run(self):
        """Reach the user's Deep scene with real controls and observed rendered state.

        Finish Rootway normally and replay. Respond only to the genuine visible
        road-hazard cues mirrored in fresh post-draw proof. No course schedule,
        seed access, secret lookup, storage edit or gameplay-state injection.
        """
        prior_run_id, _ = self.resume_observed_run()
        finish_deadline = time.monotonic() + 150
        while time.monotonic() < finish_deadline:
            _, nodes, labels = self.tree()
            if self.label_node(nodes, "Run another expedition", clickable=True):
                break
            choices = ["Take survival supplies",
                       "Reinforced shield. Two blocked hits and longer protection. Gaps still require a jump."]
            choices += [label for label in labels if label.startswith("Choose ") and " risk, " in label]
            for label in choices:
                if self.label_node(nodes, label, clickable=True):
                    self.tap(label)
                    self.mark("Finish prior run through visible choice", choice=label)
                    break
            # Never silently resume an unexpected lifecycle pause.
            if "Your run is safe." in labels:
                self.confirm_no_unexpected_pause(prior_run_id)
            time.sleep(.12)
        else:
            raise AssertionError("Prior Rootway run did not reach a replayable result within 150 seconds")
        self.capture("10-rootway-result")
        self.tap("Run another expedition")
        self.wait_hud(lambda state: self.last_observation["phase"] == "running" and state["distance_m"] >= 2, "replayed game starts", timeout=12)
        self.tree()
        self.wait_hud(lambda state: 110 <= state["distance_m"] < 140,
                      "approach to the main junction", timeout=60)
        self.tap("RIGHT")
        selected = self.wait_hud(lambda state: state["route"] == "deep",
                                 "Deep selected with real RIGHT input", timeout=15)
        self.report["states"]["deep-selected"] = selected
        # The fork recenters naturally. Follow only the visible hazard in this
        # actual lane; random seed, secret positions and course rows are unknown.
        self.road_samples = []
        self.road_cue_samples = []
        self.road_responses = []
        deadline = time.monotonic() + 90
        while time.monotonic() < deadline:
            self.hud()
            observation = self.last_observation
            self.require_running_observation(observation, "Deep approach")
            state = observation["hud"]
            if state["route"] != "deep":
                raise AssertionError(f"Left Deep before reference capture: {state}")
            if not isinstance(observation.get("hint"), str):
                raise AssertionError("Deep progression requires the real visible road cue in post-draw proof")
            if state["distance_m"] >= 353:
                break
            self.respond_to_visible_road_cue(observation)
            time.sleep(.06)
        else:
            raise AssertionError("Deep did not reach the reference distance through real gameplay")
        frames = self.capture_running_window("deep-reference", ["12-deep-reference-353m"], [0], targeted=True)
        window = self.report["motion_windows"]["deep-reference"]
        for endpoint in ("before", "after"):
            state = window[endpoint]["hud"]
            if state["route"] != "deep" or not 353 <= state["distance_m"] <= 380:
                raise AssertionError(f"Deep screenshot not near the user's 353 m scene: {state}")
        self.rendered("12-deep-reference-353m", frames[0])
        self.tap("Pause expedition")
        paused = self.paused_state("13-deep-reference-paused")
        self.mark("Real-input Deep run captured near the user's 353 m reference; left safely paused")
        return paused

    def finish(self):
        if self.log:
            premature_exit = self.log.poll()
            if premature_exit is not None:
                self.report["errors"].append(f"Logcat collector exited before validation completed: {premature_exit}")
            self.log.terminate()
            try:
                self.log.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.log.kill()
                self.log.wait(timeout=5)
        if self.log_file:
            self.log_file.close()
        log_path = OUT / "logcat.txt"
        if log_path.exists():
            lines = log_path.read_text(encoding="utf-8", errors="replace").splitlines()
            metrics = []
            for line in lines:
                marker = line.find("MADGER_EXPEDITION_RENDER ")
                if marker >= 0:
                    try:
                        metrics.append(json.JSONDecoder().raw_decode(line[marker + len("MADGER_EXPEDITION_RENDER "):])[0])
                    except ValueError:
                        pass  # The complete unmodified line remains in logcat.txt.
            self.report["render_metrics"] = metrics
            # Nonblank animation is insufficient: prove actual authored PBR draws
            # from the app-scoped offline Android host, not another log source.
            authored = []
            for line in lines:
                parsed = re.match(r"\d\d-\d\d\s+[\d:.]+\s+(\d+)\s+\d+\s+I\s+MadgerOfflineGame\s*:\s*(.*)", line)
                if not parsed or parsed[1] not in self.pids:
                    continue
                marker = parsed[2].find("MADGER_OFFLINE_RENDER ")
                if marker < 0:
                    continue
                try:
                    proof = json.JSONDecoder().raw_decode(parsed[2][marker + len("MADGER_OFFLINE_RENDER "):])[0]
                except ValueError:
                    continue
                if isinstance(proof, dict) and proof.get("renderer") == "pbr" and proof.get("madgerRig") == "authored-3d":
                    authored.append(proof)
            self.report["authored_pbr_render_metrics"] = authored
            if not authored:
                self.report["errors"].append("Missing app-scoped MadgerOfflineGame authored-3d PBR render proof")
            if not any(proof.get("route") == "deep" and isinstance(proof.get("distance"), (int, float))
                       and 350 <= proof["distance"] <= 380 for proof in authored):
                self.report["errors"].append("Missing authored PBR Deep render proof near the reference scene")
            if not lines:
                self.report["errors"].append("Logcat capture is empty; native/JavaScript crash checks lack evidence")
            for line in lines:
                process = re.search(r"Process: " + re.escape(PACKAGE) + r", PID: (\d+)", line)
                if process:
                    self.pids.add(process[1])
            crashes = []
            for line in lines:
                # ActivityManager reports ANRs from its own PID, not the app's.
                if re.search(r"\bANR in " + re.escape(PACKAGE) + r"(?=\s|[:(]|$)", line):
                    crashes.append(line)
                    continue
                parsed = re.match(r"\d\d-\d\d\s+[\d:.]+\s+(\d+)\s+\d+\s+([VDIWEF])\s+([^:]+):\s*(.*)", line)
                if not parsed or parsed[1] not in self.pids:
                    continue
                level, tag, message = parsed[2], parsed[3].strip(), parsed[4]
                if (tag == "ReactNativeJS" and level in ("E", "F")) or (tag == "MadgerOfflineGame" and re.match(r"ERROR:|.*MADGER_RENDER_FRAME_ERROR", message)) or re.search(r"FATAL EXCEPTION|Fatal signal|JavascriptException|Unhandled JS Exception", message, re.I):
                    crashes.append(line)
            self.report["application_pids"] = sorted(self.pids)
            self.report["performance_lines"] = [line for line in lines if re.search(r"EGL_emulation.*app_time_stats|Choreographer.*Skipped|EXGL.*EGL error|EGL_BAD_MATCH|MADGER_EXPEDITION_FRAME_STALL", line)][-160:]
            if not self.pids:
                self.report["errors"].append("No application PID was observed for scoped native/JavaScript crash checks")
            self.report["crash_lines"] = crashes[:100]
            if crashes:
                self.report["errors"].append("Native/JavaScript error or app ANR lines detected in logcat")
        self.report["status"] = "failed" if self.report["errors"] else "passed"
        self.report["duration_s"] = round(time.monotonic() - self.started, 3)
        self.report["completed_utc"] = datetime.now(timezone.utc).isoformat()
        (OUT / "report.json").write_text(json.dumps(self.report, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"status": self.report["status"], "report": str(OUT / "report.json"), "errors": self.report["errors"]}), flush=True)


def self_test_frame_observer():
    """Offline contract tests; these never substitute for Android/pixel QA."""
    import copy
    import tempfile
    from unittest.mock import patch
    snapshot = {"runId": "test-run", "mode": "running", "distance_m": 353,
                "lane": 1, "action": "burrowing", "route": "deep", "score": 2825}
    proof = {"observedAt": 100000, "rendered": {"at": 99950, **snapshot}, "current": snapshot}
    Smoke.validate_frame(proof, 100000, 100050)
    checks = 1
    def rejects(candidate):
        nonlocal checks
        try:
            Smoke.validate_frame(candidate, 100000, 100050)
        except AssertionError:
            checks += 1
            return
        raise AssertionError(f"Invalid frame accepted: {candidate}")
    for kind in ("stale-heartbeat", "stale-render", "future-heartbeat", "future-render", "mismatch", "missing", "nan"):
        bad = copy.deepcopy(proof)
        if kind == "stale-heartbeat": bad["observedAt"] = 97000; bad["rendered"]["at"] = 96950
        if kind == "stale-render": bad["rendered"]["at"] = 97000
        if kind == "future-heartbeat": bad["observedAt"] = 100100
        if kind == "future-render": bad["rendered"]["at"] = 100010
        if kind == "mismatch": bad["current"]["distance_m"] += 1
        if kind == "missing": del bad["rendered"]["action"]
        if kind == "nan": bad["observedAt"] = float('nan')
        rejects(bad)
    paused = copy.deepcopy(proof)
    paused["current"]["mode"] = paused["rendered"]["mode"] = "paused"
    paused["rendered"]["at"] = 1
    Smoke.validate_frame(paused, 100000, 100050); checks += 1
    paused["current"]["score"] += 1
    rejects(paused)
    # Parse real threadtime-shaped records; only exact current PID/tag counts.
    global OUT
    previous_out = OUT
    try:
        with tempfile.TemporaryDirectory() as directory:
            OUT = Path(directory)
            smoke = Smoke()
            smoke.current_pids = {"123"}
            smoke.clock_calibration = {"android_ms": 100000, "host_mid_s": 10, "rtt_ms": 100}
            for pid, tag, present in (("123", "MadgerOfflineGame", True), ("999", "MadgerOfflineGame", False), ("123", "ReactNativeJS", False)):
                (OUT / "logcat.txt").write_text(f"11-02 05:00:00.001 {pid} 456 I {tag}: INFO: MADGER_OFFLINE_FRAME " + json.dumps(proof) + "\n")
                with patch.object(time, "monotonic", return_value=10):
                    state = smoke.read_frame()
                assert (state is not None) == present, (pid, tag)
                checks += 1
            assert "UiSelector" not in (smoke.last_observation or {}).get("source", "")
    finally:
        OUT = previous_out
    smoke = Smoke()
    sequence = iter((None, "running", "paused"))
    def startup_observation():
        phase = next(sequence)
        smoke.last_observation = {"phase": phase, "hud": snapshot}
        return None if phase is None else snapshot
    with patch.object(smoke, "hud", side_effect=startup_observation), patch.object(time, "sleep"):
        assert smoke.wait_startup_frame("paused") == snapshot
        assert smoke.last_observation["phase"] == "paused"
    checks += 1
    smoke = Smoke()
    with patch.object(smoke, "hud", side_effect=AssertionError("stale")):
        try:
            smoke.wait_startup_frame("paused")
        except AssertionError as error:
            assert str(error) == "stale"
        else:
            raise AssertionError("Startup wait swallowed freshness failure")
    checks += 1
    smoke = Smoke()
    with patch.object(time, "monotonic", side_effect=(0, 0, 46)):
        try:
            smoke.wait_startup_frame("paused")
        except AssertionError as error:
            assert "within 45s" in str(error)
        else:
            raise AssertionError("Startup wait exceeded its bound")
    checks += 1
    # The road driver consumes the same generated player-facing cue mirrored
    # in strict post-draw proof. These fixtures test policy, never native success.
    cue_proof = copy.deepcopy(proof)
    cue_proof["current"]["hint"] = cue_proof["rendered"]["hint"] = "BROKEN TRAIL · JUMP · 12m"
    Smoke.validate_frame(cue_proof, 100000, 100050); checks += 1
    bad = copy.deepcopy(cue_proof); bad["rendered"]["hint"] = "LOW ROOT CANOPY · BURROW · 12m"; rejects(bad)
    bad = copy.deepcopy(cue_proof); del bad["rendered"]["hint"]; rejects(bad)
    bad = copy.deepcopy(cue_proof); bad["rendered"]["hint"] = bad["current"]["hint"] = 12; rejects(bad)
    visible_actions = {
        "LOW ROOT CANOPY": "BURROW", "LOW FLYING DRONE": "BURROW",
        "BROKEN TRAIL": "JUMP", "DEEP MUD": "JUMP",
        "ROLLING BOULDER": "JUMP OR BURST", "SPINNING SAW": "JUMP OR BURST",
        "STEAM VENT": "JUMP OR BURST", "BARRICADE": "JUMP OR BURST",
    }
    for name, action in visible_actions.items():
        cue = Smoke.visible_road_cue(f"{name} · {action} · 12m")
        assert cue["control"] == ("BURROW" if action == "BURROW" else "JUMP")
        assert cue["remaining_m"] == 12; checks += 1
    for hint in ("FRESH CLAW MARKS UNDER THE BANK", "A SEALED CACHE HUMS WITH BURST ENERGY",
                 "RAISED TREASURE 12m · LEFT + JUMP · CENTRE ROAD IS SAFE",
                 "LIVE FORK 12m · STEER LEFT / MIDDLE / RIGHT", ""):
        assert Smoke.visible_road_cue(hint) is None; checks += 1
    for hint in (None, "LOW ROOT CANOPY · JUMP · 12m", "BROKEN TRAIL · JUMP · 0m",
                 "BROKEN TRAIL · JUMP · 33m", "BROKEN TRAIL · JUMP · 1.5m"):
        try:
            Smoke.visible_road_cue(hint)
        except AssertionError:
            checks += 1
        else:
            raise AssertionError("Invalid warning accepted: " + str(hint))
    def road_observation(hint, distance=198):
        return {"phase": "running", "run_id": "real-observed-run", "hint": hint,
                "hud": {"distance_m": distance, "lane": 0, "action": "running", "route": "deep", "score": 100},
                "age_upper_ms": 100, "proof": {"rendered": {"at": 100000, "jumpAt": -100},
                                                 "current": {"jumpAt": -100}}}
    for control, hint in (("JUMP", "BROKEN TRAIL · JUMP · 6m"),
                          ("BURROW", "LOW ROOT CANOPY · BURROW · 5m")):
        smoke = Smoke(); smoke.clock_calibration = {"rtt_ms": 0}
        smoke.road_samples = [(99000, 186), (99500, 192)]
        observation = road_observation(hint)
        with patch.object(smoke, "tap") as tap, patch.object(smoke, "wait_hud") as wait:
            assert smoke.respond_to_visible_road_cue(observation)
            tap.assert_called_once_with(control); wait.assert_called_once()
            assert not smoke.respond_to_visible_road_cue(observation)
            tap.assert_called_once(); checks += 2
    smoke = Smoke(); smoke.clock_calibration = {"rtt_ms": 0}
    smoke.road_samples = [(99000, 186), (99500, 192)]
    with patch.object(smoke, "tap") as tap:
        assert not smoke.respond_to_visible_road_cue(road_observation("BROKEN TRAIL · JUMP · 20m"))
        assert not smoke.respond_to_visible_road_cue(road_observation("FRESH CLAW MARKS UNDER THE BANK"))
        tap.assert_not_called(); checks += 2
    moving = Smoke()
    earlier = road_observation("ROLLING BOULDER · JUMP OR BURST · 22m", 186)
    earlier["proof"]["rendered"]["at"] = 99000
    later = road_observation("ROLLING BOULDER · JUMP OR BURST · 8m", 198)
    assert moving.observed_cue_closing_speed(earlier, moving.visible_road_cue(earlier["hint"])) is None
    assert moving.observed_cue_closing_speed(later, moving.visible_road_cue(later["hint"])) == 14
    checks += 2
    observation = road_observation("BROKEN TRAIL · JUMP · 6m"); observation["phase"] = "paused"
    try:
        smoke.respond_to_visible_road_cue(observation)
    except AssertionError:
        checks += 1
    else:
        raise AssertionError("Road driver silently resumed a paused game")
    with patch.object(smoke, "tap", side_effect=AssertionError("stale input proof")):
        try:
            smoke.respond_to_visible_road_cue(road_observation("BROKEN TRAIL · JUMP · 6m"))
        except AssertionError as error:
            assert str(error) == "stale input proof"; checks += 1
        else:
            raise AssertionError("Road driver swallowed native input failure")
    jump_proof = copy.deepcopy(proof)
    jump_proof["current"]["jumpAt"] = jump_proof["rendered"]["jumpAt"] = -100
    Smoke.validate_frame(jump_proof, 100000, 100050); checks += 1
    for bad_value in (None, True, float('nan'), float('inf'), "10"):
        bad = copy.deepcopy(jump_proof)
        bad["current"]["jumpAt"] = bad["rendered"]["jumpAt"] = bad_value
        rejects(bad)
    bad = copy.deepcopy(jump_proof); bad["current"]["jumpAt"] = 10; rejects(bad)
    bad = copy.deepcopy(jump_proof); del bad["rendered"]["jumpAt"]; rejects(bad)
    before = road_observation("BROKEN TRAIL · JUMP · 6m")
    bounce = copy.deepcopy(before); bounce["hud"]["action"] = "jumping"
    assert not Smoke.confirmed_road_response(before, bounce, "JUMP"); checks += 1
    actual_jump = copy.deepcopy(bounce); actual_jump["proof"]["current"]["jumpAt"] = 20
    assert Smoke.confirmed_road_response(before, actual_jump, "JUMP"); checks += 1
    actual_jump["run_id"] = "different-run"
    assert not Smoke.confirmed_road_response(before, actual_jump, "JUMP"); checks += 1
    for record in (before, bounce):
        missing = copy.deepcopy(record); del missing["proof"]["current"]["jumpAt"]
        try:
            Smoke.confirmed_road_response(missing if record is before else before,
                                          missing if record is bounce else bounce, "JUMP")
        except AssertionError:
            checks += 1
        else:
            raise AssertionError("Road jump accepted missing jump-event evidence")
    print(f"{checks} post-draw observer contract tests passed (not native acceptance)")
    return 0


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    smoke = Smoke()
    try:
        smoke.run()
    except Exception as error:
        smoke.report["errors"].append(f"{type(error).__name__}: {error}")
        (OUT / "failure.txt").write_text(traceback.format_exc(), encoding="utf-8")
        if smoke.device:
            try:
                smoke.capture("failure")
            except Exception:
                pass
    finally:
        smoke.finish()
    return 0 if smoke.report["status"] == "passed" else 1


if __name__ == "__main__":
    sys.exit(self_test_frame_observer() if "--self-test-frame-observer" in sys.argv else main())
