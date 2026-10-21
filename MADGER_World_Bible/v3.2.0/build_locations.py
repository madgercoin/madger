from pathlib import Path
import json,copy,html,math,csv
R=Path(__file__).resolve().parent;BASE=R.parent/'v3.0.0' if (R.parent/'v3.0.0/World_Atlas.json').exists() else R.parent/'world-depth/source'
B=json.loads((BASE/'Blueprint_Data.json').read_text());W=json.loads((BASE/'World_Atlas.json').read_text());D=json.loads((R/'output/Conflict_Bible.json').read_text())
(R/'plans').mkdir(exist_ok=True);S={x['id']:x for x in B['signature_building_plans']};M={x['id']:x for x in B['modules']};E={x['id']:x for x in B['encounter_plans']};L=[]
def building(id,title,floor,focus,owner,history,daily,turn,props,art):
 if id in S:g=copy.deepcopy(S[id]);instance=copy.deepcopy(g)
 else:
  instance=copy.deepcopy(next(x for x in B['building_instances'] if x['id']==id));g=copy.deepcopy(M[instance['module']]);g.update(instance)
 f=copy.deepcopy(g['floors'][floor]);p=[]
 for roomname,names in props.items():
  room=next(r for r in f['rooms'] if r['name']==roomname)
  for i,name in enumerate(names):
   w=min(2.8,room['w']/2-1.4);d=.9;h=.8 if any(x in name.lower() for x in ['table','bench','cot','seat','desk','cart']) else 1.6
   corners=[(.6,.6),(.6,room['d']-.6-d),(room['w']-.6-w,.6),(room['w']-.6-w,room['d']-.6-d)]
   x,y=corners[i];p.append({'id':f'F{len(p)+1:02d}','name':name,'room':roomname,'box':[room['x']+x,room['y']+y,w,d],'height_m':h,'placement':'portable furniture; fixed room geometry unchanged'})
 L.append(dict(id=id,name=title,type='building',level=floor,focus_room=focus,ownership=owner,history=history,daily_life=daily,dramatic_use=turn,base_instance=instance,geometry=g,floor=f,features=p,art=art,origin='Southwest building corner; metres. Existing building center is settlement-local.',detail_authority='Normal-state furniture is new. Inherited building placement, footprint, rooms, doors and levels are unchanged.'))
