from pathlib import Path
import json,html
R=Path(__file__).parent;D=json.loads((R/'output/Journeys_Bible.json').read_text());P=R/'plans';P.mkdir(exist_ok=True)
C={c['id']:c for c in D['communities']};C['SITE-08']=D['site_endpoint']
colors={'road':'#496e5c','river':'#267c9a','guided forest':'#729949','caravan':'#b67d37','sky':'#b35b48','mountain':'#74769d','descent':'#863b80','boat':'#267c9a'}
def pt(p):return 100+(p[0]+220)*1.6,90+(290-p[1])*1.6
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1030" viewBox="0 0 1200 1030">','<rect width="1200" height="1030" fill="#fbf8ef"/>','<style>text{font-family:DejaVu Sans,sans-serif;fill:#173e3c}.sm{font-size:14px}.label{font-size:17px;font-weight:bold}</style>','<text x="60" y="40" font-size="28" font-weight="bold">THE OPEN WAYS / Registered connections</text>','<text x="60" y="66" class="sm">Exact regional anchors. Lines connect endpoints only; they are not surveyed tracks.</text>']
for gx in range(-200,301,50):
 x,y=pt([gx,290]);_,y2=pt([gx,-200]);svg.append(f'<path d="M{x} {y} V{y2}" stroke="#dedccd"/><text x="{x}" y="{y2+24}" text-anchor="middle" class="sm">{gx}</text>')
for gy in range(-200,301,50):
 x,y=pt([-220,gy]);x2,_=pt([300,gy]);svg.append(f'<path d="M{x} {y} H{x2}" stroke="#dedccd"/><text x="{x-15}" y="{y+5}" text-anchor="end" class="sm">{gy}</text>')
for r in D['route_cards']:
 b=r['baseline'];x1,y1=pt(C[b['a']]['position_km']);x2,y2=pt(C[b['b']]['position_km']);color=colors[b['mode']];dash=' stroke-dasharray="9 6"' if b['mode'] in ['sky','descent'] else ''
 svg.append(f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{color}" stroke-width="3" fill="none"{dash}/>')
 # short IDs only; the close deep-water legs are keyed by the inset.
 if b['id'] not in ['WAY-15','WAY-16']:
  mx=(x1+x2)/2;my=(y1+y2)/2;svg.append(f'<rect x="{mx-13}" y="{my-10}" width="26" height="20" rx="3" fill="#fbf8ef"/><text x="{mx}" y="{my+5}" text-anchor="middle" class="sm">{b["id"][-2:]}</text>')
offsets={'BRW':(-90,25),'EXT-01':(-55,28),'EXT-02':(-120,34),'EXT-03':(10,0),'EXT-04':(10,15),'EXT-05':(12,0),'EXT-06':(-105,25),'EXT-07':(12,-8),'EXT-08':(12,0),'EXT-09':(12,15),'EXT-10':(12,-8),'EXT-11':(12,-5),'EXT-12':(-12,-15),'EXT-13':(-130,-20),'SITE-08':(-130,-43)}
for id,c in C.items():
 x,y=pt(c['position_km']);dx,dy=offsets[id];svg.append(f'<circle cx="{x}" cy="{y}" r="5" fill="#173e3c" stroke="#fbf8ef" stroke-width="2"/><path d="M{x} {y} L{x+dx+(len(c["name"])*8.4 if dx < -25 else 0)} {y+dy-5}" stroke="#83928b" stroke-width="1"/><text x="{x+dx}" y="{y+dy}" class="label">{html.escape(c["name"])}</text>')
svg+=['<text x="974" y="115" class="label">NORTH ↑</text>','<text x="974" y="144" class="sm">x east / y north</text>','<text x="974" y="166" class="sm">Coordinates: km</text>']
for i,(mode,col) in enumerate(colors.items()):
 y=220+i*35;svg.append(f'<path d="M974 {y} H1010" stroke="{col}" stroke-width="4"/><text x="1020" y="{y+5}" class="sm">{mode}</text>')
svg+=['<text x="970" y="545" class="label">Route key</text>','<text x="970" y="572" class="sm">01 = WAY-01</text>','<text x="970" y="600" class="sm">15: Stonewake</text>','<text x="970" y="622" class="sm">to Lumen Tide</text>','<text x="970" y="650" class="sm">16: Lumen Tide</text>','<text x="970" y="672" class="sm">to Bellwater</text>','<text x="970" y="725" class="sm">Line crossings</text>','<text x="970" y="747" class="sm">are NOT junctions.</text>','<text x="60" y="945" class="sm">50 km grid. Burrow departures use its established east public gate; northwest travel turns outside the basin.</text>','<text x="60" y="973" class="sm">Deep routes have no Burrow connection. Sky lines do not define a continuous liftstone field or certify a flight path.</text>','<text x="60" y="1001" class="sm">MADGER World Bible 3.4 / Exact lengths, planning days and explicit timing errata are in the route register.</text></svg>']
(P/'WAY-Network.svg').write_text('\n'.join(svg).replace('class="sm"','font-size="14"').replace('class="label"','font-size="17" font-weight="bold"').replace('<text ', '<text font-family="DejaVu Sans" '))
# Detailed endpoint profile: exact elevations, explicitly not a surveyed ramp.
a=C['EXT-02'];b=C['EXT-13']
s=f'''<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="650" viewBox="0 0 1000 650"><rect width="1000" height="650" fill="#fbf8ef"/><style>text{{font-family:DejaVu Sans;fill:#173e3c;font-size:18px}}</style><text x="50" y="55" font-size="28">WAY-15 / Two datums, one inhabited destination</text><text x="50" y="95">Stonewake (+320 m) to Lumen Tide (-1600 m): vertical difference 1,920 m.</text><path d="M120 160 H400 M600 450 H880" stroke="#173e3c" stroke-width="5"/><text x="120" y="145">STONEWAKE / surface civic datum</text><text x="580" y="485">LUMEN TIDE / deep civic datum</text><path d="M380 180 Q650 210 620 425" fill="none" stroke="#863b80" stroke-width="5" stroke-dasharray="12 8"/><text x="80" y="270">16 km registered route length</text><text x="80" y="305">2 planning days, with checks</text><text x="80" y="340">No Burrow endpoint or bypass</text><text x="50" y="555">Diagram is schematic: neither slope, horizontal distance nor shaft shape is depicted.</text><text x="50" y="590">No segment-by-segment descent geometry is invented from endpoint elevations.</text><text x="50" y="625">Use the existing descent-house plans for staging; local air and pressure govern departure.</text></svg>'''
(P/'WAY-15-Datums.svg').write_text(s)
print('Two editable vector references.')
