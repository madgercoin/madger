from pathlib import Path
import json,html,copy,math
R=Path(__file__).resolve().parent;O=R/'output'
B=json.loads(((R/'source/Blueprint_Data.json' if (R/'source/Blueprint_Data.json').exists() else R.parent/'v3.0.0/Blueprint_Data.json')).read_text());W=json.loads(((R/'source/World_Atlas.json' if (R/'source/World_Atlas.json').exists() else R.parent/'v3.0.0/World_Atlas.json')).read_text())
def feature(i,name,box,kind='land',z=0):return dict(id=i,name=name,box_m=box,kind=kind,z_m=z)
def route(i,name,points,width,mode,z=0,status='NORMAL'):return dict(id=i,name=name,points_m=points,width_m=width,mode=mode,z_m=z,status=status)
sites=[]
def site(i,features,routes,notes,conditions,art):
 old=next(x for x in B['encounter_plans'] if x['id']==i);w=next(x for x in W['sites'] if x['id']==i)
 s=dict(id=i,name=w['name'],region=w['region'],regional_position_km=[w['x'],w['y']],baseline=copy.deepcopy(old),features=features,routes=routes,notes=notes,conditions=conditions,art=art,authority='Exact site bounds, regional anchor and refuge footprint inherited unchanged. New detail refines the generic 3.0 staging polyline; it does not treat that polyline as an engineered path. Local z=0 is the inherited refuge floor datum, not sea level.')
 sites.append(s)
site('SITE-01',[
 feature('F01','South river reach',[-16,-40,32,52],'water',-2),feature('F02','East river outlet',[16,-8,44,20],'water',-2),feature('F03','Spawning reeds',[-12,0,20,10],'habitat',-2),feature('F04','Old dry channel',[-47,13,12,22],'habitat',-1),feature('F05','West waiting court',[-55,-12,16,10],'land'),feature('F06','East waiting court',[36,-34,16,10],'land'),feature('F07','High bank landing',[-12,14,24,3.6],'land')],[
 route('R1','Low-water ford',[[-60,0],[-28,0],[-28,-20],[28,-20],[60,-20]],3,'foot / wagon',-1,'NORMAL only'),route('R2','North-bank refuge access',[[-28,0],[-28,25.6],[-10,25.6]],2,'foot',0,'NORMAL / RESTRICTED')],
 ['Ford crosses the south reach only; the river turns east below the refuge. Water depth and flow are checked before opening. The route line is not a bridge.', 'Refuge footprint is 20 x 16 m at (0,25.6). Raised bank and floor stay above the normal shallow-channel surface. Actual flood crest is scene-specific; do not declare the hut invulnerable.', 'Spawning habitat stays north of the crossing. The abandoned channel is visible surface terrain, never a hidden passage.'],
 {'NORMAL':'Inspected low water; crossing available with observers.','RESTRICTED':'Spawning disturbance: close the ford, retain west-bank refuge access.','CLOSED':'Rising flow or unstable bank: no ford; refuge access also closes if its approach is threatened.','EMERGENCY':'Account for people on each bank; await local boat crews. No improvised charge through current.'},dict(file='WILDS-01.png',row=0))
site('SITE-02',[
 feature('F01','West ridge',[-80,-60,90,120],'rock'),feature('F02','North ridge extension',[10,30,10,30],'rock'),feature('F03','East crown shelf',[45,-60,35,120],'rock'),feature('F04','Root span south',[10,-32,35,4],'span'),feature('F05','Root span middle',[10,-12,35,4],'span'),feature('F06','Root span north',[10,8,35,4],'span'),feature('F07','Lower rescue shelf',[15,-52,26,10],'rock',-8),feature('F08','Mawroot colony',[-57,17,3,3],'habitat'),feature('F09','West anchor',[6,-34,3,3],'anchor'),feature('F10','East anchor',[47,-34,3,3],'anchor')],[
 route('R1','Inspected south span',[[-80,0],[-20,0],[-20,-30],[10,-30],[45,-30],[80,0]],2,'foot / light handcart',0,'NORMAL only'),route('R2','Ridge hut access',[[-20,0],[-20,38.4],[-10,38.4]],2,'foot',0,'NORMAL / RESTRICTED')],
 ['The northward fixed ridge reaches the inherited hut at (0,38.4); it is on the west side of the ravine. No refuge is placed on a floating tree.', 'Three root spans are 35 m long and 4 m wide at this spring reference state. Ravine floor is staged at z=-18 m and lower rescue shelf at z=-8 m. These are production set datums, not surveys of a real site.', 'Only the inspected south span is a normal route here. The other two have no implied traffic clearance. Anchors identify rescue staging, not an engineering load rating. Migration invalidates the spring alignment until a dated scene plan updates it.', 'Mawroot remains off the marked ridge route. The lower shelf has no ordinary walking connection; reaching it requires a planned assisted descent.'],
 {'NORMAL':'Current lashing inspection and spring alignment confirmed.','RESTRICTED':'Rain or visible crown drift: stop carts and inspect all intended foot crossings.','CLOSED':'Span separation or failed anchors: no ravine crossing.','EMERGENCY':'Retreat to fixed ridge; plan assisted recovery from lower shelf without treating it as a shortcut.'},dict(file='WILDS-01.png',row=1))
