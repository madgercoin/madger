#!/usr/bin/env python3
"""Unit checks for the emulator-only launcher ANR guard.

This test imports the real native smoke harness without connecting to an
Android device, and never bypasses a MADGER app crash or UI acceptance gate.
"""
from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest
from xml.etree import ElementTree as ET

HARNESS_PATH = Path(__file__).with_name("android-expedition-smoke.py")
spec = importlib.util.spec_from_file_location("madger_android_expedition_smoke", HARNESS_PATH)
assert spec and spec.loader
harness = importlib.util.module_from_spec(spec)
spec.loader.exec_module(harness)


class FakeDevice:
    def __init__(self):
        self.clicks = []

    def click(self, x, y):
        self.clicks.append((x, y))


def node(text, package="android", resource_id="", bounds="[64,460][415,508]",
         clickable="false", enabled="true"):
    return ET.Element("node", {"text": text, "package": package,
                              "resource-id": resource_id, "bounds": bounds,
                              "clickable": clickable, "enabled": enabled})


def quickstep_dialog():
    return [
        node("Quickstep isn't responding", resource_id="android:id/alertTitle"),
        node("Close app", resource_id="android:id/aerr_close", clickable="true"),
    ]


class QuickstepDialogTests(unittest.TestCase):
    def setUp(self):
        self.smoke = harness.Smoke()
        self.smoke.device = FakeDevice()

    def test_verified_quickstep_dialog_is_dismissed(self):
        self.assertTrue(self.smoke.dismiss_quickstep_anr(quickstep_dialog()))
        self.assertEqual(self.smoke.device.clicks, [(239, 484)])
        self.assertEqual(len(self.smoke.report["system_dialog_dismissals"]), 1)

    def test_game_anr_must_not_be_dismissed(self):
        nodes = [node("MADGER isn't responding", resource_id="android:id/alertTitle"),
                 node("Close app", resource_id="android:id/aerr_close", clickable="true")]
        self.assertFalse(self.smoke.dismiss_quickstep_anr(nodes))
        self.assertEqual(self.smoke.device.clicks, [])

    def test_non_system_title_must_not_be_dismissed(self):
        nodes = quickstep_dialog()
        nodes[0].set("package", "com.madgercoin.expedition.preview")
        self.assertFalse(self.smoke.dismiss_quickstep_anr(nodes))
        self.assertEqual(self.smoke.device.clicks, [])

    def test_unsafe_close_action_fails_closed(self):
        nodes = quickstep_dialog()
        nodes[1].set("resource-id", "not-system-close")
        with self.assertRaisesRegex(AssertionError, "safe system Close app"):
            self.smoke.dismiss_quickstep_anr(nodes)
        self.assertEqual(self.smoke.device.clicks, [])

    def test_repeated_launcher_failures_remain_failures(self):
        nodes = quickstep_dialog()
        self.assertTrue(self.smoke.dismiss_quickstep_anr(nodes))
        self.assertTrue(self.smoke.dismiss_quickstep_anr(nodes))
        with self.assertRaisesRegex(AssertionError, "Repeated Quickstep"):
            self.smoke.dismiss_quickstep_anr(nodes)
        self.assertEqual(len(self.smoke.device.clicks), 2)


if __name__ == "__main__":
    unittest.main()
