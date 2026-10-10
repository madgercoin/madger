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
last_root = None
device = u2.connect()
# A running game deliberately redraws continuously. Scan its accessibility tree
# without waiting for an idle window, using the instrumentation configurator.
device.jsonrpc.setConfigurator({'waitForIdleTimeout': 0, 'waitForSelectorTimeout': 0})


def adb(*args):
    return subprocess.check_output(['adb', *args], timeout=30)


def hierarchy():
    global last_root
    data = device.dump_hierarchy(compressed=False)
    OUT.joinpath('latest-ui.xml').write_text(data)
    last_root = ET.fromstring(data)
    return last_root


def wait_for(label, seconds=30):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        root = hierarchy()
        # Cold emulator boots can stall Quickstep, the system launcher. Dismiss
        # only that launcher dialog; a MADGER ANR must still fail the test.
        if any(node.get('text') == "Quickstep isn't responding" for node in root.iter('node')):
            close = next((node for node in root.iter('node') if node.get('text') == 'Close app'), None)
            if close is not None:
                click_node(close)
                print('Dismissed emulator launcher ANR', flush=True)
                continue
        for node in root.iter('node'):
            if label in (node.get('content-desc'), node.get('text')) and node.get('enabled') == 'true':
                return node
        time.sleep(0.5)
    raise AssertionError(f'Enabled action did not appear: {label}')


def tap(label):
    click_node(wait_for(label))


def click_node(node):
    bounds = list(map(int, re.findall(r'\d+', node.get('bounds'))))
    device.click((bounds[0] + bounds[2]) // 2, (bounds[1] + bounds[3]) // 2)


def cached_node(label):
    node = next((node for node in last_root.iter('node') if label in (node.get('content-desc'), node.get('text'))), None)
    assert node is not None, f'Action missing from the running screen: {label}'
    return node


def capture(name):
    OUT.joinpath(name + '.png').write_bytes(adb('exec-out', 'screencap', '-p'))


def passed(name):
    checks.append(name)
    print('PASS', name, flush=True)


def collect_debug():
    try:
        capture('last-screen')
        OUT.joinpath('logcat.txt').write_bytes(adb('logcat', '-d'))
        from PIL import Image
        import base64, io
        for file in sorted(OUT.glob('*.png')):
            preview = Image.open(file).convert('RGB')
            preview.thumbnail((390, 844))
            buffer = io.BytesIO()
            preview.save(buffer, format='JPEG', quality=55)
            print('NATIVE_VISUAL_QA ' + file.name + ' ' + base64.b64encode(buffer.getvalue()).decode(), flush=True)
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
tap('Today’s run')
tap('Let’s dig')
started = time.monotonic()
pause_node = wait_for('Pause run')
# Live hierarchy scans on busy emulator graphics can take several seconds.
# Cache the controls from one snapshot and use their stable screen coordinates.
left_node, right_node = cached_node('Move left'), cached_node('Move right')
time.sleep(max(0, 3 - (time.monotonic() - started)))
click_node(left_node)
time.sleep(0.3)
capture('03-gameplay')
click_node(pause_node)
wait_for('Back to the run')
wait_for('MADGER in the left lane')
tap('Back to the run')
time.sleep(0.3)
click_node(right_node)
time.sleep(0.3)
click_node(pause_node)
wait_for('Back to the run')
wait_for('MADGER in the center lane')
passed('Both native steering buttons change the runner lane')
capture('04-paused')
tap('Back to the run')
time.sleep(0.3)
passed('Pause and resume work in the standalone app')
adb('shell', 'input', 'keyevent', 'KEYCODE_HOME')
time.sleep(1)
adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
wait_for('Back to the run')
capture('05-background-pause')
passed('Backgrounding automatically pauses the native run')
tap('End run & save score')
wait_for('Score saved on this device ✓')
capture('06-banked-score')
passed('Ending the run banks the score in native storage')
tap('See high scores')
wait_for('Your scores')
root = hierarchy()
rank = next((node.get('content-desc') for node in root.iter('node') if node.get('content-desc', '').startswith('Rank 1, ')), None)
assert rank, 'The banked daily run is missing from its score table'
capture('07-high-scores')
passed('The native high-score table displays the banked daily score')
adb('shell', 'am', 'force-stop', PACKAGE)
adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
wait_for('Play Burrow Run')
tap('Scores')
tap('Today’s run')
wait_for(rank)
capture('08-scores-after-restart')
passed('The high score survives a full native app process restart')
assert adb('shell', 'pidof', PACKAGE).strip(), 'App process stopped'
logs = adb('logcat', '-d').decode(errors='replace')
OUT.joinpath('logcat.txt').write_text(logs)
assert not re.search(r'FATAL EXCEPTION|ANR in com\.madgercoin\.preview|ReactNativeJS.*(?:TypeError|ReferenceError|Invariant Violation)', logs), 'Native runtime failure; inspect logcat.txt'
passed('App stays running with no fatal native or JavaScript errors')
OUT.joinpath('report.json').write_text(json.dumps({'checks': checks, 'package': PACKAGE}, indent=2))
