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
