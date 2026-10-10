"""Supplemental mode-switch regression; run against MADGER_WEB_PREVIEW."""
import atexit
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlsplit
from playwright.sync_api import expect, sync_playwright

WEB_ROOT = Path(os.environ.get("MADGER_WEB_PREVIEW", Path(__file__).resolve().parents[1] / "dist"))
OUT = Path(os.environ.get("MADGER_MODE_QA_OUTPUT", "mode-smoke"))
OUT.mkdir(exist_ok=True)
report = {"checks": [], "errors": [], "completed": False}
atexit.register(lambda: (OUT / "mode-qa.json").write_text(json.dumps(report, indent=2)))


class Preview(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        target = WEB_ROOT / urlsplit(path).path.lstrip("/")
        if target.is_dir():
            target = target / "index.html"
        if not target.exists() and not target.suffix:
            target = Path(str(target) + ".html")
        return str(target)

    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 8126), Preview)
Thread(target=server.serve_forever, daemon=True).start()
atexit.register(lambda: (server.shutdown(), server.server_close()))


def passed(name):
    report["checks"].append(name)
    print("PASS", name, flush=True)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH"), headless=True, args=["--no-sandbox"])
    for width, height in [(390, 844), (320, 568)]:
        context = browser.new_context(viewport={"width": width, "height": height}, has_touch=True)
        page = context.new_page()
        page.on("pageerror", lambda error: report["errors"].append(str(error)))
        page.goto("http://127.0.0.1:8126/play")
        expect(page.get_by_role("button", name="Let’s dig", exact=True)).to_be_enabled()
        page.clock.install()
        for current, target, category, launch in [
            ("CLASSIC", "TODAY’S", "Today’s run", "Play today’s run"),
            ("TODAY’S", "CLASSIC", "Classic", "Beat your best"),
        ]:
            page.get_by_role("button", name="Let’s dig", exact=True).click()
            page.clock.run_for(9000)
            page.get_by_role("button", name="Pause run", exact=True).click()
            page.get_by_role("button", name="End run & save score", exact=True).click()
            expect(page.get_by_role("button", name="Dig again", exact=True)).to_be_enabled()
            before = page.evaluate('JSON.parse(localStorage.getItem("madger-arcade-profile-v2"))')
            expected_mode = "classic" if current == "CLASSIC" else "daily"
            assert before["recentRuns"][0]["mode"] == expected_mode
            page.get_by_role("button", name="See high scores", exact=True).click()
            page.get_by_role("button", name=category, exact=True).click()
            page.get_by_role("button", name=launch, exact=True).click()
            expect(page.get_by_text(f"MADGER / {target} RUN", exact=True)).to_be_visible()
            expect(page.get_by_role("button", name="Let’s dig", exact=True)).to_be_enabled()
            expect(page.get_by_role("button", name="Dig again", exact=True)).to_have_count(0)
            expect(page.get_by_role("button", name="See high scores", exact=True)).to_have_count(0)
            assert page.evaluate('JSON.parse(localStorage.getItem("madger-arcade-profile-v2"))') == before
            assert not page.evaluate("document.documentElement.scrollWidth > innerWidth")
            page.screenshot(path=str(OUT / f"{width}-{expected_mode}-to-lobby.png"))
            passed(f"{width}px {current} debrief launches fresh {target} lobby without rewriting scores")
        context.close()
    assert not report["errors"], report["errors"]
    report["completed"] = True
    browser.close()
