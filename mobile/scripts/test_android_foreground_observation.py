"""Regression tests for native HUD freshness: no stale recovery proofs."""
from pathlib import Path
import sys
import time
import unittest

sys.path.insert(0, str(Path(__file__).parent))
from android_foreground_observation import sample_live_pair


class ForegroundObservationTests(unittest.TestCase):
    def test_two_required_live_values_are_recorded(self):
        journal = {}
        result = sample_live_pair(
            lambda: (time.sleep(.02), "47s")[1],
            lambda: (time.sleep(.03), True)[1],
            journal=journal,
        )
        self.assertEqual(result["timer"], "47s")
        self.assertIs(result["pause"], True)
        self.assertEqual(len(result["queries"]), 2)
        self.assertEqual(journal["started"], result["started"])
        self.assertEqual(journal["queries"], result["queries"])
        for item in result["queries"]:
            self.assertLessEqual(result["started"], item["started"])
            self.assertLessEqual(item["started"], item["finished"])
            self.assertLessEqual(item["finished"] - result["started"], 2.0)

    def test_stale_live_values_fail_closed(self):
        journal = {}
        with self.assertRaisesRegex(AssertionError, "Foreground observation became stale"):
            sample_live_pair(
                lambda: (time.sleep(.060), "47s")[1],
                lambda: True,
                max_age_seconds=.005,
                journal=journal,
            )
        self.assertEqual(len(journal["queries"]), 2)
        self.assertGreater(journal["queries"][0]["finished"] - journal["started"], .005)

    def test_missing_control_result_is_not_skipped(self):
        self.assertIs(sample_live_pair(lambda: "47s", lambda: False)["pause"], False)

    def test_rpc_error_fails_and_is_logged(self):
        journal = {}

        def rpc_error():
            raise RuntimeError("accessibility unavailable")

        with self.assertRaisesRegex(AssertionError, "accessibility unavailable"):
            sample_live_pair(lambda: "47s", rpc_error, journal=journal)
        self.assertIn("error", journal["queries"][1])

    def test_main_script_keeps_two_second_kill_freshness(self):
        main = Path(__file__).with_name("android-preview-smoke.py").read_text()
        self.assertIn("'max_age_seconds': 2.0", main)
        self.assertIn("observation['force_stop_completed'] - started", main)
        self.assertIn("delay <= observation['max_age_seconds']", main)
        self.assertIn("assert active is True", main)


if __name__ == "__main__":
    unittest.main()
