"""Real controller recovery/outcomes from valid on-device profile fixtures."""
import atexit, json, os
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect

WEB_ROOT = Path(os.environ.get('MADGER_WEB_PREVIEW', Path(__file__).resolve().parents[1] / 'dist'))
OUT = Path(os.environ.get('MADGER_COMPLETION_QA_OUTPUT', 'completion-smoke'))
OUT.mkdir(exist_ok=True)
report = {'checks': [], 'errors': [], 'completed': False}
class Preview(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        target = WEB_ROOT / urlsplit(path).path.lstrip('/')
        if target.is_dir(): target /= 'index.html'
        if not target.exists() and not target.suffix: target = Path(str(target) + '.html')
        return str(target)
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 8127), Preview)
Thread(target=server.serve_forever, daemon=True).start()
atexit.register(server.server_close)
atexit.register(server.shutdown)
atexit.register(lambda: OUT.joinpath('completion-qa.json').write_text(json.dumps(report, indent=2)))
def passed(label):
    report['checks'].append(label)
    print('PASS', label, flush=True)
def checkpoint(elapsed=12, mode='daily', stage='running', grit=3):
    return {'version':1, 'id':'recovered-run', 'mode':mode, 'day':'2026-10-10', 'stage':stage,
        'countdown':1.2 if stage=='countdown' else 0, 'randomState':12345,
        'simulation':{'elapsed':elapsed,'spawnIn':1.4,'nextId':0,'lane':1,'entities':[],
          'run':{'score':2100,'signals':18,'streak':5,'bestStreak':5,'grit':grit,'hits':0,'dodges':2,
                 'energy':100,'burst':0,'shield':4,'magnet':2,'invulnerable':0}}}
def profile(point):
    return {'version':2,'record':{'runs':0,'signals':0,'bestScore':0,'bestStreak':0,'marks':[]},
        'highScores':[],'recentRuns':[],'legacyBest':0,'xp':0,'completed':0,'perfectRuns':0,'playedDays':[],
        'preferences':{'sound':False,'haptics':False,'calm':True,'trail':'gold'},'checkpoint':point}
