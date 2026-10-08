"""Exercise the actual standalone preview APK through Android accessibility UI."""
import json
from pathlib import Path
import re
import subprocess
import time
import xml.etree.ElementTree as ET
import atexit
import uiautomator2 as u2

PACKAGE = 'com.madgercoin.preview'
OUT = Path('android-smoke')
OUT.mkdir(exist_ok=True)
checks = []
device = u2.connect()
# A running game deliberately redraws continuously. Scan its accessibility tree
# without waiting for an idle window, using the instrumentation configurator.
device.jsonrpc.setConfigurator({'waitForIdleTimeout': 0, 'waitForSelectorTimeout': 0})


def adb(*args):
    return subprocess.check_output(['adb', *args], timeout=30)


def hierarchy():
    data = device.dump_hierarchy(compressed=False)
    OUT.joinpath('latest-ui.xml').write_text(data)
    return ET.fromstring(data)


def wait_for(label, seconds=30):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        root = hierarchy()
        for node in root.iter('node'):
            if label in (node.get('content-desc'), node.get('text')) and node.get('enabled') == 'true':
                return node
        time.sleep(0.5)
    raise AssertionError(f'Enabled action did not appear: {label}')


def tap(label):
    bounds = list(map(int, re.findall(r'\d+', wait_for(label).get('bounds'))))
    adb('shell', 'input', 'tap', str((bounds[0] + bounds[2]) // 2), str((bounds[1] + bounds[3]) // 2))


def capture(name):
    OUT.joinpath(name + '.png').write_bytes(adb('exec-out', 'screencap', '-p'))


def passed(name):
    checks.append(name)
    print('PASS', name, flush=True)


def collect_debug():
    try:
        capture('last-screen')
        OUT.joinpath('logcat.txt').write_bytes(adb('logcat', '-d'))
    except (OSError, subprocess.SubprocessError):
        pass


atexit.register(collect_debug)


adb('install', '-r', 'android/app/build/outputs/apk/release/app-release.apk')
adb('logcat', '-c')
adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
wait_for('Play Burrow Run')
capture('01-home')
passed('Standalone APK launches and renders the Home entry')
tap('Play Burrow Run')
wait_for('Let’s dig')
capture('02-lobby')
passed('Game lobby loads with an enabled start action')
tap('Let’s dig')
wait_for('Pause run')
time.sleep(3)
tap('Move left')
tap('Move right')
capture('03-gameplay')
passed('Countdown finishes and native movement controls respond')
tap('Pause run')
wait_for('Back to the run')
capture('04-paused')
tap('Back to the run')
wait_for('Pause run')
passed('Pause and resume work in the standalone app')
adb('shell', 'input', 'keyevent', 'KEYCODE_HOME')
time.sleep(1)
adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
wait_for('Back to the run')
capture('05-background-pause')
passed('Backgrounding automatically pauses the native run')
assert adb('shell', 'pidof', PACKAGE).strip(), 'App process stopped'
logs = adb('logcat', '-d').decode(errors='replace')
OUT.joinpath('logcat.txt').write_text(logs)
assert not re.search(r'FATAL EXCEPTION|ReactNativeJS.*(?:TypeError|ReferenceError|Invariant Violation)', logs), 'Native runtime failure; inspect logcat.txt'
passed('App stays running with no fatal native or JavaScript errors')
OUT.joinpath('report.json').write_text(json.dumps({'checks': checks, 'package': PACKAGE}, indent=2))