site('SITE-03',[
 feature('F01','Storm court',[-23,-33,46,46],'court'),feature('F02','Optical chamber below',[-12,-20,24,18],'subfloor',-6),feature('F03','Excavated stair',[-6,-2,4,15],'stair'),feature('F04','Maintenance ramp',[12,-20,12,6],'ramp'),feature('F05','Light well NW',[-18,4,3,3],'shaft'),feature('F06','Light well NE',[15,4,3,3],'shaft'),feature('F07','Light well SW',[-18,-29,3,3],'shaft'),feature('F08','Light well SE',[15,-29,3,3],'shaft'),feature('F09','Drake nesting bowl',[31,11,14,15],'habitat'),feature('F10','Packbeast rest bay',[-44,-34,16,10],'land')],[
 route('R1','Marked court approach',[[-50,0],[-27,0],[-27,17],[0,17]],2,'foot',0),route('R2','Refuge path',[[0,17],[0,24]],2,'foot',0),route('R3','Stair entry',[[-4,13],[-4,-2]],2,'foot',0),route('R4','Ramp approach',[[50,-30],[27,-30],[27,-17],[24,-17],[12,-17]],2,'maintenance',0)],
 ['Court is a 46 x 46 m square excavation envelope around a circular 44 m storm court. Chamber is 24 x 18 m at z=-6 m; a 4 m wide stair descends from y=13 to y=-2. Light wells are guarded 3 x 3 m openings, never exits.', 'The 12 x 6 m ramp box marks the entry cut, not its full sloped length. A folded internal service ramp descends within the chamber; its engineered profile must be resolved before a moving-camera interior sequence. This sheet fixes the exterior footprint and entry points only.', 'Refuge remains 20 x 16 m at (0,32). Nesting bowl is northeast, outside the marked approach. Packbeasts wait in the southwest rest bay, not on light wells.', 'No chase may leap through a light well. Reflected bearings are checked against marked bedrock and local guides.'],
 {'NORMAL':'Stable crust inspected, safe light and no storm warning.','RESTRICTED':'Active nesting: exclude northeast bowl, keep bedrock approaches.','CLOSED':'Glass storm or unstable excavation rim: shelter; no entry.','EMERGENCY':'Retreat by the same verified exterior approach; do not invent a shaft escape.'},dict(file='WILDS-02.png',row=0))
site('SITE-08',[
 feature('F01','Navigable tidal channel',[-100,-10,200,20],'water',-8),feature('F02','Southwest rock pier',[-45,-38,15,28],'rock',-6),feature('F03','Northeast rock pier',[30,10,15,28],'rock',-6),feature('F04','High east rock arch',[70,-60,16,110],'overhead',0),feature('F05','North dry ledge',[-30,27,116,25],'rock',0),feature('F06','Quiet nesting pocket',[-78,22,30,23],'habitat',-8),feature('F07','Snail grazing mat',[-23,-48,25,15],'habitat',-8),feature('F08','South boat landing',[4,-26,15,10],'dock',-6),feature('F09','Ascent to high path',[20,-40,50,12],'stair',-3)], [
 route('R1','Quiet water passage',[[-100,0],[-55,0],[0,0],[55,0],[100,0]],8,'boat',-8,'NORMAL only'),route('R2','Dry refuge approach',[[78,-60],[78,42],[10,42]],2,'foot',0,'NORMAL / RESTRICTED')],
 ['Two rock piers bracket the open channel. The inherited refuge stays 20 x 16 m at (0,38.4), floor z=0. Typical low-water surface is staged at z=-8 m; water level can rise and navigation can close.', 'South foot access follows a natural high rock arch along the east side, then the north ledge. Water passes beneath the arch; the plan must be read by elevation. This is not an at-grade dam across the sea route.', 'The boat landing and ascent are separate from the through foot approach. The ascent gains 6 m; final tread and guarding design is reserved for its dedicated construction sheet. Never assume a boat can reach the dry refuge floor directly.', 'Protected pocket and grazing mat lie away from the through channel. This author sheet is not an in-world public chart. No connection to the Burrow exists.'],
 {'NORMAL':'Local navigator confirms water, pressure, air and vessel clearance.','RESTRICTED':'Nesting: quiet through passage only if locally permitted; pocket closed.','CLOSED':'Water rise, pressure or air warning: no boat departure, reassess foot route separately.','EMERGENCY':'Use inspected refuge only while its access and air remain safe; request local rescue rather than striking the hull for a distraction.'},dict(file='WILDS-02.png',row=1))