def data(page): return page.evaluate('JSON.parse(localStorage.getItem("madger-arcade-profile-v2"))')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH'),headless=True,args=['--no-sandbox'])
    def open_recovery(point, width=390, date='2026-10-10T12:00:00Z'):
        context=browser.new_context(viewport={'width':width,'height':568 if width==320 else 844},has_touch=True)
        context.add_init_script('if(!localStorage.getItem("madger-arcade-profile-v2"))localStorage.setItem("madger-arcade-profile-v2",'+json.dumps(json.dumps(profile(point)))+');')
        page=context.new_page()
        page.on('pageerror',lambda e:report['errors'].append(str(e)))
        page.clock.install(time=date)
        page.goto('http://127.0.0.1:8127/play')
        expect(page.get_by_role('button',name='Back to the run',exact=True)).to_be_enabled()
        return context,page
    for width in [390,320]:
        context,page=open_recovery(checkpoint(),width)
        for attempt in range(2):
            before=data(page)
            page.clock.run_for(5000)
            assert data(page)==before and before['record']['runs']==0
            for label in ['Back to the run','End run & save score']:
                box=page.get_by_role('button',name=label,exact=True).bounding_box()
                assert box and box['y']>=0 and box['y']+box['height']<=page.viewport_size['height'],box
            page.get_by_role('button',name='Back to the run',exact=True).click()
            page.clock.run_for(250)
            runner=page.locator('img[src*="madger-runner"]').last.bounding_box()
            control=page.get_by_role('button',name='Move left',exact=True).bounding_box()
            assert runner and control and runner['y']>=0 and runner['y']+runner['height']<=control['y'],(width,runner,control)
            page.get_by_role('button',name='Pause run',exact=True).click()
            expect(page.get_by_text('Run saved for recovery.',exact=True)).to_be_visible()
            saved=data(page)['checkpoint']
            assert saved['simulation']['elapsed']>before['checkpoint']['simulation']['elapsed']
            page.reload()
            expect(page.get_by_role('button',name='Back to the run',exact=True)).to_be_enabled()
            assert data(page)['checkpoint']==saved
        page.screenshot(path=str(OUT/f'recovered-{width}.png'))
        page.get_by_role('button',name='End run & save score',exact=True).click()
        expect(page.get_by_role('button',name='Dig again',exact=True)).to_be_enabled()
        final=data(page)
        assert final['checkpoint'] is None and final['record']['runs']==1
        page.reload()
        expect(page.get_by_role('button',name="Let\u2019s dig",exact=True)).to_be_enabled()
        assert data(page)==final
        passed(f'{width}px repeated recovery freezes powers/time, keeps visible actions and banks once')
        context.close()
    context,page=open_recovery(checkpoint(elapsed=59.8),date='2026-10-10T23:59:59Z')
    page.get_by_role('button',name='Back to the run',exact=True).click()
    page.clock.run_for(35000)
    expect(page.get_by_role('button',name='Dig again',exact=True)).to_be_enabled()
    expect(page.get_by_text('Made your mark.',exact=True)).to_be_visible()
    expect(page.get_by_text('MADGER / DAILY RUN 2026-10-10',exact=True)).to_be_visible()
    expect(page.get_by_text('Daily mark cleared. The Burrow remembers.',exact=True)).to_be_visible()
    final=data(page)
    assert final['recentRuns'][0]['seconds']==60 and final['recentRuns'][0]['reason']=='time'
    assert final['record']['marks']==['2026-10-10'] and final['completed']==1
    page.get_by_role('button',name='See run history',exact=True).click()
    expect(page.get_by_role('heading',name='Your scores',exact=True)).to_be_visible()
    expect(page.get_by_text('2,100',exact=True).first).to_be_visible()
    page.get_by_role('tab',name='Play',exact=True).click()
    page.get_by_role('button',name='Dig again',exact=True).click()
    page.clock.run_for(100)
    assert data(page)['checkpoint']['day']=='2026-10-11'
    assert data(page)['checkpoint']['simulation']['elapsed']==0
    passed('Time win earns progression once; midnight debrief keeps its date and replay uses the new day')
    context.close()
    point=checkpoint(elapsed=30,mode='classic',grit=1)
    point['simulation']['run'].update(shield=0,magnet=0,hits=2)
    point['simulation']['nextId']=1
    point['simulation']['entities']=[{'id':0,'lane':1,'type':'noise','y':0.82,'passed':False}]
    context,page=open_recovery(point)
    page.get_by_role('button',name='Back to the run',exact=True).click()
    page.clock.run_for(200)
    expect(page.get_by_text('Dust off. Dig again.',exact=True)).to_be_visible()
    expect(page.get_by_role('button',name='Dig again',exact=True)).to_be_enabled()
    final=data(page)
    assert final['recentRuns'][0]['reason']=='grit' and final['recentRuns'][0]['hits']==3
    assert final['record']['runs']==1 and final['completed']==0 and final['checkpoint'] is None
    page.get_by_role('button',name='Dig again',exact=True).click()
    page.clock.run_for(3000)
    expect(page.get_by_role('button',name='Pause run',exact=True)).to_be_visible()
    passed('Final grit loss banks a loss once and replay starts a healthy new run')
    context.close()
    point=checkpoint(elapsed=0,stage='countdown')
    point['simulation']['run'].update(score=0,signals=0,streak=0,bestStreak=0,dodges=0,energy=0,shield=0,magnet=0)
    context,page=open_recovery(point)
    page.get_by_role('button',name='Back to the run',exact=True).click()
    page.clock.run_for(500)
    assert data(page)['checkpoint']['simulation']['elapsed']==0
    page.clock.run_for(1000)
    page.get_by_role('button',name='Pause run',exact=True).click()
    expect(page.get_by_text('Run saved for recovery.',exact=True)).to_be_visible()
    assert 0<data(page)['checkpoint']['simulation']['elapsed']<1
    passed('Recovered countdown finishes its remaining preparation before simulation starts')
    context.close()
    point=checkpoint()
    context,page=open_recovery(point)
    page.clock.pause_at(page.evaluate('Date.now()+100'))
    page.get_by_role('button',name='Back to the run',exact=True).click()
    page.clock.fast_forward(2000)
    expect(page.get_by_role('button',name='Back to the run',exact=True)).to_be_enabled()
    expect(page.get_by_text('Run saved for recovery.',exact=True)).to_be_visible()
    assert data(page)['checkpoint']['simulation']==point['simulation']
    page.get_by_role('button',name='Back to the run',exact=True).click()
    page.clock.fast_forward(300)
    page.get_by_role('button',name='Pause run',exact=True).click()
    expect(page.get_by_text('Run saved for recovery.',exact=True)).to_be_visible()
    progressed=data(page)['checkpoint']['simulation']
    assert abs(progressed['elapsed']-12.3)<1e-6
    assert abs(progressed['run']['shield']-3.7)<1e-6
    passed('Real controller pauses a long stall and consumes ordinary 300ms frames in full')
    context.close()
    assert not report['errors'],report['errors']
    report['completed']=True
    browser.close()
