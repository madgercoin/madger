"""Raw capture compatibility and strict motion-window regression tests."""
import importlib.util
import io
import os
from pathlib import Path
import struct
import tempfile
import unittest
from unittest.mock import patch
from PIL import Image

spec = importlib.util.spec_from_file_location('raw_capture_harness', Path(__file__).with_name('android-expedition-smoke.py'))
harness = importlib.util.module_from_spec(spec)
spec.loader.exec_module(harness)


def raw(header=16):
    return struct.pack('<III', 1, 1, 1) + (b'\0' * 4 if header == 16 else b'') + bytes([255, 0, 0, 255])


class RawCaptureTests(unittest.TestCase):
    def test_rgba_12_and_16_byte_headers(self):
        for header in (12, 16):
            png = harness.Smoke.raw_screencap_png(raw(header))
            self.assertEqual(Image.open(io.BytesIO(png)).getpixel((0, 0)), (255, 0, 0))

    def test_rejects_unknown_format_and_payload(self):
        for value in (b'bad', struct.pack('<III', 1, 1, 99) + b'abcd', raw() + b'x'):
            with self.assertRaises(AssertionError):
                harness.Smoke.raw_screencap_png(value)

    def test_raw_command_omits_guest_png_flag(self):
        smoke = harness.Smoke()
        smoke.serial = 'emulator-5554'
        smoke.timed = lambda name, call: call()
        with patch.object(harness.subprocess, 'run') as run:
            run.return_value.stdout = raw()
            smoke.capture_adb_raw('test')
            self.assertEqual(run.call_args.args[0][-2:], ['exec-out', 'screencap'])
            self.assertEqual(run.call_args.kwargs['timeout'], 30)

    def window(self, end_phase):
        smoke = harness.Smoke()
        events = []
        phases = iter([('running', 353), (end_phase, 355)])
        def hud():
            phase, distance = next(phases)
            events.append('hud')
            smoke.last_observation = {'phase': phase, 'run_id': 'same', 'hud': {
                'distance_m': distance, 'lane': 0, 'action': 'running', 'route': 'deep', 'score': 10}}
        smoke.hud = hud
        smoke.capture_adb_raw = lambda name: events.append('capture') or raw()
        decoder = smoke.raw_screencap_png
        smoke.raw_screencap_png = lambda data: events.append('encode') or decoder(data)
        return smoke, events

    def test_host_encoding_follows_final_observation(self):
        smoke, events = self.window('running')
        with tempfile.TemporaryDirectory() as directory, patch.object(harness, 'OUT', Path(directory)), patch.dict(os.environ, {'MADGER_ANDROID_RAW_CAPTURE': '1'}):
            smoke.capture_running_window('test', ['frame'], [0], targeted=True)
        self.assertEqual(events, ['hud', 'capture', 'hud', 'encode'])
        self.assertTrue(smoke.report['motion_windows']['test']['phase_and_progress_passed'])

    def test_paused_endpoint_still_fails_and_raw_is_preserved(self):
        smoke, events = self.window('paused')
        with tempfile.TemporaryDirectory() as directory, patch.object(harness, 'OUT', Path(directory)), patch.dict(os.environ, {'MADGER_ANDROID_RAW_CAPTURE': '1'}):
            with self.assertRaisesRegex(AssertionError, 'must show a running phase'):
                smoke.capture_running_window('test', ['frame'], [0], targeted=True)
            self.assertTrue((Path(directory) / 'frame.raw').exists())
        self.assertFalse(smoke.report['motion_windows']['test']['phase_and_progress_passed'])

    def test_initial_window_requires_native_targeted_endpoints(self):
        import ast
        source = Path(harness.__file__).read_text()
        calls = [node for node in ast.walk(ast.parse(source))
                 if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                 and node.func.attr == 'capture_running_window' and node.args
                 and isinstance(node.args[0], ast.Constant) and node.args[0].value == 'initial-running']
        self.assertEqual(len(calls), 1)
        self.assertTrue(any(item.arg == 'targeted' and isinstance(item.value, ast.Constant)
                            and item.value.value is True for item in calls[0].keywords))

    def test_stale_final_native_proof_fails_without_tree_fallback(self):
        smoke, events = self.window('running')
        original = smoke.hud
        count = 0
        def hud():
            nonlocal count
            count += 1
            if count == 2:
                raise AssertionError('Foreground frame heartbeat is stale (>2 seconds)')
            original()
        smoke.hud = hud
        smoke.tree = lambda: self.fail('Must not fall back to accessibility snapshots')
        with tempfile.TemporaryDirectory() as directory, patch.object(harness, 'OUT', Path(directory)), patch.dict(os.environ, {'MADGER_ANDROID_RAW_CAPTURE': '1'}):
            with self.assertRaisesRegex(AssertionError, 'heartbeat is stale'):
                smoke.capture_running_window('test', ['frame'], [0], targeted=True)
            self.assertTrue((Path(directory) / 'frame.raw').exists())
        self.assertFalse(smoke.report['motion_windows']['test']['phase_and_progress_passed'])


