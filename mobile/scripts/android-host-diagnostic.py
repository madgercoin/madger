#!/usr/bin/env python3
"""One bounded suite run, sampling host counters only (never argv/env/dumps)."""
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
import time

METRICS = ('memory.current', 'memory.max', 'memory.peak', 'memory.events',
           'memory.events.local', 'memory.usage_in_bytes', 'memory.limit_in_bytes',
           'memory.max_usage_in_bytes', 'memory.failcnt', 'memory.oom_control')


def read(path):
    try:
        return Path(path).read_text()
    except OSError:
        return None


def cgroups(pid):
    """Resolve process cgroup paths against v1/v2 mount roots, not just /sys root."""
    result = {}
    memberships = read(f'/proc/{pid}/cgroup') or ''
    mounts = read('/proc/self/mountinfo') or ''
    for membership in memberships.splitlines():
        _, controllers, group = membership.split(':', 2)
        for line in mounts.splitlines():
            before, after = line.split(' - ', 1)
            fields, fs = before.split(), after.split()
            if not (fs[0] == 'cgroup2' and not controllers or
                    fs[0] == 'cgroup' and 'memory' in controllers.split(',') and
                    'memory' in fs[2].split(',')):
                continue
            root, mount = fields[3:5]
            if group != root and not group.startswith(root.rstrip('/') + '/'):
                continue
            relative = group[len(root):].lstrip('/')
            directory = Path(mount) / relative
            # Include parent limits too; ancestor cgroups can enforce memory caps.
            while True:
                counters = {name: value for name in METRICS
                            if (value := read(directory / name)) is not None}
                if counters:
                    result[str(directory)] = counters
                if directory == Path(mount) or Path(mount) not in directory.parents:
                    break
                directory = directory.parent
    return result


def snapshot():
    processes = []
    for directory in Path('/proc').glob('[0-9]*'):
        name = (read(directory / 'comm') or '').strip()
        if not (name.startswith(('qemu', 'emulator'))):
            continue
        status = read(directory / 'status') or ''
        fields = dict(line.split(':', 1) for line in status.splitlines() if ':' in line)
        processes.append({'pid': int(directory.name), 'name': name,
                          'status': {key: fields[key].strip() for key in
                                     ('State', 'VmRSS', 'VmHWM', 'VmSize', 'Threads') if key in fields},
                          'cgroups': cgroups(directory.name)})
    memory = read('/proc/meminfo') or ''
    return {'utc': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            'monotonic': time.monotonic(), 'emulators': processes,
            'host_memory': {line.split(':')[0]: line.split(':')[1].strip()
                            for line in memory.splitlines() if line.split(':')[0] in
                            ('MemAvailable', 'MemFree', 'SwapFree', 'SwapTotal')},
            'sampler_cgroups': cgroups('self')}


def failure_liveness():
    """Observe once after failure; never restart adb, resume, or send console commands."""
    import socket
    result = {}
    adb = os.environ.get('ADB', 'adb')
    serial = os.environ.get('MADGER_ANDROID_SERIAL', 'emulator-5554')
    # Never invoke adb if its server is already gone, avoiding implicit startup.
    try:
        with socket.create_connection(('127.0.0.1', 5037), timeout=1):
            server_present = True
    except OSError:
        server_present = False
    for name, command in [('devices', [adb, 'devices']),
                          ('state', [adb, '-s', serial, 'get-state']),
                          ('guest_echo', [adb, '-s', serial, 'shell', 'echo', 'MADGER_DIAGNOSTIC_ALIVE'])]:
        if not server_present:
            result[name] = {'skipped': 'existing adb server unavailable'}
            continue
        try:
            check = subprocess.run(command, capture_output=True, text=True, timeout=3)
            # Do not retain arbitrary shell or daemon output.
            allowed = ('device', 'offline', 'unauthorized', 'unknown', 'MADGER_DIAGNOSTIC_ALIVE')
            result[name] = {'exit_code': check.returncode,
                            'states': [word for word in check.stdout.split() if word in allowed]}
        except (OSError, subprocess.TimeoutExpired) as error:
            result[name] = {'error': type(error).__name__}
    try:
        with socket.create_connection(('127.0.0.1', 5554), timeout=2):
            result['console_tcp_connect'] = True
    except OSError as error:
        result['console_tcp_connect'] = False
        result['console_error'] = type(error).__name__
    result['threads'] = []
    for process in snapshot()['emulators']:
        for task in (Path('/proc') / str(process['pid']) / 'task').glob('[0-9]*'):
            status = read(task / 'status') or ''
            state = next((line.split(':', 1)[1].strip() for line in status.splitlines()
                          if line.startswith('State:')), 'unavailable')
            result['threads'].append({'pid': process['pid'], 'tid': int(task.name), 'state': state})
    return result


