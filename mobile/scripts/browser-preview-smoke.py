from playwright.sync_api import sync_playwright, expect
from pathlib import Path
import os
import json, re
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlsplit
from threading import Thread
WEB_ROOT=Path(os.environ.get('MADGER_WEB_PREVIEW', Path(__file__).resolve().parents[1] / 'dist'))
class Preview(SimpleHTTPRequestHandler):
    def translate_path(self,path):
        target=WEB_ROOT/urlsplit(path).path.lstrip('/')
        if target.is_dir(): target=target/'index.html'
        if not target.exists() and not target.suffix: target=Path(str(target)+'.html')
        return str(target)
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',8125),Preview)
Thread(target=server.serve_forever,daemon=True).start()
OUT=Path(os.environ.get('MADGER_QA_OUTPUT', 'browser-smoke'))
OUT.mkdir(exist_ok=True)
report={'checks':[], 'errors':[]}
def passed(name):
    report['checks'].append(name)
    print('PASS',name,flush=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,has_touch=True)
    page=context.new_page()
    page.on('pageerror',lambda e:report['errors'].append(str(e)))
    page.goto('http://127.0.0.1:8125/play')
    expect(page.get_by_role('button',name='Let’s dig')).to_be_enabled()
    page.wait_for_timeout(600)
    page.screenshot(path=str(OUT/'burrow-lobby-390.png'))
    passed('Lobby loads with an enabled start action')
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
    passed('390px lobby has no horizontal overflow')
    page.get_by_role('switch',name='Sound',exact=True).click()
    expect(page.get_by_role('switch',name='Sound',exact=True)).to_have_attribute('aria-checked','true')
    page.get_by_role('switch',name='Calm effects').click()
    expect(page.get_by_role('switch',name='Calm effects')).to_have_attribute('aria-checked','true')
    passed('Sound and calm-effects controls toggle')
    page.clock.install()
    page.get_by_role('button',name='Let’s dig').click()
    page.clock.run_for(2900)
    expect(page.get_by_role('button',name='Pause run')).to_be_visible()
    runner=page.locator('img[src*="madger-runner"]').last
    x0=runner.bounding_box()['x']
    page.get_by_role('button',name='Move left').click()
    expect(page.get_by_role('button',name='Move left')).to_be_disabled()
    page.clock.run_for(150)
    page.wait_for_timeout(100)
    x1=runner.bounding_box()['x']
    assert x1 < x0-40,(x0,x1)
    expect(page.get_by_role('button',name='Move left')).to_be_disabled()
    page.get_by_role('button',name='Move right').click()
    page.clock.run_for(100)
    passed('Movement switches lanes and respects field boundaries')
    page.get_by_role('button',name='Move left').click()
    page.keyboard.press('ArrowRight')
    expect(page.get_by_role('button',name='Move left')).to_be_enabled()
    page.keyboard.press('ArrowRight')
    expect(page.get_by_role('button',name='Move right')).to_be_disabled()
    page.keyboard.press('ArrowLeft')
    passed('Keyboard arrows keep steering after a movement button is focused')
    field=page.locator('[aria-label^="Three-lane tunnel"]').first
    box=field.bounding_box()
    page.mouse.move(box['x']+box['width']*.5,box['y']+box['height']*.65)
    page.mouse.down()
    page.mouse.move(box['x']+box['width']*.8,box['y']+box['height']*.65,steps=8)
    page.mouse.up()
    page.clock.run_for(100)
    expect(page.get_by_role('button',name='Move right')).to_be_disabled()
    passed('Swipe gesture moves the runner')
    page.get_by_role('button',name='Pause run').click()
    expect(page.get_by_role('button',name='Back to the run')).to_be_visible()
    timer_text=page.locator('body').inner_text()
    page.clock.run_for(5000)
    assert page.locator('body').inner_text()==timer_text
    passed('Pause freezes countdown, powers, and gameplay')
    page.get_by_role('button',name='Back to the run').click()
    page.clock.run_for(1000)
    page.screenshot(path=str(OUT/'burrow-gameplay-390.png'))
    page.get_by_role('tab',name='Home',exact=True).click()
    page.get_by_role('tab',name='Play',exact=True).click()
    expect(page.get_by_role('button',name='Back to the run')).to_be_visible()
    page.get_by_role('button',name='Back to the run').click()
    passed('Leaving the Play tab automatically pauses the run')
    # Complete a real simulation with a reproducible stream; move occasionally.
    for i in range(125):
        if page.get_by_role('button',name='Dig again').count():
            break
        if i % 7 == 0:
            button=page.get_by_role('button',name='Move left' if (i//7)%2==0 else 'Move right')
            if button.is_enabled(): button.click()
        burst=page.get_by_role('button',name='Activate dig burst')
        if burst.count() and burst.is_enabled(): burst.click()
        page.clock.run_for(500)
    expect(page.get_by_role('button',name='Dig again')).to_be_enabled()
    page.screenshot(path=str(OUT/'burrow-results-390.png'))
    records=page.evaluate('Object.fromEntries(Object.entries(localStorage))')
    saved=json.loads(records['madger-burrow-run-native-v1'])
    assert saved['runs']==1 and saved['bestScore']>=0
    passed('A completed run produces a debrief and saves a field record')
    page.get_by_role('button',name='Dig again').click()
    page.clock.run_for(3000)
    expect(page.get_by_role('button',name='Pause run')).to_be_visible()
    passed('Replay starts a fresh run')
    page.reload()
    expect(page.get_by_role('button',name='Let’s dig')).to_be_enabled()
    saved_again=page.evaluate('localStorage.getItem("madger-burrow-run-native-v1")')
    assert json.loads(saved_again)==saved
    passed('Field record survives a reload')
    page.get_by_role('tab',name='Home',exact=True).click()
    expect(page.get_by_role('button',name='Play Burrow Run')).to_be_visible()
    page.screenshot(path=str(OUT/'madger-home-390.png'))
    page.get_by_role('button',name='Play Burrow Run').click()
    expect(page.get_by_role('button',name='Let’s dig')).to_be_enabled()
    passed('Home offers a direct game entry')
    for width in [320,768]:
        page.set_viewport_size({'width':width,'height':844 if width==320 else 1024})
        page.wait_for_timeout(150)
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
        page.screenshot(path=str(OUT/f'burrow-lobby-{width}.png'))
        page.get_by_role('button',name='Let’s dig').click()
        page.clock.run_for(3000)
        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
        assert page.get_by_role('button',name='Move right').bounding_box()['height']>=48
        page.get_by_role('button',name='Pause run').click()
        page.clock.run_for(1000)
        page.screenshot(path=str(OUT/f'burrow-paused-{width}.png'))
        page.reload()
        expect(page.get_by_role('button',name='Let’s dig')).to_be_enabled()
        passed(f'{width}px lobby, gameplay, controls, and pause dialog fit')
    report['saved_record']=saved
    browser.close()
OUT.joinpath('browser-qa.json').write_text(json.dumps(report,indent=2))
assert not report['errors'],report['errors']
print(json.dumps(report,indent=2),flush=True)
