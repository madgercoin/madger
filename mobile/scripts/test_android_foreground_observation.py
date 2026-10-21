"""Regression tests for native HUD freshness: no stale recovery proofs."""
from pathlib import Path
import sys
import time
import unittest

sys.path.insert(0, str(Path(__file__).parent))
from android_foreground_observation import sample_live_pair, sample_live_pair_with_retry


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

    def test_a_stale_attempt_is_discarded_before_fresh_retry(self):
        attempts = [0]
        journal = {}

        def read_timer():
            attempts[0] += 1
            if attempts[0] == 1:
                time.sleep(.35)
            return "39s"

        result = sample_live_pair_with_retry(
            read_timer, lambda: True,
            max_age_seconds=.30, max_attempts=2, journal=journal,
        )
        self.assertEqual(attempts[0], 2)
        self.assertEqual(result["timer"], "39s")
        self.assertEqual(result["pause"], True)
        self.assertEqual(journal["attempts"][0]["status"], "rejected")
        self.assertEqual(journal["attempts"][1]["status"], "fresh")
        self.assertEqual(result["started"], journal["attempts"][1]["started"])
        self.assertLess(result["queries"][0]["finished"] - result["started"], .30)

    def test_non_stale_rpc_failure_is_not_retried(self):
        calls = [0]
        journal = {}

        def bad_timer():
            calls[0] += 1
            raise RuntimeError("accessibility unavailable")

        with self.assertRaisesRegex(AssertionError, "accessibility unavailable"):
            sample_live_pair_with_retry(
                bad_timer, lambda: True, max_attempts=3, journal=journal)
        self.assertEqual(calls[0], 1)
        self.assertEqual(len(journal["attempts"]), 1)
        self.assertEqual(journal["attempts"][0]["status"], "rejected")

    def test_main_script_keeps_two_second_kill_freshness(self):
        main = Path(__file__).with_name("android-preview-smoke.py").read_text()
        self.assertIn("'max_age_seconds': 2.0", main)
        self.assertIn("observation['force_stop_completed'] - started", main)
        self.assertIn("delay <= observation['max_age_seconds']", main)
        self.assertIn("assert active is True", main)


    def sample_xml(self, timer="49s", pause_enabled="true", include_pause=True):
        nodes = [
            f'<node package="com.madgercoin.preview" class="android.widget.TextView" '
            f'text="{timer}" enabled="true" visible-to-user="true" bounds="[418,110][456,147]"/>'
        ]
        if include_pause:
            nodes.append('<node package="com.madgercoin.preview" class="android.widget.Button" '
                         f'content-desc="Pause run" enabled="{pause_enabled}" '
                         'visible-to-user="true" bounds="[412,47][460,95]"/>')
        return "<hierarchy>" + "".join(nodes) + "</hierarchy>"

    def test_real_single_accessibility_snapshot_records_both_required_values(self):
        from android_foreground_observation import sample_live_hierarchy_with_retry
        calls = []
        journal = {}

        def read():
            calls.append("actual-hierarchy-query")
            return self.sample_xml(timer="49s")
        result = sample_live_hierarchy_with_retry(read, package="com.madgercoin.preview", journal=journal)
        self.assertEqual(calls, ["actual-hierarchy-query"])
        self.assertEqual(result["timer"], "49s")
        self.assertIs(result["pause"], True)
        self.assertEqual(len(result["queries"]), 1)
        self.assertEqual(result["queries"][0]["source"], "one actual foreground accessibility snapshot")
        self.assertEqual(journal["attempts"][0]["status"], "fresh")
        self.assertTrue(journal["snapshot_observations"]["same_snapshot"])

    def test_missing_disabled_or_foreign_control_cannot_authorize_kill(self):
        from android_foreground_observation import sample_live_hierarchy
        for data in [
            self.sample_xml(include_pause=False),
            self.sample_xml(pause_enabled="false"),
            self.sample_xml(timer="0s"),
            self.sample_xml(timer="x"),
            self.sample_xml().replace("Pause run", "Resume run"),
            self.sample_xml().replace('package="com.madgercoin.preview"', 'package="another.app"'),
        ]:
            with self.subTest(data=data[:100]):
                with self.assertRaises(AssertionError):
                    sample_live_hierarchy(lambda: data, package="com.madgercoin.preview")

    def test_single_snapshot_still_rejects_a_stale_rpc(self):
        from android_foreground_observation import sample_live_hierarchy
        journal = {}
        def slow():
            time.sleep(.035)
            return self.sample_xml()
        with self.assertRaisesRegex(AssertionError, "Foreground observation became stale"):
            sample_live_hierarchy(slow, package="com.madgercoin.preview", max_age_seconds=.01, journal=journal)
        self.assertIn("error", journal["queries"][0])

    def test_stale_snapshot_retry_is_bounded_and_never_accepts_missing_pause(self):
        from android_foreground_observation import sample_live_hierarchy_with_retry
        count = [0]
        def retry():
            count[0] += 1
            if count[0] == 1:
                time.sleep(.040)
            return self.sample_xml()
        journal={}
        result=sample_live_hierarchy_with_retry(retry,package="com.madgercoin.preview",
                                                 max_age_seconds=.02,journal=journal)
        self.assertEqual(result["timer"],"49s")
        self.assertEqual(count[0],2)
        self.assertEqual([a["status"] for a in journal["attempts"]],["rejected","fresh"])
        count[0]=0
        with self.assertRaisesRegex(AssertionError, "visible enabled Pause"):
            sample_live_hierarchy_with_retry(lambda: self.sample_xml(include_pause=False),
                package="com.madgercoin.preview", max_attempts=2)


if __name__ == "__main__":
    unittest.main()
