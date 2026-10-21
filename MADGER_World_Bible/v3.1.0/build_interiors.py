"""Add reproducible interior dressing to unchanged 3.0 floor geometry."""
from pathlib import Path
import json,csv,math,html
ROOT=Path(__file__).resolve().parent
D=json.loads((ROOT/'output/Living_Places.json').read_text())
BASE_DIR=ROOT.parent/'v3.0.0' if (ROOT.parent/'v3.0.0/World_Atlas.json').exists() else ROOT/'source'
BASE=json.loads((BASE_DIR/'Blueprint_Data.json').read_text())
ATLAS=json.loads((BASE_DIR/'World_Atlas.json').read_text())
(ROOT/'plans').mkdir(exist_ok=True)
CHAR={x['id']:x for x in ATLAS['characters']}
GEO={x['id']:x for x in BASE['signature_building_plans']}

def rect_overlap(a,b):
 return min(a[0]+a[2],b[0]+b[2])-max(a[0],b[0])>1e-6 and min(a[1]+a[3],b[1]+b[3])-max(a[1],b[1])>1e-6

def ordinary(room):
 n=room.lower()
 if n.startswith('guest'): return ['Paired sleeping cots','Personal storage chest','Bedside lamp table','Folded bedding rack']
 if 'kitchen' in n:return ['Preparation counter','Cold pantry cabinet','Serving-cart parking','Covered wash bench']
 if 'tool' in n:return ['Numbered tool cabinet','Material stock rack','Repair-parts drawers','Inspection table']
 if 'wash' in n:return ['Wash basin cabinet','Work desk and chair','Supply cabinet','Records shelf']
 if 'archive' in n:return ['Catalogued record cabinet','Copying desk and chair','Secure document chest','Returns trolley']
 if 'dispatch' in n:return ['Dispatch desk and chair','Message-sort cabinet','Instrument rack','Waiting bench']
 if 'dry store' in n:return ['Dry ration cabinet','Blanket rack','Water-vessel stand','Equipment crate rack']
 if 'guide' in n:return ['Wash basin cabinet','Guide desk and chair','Route-record cabinet','Drying rail']
 if 'shelter' in n:return ['Rest cot','Dry clothing cabinet','Assessment seat','Blanket chest']
 if 'stalls' in n:return ['Display counter','Storage cabinet','Sorting table','Packing bench']
 if 'assembly' in n:return ['Movable assembly bench','Materials rack','Test jig stand','Parts trolley']
 if 'bench' in n:return ['Work bench','Tool cabinet','Inspection stand','Parts drawers']
 return ['Work table','Supply cabinet','Waiting bench','Display stand']

def dimensions(name):
 n=name.lower()
 if any(k in n for k in ['frame','bench','table','desk','counter','cots']):return (3.0,1.25,0.82)
 if any(k in n for k in ['board','stand','cord','display']):return (1.15,.55,1.65)
 if 'mat' in n:return (1.4,.8,.03)
 if any(k in n for k in ['cabinet','rack','shelf','drawers','rail']):return (2.5,.7,1.8)
 return (1.6,.8,.8)