# Ford surface/bed distinction and continuous bank transitions.
a=next(s for s in sites if s['id']=='SITE-01')
for f in a['features']:
 if f['kind']=='water': f['z_m']=-1.2
r=a['routes'][0];r['z_m']='0 banks / -1.5 ford bed';r['profile_xyz']=[[-60,0,0],[-28,0,0],[-28,-20,0],[-16,-20,-1.5],[16,-20,-1.5],[28,-20,0],[60,-20,0]]
a['notes'].append('Reference normal water surface is z=-1.2 m; ford bed z=-1.5 m gives 0.3 m depth. West and east bank approaches slope 1.5 m over 12 m between x=-28/-16 and x=16/28 at y=-20. R1 and R2 join on the dry bank at (-28,0,0). These staging levels do not authorize crossing in changed flow.')

# Resolved production circulation details, additive to inherited footprints.
a=next(s for s in sites if s['id']=='SITE-03')
a['features'][3].update(name='Service stair cut (not a ramp)',kind='stair',z_m=-6)
a['routes'][2].update(points_m=[[-4,17],[-4,13],[-4,2.5],[-4,-2]],z_m='0 to -6')
a['routes'][3].update(name='Service stair approach',points_m=[[50,-30],[27,-30],[27,-21],[12,-21],[12,-19.4]],z_m=0)
a['notes'][1]='The former ramp reservation is resolved as a service stair inside the unchanged 12 x 6 m entry cut. Three parallel flights descend 2 m each; bottom corridor enters the chamber through its east wall. It is foot/service access only: no wheeled ramp is implied.'
a['details']=[
 dict(id='D03-A',name='Public excavated stair',width_m=2,risers=36,riser_m=1/6,treads=35,tread_m=.3,rise_m=6,run_m=10.5,top_xyz=[-4,13,0],bottom_xyz=[-4,2.5,-6],exit_xyz=[-4,-2,-6],note='Straight south flight; bottom landing continues south 4.5 m into the chamber. Clear headroom 2.4 m measured above pitch line. Open stair cut is guarded at surface.'),
 dict(id='D03-B',name='Three-flight service stair',width_m=1.2,flights=3,risers_per_flight=12,riser_m=1/6,treads_per_flight=11,tread_m=.3,rise_per_flight_m=2,run_per_flight_m=3.3,flight_endpoints_xyz=[[[14,-19.4,0],[17.3,-19.4,-2]],[[17.3,-17.4,-2],[14,-17.4,-4]],[[14,-15.4,-4],[17.3,-15.4,-6]]],landing_boxes_xy=[[17.3,-20,2,3.2],[12,-18,2,3.2]],bottom_route_xyz=[[17.3,-15.4,-6],[21,-15.4,-6],[21,-19.4,-6],[12,-19.4,-6]],note='Upper approach reaches x=12 then crosses the 2 m top landing to x=14. Return landings join adjacent flights at z=-2 and -4. Bottom corridor 1.2 m clear, beside flights, not through them. Bottom chamber doorway 1.2 x 2.4 m. Guard open edges to 1.1 m; maintain 2.4 m headroom. No ramp or cart passage.')]