class OpeningControlTests(unittest.TestCase):
    def setup_smoke(self, end_phase='running', end_distance=10, end_id='run-1', missing=False):
        smoke = harness.Smoke()
        events = []
        labels = ('LEFT', 'RIGHT', 'JUMP', 'BURROW', 'Pause expedition')
        nodes = [harness.ET.Element('node', {'text': label, 'clickable': 'true',
                 'enabled': 'true', 'visible-to-user': 'true', 'bounds': '[10,20][30,40]'})
                 for label in labels if not (missing and label == 'LEFT')]
        def observed(phase, distance, run_id):
            return {'phase': phase, 'run_id': run_id, 'hud': {'route': 'main',
                    'distance_m': distance, 'lane': 0, 'action': 'running', 'score': 0}}
        def wait(predicate, description, timeout):
            smoke.last_observation = observed('countdown', 0, 'run-1')
            self.assertTrue(predicate(smoke.last_observation['hud']))
        def tree():
            events.append('tree')
            return '<hierarchy/>', nodes, list(labels)
        def hud():
            events.append('hud')
            smoke.last_observation = observed(end_phase, end_distance, end_id)
            return smoke.last_observation['hud']
        smoke.wait_hud, smoke.tree, smoke.hud = wait, tree, hud
        return smoke, events

    def prime(self, smoke):
        with tempfile.TemporaryDirectory() as directory, patch.object(harness, 'OUT', Path(directory)):
            smoke.prime_start_controls()

    def test_geometry_is_real_and_bound_to_same_run(self):
        smoke, events = self.setup_smoke()
        self.prime(smoke)
        self.assertEqual(smoke.control_bounds['LEFT'], (10, 20, 30, 40))
        self.assertEqual(smoke.control_run_id, 'run-1')
        self.assertEqual(events, ['tree', 'hud'])
        self.assertEqual(smoke.report['control_priming'][0]['before']['phase'], 'countdown')

    def test_paused_changed_run_and_late_opening_fail(self):
        for kwargs in ({'end_phase': 'paused'}, {'end_id': 'run-2'}, {'end_distance': 53}, {'missing': True}):
            smoke, _ = self.setup_smoke(**kwargs)
            with self.assertRaises(AssertionError):
                self.prime(smoke)
            self.assertFalse(smoke.control_bounds)

    def test_primed_input_still_requires_fresh_running_telemetry(self):
        smoke, events = self.setup_smoke()
        self.prime(smoke)
        class Device:
            def click(self, x, y):
                events.append(('click', x, y))
        smoke.device = Device()
        smoke.tap('LEFT')
        self.assertEqual(events, ['tree', 'hud', 'hud', ('click', 20, 30)])
        def stale():
            raise AssertionError('Foreground frame heartbeat is stale (>2 seconds)')
        smoke.hud = stale
        with self.assertRaisesRegex(AssertionError, 'heartbeat is stale'):
            smoke.tap('RIGHT')
        self.assertEqual(sum(isinstance(x, tuple) for x in events), 1)

    def test_priming_does_not_accept_stale_post_scan_proof(self):
        smoke, _ = self.setup_smoke()
        def stale():
            raise AssertionError('Foreground frame heartbeat is stale (>2 seconds)')
        smoke.hud = stale
        with self.assertRaisesRegex(AssertionError, 'heartbeat is stale'):
            self.prime(smoke)
        self.assertFalse(smoke.control_bounds)


if __name__ == '__main__':
    unittest.main()
