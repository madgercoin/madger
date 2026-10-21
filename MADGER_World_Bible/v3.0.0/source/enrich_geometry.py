import json,math
from pathlib import Path
P=Path(__file__).parent/'output';g=json.loads((P/'Blueprint_Data.json').read_text());w=json.loads((P/'World_Atlas.json').read_text())
for m in g['modules']:
 m['dimension_basis']='Nominal wall-center allocation dimensions; partitions are 0.25 m. Clear usable area is smaller. Fictional production layout, not construction certification.'
 m['floors']=[{'level':i,'z_m':i*m['floor_height_m'],'rooms':m['rooms']} for i in range(m['levels'])]
 if m['id']=='MOD-03':
  m['floors'][1]['rooms']=[{'name':n,'x':x,'y':y,'w':a,'d':b} for n,x,y,a,b in [('Suite A',0,0,6,6),('Suite B',6,0,6,6),('Stair/wash',12,0,6,6),('Gallery',0,6,18,2),('Suite C',0,8,12,6),('Stair/store',12,8,6,6)]]
 if m['id']=='MOD-06':
  m['floors'][1]['rooms']=[{'name':('Guest D' if r['name']=='Common room' else 'Guest E' if r['name']=='Kitchen' else 'Guest F' if r['name']=='Guest A' else 'Guest G' if r['name']=='Guest B' else r['name']),**{k:v for k,v in r.items() if k!='name'}} for r in m['rooms']]
 if m['id']=='MOD-10':
  m['floors'][1]['rooms']=[{'name':('Catalog A' if r['name']=='Public reading' else 'Catalog B' if r['name']=='Dispatch' else r['name']),**{k:v for k,v in r.items() if k!='name'}} for r in m['rooms']]
 for f in m['floors']:
  # A deterministic room-adjacency graph places openings on shared boundaries.
  rs=f['rooms'];adj=[]
  for i,a in enumerate(rs):
   for j,b in enumerate(rs[:i]):
    if abs(a['x']-(b['x']+b['w']))<1e-6 or abs(b['x']-(a['x']+a['w']))<1e-6:
     lo=max(a['y'],b['y']);hi=min(a['y']+a['d'],b['y']+b['d'])
     if hi-lo>=1.4:adj.append((i,j,'V',max(a['x'],b['x']),(lo+hi)/2))
    if abs(a['y']-(b['y']+b['d']))<1e-6 or abs(b['y']-(a['y']+a['d']))<1e-6:
     lo=max(a['x'],b['x']);hi=min(a['x']+a['w'],b['x']+b['w'])
     if hi-lo>=1.4:adj.append((i,j,'H',(lo+hi)/2,max(a['y'],b['y'])))
  circ=[i for i,r in enumerate(rs) if any(k in r['name'].lower() for k in ['passage','gallery','aisle','stair'])]
  chosen=[e for e in adj if e[0] in circ or e[1] in circ]
  # The household/workshop core joins the entrance room to the central circulation.
  if not circ:chosen=adj
  connected={0}
  for _ in rs:
   for i,j,*_ in chosen:
    if i in connected:connected.add(j)
    if j in connected:connected.add(i)
  while len(connected)<len(rs):
   edge=next((e for e in adj if (e[0] in connected)!=(e[1] in connected)),None)
   if not edge:break
   chosen.append(edge);connected.update(edge[:2])
  f['internal_doors']=[{'rooms':[rs[i]['name'],rs[j]['name']],'orientation':o,'center_m':[x,y],'width_m':1.2} for i,j,o,x,y in chosen]
  f['circulation_connected']=len(connected)==len(rs)
 m['front_elevation']={'wall_height_m':m['levels']*m['floor_height_m'],'ridge_height_m':m['levels']*m['floor_height_m']+m['depth_m']*.5*math.tan(math.radians(25)),'window_bays':max(2,int(m['width_m']//5)),'entry_width_m':m['entry']['width_m']}
 if m['id']=='MOD-11':m['front_elevation']['wall_height_m']=6;m['front_elevation']['ridge_height_m']=6+m['depth_m']*.5*math.tan(math.radians(25))
for b in g['signature_building_plans']:
 m=next(x for x in g['modules'] if x['id']==b['module']);b['floors']=m['floors'];b['front_elevation']=m['front_elevation']
 # Remove ambiguities in special adaptive uses with explicit room substitutions.
 if 'Pressure' in b['name']:
  b['floors']=json.loads(json.dumps(m['floors']));b['floors'][0]['rooms'][0]={'name':'Vestibules + control','x':0,'y':0,'w':8,'d':10};b['special']='West 8 x 10 m allocation contains two 4 x 4 m vestibules at (0,0) and (4,0), a 2 m control passage y=4..6, and a 4 m deep equipment zone y=6..10. No instant descent.'
# Complete staging envelopes for wildlife; exact anatomy follows visual plates.
sizes=[(8,1.7,1.3),(3,3,1.8),(3.8,1.6,1.2),(24,16,8),(12,22,2),(2.6,5,2.5),(3.4,2.1,1.4),(7,.5,.6),(3.6,1.4,2.6),(.12,.08,.06),(2.4,1.6,1.8),(2.1,.8,1.5)]
for c,sz in zip(w['creatures'],sizes):c['envelope_m']={'length':sz[0],'width_or_span':sz[1],'height':sz[2]};c['scale_note']='Adult representative staging envelope; individuals vary by up to 10%. Not shown at common scale on the art plate.'
nonhero=[c for c in w['characters'] if c['id'] not in ['MADGER','GORILLA_WHITE','MADGER_BOT','SNOW_WHITE']]
for i,c in enumerate(nonhero):c['art']={'file':f'CAST-{i//6+1:02d}.png','column':i%3,'row':(i%6)//3,'grid':[3,2]}
for i,c in enumerate(w['characters'][:4]):c['art']={'file':'HEROES-01.png','column':i,'row':0,'grid':[4,1]}
for c in w['characters']:
 c['performance']={'silhouette':c['design'],'expression_set':['neutral listening','pleased','concerned','frustrated','focused'],'motion_rule':'Use a held body pose for dialogue with separate mouth shapes, blinks and intentional expression changes. Preserve facial landmarks.','limits':c['skills_and_limits']}
 if c['id']=='SNOW_WHITE':c['performance']['expression_set']=['relaxed','alert','playful','uncertain','resting'];c['performance']['motion_rule']='Canine ears, tail, posture and gaze; no speech mouth shapes or human acting gestures.'
world_json=P/'World_Atlas.json';world_json.write_text(json.dumps(w,ensure_ascii=False,indent=2)+'\n');(P/'Blueprint_Data.json').write_text(json.dumps(g,ensure_ascii=False,indent=2)+'\n')
print('Added floor variants, connected internal doors, elevations, creature dimensions and art references')