a=next(s for s in sites if s['id']=='SITE-08')
a['features'][8].update(name='Measured straight ascent',z_m='-6 to 0')
a['features'].append(feature('F10','Landing connector',[19,-35,7,15],'land',-6))
a['features'].append(feature('F11','Landing water approach',[4,-16,15,6],'water',-8))
a['notes'].append('F11 connects the channel south edge at y=-10 to the dock north face y=-16. A 1.8 m wide boarding gangway at z=-7.5 links that face to the stair foot (11.5,-18.3,-7.5), a 2.3 m horizontal reach inside the dock cut. It is deployed only after vessel freeboard and the gap are checked; no jump or submerged walk is implied.')
a['routes'].append(route('R3','Landing to high arch',[[11.5,-21],[25,-21],[25,-34],[42.55,-34],[78,-34]],1.8,'foot via stairs','-6 to 0','NORMAL / EMERGENCY if inspected'))
a['notes'][2]='The dock connects to the high path through F10 and the measured F09 stair. Boarding at reference water z=-8 uses a 10-riser stair from z=-7.5 to dock z=-6; 0.5 m is the assumed vessel deck freeboard. Changed tide or vessel freeboard requires a separately checked boarding arrangement. Stair ascent gains 6 m; no boat reaches refuge floor directly.'
a['details']=[dict(id='D08-A',name='Dock boarding stair',width_m=1.8,risers=10,riser_m=.15,treads=9,tread_m=.3,rise_m=1.5,run_m=2.7,top_xyz=[11.5,-21,-6],bottom_xyz=[11.5,-18.3,-7.5],note='Stair descends north within landing footprint. Vessel secures at the north edge; boarding gap verified by crew. No all-tide accessibility claim.'),dict(id='D08-B',name='High path ascent',width_m=1.8,flights=4,risers_per_flight=10,riser_m=.15,treads_per_flight=9,tread_m=.45,rise_per_flight_m=1.5,run_per_flight_m=4.05,landing_length_m=1.8,flight_endpoints_xyz=[[[25,-34,-6],[29.05,-34,-4.5]],[[30.85,-34,-4.5],[34.9,-34,-3]],[[36.7,-34,-3],[40.75,-34,-1.5]],[[42.55,-34,-1.5],[46.6,-34,0]]],top_exit_xyz=[78,-34,0],note='Four straight eastbound flights, three 1.8 m landings; total rise 6 m, stair-and-landing run 21.6 m. F10 connects dock to the west bottom landing. Top walkway continues east at z=0 within F09 to the arch, whose southwest approach joins R2. All walking edges guarded to 1.1 m. Arch underside z=-3 over channel: nominal water clearance 5 m at z=-8, rechecked for actual vessel and tide. No unmeasured ledge leap.')]
a['routes'][-1]['points_m']=[[11.5,-21],[25,-21],[25,-34],[46.6,-34],[78,-34]]
for s0 in sites:
 s0.setdefault('details',[])
 s0['geometry_status']='Resolved fictional production layout; not certified construction.'