def main():
    out = Path(os.environ['MADGER_ANDROID_EVIDENCE_DIR']) / 'host-live'
    out.mkdir(parents=True, exist_ok=True)
    stop = threading.Event()
    def sample():
        with (out / 'samples.jsonl').open('w') as stream:
            while not stop.is_set():
                try:
                    record = snapshot()
                except Exception as error:
                    record = {'sampling_error': type(error).__name__}
                stream.write(json.dumps(record) + '\n')
                stream.flush()
                stop.wait(1)
    thread = threading.Thread(target=sample, daemon=True)
    thread.start()
    # Keep known app telemetry/crash markers across BOTH suites. No broad log dump.
    guest = None
    guest_thread = None
    def collect_guest(process):
        import re
        with (out / 'guest-lifecycle.log').open('w') as stream:
            for line in process.stdout:
                if (re.search(r'MADGER_OFFLINE_FRAME|MADGER_EXPEDITION_FRAME_STALL|FATAL EXCEPTION|Fatal signal|RGBELoader', line)
                        and not re.search(r'password|token|secret|authorization', line, re.I)):
                    stream.write(line[:16384])
                    stream.flush()
    try:
        guest = subprocess.Popen([os.environ.get('ADB', 'adb'), '-s',
            os.environ.get('MADGER_ANDROID_SERIAL', 'emulator-5554'), 'logcat', '-T', '1',
            '-v', 'threadtime', 'MadgerOfflineGame:I', 'AndroidRuntime:E', 'libc:F', '*:S'],
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, errors='replace')
        guest_thread = threading.Thread(target=collect_guest, args=(guest,), daemon=True)
        guest_thread.start()
    except OSError:
        pass
    started = time.monotonic()
    result = {'timeout': False}
    try:
        # Existing suite retains its per-suite 600s bounds and all strict proofs.
        process = subprocess.Popen([sys.executable, '-u', 'scripts/android-preview-suite.py'],
                                   start_new_session=True)
        try:
            result['exit_code'] = process.wait(timeout=1250)
        except subprocess.TimeoutExpired:
            import signal
            result.update(timeout=True, exit_code=124)
            os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()
    finally:
        if result.get('exit_code', 1) != 0:
            try:
                probes = failure_liveness()
            except Exception as error:
                probes = {'probe_error': type(error).__name__}
            (out / 'failure-liveness.json').write_text(json.dumps(probes, indent=2) + '\n')
        if guest:
            result['guest_log_exit_before_cleanup'] = guest.poll()
            guest.terminate()
            try:
                guest.wait(timeout=3)
            except subprocess.TimeoutExpired:
                guest.kill()
                guest.wait(timeout=3)
            guest_thread.join(timeout=3)
        stop.set()
        thread.join(timeout=5)
        result['duration_s'] = round(time.monotonic() - started, 3)
        # Filter in memory; never persist unfiltered kernel output.
        try:
            kernel = subprocess.run(['sudo', '-n', 'dmesg', '--ctime'],
                                    capture_output=True, text=True, timeout=5)
            result['kernel_read_exit_code'] = kernel.returncode
            import re
            lines = [line for line in kernel.stdout.splitlines()
                     if re.search(r'out of memory|oom-kill|killed process|segfault|qemu|emulator', line, re.I)
                     and not re.search(r'key|token|secret|auth', line, re.I)]
            (out / 'kernel-events.txt').write_text('\n'.join(lines) + '\n')
        except (OSError, subprocess.TimeoutExpired) as error:
            result['kernel_read_error'] = type(error).__name__
        (out / 'result.json').write_text(json.dumps(result, indent=2) + '\n')
    return result['exit_code']


if __name__ == '__main__':
    raise SystemExit(main())
