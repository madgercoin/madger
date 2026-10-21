import json,math,csv
from pathlib import Path
R=Path(__file__).parent;P=R/'output';w=json.loads((P/'World_Atlas.json').read_text());b=json.loads((R/'source/Burrow_v2.1.json').read_text())
modules=[]
def mod(id,name,W,D,levels,cap,rooms,notes):
 # Room boxes are clear allocation rectangles; 0.25 m partitions are centered on boundaries.
 modules.append({'id':id,'name':name,'width_m':W,'depth_m':D,'levels':levels,'floor_height_m':3.2,'wall_m':0.25,'resident_capacity':cap,'rooms':[dict(zip(['name','x','y','w','d'],r)) for r in rooms],'entry':{'side':'S','offset_m':0,'width_m':2.4},'secondary_exit':{'side':'N','offset_m':0,'width_m':1.8},'notes':notes,'roof':'Pitched timber/truss at 25 degrees unless a regional kit explicitly selects flat insulated or vaulted cover.'})
mod('MOD-01','Courtyard household',12,10,1,4,[('Living',0,0,7,4),('Kitchen',7,0,5,4),('Sleep A',0,6,4,4),('Sleep B',4,6,4,4),('Wash/store',8,6,4,4),('Passage',0,4,12,2)],'One household; two sleeping rooms. No private room is used as the only through-route.')
mod('MOD-02','Terrace residential block',30,20,3,72,[('Flat A',0,0,8,8),('Flat B',8,0,8,8),('Flat C',16,0,8,8),('Stair S',24,0,6,8),('Flat D',0,12,8,8),('Flat E',8,12,8,8),('Flat F',16,12,8,8),('Stair N',24,12,6,8),('Gallery',0,8,30,4)],'Six 64 m2 flats per floor, three floors, four planning residents per flat = 72. Flat interiors use MOD-01 principles scaled to the explicit 8 x 8 m envelope. Each flat has living/kitchen 8 x 3, passage 8 x 1, two sleep rooms 3 x 4 and wash/store 2 x 4. Stair cores have separate exterior discharge. The central gallery connects both cores; entry openings align with the stair landing at the east end, not the schematic center door used by other modules.')
mod('MOD-03','Workshop household',18,14,2,12,[('Workshop',0,0,11,6),('Shop',11,0,7,6),('Gallery',0,6,18,2),('Store',0,8,6,6),('Kitchen',6,8,6,6),('Stair/wash',12,8,6,6)],'Ground-floor work and shared kitchen; upper floor has three household suites. No habitation above a hot forge without a distinct separated block.')
mod('MOD-04','Public exchange hall',30,18,1,0,[('West stalls',0,0,10,18),('Public aisle',10,0,10,18),('East stalls',20,0,10,18)],'Open stall bays connect directly to the aisle. Storage is within each stall allocation. Both ends remain open to public exit courts.')
mod('MOD-05','Common workshop',24,18,1,0,[('Bench room',0,0,10,8),('Assembly',14,0,10,8),('Passage',10,0,4,18),('Tool store',0,8,10,10),('Wash/office',14,8,10,10)],'Ventilation and noise remain in the work district; hot work uses the regional kiln annex rather than an invented exhaust under a home.')
mod('MOD-06','Travelers inn',24,20,2,0,[('Common room',0,0,10,8),('Kitchen',14,0,10,8),('Passage/stairs',10,0,4,20),('Guest A',0,8,10,6),('Guest B',14,8,10,6),('Guest C',0,14,10,6),('Wash/store',14,14,10,6)],'Upper floor repeats four guest bays and a lounge, with paired stairs at passage ends. Capacity 24 overnight guests, separate from permanent population.')
mod('MOD-07','Learning house',20,16,1,0,[('Class A',0,0,8,10),('Class B',12,0,8,10),('Public passage',8,0,4,16),('Maker store',0,10,8,6),('Wash/quiet',12,10,8,6)],'Two learning groups of 16 per session. Furniture and signs adapt to differing body size and reach.')
mod('MOD-08','Care house',22,16,1,0,[('Waiting',0,0,9,6),('Consult',13,0,9,6),('Public passage',9,0,4,16),('Recovery',0,6,9,10),('Wash/store',13,6,9,10)],'Private care rooms do not become general circulation. Four recovery bays and a staffed reception; not a full regional hospital.')
mod('MOD-09','Water service house',24,18,1,0,[('Clean plant',0,0,10,10),('Service aisle',10,0,4,18),('Pump plant',14,0,10,10),('Sampling',0,10,10,8),('Stores',14,10,10,8)],'Potable storage is separate from wastewater. Diagram defines scene layout, not real-world plumbing or engineering certification.')
mod('MOD-10','Archive and dispatch',24,18,2,0,[('Public reading',0,0,10,8),('Dispatch',14,0,10,8),('Passage/stairs',10,0,4,18),('Archive A',0,8,10,10),('Archive B',14,8,10,10)],'Upper floor repeats controlled archive rooms. Public records and private records have distinct permissions.')
mod('MOD-11','Covered freight store',36,24,1,0,[('West racks',0,0,15,24),('Freight aisle',15,0,6,24),('East racks',21,0,15,24)],'Six-metre center aisle; 4.8 m wagon doors at north and south. Goods do not block exits. Roof eaves 6 m.')
mod('MOD-12','Refuge and guide house',20,16,1,0,[('Shelter west',0,0,8,10),('Shelter east',12,0,8,10),('Passage',8,0,4,16),('Dry store',0,10,8,6),('Guide/wash',12,10,8,6)],'24 temporary refuge places with supplies and local guidance. This is a finite overnight refuge, not a permanent population allocation.')
M={x['id']:x for x in modules}
# Align each door with its actual circulation instead of drawing decorative thresholds.
for m in modules:
 if m['id']=='MOD-01':m['entry']['offset_m']=-2.5;m['secondary_exit']={'side':'W','offset_m':0,'width_m':1.2}
 elif m['id']=='MOD-02':m['entry']['offset_m']=12;m['secondary_exit']['offset_m']=12
 elif m['id']=='MOD-03':m['entry']['offset_m']=5.5;m['secondary_exit']['offset_m']=6
 elif m['id']=='MOD-11':m['entry']['width_m']=4.8;m['secondary_exit']['width_m']=4.8

