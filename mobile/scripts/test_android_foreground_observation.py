"""Regression tests for native HUD freshness: no stale recovery proofs."""
from pathlib import Path
import sys
import time
import unittest

sys.path.insert(0, str(Path(__file__).parent))
from android_foreground_observation import sample_live_pair, sample_live_pair_with_retry, sample_live_snapshot


class ForegroundObservationTests(unittest.TestCase):
    def test_snapshot_retains_both_values_and_start_time(self):
        journal = {}
        result = sample_live_snapshot(lambda: {'timer': '47s', 'pause': True}, journal=journal)
        self.assertEqual((result['timer'], result['pause']), ('47s', True))
        self.assertEqual(result['started'], journal['started'])
        self.assertEqual(len(journal['queries']), 1)

    def test_stale_snapshot_fails_closed(self):
        ticks = iter([1.0, 3.01])
        with self.assertRaisesRegex(AssertionError, 'became stale'):
            sample_live_snapshot(lambda: {'timer': '47s', 'pause': True}, clock=lambda: next(ticks))

    def test_snapshot_observation_failure_is_preserved(self):
        journal = {}
        def missing():
            raise AssertionError('Live Pause control missing')
        with self.assertRaisesRegex(AssertionError, 'Live Pause control missing'):
            sample_live_snapshot(missing, journal=journal)
        self.assertIn('error', journal['queries'][0])

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


if __name__ == "__main__":
    unittest.main()
