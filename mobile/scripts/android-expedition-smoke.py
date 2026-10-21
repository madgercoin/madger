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
ENTRY = "Play the 3D Expedition"
HUD = re.compile(r"Expedition distance (\d+) meters; lane (-?\d); (jumping|burrowing|running); route (main|hollow|grotto|rootway|ridge|deep|mosswalk|root-arch|log-crossing|causeway|watchtower|gearworks|mudslide|crystal-vein|ancient-vault)$")
SCORE = re.compile(r"Current expedition score (\d+)")
ERROR_LABELS = (
    "The 3D view did not start.", "The 3D view needs a restart.",
    "Saved expedition could not be loaded.", "Progress is in memory only.",
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

    def tap(self, label, timeout=20):
        bounds, _ = self.wait_label(label, timeout, clickable=True)
        x1, y1, x2, y2 = bounds
        self.timed("click:" + label, lambda: self.device.click((x1 + x2) // 2, (y1 + y2) // 2))

    def hud(self):
        _, _, labels = self.tree()
        match = next((HUD.search(value) for value in labels if HUD.search(value)), None)
        score = next((SCORE.search(value) for value in labels if SCORE.search(value)), None)
        if not match or not score:
            return None
        return {"distance_m": int(match[1]), "lane": int(match[2]), "action": match[3],
                "route": match[4], "score": int(score[1])}

    def wait_hud(self, predicate, description, timeout=8):
        deadline = time.monotonic() + timeout
        last = None
        while time.monotonic() < deadline:
            last = self.hud()
            if last and predicate(last):
                return last
            time.sleep(.06)
        raise AssertionError(f"HUD did not show {description}; last state: {last}; observation: {self.last_observation}")

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

    def capture_running_window(self, name, frame_names, quiet_waits):
        """Bracket untouched gameplay with explicit phase/HUD observations.

        No UI input, hierarchy scans, or PNG decoding occur between endpoints.
        Paused runs cannot resume themselves, so either non-running endpoint
        rejects the entire window. A later phase never labels an earlier PNG.
        Raw ADB captures may still add graphics load; they are not free probes.
        """
        from PIL import Image
        if not frame_names or len(frame_names) != len(quiet_waits):
            raise ValueError("Each motion frame requires an explicit preceding quiet wait")
        window = {"frames": list(frame_names), "quiet_waits_s": list(quiet_waits),
                  "capture_method": "adb exec-out screencap -p", "phase_and_progress_passed": False}
        self.report.setdefault("motion_windows", {})[name] = window
        xml, _, _ = self.tree()
        window["before"] = self.last_observation
        (OUT / f"{name}-before.xml").write_text(xml, encoding="utf-8")
        self.require_running_observation(window["before"], f"Motion window {name} start")
        raw_frames = []
        window["sampling_start_s"] = round(time.monotonic() - self.started, 3)
        try:
            for frame_name, delay in zip(frame_names, quiet_waits):
                if delay:
                    time.sleep(delay)
                raw_frames.append((frame_name, self.capture_adb_png(frame_name)))
            window["sampling_end_s"] = round(time.monotonic() - self.started, 3)
            xml, _, _ = self.tree()
            window["after"] = self.last_observation
            (OUT / f"{name}-after.xml").write_text(xml, encoding="utf-8")
        finally:
            # Preserve raw evidence even if the final observation or capture fails.
            # Encoding/decoding and image analysis stay outside the sampled window.
            for frame_name, png in raw_frames:
                (OUT / f"{frame_name}.png").write_bytes(png)
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
        if cold:
            self.adb("shell", "am", "force-stop", PACKAGE)
        self.adb("shell", "am", "start", "-W", "-n", self.component)
        self.pids.update(self.adb("shell", "pidof", PACKAGE, check=False).split())

    def paused_state(self, name):
        self.wait_label("Your run is safe.")
        self.wait_label("Recovery point saved on this device.", timeout=15)
        before = self.wait_hud(lambda _: True, "paused run")
        time.sleep(.8)
        after = self.hud()
        if before != after:
            raise AssertionError(f"Run changed while paused: {before} -> {after}")
        self.report["states"][name] = after
        self.capture(name)
        return after

    def manual_pause(self):
        # The real course reaches its first decision at 140m. UI automation
        # can cross that boundary between locating Pause and tapping it.
        # Choose the visible low-risk route, then exercise Pause again.
        clicked = False
        for _ in range(4):
            _, nodes, labels = self.tree()
            if "Your run is safe." in labels:
                if not clicked:
                    raise AssertionError("Run paused before the manual pause input")
                return
            route = "Choose Mossbound Rootway, low risk, Guardian Totems"
            if self.label_node(nodes, route, clickable=True):
                self.tap(route)
                self.wait_hud(lambda s: s['route'] == 'rootway', 'selected Rootway branch')
                self.mark("Selected the visible Rootway branch before testing pause")
            self.tap("Pause expedition")
            clicked = True
        raise AssertionError("Manual pause did not reach the paused screen")

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
        self.wait_label(ENTRY, timeout=45)
        self.capture("01-home")
        self.mark("Home launches and exposes the Expedition entry")
        self.tap(ENTRY)
        self.wait_label("Start expedition", timeout=35)
        self.capture("02-expedition-ready")
        self.tap("Start expedition")
        try:
            initial = self.wait_hud(lambda state: state["distance_m"] >= 2, "running distance after countdown", timeout=12)
        except Exception as original_error:
            try:
                self.startup_diagnostic(original_error)
            except Exception as diagnostic_error:
                self.report.setdefault("startup_diagnostic", {})["diagnostic_error"] = str(diagnostic_error)
            raise
        frame_names = ["03-running-a", "04-running-b", "04-sustained-motion-1", "04-sustained-motion-2"]
        motion_frames = self.capture_running_window("initial-running", frame_names, [0, .55, .4, .4])
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
        self.mark("Left, right, jump, and burrow respond through the visible HUD", burst_control=charge)

        self.manual_pause()
        paused = self.paused_state("05-manual-pause")
        self.mark("Manual pause freezes distance, score, lane, and action")
        self.tap("Resume expedition")
        self.wait_hud(lambda state: state["distance_m"] > paused["distance_m"], "progress after resume")
        self.device.press("home")
        time.sleep(1.2)
        self.launch()
        background = self.paused_state("06-background-return")
        self.mark("Backgrounding saves and returns to a paused run")

        self.launch(cold=True)
        # Android may recreate Home or retain the route. Both must recover safely.
        deadline = time.monotonic() + 35
        while time.monotonic() < deadline:
            _, nodes, labels = self.tree()
            if "Your run is safe." in labels:
                break
            if self.label_node(nodes, ENTRY):
                self.tap(ENTRY)
                break
            time.sleep(.15)
        restored = self.paused_state("07-cold-restored")
        if background != restored:
            raise AssertionError(f"Cold checkpoint changed: before={background}, restored={restored}")
        self.mark("Force-stop and cold launch restore the same saved run", restored_state=restored)
        self.tap("Resume expedition")
        self.wait_hud(lambda state: state["distance_m"] > restored["distance_m"], "progress after cold restore")
        image = self.capture("08-restored-running", require_running=True)
        self.rendered("08-restored-running", image)
        self.manual_pause()
        self.paused_state("09-final-paused")
        self.mark("Restored run resumes with a nonblank 3D view; left safely paused")

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
                if (tag == "ReactNativeJS" and level in ("E", "F")) or re.search(r"FATAL EXCEPTION|Fatal signal|JavascriptException|Unhandled JS Exception", message, re.I):
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
    sys.exit(main())