building('EXT-01-B03','Kest Depot',0,'West racks','Privately operated by Gilt Ledger; Reedbank remains independent.',
'The building began as a raised freight store serving ferry traffic. Veyra’s business made its reliable handling a public reputation and its selective access a source of power. Flood marks on the outer steps record maintenance, not supernatural immunity. The refuge and public charter records elsewhere in Reedbank are not owned by the depot.',
'Bale compares a physical count to the day’s dispatch instructions. Legitimate customers collect orders while disputed allocations wait in a marked side bay. Workers use both large wagon doors; no stack occupies the six-metre freight aisle. Veyra meets difficult visitors on the floor when she wants the available stock to speak for her.',
'A withheld crate can sit in full view. Suspense comes from knowing it could leave, not from finding a secret chamber. The marked hold bay changes only through a documented order, making a worker’s refusal or release visible to witnesses.',
{'West racks':['Dispatch comparison table','Marked hold-bay rack','Wagon inspection bench','Recipient request case'],'East racks':['Ready-order racks','Packing bench','Return-goods rack','Allocation board']},dict(file='THREATS-01.png',grid=[2,2],column=0,row=0))
building('EXT-03-U04','Slate Arcade Rooms',1,'Guest E','Ordinary lodging business; a temporary Glass Thread lease does not implicate the landlord or other guests.',
'This is a new name for the existing EXT-03-U04 lodging building, fifty metres east and one hundred north of Latchford’s civic origin. Its trade is rooms for crews in transit. Glass Thread uses one upper guest room during a later story, then moves on. The public North Relay Rooms remain a separate legitimate institution.',
'Guests share the ordinary stair passage and washing facilities. In Guest E, a folding cot, document table and portable repair bench make a rented room serve two purposes. Travel bags can be packed quickly because this is a temporary stay, not an underground headquarters. Quiet maintenance is possible; industrial work and permanent aerials are not added.',
'A lease date and a witness can establish presence without proving every act of the tenant. An unrelated guest’s complaint about noise matters more than a theatrical hidden emblem. The crew’s departure changes occupancy and prop state, not the town plan.',
{'Guest E':['Document table and chair','Portable relay repair bench','Folded guest cot','Three travel-bag rack'],'Guest D':['Sleeping cot','Guest storage chest'],'Guest F':['Sleeping cot','Guest storage chest'],'Guest G':['Sleeping cot','Guest storage chest'],'Guest C':['Sleeping cot','Guest storage chest'],'Wash/store':['Wash cabinet','Clean linen rack']},dict(file='THREATS-01.png',grid=[2,2],column=1,row=0))
building('EXT-08-B03','Salt Crown Counting House',0,'Public reading','Kavar’s accounts business; not owner of every public well.',
'The counting house gained standing by making water claims easier to compare. Public counters and carefully maintained measures still perform useful work. Kavar exploited that trust by treating his certificate as the necessary condition of access and concealing the decision to keep a competing pump closed.',
'Claimants wait in the public reading room. Dispatch staff compare deliveries with accounts. Original files and private customer information remain in distinct archive rooms; a claim of wrongdoing does not turn every personal record into a public exhibit. No machinery here can switch off the desert’s wells.',
'A polished measure can be honest while the account beside it is false. The scene turns when a service witness describes a repair that the dated record says never happened. Even after that proof, Maela must explain a genuine limit on extraction.',
{'Public reading':['Certificate comparison desk','Public measure display','Waiting seats','Posted allocation board'],'Dispatch':['Delivery desk','Container tally rack'],'Archive A':['Service record cabinet','Inspection comparison table'],'Archive B':['Private account cabinet','Supervised reading desk']},dict(file='THREATS-01.png',grid=[2,2],column=0,row=1))
building('EXT-11-B02','Echo Archive Council Room',1,'Catalog A','Still Bell institution; divided between disclosure and concentrated authority.',
'The council uses upper Catalog A for small hearings around movable furniture. This does not create a new wing or change the public ground floor developed in Living Places. The room holds records made by several generations, including people whose knowledge was careful and whose decisions were still self-serving.',
'Archivists bring only the required copies to a hearing. Insulated sample cases remain closed except during supervised examination. Most disagreement is about evidence and authority, not a contest of magical powers. A modern alteration can sit beside a reliable old observation without contaminating the entire collection.',
'Ysolde places the two versions side by side and discloses her own family’s benefit from closure. Ossa’s strongest response is a correct account of the actual danger. The room must accommodate both admissions at once.',
{'Catalog A':['Council comparison table','Original-order case','Insulated sample cabinet','Independent report stand'],'Catalog B':['Copy desk','Catalog cabinet'],'Archive A':['Restricted record cabinet','Returns cart'],'Archive B':['Family record cabinet','Supervised reading desk']},dict(file='THREATS-01.png',grid=[2,2],column=1,row=1))
def site(id,title,owner,history,daily,turn,features,routes,art):
 g=copy.deepcopy(E[id]);base=copy.deepcopy(next(s for s in W['sites'] if s['id']==id));L.append(dict(id=id,name=title,type='site',ownership=owner,history=history,daily_life=daily,dramatic_use=turn,geometry=g,base_site=base,features=[dict(id=f'T{i+1:02d}',name=n,box=box,kind=k) for i,(n,box,k) in enumerate(features)],routes=routes,art=art,origin='Site center (0,0); metres, x east, y north. Elevation is relative to the occupied deck or terrace, not sea level.',detail_authority='Fixed 3.0 site bounds, regional coordinates and refuge footprints retained. New measured feature and route layers refine the generic encounter field.'))
