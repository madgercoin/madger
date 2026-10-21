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


def sample_live_hierarchy(read_hierarchy, *, package, max_age_seconds=2.0,
                          clock=time.monotonic, journal=None):
    """One real, atomic foreground accessibility snapshot for BOTH required values.

    Independent JSON-RPC getText/exists calls can each take 3 seconds on
    software emulators. A single fresh hierarchy returns the displayed timer
    and enabled Pause button from the same UI state. Parsing is done locally,
    but the deadline starts BEFORE the live UI query and still includes the
    subsequent force-stop in the caller. Missing/stale data fail closed.
    """
    import re
    import xml.etree.ElementTree as ET

    started = clock()
    sample = {"name": "live-timer-and-pause-hierarchy", "started": started,
              "source": "one actual foreground accessibility snapshot"}
    try:
        xml = read_hierarchy()
        sample["finished"] = clock()
        if not isinstance(xml, str) or not xml.strip():
            raise AssertionError("Live HUD hierarchy was empty")
        root = ET.fromstring(xml)
        nodes = [n for n in root.iter("node") if n.get("package") == package]

        def visible_enabled(n):
            bounds = [int(x) for x in re.findall(r"-?\d+", n.get("bounds", ""))]
            return (n.get("enabled") == "true"
                    and n.get("visible-to-user", "true") == "true"
                    and len(bounds) == 4 and bounds[2] > bounds[0]
                    and bounds[3] > bounds[1])

        timers = [n for n in nodes if re.fullmatch(r"\d+s", n.get("text", ""))
                  and n.get("class") == "android.widget.TextView"
                  and visible_enabled(n)]
        pauses = [n for n in nodes if n.get("content-desc") == "Pause run"
                  and n.get("class") == "android.widget.Button"
                  and visible_enabled(n)]
        timer_values = {n.get("text") for n in timers}
        if len(timer_values) != 1 or len(pauses) != 1:
            raise AssertionError("Live HUD timer or visible enabled Pause run control missing/ambiguous")
        timer = next(iter(timer_values))
        if not 0 < int(timer[:-1]) <= 60:
            raise AssertionError("Foreground HUD timer expired or invalid")
        sample["timer"] = timer
        sample["pause"] = True
        sample["timer_nodes"] = len(timers)
        sample["pause_nodes"] = len(pauses)
        if clock() - started > max_age_seconds:
            raise AssertionError("Foreground observation became stale during live hierarchy")
    except Exception as error:
        sample["finished"] = sample.get("finished", clock())
        sample["error"] = str(error)
        if journal is not None:
            journal["started"] = started
            journal["queries"] = [sample]
        raise
    if journal is not None:
        journal["started"] = started
        journal["queries"] = [sample]
        journal["snapshot_observations"] = {
            "timer": timer, "pause": True, "same_snapshot": True,
        }
    return {"started": started, "queries": [sample], "timer": timer,
            "pause": True}


def sample_live_hierarchy_with_retry(read_hierarchy, *, package,
                                     max_age_seconds=2.0, max_attempts=2,
                                     clock=time.monotonic, journal=None):
    """Discard one stale snapshot, never waive the next exact deadline."""
    if not 1 <= max_attempts <= 2:
        raise ValueError("Only one bounded foreground snapshot retry is permitted")
    attempts = []
    for index in range(max_attempts):
        record = {"attempt": index + 1}
        try:
            result = sample_live_hierarchy(read_hierarchy, package=package,
                                           max_age_seconds=max_age_seconds,
                                           clock=clock, journal=record)
        except AssertionError as error:
            record["status"] = "rejected"
            record["error"] = str(error)
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
            journal["snapshot_observations"] = record.get("snapshot_observations")
        return result
    raise AssertionError("No sufficiently fresh foreground observation")