checks=[]
for i,p in enumerate(D['landmarks']):
 g=p['geometry']; assert g==GEO[p['building_id']]
 rooms=g['floors'][0]['rooms']; focus=next(r for r in rooms if r['name']==p['focus_room'])
 props=[]
 def add(name,room,slot,signature=False,custom=None):
  w,d,h=dimensions(name)
  w=min(w,room['w']/2-1.35); d=min(d,room['d']/2-1.35)
  corners=[(room['x']+.55,room['y']+.55),(room['x']+.55,room['y']+room['d']-.55-d),(room['x']+room['w']-.55-w,room['y']+.55),(room['x']+room['w']-.55-w,room['y']+room['d']-.55-d)]
  x,y=corners[slot]
  if custom:x,y,w,d,h=custom
  center=[round(x+w/2,3),round(y+d/2,3),round(h/2,3)]
  prop={'id':p['id']+f'-P{len(props)+1:02d}','name':name,'room':room['name'],'signature':signature,'x_m':round(x,3),'y_m':round(y,3),'width_m':w,'depth_m':d,'height_m':h,'rotation_deg':0,'mount':'floor','footprint_kind':'placement envelope; includes seat where named','world_center_m':[round(g['center_m'][0]-g['width_m']/2+center[0],3),round(g['center_m'][1]-g['depth_m']/2+center[1],3),round(g['center_m'][2]+center[2],3)]}
  props.append(prop)
 if i==2:
  # Six tables are an established supper tradition; all six exist in this room.
  sig=p['signature_props']; add(sig[0],focus,0,True,(.6,.5,3,1.1,.8))
  add(sig[1],focus,0,True,(.6,5.2,1.2,.55,1.3))
  add(sig[2],focus,0,True,(8.3,5.2,1.1,.6,1.8))
  add(sig[3],focus,0,True,(6.4,5.2,1.4,.8,.03))
  for k,(x,y) in enumerate([(6.4,.5),(.6,2),(6.4,2),(.6,6.4),(6.4,6.4)],2):add(f'Destination table {k}',focus,0,False,(x,y,3,1.1,.8))
 elif i==12:
  west=rooms[0];east=rooms[2]
  for k,n in enumerate(p['signature_props']):add(n,west if k<2 else east,k%2,True)
 else:
  # White's paired fitting bench is the southwest anchor used in the story.
  slots=[1,3,0,2] if i==1 else [0,1,2,3]
  for k,n in enumerate(p['signature_props']):add(n,focus,slots[k],True)
 for r in rooms:
  if r==focus or any(z in r['name'].lower() for z in ['passage','aisle']):continue
  if i==12:
   for k,n in enumerate(['Visitor seat','Public copy desk']):add(n,r,k+2)
  else:
   for k,n in enumerate(ordinary(r['name'])):add(n,r,k)
 # Named removable story kit uses free corners, and is reset after the scene.
 p['props']=props
 p['coordinate_rule']='Metres. Local southwest outside corner at (0,0); x east, y north, z above ground-floor datum. All inherited rotations are 0 degrees. World position = settlement-local building center minus half footprint plus local point. Settlements have separate local origins.'
 p['ground_floor_only']=True
 p['cast_names']=[CHAR[c]['name'] for c in p['cast']]
 p['furniture_state']='Normal day; portable story kit and occupancy changes are logged per scene. No additional walls, openings, floors or doors.'
 target=next((r for r in rooms if r['name']==props[0]['room']),focus)
 p['cameras']=[{'id':'C1','room':target['name'],'position_m':[target['x']+target['w']/2,target['y']+target['d']/2,1.55],'look_at_prop':props[0]['id'],'lens_mm':35,'note':'Interior dialogue anchor; stage cast on the open room side of the prop. No pan through walls.'}]
 p['art']={'file':f'INTERIORS-{1 if i<4 else 2 if i<7 else 3 if i<10 else 4:02d}'+('-v2.png' if i<4 or i>=10 else '.png'),'grid':[2,2] if i<4 else [1,3],'column':i%2 if i<4 else 0,'row':i//2 if i<4 else (i-4)%3,'authority':'Atmosphere reference, not measured geometry. Use this floor plan for walls, apertures, floor heights and prop positions.'}
 for r in rooms:
  rp=[q for q in props if q['room']==r['name']]
  assert not rp or not any(z in r['name'].lower() for z in ['passage','aisle'])
  for q in rp:
   assert q['x_m']>=r['x']+.25 and q['y_m']>=r['y']+.25
   assert q['x_m']+q['width_m']<=r['x']+r['w']-.25 and q['y_m']+q['depth_m']<=r['y']+r['d']-.25
   # A continuous 1.6m cross connects all inherited mid-wall doors.
   a=[q['x_m'],q['y_m'],q['width_m'],q['depth_m']]
   assert not rect_overlap(a,[r['x']+r['w']/2-.8,r['y'],1.6,r['d']]),(p['name'],q['name'],'vertical')
   assert not rect_overlap(a,[r['x'],r['y']+r['d']/2-.8,r['w'],1.6]),(p['name'],q['name'],'horizontal')
  for j,q in enumerate(rp):
   for b in rp[j+1:]:assert not rect_overlap([q['x_m'],q['y_m'],q['width_m'],q['depth_m']],[b['x_m'],b['y_m'],b['width_m'],b['depth_m']]),(p['name'],q['name'],b['name'])
 for door in g['floors'][0]['internal_doors']:
  for rn in door['rooms']:
   r=next(x for x in rooms if x['name']==rn)
   if 'passage' in rn.lower() or 'aisle' in rn.lower():continue
   v=door['center_m']; assert abs(v[1]-(r['y']+r['d']/2))<1e-6 if door['orientation']=='V' else abs(v[0]-(r['x']+r['w']/2))<1e-6
 checks.append({'id':p['id'],'unchanged_geometry':True,'props':len(props),'within_room_and_nonoverlapping':True,'clear_midwall_approaches_m':1.6,'central_circulation_unfurnished':True})

stories=json.loads((ROOT/'companion_stories.json').read_text())
for s in stories:
 assert all(c in CHAR for c in s['cast']);s['cast_names']=[CHAR[c]['name'] for c in s['cast']];s['word_count']=len(s['text'].split())
# The portable measuring cord may move during the scene; its reset slot stays P04.
stories[0]['text']=stories[0]['text'].replace('A repaired cord hung from the stop-board easel.','A repaired cord had been borrowed from its stand and hung over the stop-board easel.')
for story in stories: story['word_count']=len(story['text'].split())
D['companion_stories']=stories
D['production_rules']=[
 'Edition 3.0 geometry and the earlier detailed Burrow plans remain authoritative. These thirteen furnished sheets cover ground floors only.',
 'No new hero designs or voices. Use the approved character cards. Snow has ordinary canine behavior and no speech; Bot has mechanical optics and face.',
 'The pilot stays wholly inside the Burrow. Exterior scenes in this volume belong to later, unnumbered story opportunities.',
 'Scene seeds and complete stories are authored options, not events already added to the dated episode ledger. Local histories and normal-day interior dressing are additive writer canon.',
 'Painted panels establish materials and atmosphere. Their perspective openings, decorative arches and ceiling exaggeration are not construction dimensions. Furnished plans and JSON determine actual rooms and placements.',
 'Portable props can be moved deliberately within a shot sequence. Record state changes and reset them; do not generate unrelated room arrangements from frame to frame.',
 'Keep a stable body drawing for dialogue. Animate approved mouth shapes, blinks and intentional gesture changes. These are set assets, not an interpolated video or a finished episode.',
 'Fictional set and game-blockout plans only; no construction engineering certification is implied.'
]
(ROOT/'output/Living_Places.json').write_text(json.dumps(D,ensure_ascii=False,indent=2))
with (ROOT/'output/Interior_Props.csv').open('w') as f:
 cols=['landmark_id','building_id','id','name','room','signature','x_m','y_m','width_m','depth_m','height_m','rotation_deg'];w=csv.DictWriter(f,fieldnames=cols);w.writeheader()
 for p in D['landmarks']:
  for q in p['props']:w.writerow({c:(p['id'] if c=='landmark_id' else p['building_id'] if c=='building_id' else q[c]) for c in cols})

# Exact scalable drawings. Geometry values are inherited; furniture is additive.
def esc(s):return html.escape(str(s))
for p in D['landmarks']:
 g=p['geometry']; w=g['width_m'];h=g['depth_m'];scale=min(700/w,530/h);ox=65+(700-w*scale)/2;oy=135+(530-h*scale)/2
 def xy(x,y):return ox+x*scale,oy+(h-y)*scale
 out=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="840" viewBox="0 0 1200 840">','<rect width="1200" height="840" fill="#f8f5ec"/>']
 def text(x,y,t,size=14,color='#173e3c',weight='normal',anchor='start'):
  out.append(f'<text x="{x:.2f}" y="{y:.2f}" font-family="DejaVu Sans, sans-serif" font-size="{size}" fill="{color}" font-weight="{weight}" text-anchor="{anchor}">{esc(t)}</text>')
 def line(x1,y1,x2,y2,col='#173e3c',sw=2,dash=''):
  out.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="{col}" stroke-width="{sw}"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>')
 def rect(x,y,ww,dd,fill,stroke='#173e3c',sw=2):
  X,Y=xy(x,y+dd);out.append(f'<rect x="{X:.2f}" y="{Y:.2f}" width="{ww*scale:.2f}" height="{dd*scale:.2f}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
 text(48,42,'MADGER / FURNISHED INTERIORS',14,weight='bold');text(48,83,p['name'],30,weight='bold');text(48,110,p['community']+'  |  '+p['id']+'  |  Ground floor / normal day',13)
 text(1150,42,'3.1.0',14,anchor='end');line(48,120,1150,120,'#b4a27c',1)
 for r in g['floors'][0]['rooms']:
  passage=any(z in r['name'].lower() for z in ['passage','aisle'])
  rect(r['x'],r['y'],r['w'],r['d'],'#e1eeea' if passage else '#fffdf8')
  if not passage:
   x1,y1=xy(r['x']+.3,r['y']+r['d']/2);x2,y2=xy(r['x']+r['w']-.3,r['y']+r['d']/2);line(x1,y1,x2,y2,'#8bb9b2',1,'4 5')
   x1,y1=xy(r['x']+r['w']/2,r['y']+.3);x2,y2=xy(r['x']+r['w']/2,r['y']+r['d']-.3);line(x1,y1,x2,y2,'#8bb9b2',1,'4 5')
  X,Y=xy(r['x']+r['w']/2,r['y']+r['d']/2)
  text(X,Y-30,r['name'],12,anchor='middle');text(X,Y-15,f"{r['w']} x {r['d']} m",11,anchor='middle')
 for q in p['props']:
  rect(q['x_m'],q['y_m'],q['width_m'],q['depth_m'],'#d0b682' if q['signature'] else '#e4e3db','#7b755e',1)
  X,Y=xy(q['x_m']+q['width_m']/2,q['y_m']+q['depth_m']/2);text(X,Y+4,q['id'].split('-')[-1],10,'#243a37',anchor='middle')
 for door in g['floors'][0]['internal_doors']:
  x,y=door['center_m'];half=door['width_m']/2
  a=xy(x,y-half) if door['orientation']=='V' else xy(x-half,y); b=xy(x,y+half) if door['orientation']=='V' else xy(x+half,y)
  line(*a,*b,'#fcfaf4',5);line(*a,*b,'#377f9c',2)
 for y,ww in [(0,g['entry']['width_m']),(h,g['secondary_exit']['width_m'])]:
  a=xy(w/2-ww/2,y);b=xy(w/2+ww/2,y);line(*a,*b,'#f8f5ec',6);line(*a,*b,'#377f9c',2)
  X,Y=xy(w/2,y);text(X,Y+(20 if y==0 else 18),('S entry' if y==0 else 'N exit')+f' / {ww} m',11,anchor='middle')
 c=p['cameras'][0];X,Y=xy(*c['position_m'][:2]);out.append(f'<circle cx="{X}" cy="{Y}" r="10" fill="#367b96"/>');text(X,Y+4,'C1',9,'#ffffff',anchor='middle')
 text(45,170,'N',14,weight='bold');line(50,210,50,182,'#173e3c',2);line(50,182,45,191);line(50,182,55,191)
 text(48,705,f"Footprint {w} x {h} m  |  Walls {g['wall_m']} m  |  Floor height {g['floor_height_m']} m",14,weight='bold')
 text(48,729,f"Building center {g['center_m']} m  |  Rotation {g['rotation_deg']} deg  |  {g['module']}",12)
 text(48,751,'Local origin: southwest corner. Dashed crosses reserve 1.6 m clear approaches.',12)
 text(48,773,'Upper floors, stairs, windows and outside courts: unchanged 3.0 master geometry.',12)
 text(48,795,'C1: room-center dialogue anchor, eye height 1.55 m, 35 mm lens. Exact props: CSV / JSON.',12)
 text(810,148,'PROP REGISTER',15,weight='bold');text(810,170,'Gold = signature prop; gray = daily-use dressing',10)
 for j,q in enumerate(p['props']):text(810,196+j*18,q['id'].split('-')[-1]+'  '+q['name'],11)
 text(810,730,'NORMAL-DAY RESET',12,weight='bold');text(810,751,'Circulation stays free of fixed furniture.',11);text(810,770,'Portable props require a scene-state log.',11);text(810,789,'Fictional production / game set plan.',11)
 out.append('</svg>');(ROOT/'plans'/f"{p['id']}.svg").write_text('\n'.join(out))
validation={'edition':'3.1.0','base_commit':D['base_commit'],'landmarks':len(D['landmarks']),'prop_count':sum(len(p['props']) for p in D['landmarks']),'cast_references_valid':True,'all_checks_passed':True,'checks':checks,'story_word_counts':{s['title']:s['word_count'] for s in stories},'scope':'Fictional geometry and continuity assertions; not real-world fire, building or accessibility certification.'}
(ROOT/'output/VALIDATION.json').write_text(json.dumps(validation,indent=2));print(json.dumps({k:v for k,v in validation.items() if k!='checks'},indent=2))
