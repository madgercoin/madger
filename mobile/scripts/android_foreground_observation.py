"""Two simultaneous read-only accessibility observations with an unchanged freshness limit.

The timer and Pause-control RPCs each took roughly a second on a busy Android
software emulator. Serial reads aged the timer before the app could be killed.
Concurrent reads do not waive either observation or its absolute deadline.
"""
from concurrent.futures import ThreadPoolExecutor
import time


def sample_live_pair(read_timer, read_pause_control, *,
                     max_age_seconds=2.0, clock=time.monotonic, journal=None):
    """Return timestamped HUD observations; fail closed when either read is stale."""
    started = clock()

    def read(name, callback):
        item = {"name": name, "started": clock()}
        try:
            item["value"] = callback()
        except Exception as exc:
            item["error"] = repr(exc)
        finally:
            item["finished"] = clock()
        return item

    with ThreadPoolExecutor(max_workers=2, thread_name_prefix="madger-live-hud") as pool:
        timer_future = pool.submit(read, "timer-text", read_timer)
        control_future = pool.submit(read, "pause-control-exists", read_pause_control)
        samples = [timer_future.result(), control_future.result()]

    if journal is not None:
        journal["started"] = started
        journal["queries"] = samples
    for sample in samples:
        if "error" in sample:
            raise AssertionError(f"Live HUD {sample['name']} failed: {sample['error']}")
        if sample["finished"] - started > max_age_seconds:
            raise AssertionError(
                f"Foreground observation became stale during {sample['name']}"
            )
    return {"started": started, "queries": samples,
            "timer": samples[0]["value"], "pause": samples[1]["value"]}