site('SITE-07','Ashmouth Freight Yard','Riven Claw occupies a disused freight site; civilian Cinder Cuts is elsewhere.',
'After freight was diverted, this loading terrace lost its regular traffic. It retains a refuge lodge and service approaches because those were useful before Brakka arrived. The band’s occupation turns a workplace into a coercive store without making its original builders or the neighboring population complicit.',
'Dreg keeps crates sorted by use and remembers which harness needs repair. The west approach admits wagons; the east route is a narrow foot path. A fenced gas trough stays outside the working court. Ashmaws follow heat plumes in the wider terrain; neither Brakka nor Dreg commands them.',
'The loading platform makes a public order visible. When Brakka demands spectacle and Dreg protects usable supplies, everyone on the floor sees the split. Escape follows the registered approaches; the shelter offers cover and rest, not a hidden passage to town.',
[('Refuge lodge',[-10,30.4,20,16],'refuge'),('West covered freight',[-40,4,18,12],'storage'),('East covered freight',[22,4,18,12],'storage'),('Loading platform',[-20,-45,40,10],'deck'),('Fenced gas trough',[30,28,32,12],'hazard'),('Share-count table',[-28,20,5,3],'prop'),('Harness repair station',[23,20,5,3],'prop')],
[{'name':'Wagon approach / 6 m','width_m':6,'points':[[-90,0],[-50.4,0],[0,-30]],'mode':'wagon'}, {'name':'Foot approach / 1.5 m','width_m':1.5,'points':[[90,0],[50.4,0],[0,-30]],'mode':'foot'},{'name':'Shelter connection / 3 m','width_m':3,'points':[[0,-30],[0,30.4]],'mode':'foot'}],dict(file='THREATS-02.png',grid=[1,2],column=0,row=0,crop_px=[0,45,1536,452]))
site('SITE-05','Blackwake Mooring','Abandoned mooring occupied by Serik’s three-craft crew.',
'The platform was built for regulated cargo transfer within a local liftstone field. Its counterweights and load rules are older than Serik’s claim to the place. His occupation gives him a berth and a stage; it does not give him ownership of the air routes or control over the field.',
'One main winch deck feeds three docking arms. The rear refuge lodge uses the existing two shelter bays as separate refuge cells. A short connector links it to the deck. Each craft has a finite load envelope and must be counted in the scene state: berthed, arriving or away. Three small craft cannot become an unseen reserve fleet.',
'Eri recognizes a routine loading limit that Serik is trying to conceal. The heroes free people by making a viable departure possible, not by cutting every support and hoping the platform floats anyway. Captives and cargo compete for capacity; useful evidence may have to be left behind.',
[('Refuge lodge / two cells',[-10,24,20,16],'refuge'),('Main winch deck',[-32,-18,64,38],'deck'),('West docking arm',[-67,-12,35,8],'deck'),('East docking arm',[32,-12,35,8],'deck'),('South docking arm',[-4,-45,8,27],'deck'),('Refuge connector',[-3,20,6,4],'deck'),('Winch working envelope',[-8,-4,16,12],'prop'),('West craft berth envelope',[-77,0,20,9],'berth'),('East craft berth envelope',[57,0,20,9],'berth'),('South craft berth envelope',[-10,-49,20,8],'berth'),('West boarding plank',[-61.5,-4,3,4],'deck'),('East boarding plank',[58.5,-4,3,4],'deck')],
[{'name':'Deck circulation','width_m':2,'points':[[-60,0],[-60,-8],[-20,-8],[-20,14],[0,14],[0,24]],'mode':'deck'},{'name':'East approach on arm','width_m':2,'points':[[60,0],[60,-8],[20,-8],[20,14],[0,14]],'mode':'deck'},{'name':'South approach on arm','width_m':2,'points':[[0,-40],[0,-14],[-20,-14],[-20,14]],'mode':'deck'}],dict(file='THREATS-02.png',grid=[1,2],column=0,row=1,crop_px=[0,500,1536,1024]))
site('SITE-06','The Cut Span','A genuinely closed crossing inspected by Still Bell and independent reviewers.',
'The deliberate severing belongs to the historical response to the Severance. Ossa’s later forged prohibition is a separate act. The north and south inspection places allow evidence to be gathered without reopening the gap. The longer foot detour still takes two days and leaves this sheet.',
'Inspectors approach their own abutment, compare marks and stop at the guarded edge. Detached couplings are examined behind the north rail. The north refuge remains at its inherited position; a measured south inspection lodge completes the two-house description already established in the atlas.',
'Expose a false order beside a dangerous structure that deserves a truthful warning. A refusal to reconnect can be the responsible outcome even when the official who demanded it has lied. No visual hint should turn the gap into an easy leap for the heroes.',
[('North inspection refuge',[-10,24,20,16],'refuge'),('South inspection lodge',[-10,-42,20,16],'refuge'),('North abutment',[-18,10,36,14],'deck'),('South abutment',[-18,-24,36,14],'deck'),('Blocked span gap',[-90,-10,180,20],'hazard'),('Detached coupling display',[-30,18,7,4],'prop')],
[{'name':'North safe approach / 2 m','width_m':2,'points':[[25,50],[25,26],[14,26],[14,16],[0,16]],'mode':'foot'},{'name':'South safe approach / 2 m','width_m':2,'points':[[25,-50],[25,-26],[14,-26],[14,-16],[0,-16]],'mode':'foot'}],dict(file='THREATS-03.png',grid=[1,1],column=0,row=0))

