import json,math,csv
from pathlib import Path
P=Path(__file__).parent/'output';w=json.loads((P/'World_Atlas.json').read_text());g=json.loads((P/'Blueprint_Data.json').read_text())
for c in w['characters']:
 if c['id']=='MADGER_BOT':c['origin']='Millmere / Varr Workshop'
 if c['id']=='SNOW_WHITE':c['origin']='Latchford / Wayfarer household'
layouts={'river':[(-450,-260),(0,-260),(450,-260),(-450,260),(0,260),(450,260)],'quarry':[(-520,-300),(0,-250),(520,-200),(-520,200),(0,280),(520,340)],'crossroads':[(-600,0),(-300,-420),(300,-420),(600,0),(300,420),(-300,420)],'canal':[(-550,-280),(0,-280),(550,-280),(-550,280),(0,280),(550,280)],'orchard':[(-500,-300),(0,-320),(500,-300),(-500,260),(0,320),(500,260)],'freight':[(-1000,300),(-600,300),(-200,300),(200,300),(600,300),(1000,300)],'canopy':[(-500,-320),(-80,-400),(420,-280),(-500,250),(-40,300),(440,280)],'rings':[(-600,0),(-300,-420),(300,-420),(600,0),(300,420),(-300,420)],'tidal':[(-600,-220),(0,-220),(600,-220),(-600,300),(0,300),(600,300)],'sky':[(-600,-260),(0,-260),(600,-260),(-600,260),(0,260),(600,260)],'cavern':[(-500,-260),(0,-300),(500,-260),(-500,220),(0,300),(500,220)],'volcanic':[(-500,-350),(0,-300),(500,-250),(-500,200),(0,300),(500,400)],'deepsea':[(-600,-240),(0,-240),(600,-240),(-600,280),(0,280),(600,280)]}
delta={}
for city in g['settlements']:
 kind=next(c['layout'] for c in w['communities'] if c['id']==city['id']);new=layouts[kind]
 for d,(x,y) in zip(city['districts'],new):
  ox,oy,z=d['center_m'];delta[d['id']]=(x-ox,y-oy);d['center_m']=[x,y,z]
 for r,d in zip(city['routes'],city['districts']):
  x,y,z=d['center_m'];r['points_m']=[[x,y,z],[x,0,0],[0,0,0]]
 city['bounds_m']=[min(-660,min(x for x,y in new)-210),min(-540,min(y for x,y in new)-220),max(660,max(x for x,y in new)+210),max(500,max(y for x,y in new)+220)]
for i in g['building_instances']:
 if i.get('district'):
  dx,dy=delta[i['district']];i['center_m'][0]+=dx;i['center_m'][1]+=dy
  for door in g['door_instances']:
   if door['building']==i['id']:door['center_m'][0]+=dx;door['center_m'][1]+=dy
for m in g['modules']:
 if m['id']=='MOD-03':
  m['floors'][1]['rooms'][2]['name']='Wash/store'
  for d in m['floors'][1]['internal_doors']:d['rooms']=['Wash/store' if n=='Stair/wash' else n for n in d['rooms']]
for bp in g['signature_building_plans']:
 if bp['module']=='MOD-03':bp['floors']=next(m['floors'] for m in g['modules'] if m['id']=='MOD-03')
