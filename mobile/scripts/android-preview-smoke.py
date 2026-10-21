"""Exercise the actual standalone preview APK through Android accessibility UI."""
import json
import os
from pathlib import Path
import re
import subprocess
import time
import xml.etree.ElementTree as ET
import atexit
import uiautomator2 as u2
from android_foreground_observation import sample_live_snapshot

PACKAGE = os.environ.get('MADGER_ANDROID_PACKAGE') or 'com.madgercoin.preview'
APK = os.environ.get('MADGER_ANDROID_APK') or 'android/app/build/outputs/apk/release/app-release.apk'
OUT = Path(os.environ.get('MADGER_ANDROID_LEGACY_EVIDENCE_DIR') or 'android-smoke')
OUT.mkdir(parents=True, exist_ok=True)
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


def home_action(label, max_swipes=5, forbidden_label=None):
    """Find a Home action with bounded swipes inside the app's scroll view."""
    for swipe_count in range(max_swipes + 1):
        root = hierarchy()
        if forbidden_label is not None:
            assert not any(
                forbidden_label in (node.get('content-desc'), node.get('text'))
                for node in root.iter('node')
            ), 'Completed run was resurrected'
        scroll_view = next((
            node for node in root.iter('node')
            if node.get('scrollable') == 'true' and node.get('package') == PACKAGE
        ), None)
        assert scroll_view is not None, 'Home scroll view is missing'
        viewport = list(map(int, re.findall(r'-?\d+', scroll_view.get('bounds', ''))))
        assert len(viewport) == 4, 'Home scroll view has invalid bounds'
        left, top, right, bottom = viewport
        assert right > left and bottom > top, 'Home scroll view is not visible'
        for node in root.iter('node'):
            if label not in (node.get('content-desc'), node.get('text')) or node.get('enabled') != 'true':
                continue
            bounds = list(map(int, re.findall(r'-?\d+', node.get('bounds', ''))))
            if len(bounds) == 4 and (
                left <= bounds[0] < bounds[2] <= right
                and top <= bounds[1] < bounds[3] <= bottom
                and node.get('visible-to-user', 'true') == 'true'
            ):
                return node
        if swipe_count == max_swipes:
            break
        x = (left + right) // 2
        height = bottom - top
        device.swipe(x, top + int(height * 0.78), x, top + int(height * 0.28), duration=0.35)
        time.sleep(0.5)
    raise AssertionError(f'Enabled Home action not visible after {max_swipes} swipes: {label}')


def tap(label):
    click_node(wait_for(label))


