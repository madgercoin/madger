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


if __name__ == '__main__':
    unittest.main()
