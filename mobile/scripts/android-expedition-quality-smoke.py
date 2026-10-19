#!/usr/bin/env python3
"""Select Softer via the real menu, then run the unchanged native acceptance.

Only ready/paused setup is extended. No simulation injection, automatic resume,
threshold adjustment or running-window intervention is permitted.
"""
from pathlib import Path
import importlib.util
import json
import sys

spec = importlib.util.spec_from_file_location("expedition_acceptance", Path(__file__).with_name("android-expedition-smoke.py"))
acceptance = importlib.util.module_from_spec(spec)
spec.loader.exec_module(acceptance)
BaseSmoke = acceptance.Smoke


class SofterSmoke(BaseSmoke):
    def __init__(self):
        super().__init__()
        self.report["requested_scene_quality"] = "softer"
        self.report["quality_setup"] = []

    def tap(self, label, timeout=20):
        if label in ("Start expedition", "Resume expedition"):
            _, _, labels = self.tree()
            sharp, softer = "Scene quality: Sharp", "Scene quality: Softer"
            if label == "Start expedition" and sharp not in labels:
                raise AssertionError("Fresh screen must default to full-resolution Sharp")
            before = "sharp" if sharp in labels else "softer" if softer in labels else "missing"
            if before == "missing":
                raise AssertionError("Scene quality menu setting is absent before " + label)
            if before == "sharp":
                super().tap(sharp, timeout)
                self.wait_label(softer, timeout=5)
                self.capture("quality-selection-" + str(len(self.report["quality_setup"]) + 1))
            self.report["quality_setup"].append({"before_action": label, "before": before, "selected": "softer"})
        return super().tap(label, timeout)

    def finish(self):
        super().finish()
        lines = (acceptance.OUT / "logcat.txt").read_text(encoding="utf-8", errors="replace").splitlines() if (acceptance.OUT / "logcat.txt").exists() else []
        renders = []
        for line in lines:
            marker = "MADGER_EXPEDITION_RENDER "
            if marker in line:
                try:
                    renders.append(json.loads(line.split(marker, 1)[1]))
                except json.JSONDecodeError:
                    pass
        fallback = [line for line in lines if "Low-resolution scene unavailable" in line]
        target_evidence = [render for render in renders if render.get("drawCalls") == 12 and render.get("indexedDrawCalls") == 11]
        self.report["optional_target_evidence"] = {"presentation_draw_observed": bool(target_evidence), "render_samples": renders, "fallback_lines": fallback}
        if fallback:
            self.report["errors"].append("Optional scene target fell back to full resolution")
        if not target_evidence:
            self.report["errors"].append("Optional target activation lacks native presentation-draw evidence")
        if self.report["errors"]:
            self.report["status"] = "failed"
        (acceptance.OUT / "report.json").write_text(json.dumps(self.report, indent=2) + "\n", encoding="utf-8")
        print("OPTIONAL_SCENE_QUALITY " + json.dumps({"status": self.report["status"], "target_observed": bool(target_evidence), "fallback": bool(fallback)}), flush=True)


if __name__ == "__main__":
    acceptance.Smoke = SofterSmoke
    sys.exit(acceptance.main())