def esc(t):return html.escape(str(t))
pal={'land':'#d4dac4','rock':'#bec8c5','water':'#95c7d9','habitat':'#bdc889','span':'#b79a66','anchor':'#f1c66a','court':'#ddcba5','subfloor':'#c5b8b8','shaft':'#4a5d67','stair':'#b7a681','ramp':'#c7aa74','overhead':'#c1b3d0','dock':'#b99e79'}
for s in sites:
 b=s['baseline'];ww,dd=b['width_m'],b['depth_m'];scale=min(680/ww,425/dd);ox=420;oy=340
 def xy(x,y):return ox+x*scale,oy-y*scale
 a=['<svg xmlns="http://www.w3.org/2000/svg" width="840" height="880" viewBox="0 0 840 880">','<rect width="840" height="880" fill="#f8f5e9"/>','<style>text{font-family:DejaVu Sans,sans-serif;fill:#163e40} .tiny{font-size:10px} .small{font-size:12px} .title{font-size:26px;font-weight:bold}</style>',f'<text x="40" y="40" class="small">MADGER WORLD BIBLE 3.3 / HABITAT BLUEPRINT / {s["id"]}</text>',f'<text x="40" y="78" class="title">{esc(s["name"])}</text>',f'<text x="40" y="105" class="small">{ww} x {dd} m | local metres, north up | regional {s["regional_position_km"]} km</text>']
 x,y=xy(-ww/2,dd/2);a.append(f'<rect x="{x}" y="{y}" width="{ww*scale}" height="{dd*scale}" fill="#ece9d8" stroke="#163e40"/>')
 for gx in range(-int(ww/2),int(ww/2)+1,10):
  x1,y1=xy(gx,-dd/2);x2,y2=xy(gx,dd/2);a.append(f'<path d="M{x1} {y1} L{x2} {y2}" stroke="#d4d5c7" stroke-width="0.5"/>')
 for gy in range(-int(dd/2),int(dd/2)+1,10):
  x1,y1=xy(-ww/2,gy);x2,y2=xy(ww/2,gy);a.append(f'<path d="M{x1} {y1} L{x2} {y2}" stroke="#d4d5c7" stroke-width="0.5"/>')
 for f in s['features']:
  xx,yy,fw,fh=f['box_m'];x,y=xy(xx,yy+fh)
  a.append(f'<rect x="{x}" y="{y}" width="{fw*scale}" height="{fh*scale}" fill="{pal[f["kind"]]}" fill-opacity="0.8" stroke="#526867" stroke-width="1"/>')
  tx,ty=xy(xx+fw/2,yy+fh/2);a.append(f'<text x="{tx}" y="{ty+3}" text-anchor="middle" class="tiny">{f["id"]}</text>')
 rf=b['refuge'];cx,cy,_=rf['center_m'];rw,rd=rf['width_m'],rf['depth_m'];x,y=xy(cx-rw/2,cy+rd/2);a.append(f'<rect x="{x}" y="{y}" width="{rw*scale}" height="{rd*scale}" fill="#f4e2b6" stroke="#163e40" stroke-width="2"/>');tx,ty=xy(cx,cy);a.append(f'<text x="{tx}" y="{ty+3}" text-anchor="middle" class="tiny">REFUGE</text>')
 for r in s['routes']:
  pts=' '.join(f'{xy(*p)[0]},{xy(*p)[1]}' for p in r['points_m']);a.append(f'<polyline points="{pts}" fill="none" stroke="#b3483e" stroke-width="2.4" stroke-dasharray="6 3"/>');tx,ty=xy(*r['points_m'][0]);a.append(f'<text x="{tx+6}" y="{ty-7}" class="small">{r["id"]}</text>')
 # Explicit map dimensions and ten-metre grid scale.
 lx,ly=xy(-ww/2,-dd/2);rx,_=xy(ww/2,-dd/2);a.append(f'<path d="M{lx} {ly+16} L{rx} {ly+16}" stroke="#163e40"/><text x="420" y="{ly+32}" text-anchor="middle" class="small">{ww} m</text>')
 a.append('<text x="788" y="145" class="small">N ↑</text>');a.append('<text x="40" y="602" class="small">10 m grid. Red dashed = route centreline. IDs key to the geometry register.</text>')
 for i,f in enumerate(s['features']):
  xx,yy,fw,fh=f['box_m'];cx=40+(i%2)*390;cy=630+(i//2)*21;a.append(f'<text x="{cx}" y="{cy}" class="tiny">{f["id"]} {esc(f["name"])} | {fw:g} x {fh:g} m | z {f["z_m"]}</text>')
 yy=630+math.ceil(len(s['features'])/2)*21+12
 for r in s['routes']:
  a.append(f'<text x="40" y="{yy}" class="tiny">{r["id"]} {esc(r["name"])} | {r["width_m"]} m wide | {esc(r["mode"])} | z {r["z_m"]}</text>');yy+=20
 a.append('<text x="40" y="845" class="tiny">Fictional production geometry. Read elevation, condition and access notes in the companion volume.</text></svg>')
 (R/'plans'/f'HAB-{s["id"]}.svg').write_text('\n'.join(a))
 # Real geometry checks: no edited inherited footprints or outside features.
 assert s['baseline']==next(x for x in B['encounter_plans'] if x['id']==s['id'])
 for f in s['features']:
  xx,yy,fw,fh=f['box_m'];assert xx>=-ww/2 and yy>=-dd/2 and xx+fw<=ww/2 and yy+fh<=dd/2,(s['id'],f['id'])
 for r in s['routes']:
  for x,y in r['points_m']:assert -ww/2<=x<=ww/2 and -dd/2<=y<=dd/2
(O/'Habitat_Plans.json').write_text(json.dumps(dict(edition='3.3.0',units='metres',sites=sites),indent=2))
print('Four habitat sheets, inherited bounds and refuge footprints verified.')
