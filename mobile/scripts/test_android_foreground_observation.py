"""Regression tests for native HUD freshness: no stale recovery proofs."""
from pathlib import Path
import importlib.util
import sys
import time
import unittest
from unittest.mock import Mock, patch

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


class ExpeditionResumeObservationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location(
            "expedition_resume_harness", Path(__file__).with_name("android-expedition-smoke.py"))
        cls.harness = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.harness)

    def smoke(self, frames):
        smoke = self.harness.Smoke()
        sequence = iter(frames)
        smoke.clicks = []
        smoke.tap = smoke.clicks.append
        def hud():
            frame = next(sequence)
            if isinstance(frame, Exception):
                raise frame
            phase, distance, run_id = frame
            state = {"distance_m": distance, "lane": 0, "action": "running",
                     "route": "rootway", "score": 350}
            smoke.last_observation = {"phase": phase, "hud": state, "run_id": run_id}
            return state
        smoke.hud = hud
        return smoke

    def test_resume_waits_for_same_run_progress_after_transitional_pause(self):
        smoke = self.smoke([("paused", 233, "one"), ("paused", 233, "one"),
                            ("running", 233, "one"), ("running", 237, "one")])
        with patch.object(self.harness.time, "sleep"):
            run_id, state = smoke.resume_observed_run()
        self.assertEqual((run_id, state["distance_m"]), ("one", 237))
        self.assertEqual(smoke.clicks, ["Resume expedition"])
        self.assertEqual(len(smoke.report["resume_observations"]), 1)

    def test_resume_rejects_new_run(self):
        smoke = self.smoke([("paused", 233, "one"), ("running", 237, "two")])
        with self.assertRaisesRegex(AssertionError, "run identity"):
            smoke.resume_observed_run()

    def test_resume_rejects_genuine_repause_without_second_tap(self):
        smoke = self.smoke([("paused", 233, "one"), ("running", 233, "one"),
                            ("paused", 233, "one")])
        with patch.object(self.harness.time, "sleep"):
            with self.assertRaisesRegex(AssertionError, "paused again"):
                smoke.resume_observed_run()
        self.assertEqual(smoke.clicks, ["Resume expedition"])

    def test_resume_keeps_bounded_default_wait(self):
        smoke = self.smoke([("paused", 233, "one"), ("paused", 233, "one")])
        with patch.object(self.harness.time, "monotonic", side_effect=[0, 1, 9]), \
                patch.object(self.harness.time, "sleep"):
            with self.assertRaisesRegex(AssertionError, "same-run progress"):
                smoke.resume_observed_run()

    def test_stale_live_proof_is_not_caught_or_retried(self):
        smoke = self.smoke([("paused", 233, "one"), AssertionError("Foreground frame heartbeat is stale (>2 seconds)")])
        with self.assertRaisesRegex(AssertionError, "heartbeat is stale"):
            smoke.resume_observed_run()

    def test_stale_pause_label_accepts_only_fresh_same_run_nonpaused_proof(self):
        smoke = self.smoke([("running", 237, "one")])
        smoke.confirm_no_unexpected_pause("one")
        self.assertEqual(smoke.clicks, [])
        self.assertEqual(len(smoke.report["stale_pause_labels"]), 1)
        for frame, message in [(("paused", 233, "one"), "unexpectedly paused"),
                               (("running", 237, "two"), "Cannot verify")]:
            smoke = self.smoke([frame])
            with self.assertRaisesRegex(AssertionError, message):
                smoke.confirm_no_unexpected_pause("one")
            self.assertEqual(smoke.clicks, [])

    def prior_smoke(self, frames, labels=("Run another expedition",)):
        smoke = self.smoke(frames)
        smoke.tree = Mock(return_value=(None, list(labels), list(labels)))
        smoke.label_node = lambda nodes, label, clickable=False: label in nodes
        smoke.mark = Mock()
        return smoke

    def test_prior_running_and_countdown_never_scan_accessibility(self):
        smoke = self.prior_smoke([("running", 237, "one"),
                                  ("countdown", 237, "one"),
                                  ("running", 260, "one"), ("lost", 290, "one")])
        phases = []
        smoke.tree.side_effect = lambda: (phases.append(smoke.last_observation["phase"]),
                                           ["Run another expedition"], ["Run another expedition"])
        with patch.object(self.harness.time, "sleep"):
            smoke.wait_prior_run_result("one")
        self.assertEqual(phases, ["lost"])
        self.assertEqual(smoke.clicks, [])

    def test_prior_result_requires_terminal_proof_and_visible_replay(self):
        smoke = self.prior_smoke([("running", 237, "one"), ("won", 1000, "one"),
                                  ("won", 1000, "one")])
        smoke.tree.side_effect = [(None, [], []),
                                  (None, ["Run another expedition"], ["Run another expedition"])]
        with patch.object(self.harness.time, "sleep"):
            smoke.wait_prior_run_result("one")
        self.assertEqual(smoke.tree.call_count, 2)
        self.assertEqual(smoke.clicks, [])

    def test_prior_modal_retains_real_visible_choice_input(self):
        for phase, label in [("chamber", "Take survival supplies"),
                ("upgrade", "Reinforced shield. Two blocked hits and longer protection. Gaps still require a jump."),
                ("fork", "Choose Rootway, low risk, supplies")]:
            with self.subTest(phase=phase):
                smoke = self.prior_smoke([(phase, 300, "one"), ("running", 301, "one"),
                                          ("lost", 330, "one")])
                smoke.tree.side_effect = [(None, [label], [label]),
                                          (None, ["Run another expedition"], ["Run another expedition"])]
                with patch.object(self.harness.time, "sleep"):
                    smoke.wait_prior_run_result("one")
                self.assertEqual(smoke.clicks, [label])
                self.assertEqual(smoke.tree.call_count, 2)

    def test_prior_loop_rejects_pause_changed_identity_and_unknown_phase_before_xml(self):
        for frame, message in [(("paused", 273, "one"), "unexpectedly paused"),
                (("running", 273, "two"), "Cannot verify prior run"),
                (("won", 1000, "two"), "Cannot verify prior run"),
                (("ready", 0, "one"), "Unexpected prior-run phase")]:
            with self.subTest(frame=frame):
                smoke = self.prior_smoke([frame])
                with self.assertRaisesRegex(AssertionError, message):
                    smoke.wait_prior_run_result("one")
                smoke.tree.assert_not_called()
                self.assertEqual(smoke.clicks, [])

    def test_prior_loop_propagates_invalid_or_stale_frame_without_xml(self):
        for message in ["Foreground frame heartbeat is stale (>2 seconds)",
                        "Current state differs from the actually rendered frame"]:
            smoke = self.prior_smoke([AssertionError(message)])
            with self.assertRaises(AssertionError) as caught:
                smoke.wait_prior_run_result("one")
            self.assertEqual(str(caught.exception), message)
            smoke.tree.assert_not_called()
            self.assertEqual(smoke.clicks, [])
        smoke = self.prior_smoke([])
        smoke.hud = lambda: None
        smoke.last_observation = {"phase": "unobserved", "hud": None}
        with self.assertRaisesRegex(AssertionError, "Cannot verify prior run"):
            smoke.wait_prior_run_result("one")
        smoke.tree.assert_not_called()

    def test_prior_loop_keeps_150_second_deadline(self):
        smoke = self.prior_smoke([("running", 237, "one")])
        with patch.object(self.harness.time, "monotonic", side_effect=[10, 10, 160]), \
                patch.object(self.harness.time, "sleep"):
            with self.assertRaisesRegex(AssertionError, "within 150 seconds"):
                smoke.wait_prior_run_result("one")
        smoke.tree.assert_not_called()
        self.assertEqual(smoke.clicks, [])


class ExpeditionActionEntranceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location(
            "expedition_action_harness", Path(__file__).with_name("android-expedition-smoke.py"))
        cls.harness = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.harness)

    def smoke(self, frames):
        smoke = self.harness.Smoke()
        smoke.clicks = []
        smoke.tap = smoke.clicks.append
        observations = iter(frames)
        def wait(predicate, description, timeout=8):
            state, mode, run_id = next(observations)
            smoke.last_observation = {"hud": state, "phase": mode, "run_id": run_id}
            if not predicate(state):
                raise AssertionError("Missing observed " + description)
            return state
        smoke.wait_hud = wait
        return smoke

    def frame(self, d, lane=1, action="running", route="main", mode="running", run_id="one"):
        return ({"distance_m": d, "lane": lane, "action": action, "route": route, "score": 350}, mode, run_id)

    def test_low_route_needs_observed_burrow_before_route_change(self):
        smoke = self.smoke([self.frame(120, 0), self.frame(135),
                            self.frame(136, action="burrowing"), self.frame(141, route="deep")])
        selected = smoke.enter_deep_route()
        self.assertEqual(selected["route"], "deep")
        self.assertEqual(smoke.clicks, ["RIGHT", "BURROW"])

    def test_steering_without_burrowing_cannot_pass(self):
        smoke = self.smoke([self.frame(120), self.frame(135), self.frame(136)])
        with self.assertRaisesRegex(AssertionError, "deliberate burrow"):
            smoke.enter_deep_route()

    def test_missed_input_window_is_not_retried_or_accepted(self):
        for late_distance in (137, 138, 140):
            smoke = self.smoke([self.frame(120), self.frame(late_distance)])
            with self.assertRaisesRegex(AssertionError, "entrance within reach"):
                smoke.enter_deep_route()
            self.assertEqual(smoke.clicks, ["RIGHT"])

    def test_pause_or_changed_run_does_not_get_resumed(self):
        for mode, run_id in [("paused", "one"), ("running", "other")]:
            smoke = self.smoke([self.frame(120), self.frame(135, mode=mode, run_id=run_id)])
            with self.assertRaises(AssertionError):
                smoke.enter_deep_route()
            self.assertEqual(smoke.clicks, ["RIGHT"])

    def test_wrong_route_cannot_be_called_success(self):
        smoke = self.smoke([self.frame(120), self.frame(135),
                            self.frame(136, action="burrowing"), self.frame(141, route="rootway")])
        with self.assertRaisesRegex(AssertionError, "Deep reached"):
            smoke.enter_deep_route()


if __name__ == "__main__":
    unittest.main()