setpieces=[
('The Root That Let Go','Season 1 / Walking Root Crossing','A crown begins its seasonal turn while a wagon is halfway across. The first warning is a cup sliding sideways, followed by a lashing tightening to a musical note. Nix reaches the far bank with the evidence case. Madger has one clear jump after them. Then Snow looks down: someone is trapped beneath the wagon.','Gorilla braces a temporary anchor, Bot fixes a tether to an existing ring, and Senn names the root that will release next. Madger abandons pursuit and descends. The rescue succeeds because each partner solves a different physical problem. The case leaves with Nix.','A rescued traveler remembers the direction of the lost convoy. The heroes lose the easy proof but gain a person and a harder route forward.'),
('The Storm of False Suns','Season 2 / Mirrorglass Expanse','A glass storm scatters sunset into dozens of apparent horizons. The caravan’s packbeasts refuse the glittering shortcut. Madger mistakes refusal for fear until a glassback drake rises beneath the thin crust.','Maela leads everyone toward exposed bedrock while Gorilla shields the smallest travelers with a broken cargo panel. Bot cannot trust visual bearings. Lark drops bright cloth markers that work only at close range. The team must leave a valuable crate behind to keep the water load.','The lost crate contains Maela’s best instrument. At Ossara she must prove her case with testimony and a cruder shared tool.'),
('An Hour Below the Sea','Season 2 / Drowned Archive','The tide exposes the archive steps. Inside, light ripples over a ceiling painted with familiar family names. Toma finds the sought charter and an older ownership record he would prefer to leave. A reefback’s passage changes the current sooner than expected.','The party must carry people and records up separate intact stairs. Madger cannot take both a heavy proof chest and an injured rival; he chooses the rival. Toma removes the chest’s useful sheets, leaves the valuable fittings and loses his salvage profit.','The rival confirms the rescue and the archive’s provenance. Evidence survives without making the heroes owners of the place.'),
('The Island That Tilted','Season 3 / Aurel Quay','During a crowded festival, an overloaded cargo platform begins to tilt toward the cloud sea. Serik offers the only nearby ship, on terms that would bind the dock to him. Eri knows his craft cannot safely take the advertised load.','She divides the rescue between an existing sheltered deck and a smaller craft, using counterweights to hold the platform while people cross. Gorilla must release an empty cargo section instead of trying to save everything. A storm manta’s wake provides a brief calm interval, not a miraculous obedient rescue.','Everyone reaches refuge; expensive freight is lost. Serik cannot sell his false heroic story to people who watched the actual choice.'),
('The Voice Beyond the Warmth','Season 3 / Frostspine','A familiar voice calls from the ice, repeating an intimate sentence in the wrong rhythm. The group almost follows it beyond the warm ridge. Ysolde hears the same breath twice and recognizes a copied fragment.','A choirwraith emerges against the aurora like torn translucent cloth. Warmth weakens its membranes, but the portable heater has a finite charge. The team moves together between marked refuges rather than scattering toward voices.','Bot preserves the sound with its uncertainty attached. The incident prepares the audience to question a later echo record without dismissing all old evidence.'),
('The Small Bridge','Season 3 / Stonewake','The final crossing is smaller and less glorious than the restored ancient span Madger imagined. During its first test, one bearing shifts. A crowd waits for Gorilla to hold the structure by force.','He stops the test, orders the empty span unloaded and lets Eris direct the correction. Tavi admits his measurement was copied from the wrong revision. Their public delay costs a day of celebration and prevents a private disaster.','The opening is earned through changed behavior. Oren names the entire crew when the first travelers cross.'),
('The Silent Hull','Season 4 / Bellwater Narrows','A rescue boat must pass a bell-eel nesting channel with a damaged propeller that strikes the hull. The creature’s resonators glow one after another beneath the water, revealing its enormous length.','Namu orders the engine stopped. Toma uses the current; Madger and Gorilla shift weight slowly instead of rowing harder. Bot shuts down an unnecessary vibrating pump. The trapped travelers must trust a boat that appears to be doing nothing.','The rescue succeeds without defeating the animal. A damaged hull and missed tide force the party to stay in Lumen Tide long enough to understand its conflict.'),
('The Fire Brakka Ordered','Season 4 / Ashmouth Freight Yard','Brakka orders captured food burned to prove she cannot be challenged. Heat draws an ashmaw toward the freight yard and cuts off her own crew’s retreat. Dreg sees supplies for his relatives among the crates.','He opens a civilian escape lane and refuses the order. Vessa guides workers along the mapped foot path. Kesh’s crew cools a diversion trench while the heroes move people away from the heat. Brakka escapes with a smaller loyal band, stripped of the claim that she protects the district.','Dreg gives up the victim ledger. Returning stolen goods and testifying become the beginning of change, not an instant pardon.')]
w['setpieces']=[dict(zip(['title','setting','setup','action','lasting_result'],x)) for x in setpieces]
for m in g['modules']+g['signature_building_plans']:
 if m.get('front_elevation'):
  e=m['front_elevation'];e['ridge_height_m']=e['wall_height_m']+m['width_m']*.5*math.tan(math.radians(25))
for city in g['settlements']:
 for route,d in zip(city['routes'],city['districts']):
  x,y,z=d['center_m']
  if y==0:
   side=200 if x>0 else -200
   route['points_m']=[[x,0,z],[x,220,z],[side,220,0],[side,0,0],[0,0,0]]
with (P/'Building_Instances.csv').open('w',newline='') as f:
 wr=csv.writer(f);wr.writerow(['id','settlement','module','x_m','y_m','z_m','rotation_deg','width_m','depth_m','levels','roof','materials'])
 for i in g['building_instances']:wr.writerow([i['id'],i['settlement'],i['module'],*i['center_m'],i['rotation_deg'],i['width_m'],i['depth_m'],i['levels'],i['roof'],i['materials']])
(P/'World_Atlas.json').write_text(json.dumps(w,ensure_ascii=False,indent=2)+'\n');(P/'Blueprint_Data.json').write_text(json.dumps(g,ensure_ascii=False,indent=2)+'\n')
# Individual editable cards mirror the current complete register.
(P/'character_sources').mkdir(exist_ok=True)
for c in w['characters']:(P/'character_sources'/f'{c["id"]}.json').write_text(json.dumps(c,ensure_ascii=False,indent=2)+'\n')
print('Final lore and distinct settlement layouts applied')
