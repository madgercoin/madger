"""Two simultaneous read-only accessibility observations with an unchanged freshness limit.

The timer and Pause-control RPCs each took roughly a second on a busy Android
software emulator. Serial reads aged the timer before the app could be killed.
Concurrent reads do not waive either observation or its absolute deadline.
"""
from concurrent.futures import ThreadPoolExecutor
import time


def sample_live_snapshot(read_snapshot, *, max_age_seconds=2.0,
                         clock=time.monotonic, journal=None):
    """Read timer and activity control from one current accessibility tree.

    This avoids two expensive UiSelector refreshes while preserving the entire
    before-read-through-kill deadline. The caller validates package and bounds.
    """
    started = clock()
    query = {"name": "timer-and-pause-snapshot", "started": started}
    try:
        query["value"] = read_snapshot()
    except Exception as error:
        query["error"] = repr(error)
        raise AssertionError("Live HUD snapshot failed: " + repr(error)) from error
    finally:
        query["finished"] = clock()
        if journal is not None:
            journal.update(started=started, queries=[query])
    if query["finished"] - started > max_age_seconds:
        raise AssertionError("Foreground observation became stale during snapshot")
    value = query["value"]
    return {"started": started, "queries": [query], "timer": value["timer"], "pause": value["pause"]}


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



def sample_live_pair_with_retry(read_timer, read_pause_control, *,
                                max_age_seconds=2.0, max_attempts=2,
                                clock=time.monotonic, journal=None):
    """Retake a rejected *stale* observation rather than accepting it.

    Each attempt independently begins a new unchanged freshness window. Only
    the final verified timer and Pause values may justify a force-stop, which
    must also finish within two seconds of that final attempt's start. RPC
    errors, missing controls and unrelated assertions do not authorize retries.
    """
    if max_attempts < 1 or max_attempts > 3:
        raise ValueError("Foreground observation attempts must be between 1 and 3")
    attempts = []
    for index in range(max_attempts):
        record = {"attempt": index + 1}
        try:
            result = sample_live_pair(read_timer, read_pause_control,
                                      max_age_seconds=max_age_seconds,
                                      clock=clock, journal=record)
        except AssertionError as error:
            record["error"] = str(error)
            record["status"] = "rejected"
            attempts.append(record)
            if journal is not None:
                journal["attempts"] = attempts
            if not str(error).startswith("Foreground observation became stale") or index == max_attempts - 1:
                raise
            continue
        record["status"] = "fresh"
        attempts.append(record)
        if journal is not None:
            journal["attempts"] = attempts
            journal["started"] = result["started"]
            journal["queries"] = result["queries"]
        return result
    raise AssertionError("No sufficiently fresh foreground observation")