# Bounds, genuine inherited identities and route hazards are checked, without pretending to engineering certification.
def overlap(a,b):return min(a[0]+a[2],b[0]+b[2])>max(a[0],b[0])+1e-7 and min(a[1]+a[3],b[1]+b[3])>max(a[1],b[1])+1e-7
checks=[]
for l in L:
 g=l['geometry']
 if l['type']=='building':
  if l['id'] in S:assert g==S[l['id']]
  else:assert l['base_instance']==next(x for x in B['building_instances'] if x['id']==l['id'])
  for q in l['features']:
   room=next(r for r in l['floor']['rooms'] if r['name']==q['room']);x,y,w,h=q['box'];assert x>=room['x']+.25 and y>=room['y']+.25 and x+w<=room['x']+room['w']-.25 and y+h<=room['y']+room['d']-.25
   assert not overlap(q['box'],[room['x']+room['w']/2-.8,room['y'],1.6,room['d']]);assert not overlap(q['box'],[room['x'],room['y']+room['d']/2-.8,room['w'],1.6])
 else:
  assert g==E[l['id']]
  for q in l['features']:
   x,y,w,h=q['box'];assert -g['width_m']/2<=x and x+w<=g['width_m']/2 and -g['depth_m']/2<=y and y+h<=g['depth_m']/2
  assert l['features'][0]['box']==[g['refuge']['center_m'][0]-g['refuge']['width_m']/2,g['refuge']['center_m'][1]-g['refuge']['depth_m']/2,g['refuge']['width_m'],g['refuge']['depth_m']]
  for route in l['routes']:
   for a,b in zip(route['points'],route['points'][1:]):
    for k in range(101):
     x=a[0]+(b[0]-a[0])*k/100;y=a[1]+(b[1]-a[1])*k/100;r=route['width_m']/2
     if l['id']=='SITE-05':
      assert any(f['kind'] in ['deck','refuge'] and f['box'][0]-1e-6<=x<=f['box'][0]+f['box'][2]+1e-6 and f['box'][1]-1e-6<=y<=f['box'][1]+f['box'][3]+1e-6 for f in l['features']),('unsupported route',x,y)
     for q in l['features']:
      if q['kind'] in ['hazard','storage','prop']:assert not overlap([x-r,y-r,2*r,2*r],q['box']),(l['id'],route['name'],q['name'])
  if l['id']=='SITE-06':assert all(all(y>=10 for x,y in route['points']) or all(y<=-10 for x,y in route['points']) for route in l['routes'])
 checks.append({'id':l['id'],'inherited_geometry_preserved':True,'features_within_bounds':True,'circulation_checks':True})