def click_node(node):
    bounds = list(map(int, re.findall(r'\d+', node.get('bounds'))))
    device.click((bounds[0] + bounds[2]) // 2, (bounds[1] + bounds[3]) // 2)


def cached_node(label):
    node = next((node for node in last_root.iter('node') if label in (node.get('content-desc'), node.get('text'))), None)
    assert node is not None, f'Action missing from the running screen: {label}'
    return node


def kill_observed_foreground_run():
    """Read only the live HUD/controls, then kill before that observation is stale."""
    started = None
    preparation = {'started': time.monotonic(), 'queries': []}
    observation = {'status': 'preparing', 'clock': 'host monotonic seconds',
                   'started': started, 'max_age_seconds': 2.0, 'queries': [],
                   'freshness_scope': 'Before current UI hierarchy capture through completed force-stop',
                   'pre_observation': preparation}
    screenshot = None

    def assert_visible(node):
        bounds = list(map(int, re.findall(r'-?\d+', node.get('bounds', ''))))
        assert node.get('enabled') == 'true' and node.get('visible-to-user', 'true') == 'true' and (
            len(bounds) == 4 and bounds[2] > bounds[0] and bounds[3] > bounds[1]
        ), ('Live HUD/control was not visible and enabled', node.attrib)

    try:
        # Validate the HUD identity/visibility from the existing paused tree.
        # This HUD also renders while running; only its timer value changes.
        reference_nodes = [node for node in last_root.iter('node') if node.get('package') == PACKAGE]
        timers = [node for node in reference_nodes if re.fullmatch(r'\d+s', node.get('text', ''))]
        assert len({node.get('text') for node in timers}) == 1, 'Paused HUD timer was missing or ambiguous'
        assert all(node.get('class') == 'android.widget.TextView' for node in timers), 'Paused HUD timer class changed'
        for node in timers:
            assert_visible(node)
        reference_controls = [node for node in reference_nodes if node.get('content-desc') in ('Resume run', 'Back to the run')]
        assert {'Resume run', 'Back to the run'} <= {node.get('content-desc') for node in reference_controls}, 'Paused HUD reference was missing controls'
        for node in reference_controls:
            assert_visible(node)
        observation['paused_reference'] = [node.attrib for node in timers + reference_controls]
        # Read back the zero-idle/selector waits set at connection time. The
        # driver must not wait for this continuously animated game to go idle.
        configuration = {'name': 'driver-config', 'started': time.monotonic()}
        preparation['queries'].append(configuration)
        try:
            configuration['value'] = device.jsonrpc.getConfigurator()
        finally:
            configuration['finished'] = time.monotonic()
        observation['driver_config'] = configuration['value']
        assert all(observation['driver_config'].get(key) == 0 for key in ('waitForIdleTimeout', 'waitForSelectorTimeout')), 'Live-query driver waits were not disabled'

        # This raw image is a pre-observation visual reference, outside the
        # fresh live-HUD window. It does not establish the later kill state.
        visual = {'name': 'screenshot', 'role': 'pre-observation reference',
                  'started': time.monotonic(), 'file': 'foreground-reference.png'}
        preparation['queries'].append(visual)
        try:
            screenshot = adb('exec-out', 'screencap', '-p')
            visual['bytes'] = len(screenshot)
        finally:
            visual['finished'] = time.monotonic()
        assert screenshot.startswith(b'\x89PNG\r\n\x1a\n'), 'Foreground reference screenshot was not a PNG'

        # UiSelector scalar refreshes took 3+ seconds despite zero idle waits.
        # A single fresh hierarchy observes timer and Pause together; package,
        # visibility, and the same two-second kill deadline remain mandatory.
        def live_snapshot():
            # Keep the same hierarchy mode used by the preceding observations.
            # Toggling accessibility compression here refreshes Android's service
            # and traverses animated nonessential nodes inside the strict deadline.
            current = ET.fromstring(device.dump_hierarchy(compressed=False))
            nodes = [n for n in current.iter('node') if n.get('package') == PACKAGE]
            timers = [n for n in nodes if n.get('class') == 'android.widget.TextView'
                      and re.fullmatch(r'\d+s', n.get('text', ''))]
            controls = [n for n in nodes if n.get('content-desc') == 'Pause run']
            assert len({n.get('text') for n in timers}) == 1, 'Live HUD timer missing or ambiguous'
            assert controls, 'Live Pause control missing'
            for node in timers + controls:
                assert_visible(node)
            return {'timer': timers[0].get('text'), 'pause': True}

        preparation['finished'] = time.monotonic()
        observation['status'] = 'sampling'
        pair = sample_live_snapshot(
            live_snapshot,
            max_age_seconds=observation['max_age_seconds'],
            journal=observation,
        )
        started = pair['started']
        timer, active = pair['timer'], pair['pause']
        assert isinstance(timer, str) and re.fullmatch(r'\d+s', timer), ('Invalid live HUD timer', timer)
        live = int(timer[:-1])
        assert 0 < live <= 60, ('Foreground run timer expired or invalid', live)
        observation['live_seconds'] = live
        assert active is True, 'Foreground run was paused, ended, or not visible'
        observation['force_stop_requested'] = time.monotonic()
        assert observation['force_stop_requested'] - started <= observation['max_age_seconds'], 'Foreground observation was stale before process kill'
        adb('shell', 'am', 'force-stop', PACKAGE)
        observation['force_stop_completed'] = time.monotonic()
        delay = observation['force_stop_completed'] - started
        observation['observation_delay_seconds'] = delay
        assert delay <= observation['max_age_seconds'], 'Foreground observation was stale when process kill completed'
        observation['status'] = 'killed_while_observed_running'
        return live, delay
    except Exception as error:
        observation['status'] = 'failed'
        observation['error'] = str(error)
        raise
    finally:
        if 'finished' not in preparation:
            preparation['finished'] = time.monotonic()
        if screenshot is not None:
            OUT.joinpath('foreground-reference.png').write_bytes(screenshot)
        OUT.joinpath('foreground-kill-observation.json').write_text(json.dumps(observation, indent=2))


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


adb('install', '-r', APK)
# The Expedition suite leaves this package on its paused game route. Start a
# fresh activity/task while preserving both games' stored checkpoints and scores.
adb('shell', 'am', 'force-stop', PACKAGE)
adb('logcat', '-c')
adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
wait_for('Play the 3D Expedition')
capture('01-home')
passed('Standalone APK launches and renders the Home entry')
click_node(home_action('Play Burrow Run'))
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

# Kill while genuinely running, without requesting a pause/save. Waiting over
# three seconds makes an old pause-only snapshot insufficient to pass recovery.
wait_for('Run saved for recovery.')
paused_seconds = {int(node.get('text')[:-1]) for node in last_root.iter('node') if re.fullmatch(r'\d+s', node.get('text', ''))}
assert len(paused_seconds) == 1, paused_seconds
tap('Back to the run')
time.sleep(3.2)
live, observation_delay = kill_observed_foreground_run()
adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
wait_for('Play the 3D Expedition')
click_node(home_action('Continue interrupted run'))
wait_for('Back to the run')
recovered_seconds = {int(node.get('text')[:-1]) for node in last_root.iter('node') if re.fullmatch(r'\d+s', node.get('text', ''))}
assert len(recovered_seconds) == 1, recovered_seconds
recovered, earlier_pause = next(iter(recovered_seconds)), next(iter(paused_seconds))
# One-second checkpoint cadence plus integer HUD rounding permits at most two
# displayed seconds of rollback. Scanning/force-stop can consume foreground time.
assert live - int(observation_delay + 1) <= recovered <= live + 2, (live, recovered, observation_delay)
assert recovered <= earlier_pause - 2, 'Recovered only the old paused snapshot; periodic checkpoint did not advance'
capture('05-foreground-recovered')
passed('Foreground process kill recovers a periodic checkpoint with at most two HUD seconds of rollback')

# Kill the actual process with an unfinished run, twice. Recovery must remain
# paused, retain the lane and HUD timer, and avoid banking an extra score.
for attempt in range(2):
    wait_for('Run saved for recovery.')
    before = {node.get('text') for node in last_root.iter('node') if re.fullmatch(r'\d+s', node.get('text', ''))}
    before_score = {node.get('content-desc') for node in last_root.iter('node') if node.get('content-desc', '').startswith('Current score ')}
    assert before, 'Paused countdown not found'
    assert before_score, 'Paused score not found'
    adb('shell', 'am', 'force-stop', PACKAGE)
    adb('shell', 'am', 'start', '-W', '-n', PACKAGE + '/.MainActivity')
    wait_for('Play the 3D Expedition')
    click_node(home_action('Continue interrupted run'))
    wait_for('Back to the run')
    wait_for('MADGER in the center lane')
    after = {node.get('text') for node in last_root.iter('node') if re.fullmatch(r'\d+s', node.get('text', ''))}
    assert before == after, (before, after)
    after_score = {node.get('content-desc') for node in last_root.iter('node') if node.get('content-desc', '').startswith('Current score ')}
    assert before_score == after_score, (before_score, after_score)
    capture(f'05-recovered-{attempt}')
    if attempt == 0:
        tap('Back to the run')
        time.sleep(0.3)
        click_node(pause_node)
        wait_for('Back to the run')
passed('Unfinished native run survives repeated process restarts, frozen with its lane and timer')
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
wait_for('Play the 3D Expedition')
home_action('Play Burrow Run', forbidden_label='Continue interrupted run')
assert not any(node.get('content-desc') == 'Continue interrupted run' for node in last_root.iter('node')), 'Completed run was resurrected'
tap('Scores')
wait_for('Your scores')
tap('Today’s run')
wait_for('Play today’s run')
wait_for(rank)
capture('08-scores-after-restart')
passed('The high score survives a full native app process restart')
assert adb('shell', 'pidof', PACKAGE).strip(), 'App process stopped'
logs = adb('logcat', '-d').decode(errors='replace')
OUT.joinpath('logcat.txt').write_text(logs)
assert not re.search(rf'FATAL EXCEPTION|ANR in {re.escape(PACKAGE)}|ReactNativeJS.*(?:TypeError|ReferenceError|Invariant Violation)', logs), 'Native runtime failure; inspect logcat.txt'
passed('App stays running with no fatal native or JavaScript errors')
OUT.joinpath('report.json').write_text(json.dumps({'checks': checks, 'package': PACKAGE}, indent=2))