styles={
'river':('ochre tile','raised timber / limestone','flood stair and boat rail',2.4),
'quarry':('copper caps','cut limestone / dark timber','terraced retaining wall',0),
'crossroads':('slate blue','plaster / timber','deep public arcade',0),
'canal':('brick red','fired brick / painted timber','canal-side loading balcony',1.2),
'orchard':('moss green','timber / pale plaster','rain garden and broad eaves',0),
'freight':('rust ceramic','basalt / reused steel','freight rail and repaired stone edge',0),
'canopy':('amber shingle','living fiber / light timber','tether collar and adjustable deck',0),
'rings':('pale sandstone','sandstone / turquoise shutters','wind tower and shaded court',0),
'tidal':('coral tile','limestone / marine timber','raised tide stair and mooring post',3),
'sky':('ochre sail','basalt / light timber','counterweight gantry and wind screen',0),
'cavern':('copper insulated','stone / insulated timber','steam porch and ice light baffle',0),
'volcanic':('red ceramic','basalt / fired ceramic','gas vent marker and cooled bridge',0),
'deepsea':('mineral vault','limestone / fungal textile','air indicator and tidal pier',4)}
signature_types={
'EXT-01':['MOD-06','MOD-10','MOD-11'],'EXT-02':['MOD-05','MOD-05','MOD-12'],'EXT-03':['MOD-12','MOD-06','MOD-10'],'EXT-04':['MOD-05','MOD-10','MOD-04'],'EXT-05':['MOD-04','MOD-07','MOD-12'],'EXT-06':['MOD-06','MOD-04','MOD-11'],'EXT-07':['MOD-12','MOD-05','MOD-04'],'EXT-08':['MOD-09','MOD-10','MOD-10'],'EXT-09':['MOD-04','MOD-12','MOD-10'],'EXT-10':['MOD-09','MOD-05','MOD-12'],'EXT-11':['MOD-04','MOD-10','MOD-10'],'EXT-12':['MOD-05','MOD-07','MOD-04'],'EXT-13':['MOD-04','MOD-04','MOD-12']}
plans=[];instances=[];doors=[]
for city in w['communities'][1:]:
 cid=city['id'];kind=city['layout'];roof,mat,motif,raised=styles[kind]
 # Six separated districts on a consistent surveyed grid, with region-specific environmental reservations.
 centers=[(-420,-260),(0,-260),(420,-260),(-420,260),(0,260),(420,260)]
 districts=[]
 for j,(x,y) in enumerate(centers):
  z=0
  if kind in ('quarry','volcanic','cavern','deepsea'):z=(j//3)*12
  if kind=='canopy':z=[22,34,27,46,18,38][j]
  if kind=='sky':z=[0,6,0,12,6,12][j]
  districts.append({'id':cid+f'-D{j+1:02d}','center_m':[x,y,z],'size_m':[320,360],'name':['Southwest homes','South homes','East work','West learning','North gardens','North homes'][j]})
 n=math.ceil(city['population']/72);homes=[]
 slots=[]
 for d in districts:
  cx,cy,z=d['center_m']
  for ry in range(5):
   for rx in range(4):slots.append((cx-105+rx*70,cy-140+ry*70,z,d['id']))
 # Round-robin across districts maintains several neighborhoods rather than filling one first.
 slots=[slots[j*20+k] for k in range(20) for j in range(6)]
 for i,(x,y,z,did) in enumerate(slots[:n]):
  item={'id':cid+f'-H{i+1:03d}','settlement':cid,'district':did,'module':'MOD-02','center_m':[x,y,z+raised],'rotation_deg':0,'width_m':30,'depth_m':20,'levels':3,'capacity':72,'roof':roof,'materials':mat,'motif':motif};instances.append(item);homes.append(item['id'])
 named=[]
 for j,(name,typ) in enumerate(zip(city['buildings'].split('|'),signature_types[cid])):
  m=M[typ];x=[-120,0,120][j];y=0
  # Drowned Archive has its own offshore SITE-04; no duplicated physical building.
  if cid=='EXT-09' and j==2:
   named.append({'id':'SITE-04','name':name,'offsite':True,'site_ref':'SITE-04','module':typ});continue
  item={'id':cid+f'-B{j+1:02d}','name':name,'settlement':cid,'module':typ,'center_m':[x,y,raised],'rotation_deg':0,'width_m':m['width_m'],'depth_m':m['depth_m'],'levels':m['levels'],'roof':roof,'materials':mat,'motif':motif,'role':name,'state':'normal'}
  # Raider base is explicitly outside civilian city plan at SITE-07.
  if cid=='EXT-06' and j==2:
   named.append({'id':'SITE-07','name':name,'offsite':True,'site_ref':'SITE-07','module':typ});continue
  named.append(item);instances.append(item)
 for j,typ in enumerate(['MOD-07','MOD-08','MOD-09','MOD-06','MOD-04','MOD-11']):
  m=M[typ];x=-250+j*100;y=100
  instances.append({'id':cid+f'-U{j+1:02d}','name':m['name'],'settlement':cid,'module':typ,'center_m':[x,y,raised],'rotation_deg':0,'width_m':m['width_m'],'depth_m':m['depth_m'],'levels':m['levels'],'roof':roof,'materials':mat,'motif':motif,'state':'normal'})
 links=[]
 for d in districts:
  x,y,z=d['center_m'];links.append({'id':d['id']+'-ACCESS','points_m':[[x,y,z],[x,0,0],[0,0,0]],'width_m':6,'type':'adjustable bridge and lift' if kind in ('canopy','sky') else 'public lane with stairs/lift where grade changes'})
 environment={'river':'River corridor follows y=-520, outside the plotted housing; southern wharves connect by flood stairs.','quarry':'Quarry walls bound north terraces; only the named descent house accesses the independent deep route.','crossroads':'Three main wagon approaches enter west, east and south civic courts.','canal':'Main canal follows y=-520; secondary channels follow x=+-630 outside housing districts.','orchard':'Growing belt surrounds the six residential/work districts; the fixed ridge approach enters north.','freight':'Public freight line follows y=-520; hostile eastern spur is a separate mapped site.','canopy':'Six crown decks occupy district rectangles; trunk collars sit at their centers. Civic ridge remains fixed at y=0. Movement uses dated transforms, not edits to deck geometry.','rings':'A civic well axis y=0 anchors three well courts; outer caravan wall at x=+-650 and y=+-500.','tidal':'Sea begins south of y=-520; raised civic quays remain above routine high water. Offshore archive is SITE-04.','sky':'District pairs form three basalt islands: west, center and east. Central civic platforms connect to local islands; counterweights remain below occupied decks.','cavern':'A continuous rock shelter covers occupied districts. A geothermal public corridor at y=0 stays distinct from plant rooms.','volcanic':'Terraced north districts stand 12 m above south. Active gas/heat channels lie outside x=-650; public bridge crossings are supervised.','deepsea':'Sea lies south of y=-520; upper districts rise 12 m. Ventilation follows mapped civic shafts and does not connect to the Burrow.'}[kind]
 plan={'id':cid,'name':city['name'],'bounds_m':[-660,-540,660,500],'origin':'Civic anchor at (0,0,0); heights are relative to community datum.','districts':districts,'signature_buildings':named,'routes':links,'environment':environment,'population':city['population'],'residential_capacity':n*72,'occupied_baseline':city['population'],'spare_capacity':n*72-city['population'],'materials':mat,'roof':roof,'motif':motif,'map_scale':'All SVG coordinates are surveyed metres; PDF scale bar governs printed output.'}
 plans.append(plan)
 for i in [v for v in instances if v['settlement']==cid]:
  m=M[i['module']];cx,cy,cz=i['center_m']
  for entry,name in [(m['entry'],'entry'),(m['secondary_exit'],'secondary')]:
   side=entry['side'];off=entry['offset_m'];dx=off if side in ('N','S') else (-m['width_m']/2 if side=='W' else m['width_m']/2);dy=(m['depth_m']/2 if side=='N' else -m['depth_m']/2) if side in ('N','S') else off
   doors.append({'id':i['id']+'-'+name,'building':i['id'],'side':side,'center_m':[cx+dx,cy+dy,cz],'width_m':entry['width_m']})

# Floor plans for every named building are instantiated modules with explicit functional relabeling.
building_plans=[]
for city in plans:
 for item in city['signature_buildings']:
  if item.get('offsite'):continue
  m=M[item['module']];d={**item,'rooms':m['rooms'],'entry':m['entry'],'secondary_exit':m['secondary_exit'],'wall_m':m['wall_m'],'floor_height_m':m['floor_height_m'],'notes':m['notes']}
  # A reusable shell is an explicit design choice; functions are named so scenes can be staged consistently.
  if 'Observatory' in item['name']:d['special']='Upper observing deck within the same footprint, roof instrument centered over the reading/measurement hall; no arbitrary extra tower footprint.'
  elif 'Kiln' in item['name']:d['special']='Hot work is in a separately marked 12 x 10 m annex centered 35 m north of this hall, with a clear open-air separation. Add it as B01-A1 in the instance registry.'
  elif 'Counterweight' in item['name']:d['special']='Machinery hall with vertical counterweight wells below the footprint; below-deck depth 24 m, enclosed against public entry.'
  elif 'Pressure' in item['name']:d['special']='Two 4 x 4 m pressure vestibules replace the west shelter bay; controlled arrival, not a magical instant descent.'
  elif 'Resin' in item['name']:d['special']='Dry resin stalls only; hot processing occurs in an outside supervised work bay.'
  else:d['special']='Use the room allocations shown; movable furnishings may vary without shifting walls, doors or stairs.'
  building_plans.append(d)
  if 'Kiln' in item['name']:
   instances.append({'id':item['id']+'-A1','name':'Kiln annex','settlement':item['settlement'],'module':'ANNEX-KILN','center_m':[item['center_m'][0],35,item['center_m'][2]],'rotation_deg':0,'width_m':12,'depth_m':10,'levels':1,'roof':'red ceramic','materials':'firebrick / basalt','motif':'supervised hot work','state':'normal'})

site_plans=[]
for s in w['sites']:
 W=s['width_m'];D=s['height_m'];typ='MOD-10' if s['id']=='SITE-04' else 'MOD-12';m=M[typ]
 site_plans.append({'id':s['id'],'name':s['name'],'width_m':W,'depth_m':D,'zones':[{'name':'West approach','box':[-W/2,-D/2,W*.22,D]},{'name':'Encounter field','box':[-W*.28,-D/2,W*.56,D]},{'name':'East approach','box':[W*.28,-D/2,W*.22,D]}],'refuge':{'module':typ,'center_m':[0,D*.32,0],'width_m':m['width_m'],'depth_m':m['depth_m']},'route_points_m':[[-W/2,0,0],[-W*.28,0,0],[0,-D*.25,0],[W*.28,0,0],[W/2,0,0]],'notes':s['layout'],'hazard':s['hazard']})

geo={'edition':'3.0.0','units':'metres locally; kilometres regionally','modules':modules,'settlements':plans,'building_instances':instances,'door_instances':doors,'signature_building_plans':building_plans,'encounter_plans':site_plans,'inherited_burrow':{'source':'Burrow_v2.1.json','surface_locations':b['locations'],'underground_areas':b['underground']['areas'],'surface_routes':b['routes'],'underground_routes':b['underground'].get('routes',[]),'sub_locations':b['sub_locations'],'note':'Exact source geometry retained, not redrawn to fit new settlements.'}}
(P/'Blueprint_Data.json').write_text(json.dumps(geo,ensure_ascii=False,indent=2)+'\n')
with (P/'Building_Instances.csv').open('w') as f:
 out=csv.writer(f);out.writerow(['id','settlement','module','x_m','y_m','z_m','rotation_deg','width_m','depth_m','levels','roof','materials'])
 for x in instances:out.writerow([x['id'],x['settlement'],x['module'],*x['center_m'],x['rotation_deg'],x['width_m'],x['depth_m'],x['levels'],x['roof'],x['materials']])
print('Blueprints:',len(plans),'towns,',len(building_plans),'named building interiors,',len(modules),'modules,',len(site_plans),'encounter sites;',len(instances),'building instances')