D['locations']=L
D['character_addenda'][6]['irreversible_choice']='Orders a destructive display even after Dreg refuses, choosing a damaged legend over the provisions that sustain the crew.'
D['character_addenda'][6]['cost_of_change']='Dreg’s refusal becomes a real split and Vessa’s loyalty narrows. Brakka loses people she cannot replace with one louder speech; later survival still leaves room for a different choice.'
(R/'output/Conflict_Bible.json').write_text(json.dumps(D,ensure_ascii=False,indent=2))
(R/'output/Threat_Locations.json').write_text(json.dumps({'edition':'3.2.0','locations':L},ensure_ascii=False,indent=2))

# Draw exact vectors. Layout fills previously schematic site areas, without relocating their inherited anchors.
for l in L:
 g=l['geometry'];is_b=l['type']=='building';ww=g['width_m'];dd=g['depth_m'];xmin=0 if is_b else -ww/2;ymin=0 if is_b else -dd/2;s=min(700/ww,510/dd);ox=58+(700-ww*s)/2;oy=154+(510-dd*s)/2
 out=['<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="840" viewBox="0 0 1200 840">','<rect width="1200" height="840" fill="#faf6ed"/>']
 def xy(x,y):return ox+(x-xmin)*s,oy+(ymin+dd-y)*s
 def txt(x,y,t,size=12,color='#173d3b',anchor='start',bold=False):out.append(f'<text x="{x:.2f}" y="{y:.2f}" font-family="DejaVu Sans,sans-serif" font-size="{size}" fill="{color}" text-anchor="{anchor}" font-weight="{"bold" if bold else "normal"}">{html.escape(str(t))}</text>')
 def line(a,b,color='#245653',width=2,dash=''):
  out.append(f'<line x1="{a[0]:.2f}" y1="{a[1]:.2f}" x2="{b[0]:.2f}" y2="{b[1]:.2f}" stroke="{color}" stroke-width="{width}"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>')
 def rect(box,fill,stroke='#385955',sw=1.5):
  x,y,w,h=box;X,Y=xy(x,y+h);out.append(f'<rect x="{X:.2f}" y="{Y:.2f}" width="{w*s:.2f}" height="{h*s:.2f}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"/>')
 txt(45,40,'MADGER / CONFLICT LOCATIONS',14,bold=True);txt(45,80,l['name'],30,bold=True);txt(45,109,l['id']+' / '+('Level '+str(l['level'])+' / inherited room plan' if is_b else 'Detailed encounter plan / fixed site bounds'),13);txt(1155,40,'3.2.0',13,anchor='end');line((45,125),(1155,125),'#b8a47e',1)
 rect([xmin,ymin,ww,dd],'#eeeae0')
 if is_b:
  for r in l['floor']['rooms']:
   passage=any(z in r['name'].lower() for z in ['passage','aisle']);rect([r['x'],r['y'],r['w'],r['d']],'#e0eee8' if passage else '#fffcf5')
   X,Y=xy(r['x']+r['w']/2,r['y']+r['d']/2);txt(X,Y-5,r['name'],11,anchor='middle');txt(X,Y+11,f"{r['w']} x {r['d']} m",10,anchor='middle')
  for door in l['floor']['internal_doors']:
   x,y=door['center_m'];half=door['width_m']/2;a=xy(x,y-half) if door['orientation']=='V' else xy(x-half,y);b=xy(x,y+half) if door['orientation']=='V' else xy(x+half,y);line(a,b,'#fffcf5',6);line(a,b,'#4e91ac',2)
  if l['level']==0:
   for y,w in [(0,g['entry']['width_m']),(dd,g['secondary_exit']['width_m'])]:
    a=xy(ww/2-w/2,y);b=xy(ww/2+w/2,y);line(a,b,'#faf6ed',7);line(a,b,'#4e91ac',2)
    X,Y=xy(ww/2,y);txt(X,Y+(18 if y==0 else 16),f"{'Entry' if y==0 else 'Exit'} {w} m",10,anchor='middle')
  else:
   X,Y=xy(ww/2,dd-1);txt(X,Y,'Internal stairs',10,anchor='middle')
 else:
  if l['id']=='SITE-05':rect([xmin,ymin,ww,dd],'#dce8e9','#8caaa8',1)
  for q in l['features']:
   color={'refuge':'#ebd2a2','deck':'#dfddd0','hazard':'#d7a29b','storage':'#cbbfa4','prop':'#bfa474','berth':'#dae5ef'}[q['kind']];rect(q['box'],color,'#7d5b54' if q['kind']=='hazard' else '#385955')
  for route in l['routes']:
   for a,b in zip(route['points'],route['points'][1:]):line(xy(*a),xy(*b),'#246e8c',max(2,route['width_m']*s),'6 4')
 if is_b:
  for q in l['features']:rect(q['box'],'#d6bd8c','#8d7954',1)
 for q in l['features']:
  x,y,w,h=q['box'];label=[x+w/2,y+h/2]
  if l['id']=='SITE-05' and q['id']=='T02':label=[25,2]
  if l['id']=='SITE-06' and q['id']=='T03':label=[0,20]
  if l['id']=='SITE-06' and q['id']=='T04':label=[0,-20]
  X,Y=xy(*label);txt(X,Y+4,q['id'],10,anchor='middle',bold=True)
 txt(28,170,'N',13,bold=True);line((32,205),(32,180));line((32,180),(27,189));line((32,180),(37,189))
 # Scaled bar remains exact in PDF and SVG at any page zoom.
 bar=5 if is_b else 20;line((60,692),(60+bar*s,692),'#173d3b',3);txt(60,710,'0',10);txt(60+bar*s,710,str(bar)+' m',10,anchor='end')
 txt(810,156,'REGISTER',15,bold=True);y=181
 import textwrap
 for q in l['features']:
  label=q['id']+'  '+q['name']
  for ss in textwrap.wrap(label,43):txt(810,y,ss,11);y+=16
  txt(825,y,' x,y,w,d = '+', '.join(str(round(n,2)) for n in q['box'])+' m',9,'#6f7266');y+=16
 if not is_b:
  txt(810,y+8,'BLUE = APPROACH / CIRCULATION',10,bold=True);y+=28
  for route in l['routes']:
   for ss in textwrap.wrap(route['name'],43):txt(810,y,ss,10);y+=15
 else:
  txt(810,y+12,'FURNITURE = PORTABLE NORMAL STATE',10,bold=True);txt(810,y+31,'Central passages and door approaches stay clear.',10)
 txt(45,744,f"Bounds {ww} x {dd} m. "+('Local origin at southwest building corner.' if is_b else 'Local origin at site center. Red = excluded hazard.'),12,bold=True)
 if is_b:
  height='Roof eaves 6 m per MOD-11 notes; one occupied level.' if l['id']=='EXT-01-B03' else f"Level datum +{l['level']*3.2:.1f} m; occupied floor height 3.2 m."
  txt(45,766,height+' Building center '+str(g['center_m'])+' m.',11)
 else:txt(45,766,'Inherited regional position '+str([l['base_site']['x'],l['base_site']['y']])+' km; refuge footprint unchanged.',11)
 notes='Upper access is by existing stairs; no new outside door.' if is_b and l['level'] else 'Detailed geometry and scene states: Threat_Locations.json.'
 if l['id']=='SITE-06':notes='20 m gap stays blocked. North and south paths never connect here. Two-day detour is off-sheet.'
 if l['id']=='SITE-05':notes='Exactly three craft. Berths are parking envelopes, not extra walkable decks. Surrounding blue is open air.'
 txt(45,788,notes,11);txt(45,811,'Fictional production / game blockout. Original appearance references do not override these dimensions.',10)
 out.append('</svg>');(R/'plans'/f"TH-{l['id']}.svg").write_text('\n'.join(out))
V={'edition':'3.2.0','checks':checks,'locations':len(L),'building_furniture':sum(len(l['features']) for l in L if l['type']=='building'),'site_features':sum(len(l['features']) for l in L if l['type']=='site'),'pilot_seconds':sum(b['end']-b['start'] for b in D['pilot_reveal_lock']['beats']),'cast_refs_valid':all(a['id'] in [c['id'] for c in W['characters']] for a in D['character_addenda']),'no_cut_span_crossing':True,'base_footprints_unchanged':True}
(R/'output/VALIDATION.json').write_text(json.dumps(V,indent=2));print(V)
