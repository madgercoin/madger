import json, math, os, hashlib
from pathlib import Path

ROOT=Path('/workspace/scratch/ae9a6a9bf3bf/world_bible')
OUT=ROOT/'output'
OUT.mkdir(parents=True,exist_ok=True)

def loc(id,name,xyz,size,role,anchors,doors,life,story,game,limits):
    return dict(id=id,name=name,position_m=xyz,footprint_m=size,role=role,anchors=anchors,doors=doors,daily_life=life,story_use=story,game_use=game,continuity_limits=limits)

locations=[
loc('BRW-01','Sunwell Market',[0,0,0],[84,64],
    'The civic center: daily exchange, news and informal decisions.',
    ['Round limestone well curb at the world origin; sealed potable-water draw point, never an energy core.','Four dark inset paving rays mark north, east, south and west.','Green canvas stalls occupy the north and west edges; the east route stays clear.','A freestanding timber noticeboard stands at (18,20,0).'],
    ['Open east to Gate Lane, south to Hearth Lane, west to Workshop Lane and north to Garden Way.'],
    'Produce arrives before breakfast. Neighbors trade repairs, food and information. A returned tool matters as much as a sale.',
    'Let the community solve ordinary problems here. A future false notice has recognizable recipients and consequences.',
    'Home hub, dialogue, noticeboard quests and map orientation. No random hazards in the peaceful baseline.',
    ['Keep the center open. Stalls move only within marked bays. Never mirror the paving compass or move the well.']),
loc('BRW-02','Common House & Tables',[-5,-58,0],[50,28],
    'A communal kitchen, shared meal room and meeting place open to the market.',
    ['Long north-facing porch; three permanent stone table bases in its forecourt.','Warm plaster, green shutters, copper kitchen vent on the southwest corner.','Four friends usually sit at the eastern porch table; it is not privately reserved.'],
    ['Main double doors centered in the north wall.','Kitchen service door in west wall.','Second exit in southeast corner.'],
    'Households have their own kitchens. This kitchen serves workers, visitors and shared meals; no one must earn food through heroics.',
    'The emotional home of the pilot and a repeatable place for disagreements, apologies and celebrations.',
    'Rest, party conversations and meal preparation. Healing/rest is a game interaction, not instant story-world magic.',
    ['Do not turn the forecourt into a different plaza. Seasonal cloths and food are state changes.']),
loc('BRW-03','Hearth Terraces',[-30,-132,12],[140,52],
    'The principal residential neighborhood, built into the southern rock.',
    ['Three inhabited tiers at +6, +12 and +18 metres.','Pale stone lower walls, dark timber balconies, slate roofs and individual colored doors.','Madger and Snow share the ground-level accessible home entry at the west end of the +12 m terrace.'],
    ['Each dwelling opens to a public gallery.','Stairs shorten the route; the western switchback ramp reaches every occupied tier.'],
    'Laundry, school bags, meals, repairs and quiet hours make this a neighborhood rather than a backdrop.',
    'Private thresholds give friendships boundaries. Residents have plans independent of the heroes.',
    'Home save point and optional conversations. Occupied homes are not loot containers.',
    ['This edition fixes neighborhood massing and Madger/Snow entry, not every unseen room or every resident name.']),
loc('BRW-04','Garden Terraces',[0,135,12],[160,62],
    'North terraces for produce, plant starts and shared learning.',
    ['Three broad planted bands at +6, +12 and +18 metres.','Two low greenhouses sit at the eastern end of the +12 m terrace.','Garden crossing BRW-C02 links the lower path to Garden Way.'],
    ['South stair from Garden Way.','Long west ramp for carts and mobility access.'],
    'Growers share water schedules. Greens, roots and fruit supplement traded grain; gardens do not magically feed everyone alone.',
    'A future changed delivery schedule can cause a missed watering without threatening the whole town at once.',
    'Cultivation, observation and soil-route tutorials in designated beds only.',
    ['No new cliff or waterfall between tiers. North remains north in every season.']),
loc('BRW-05','Spring House',[-160,150,18],[32,24],
    'Protected source, settling tanks and the start of separate water systems.',
    ['Low limestone vault built into the northwest wall.','Three labeled valve wheels inside; a fenced settling court outside.','Drinking-water tanks are covered; the utility race is visibly separate.'],
    ['South inspection entrance from Garden Ramp.'],
    'A water team checks clarity and flow physically and records the result before opening the daily allocation.',
    'Careful work becomes familiar before any later attempt to falsify it.',
    'Inspection puzzles and valve routing with a local effect; never a universal town-off switch.',
    ['No bathing or dumping in potable tanks. Water flows downhill along fixed routes.']),
loc('BRW-06','Waterhouse',[-185,65,0],[40,30],
    'Water-driven power and maintenance beside the western wheelrace.',
    ['One 6 m diameter vertical waterwheel on the east wall.','Separate mechanical sluice and electrical isolator.','Wheelrace runs on the building\'s east side; the workshop stands south.'],
    ['South door to the workshop court.','West equipment door to perimeter service path.'],
    'Operators clean grates and compare local gauges; nearby roofs add solar power and local batteries.',
    'Local consequences create practical rescue and repair stories later.',
    'Environmental repair and supervised mechanisms. No unrestricted control of the entire settlement.',
    ['The wheel never migrates to the gate or north gardens. Power and drinking water remain independent.']),
loc('BRW-07','Gorilla White\'s Workshop',[-185,18,0],[44,30],
    'A public repair workshop where Gorilla White works alongside other craftspeople.',
    ['Wide east-facing pair of timber doors.','Big shared bench beneath north windows; blue tool silhouettes on the west rack.','A small private rest alcove is behind the south partition, never in the public tool aisle.'],
    ['East workshop doors to the court.','North service door to Waterhouse.','South door to the western walk.'],
    'Repair tickets are public. Apprentices do real work. Gorilla accepts help and takes turns being off duty.',
    'Repairs reveal community relationships; strength can support rather than replace other people.',
    'Upgrade station, craft tasks and companion conversation. Purchases do not rewrite plot outcomes.',
    ['No weapon factory in the peaceful baseline. Shelves may gain tools; walls and doors stay fixed.']),
loc('BRW-08','Training Court',[-182,-73,0],[58,42],
    'A safe, open practice yard with marked soil lanes and rescue exercises.',
    ['Low timber boundary on three sides; east entrance stays open.','Two sand/soil strips, reusable wooden obstacles and a rope-rescue frame.','Soft soil lane A runs north-south inside the court; buried utilities are outside its bounds.'],
    ['East public entrance from the lower ring walk.','North equipment gate toward workshop.'],
    'Children practice coordination; adults rehearse carrying and rescue. Training is scheduled around rest hours.',
    'A place for effort, humor, failure and gradual competence before a real emergency.',
    'Jump, guard and BURROW tutorials. Down/S/down-swipe/BURROW retain their established behavior.',
    ['Digging is allowed only in defined soil volumes; never phase through stone, homes or pipes.']),
loc('BRW-09','Records House',[62,42,0],[38,28],
    'Bot\'s workroom, local records and the room where evidence is compared.',
    ['Slate-blue shutters and copper cable trays.','A public counter at the south; comparison table in the center.','Offline records cabinet at the north; Bot\'s charging dock at the northeast.'],
    ['South public entrance.','East maintenance door.'],
    'People can correct records and ask how a decision was made. Bot helps; he does not own everyone\'s information.',
    'An uncertain observation can be preserved without becoming an accusation.',
    'Quest journal, evidence board and local electronics tasks. Story knowledge and player discoveries are separate states.',
    ['No all-seeing surveillance wall or omniscient AI. The pilot does not name an attacker.']),
loc('BRW-10','Storehouse & Trading Court',[104,-40,0],[52,38],
    'Dry staples, tools and an interior receiving yard.',
    ['Long green double doors on the east.','Raised dry floor, numbered shelves, reusable D-series delivery tags.','Receiving court on the east is broad enough to turn a handcart.'],
    ['East cart entrance.','North staff door toward Gate Lane.','West inventory exit.'],
    'Outside trade supplies grain, cloth and spare parts. The shared reserve buffers interruptions; households keep personal supplies.',
    'A missing crate means a specific repair or meal is delayed. Outsiders are not automatically suspicious.',
    'Supplies, delivery errands and restoration materials. No invented real-money reward economy.',
    ['D17 is a delivery identifier, not a prophecy, secret emblem or villain\'s name.']),
loc('BRW-11','Care House',[-86,-68,0],[30,24],
    'A quiet neighborhood clinic and recovery space.',
    ['Cream shutters, a simple blue circle sign and a planted waiting porch.','Two rest rooms behind the reception area.'],
    ['North accessible entrance.','West service exit.'],
    'Ordinary checkups, rest and help for injuries; care does not depend on game rank.',
    'Consequences and recovery have a place, without turning every danger into spectacle.',
    'Recovery and rescue handoff. Actual story injuries follow the event ledger.',
    ['Do not replace it with a prison, armory or secret lab without an explicit canon revision.']),
loc('BRW-12','East Bridge',[170,0,0],[12,4.5],
    'The main public crossing between Gate Lane and the interior arrival court.',
    ['12 m east-west deck over a 6 m north-south canal; low stone abutments.','Pale repaired timber, waist-high simple rails, three modest green pennants for the reopening.','No overhead structure and no chasm.'],
    ['West landing at x=164.','East landing at x=176.'],
    'Carts and pedestrians take turns on the crossing. Service Crossing provides a bypass during maintenance.',
    'A shared accomplishment in Episode 1, repaired after ordinary seasonal weather.',
    'Landmark, route choice and later defense position. Fixed geometry in every mode.',
    ['No collapse, sabotage reveal or large arched stone replacement in the pilot.']),
loc('BRW-13','Inner Arrival Court',[225,0,0],[72,52],
    'An internal handoff space between East Bridge and the closed gate vestibule.',
    ['Open paved court, shaded waiting bench on the north and two marked cart bays.','Delivery bell and small green status display beside the gate approach.','All pilot deliveries are already inside when seen.'],
    ['West toward bridge.','East into the internal gate vestibule.','South into Service Walk.'],
    'A gate steward receives visitors and compares paper tags with the local record.',
    'Show hospitality and careful procedure together. One duplicate receipt quietly contradicts a simple count.',
    'Arrival/tutorial staging and visitor interactions without exposing undefined exterior terrain.',
    ['No view past the exterior threshold in Episode 1.']),
loc('BRW-14','East Gate',[282,0,0],[24,18],
    'A recessed gate vestibule and the main public threshold at the east rock wall.',
    ['Twin timber-and-iron gate leaves at x=294.','Mechanical crossbar on the inside, independent of the arrival log.','Inner relay cabinet BRW-15 is on the south wall: the right wall when facing outward/east.','Vestibule mouth at x=270 opens into the arrival court.'],
    ['Exterior leaf plane at x=294 is outside Episode 1\'s camera and action boundary.','Vestibule is entered only from its west mouth during the pilot.'],
    'Staff open and close it; electronics record observations and schedules, not physical permission by themselves.',
    'The same visible bar, leaves and cabinet make the last unexplained receipt legible.',
    'Future adventure boundary; locked by the current quest state, not by an invented wall across the market.',
    ['Closed does not mean the entire Burrow has no other emergency provision. Exterior geography remains unassigned.']),
loc('BRW-15','Service Walk & Gate Relay',[270,-26,0],[34,14],
    'Public maintenance access along the inner south side of the gate.',
    ['Slate paving, one shallow drain and one inspection hatch at (264,-26,0).','Cabinet R-E01 mounted at (282,-8.5,1.2), on the vestibule\'s south wall.','Cabinet door is flush and intact in the pilot; its display uses ordinary muted green.'],
    ['North access from arrival court; return through the west vestibule mouth to reach the cabinet on its inner south wall.','No shortcut through the solid south vestibule wall.'],
    'Maintenance is scheduled and logged. The place is mundane before Snow notices an unfamiliar trace.',
    'A held indication and recorded time create a question; the source remains unknown.',
    'Inspection, local relay isolation and evidence comparisons in later missions.',
    ['Never move the cabinet to the north wall. Never imply Snow can smell a digital hack.']),
loc('BRW-16','Makers\' Room & Archive',[-66,16,0],[38,22],
    'A shared studio, reading room and record of community projects.',
    ['Ochre door facing south, long north worktable and east archive wall.','Displayed objects have credited makers and recorded histories.'],
    ['South public entrance.','West service exit.'],
    'Neighbors draw, record stories, learn skills and mend small objects. Celebrations add dated artifacts.',
    'A living memory of past adventures without inventing ancient prophecy.',
    'Creator Studio and Trophy Chamber functions share this building; neither becomes an extra wing by accident.',
    ['No unrecorded trophy from an adventure the characters have not had.']),
]

nodes={
 'sunwell':[0,0,0],'market_e':[45,0,0],'lane_e':[132,0,0],'bridge_w':[164,0,0],'bridge_e':[176,0,0],
 'arrival':[225,0,0],'gate_mouth':[270,0,0],'gate_inner':[288,0,0],'relay_walk':[270,-26,0],'relay_cabinet':[282,-6,0],
 'south_w':[140,-90,0],'south_cross_w':[164,-90,0],'south_cross_e':[176,-90,0],'south_e':[202,-90,0],
 'tables':[-5,-58,0],'care':[-86,-56,0],'home_low':[-30,-100,0],
 'home_ramp_a':[-120,-90,0],'home_ramp_b':[-120,-165,6],'home_ramp_c':[-30,-165,12],'home_entry':[-80,-132,12],'home_upper':[-120,-177,18],
 'workshop':[-163,18,0],'works_junction':[-120,0,0],'waterhouse':[-185,50,0],
 'training':[-153,-73,0],'makers':[-66,5,0],'records':[62,28,0],'store':[130,-40,0],
 'garden_lower':[0,55,0],'garden_cross':[0,62,0],'garden_base':[0,80,0],'garden_entry':[0,105,6],'garden_mid':[0,135,12],'garden_upper':[0,165,18],
 'garden_ramp_a':[-90,70,0],'garden_ramp_b':[-200,80,6],'garden_ramp_c':[-100,110,12],
 'spring':[-160,138,18],'garden_ramp_d':[-200,130,18],
 'service_culvert':[210,-145,-3], 'emergency_door':[-240,-95,0]
}
edges=[]
def edge(a,b,mode='walk_cart',width=4):
 p,q=nodes[a],nodes[b];edges.append(dict(id=f'{a}__{b}',a=a,b=b,mode=mode,width_m=width,length_m=round(math.dist(p,q),2),points_m=[p,q]))
for a,b in [('sunwell','market_e'),('market_e','lane_e'),('lane_e','bridge_w'),('bridge_w','bridge_e'),('bridge_e','arrival'),('arrival','gate_mouth'),('gate_mouth','gate_inner'),('arrival','relay_walk'),('lane_e','south_w'),('south_w','south_cross_w'),('south_cross_w','south_cross_e'),('south_cross_e','south_e'),('south_e','arrival'),('sunwell','tables'),('tables','care'),('tables','home_low'),('home_low','home_ramp_a'),('home_ramp_a','home_ramp_b'),('home_ramp_b','home_ramp_c'),('home_ramp_c','home_entry'),('sunwell','works_junction'),('works_junction','workshop'),('workshop','waterhouse'),('works_junction','training'),('training','care'),('training','home_ramp_a'),('sunwell','makers'),('market_e','records'),('lane_e','store'),('store','tables'),('sunwell','garden_lower'),('garden_lower','garden_cross'),('garden_cross','garden_base'),('garden_base','garden_ramp_a'),('garden_ramp_a','garden_ramp_b'),('garden_ramp_b','garden_ramp_c'),('garden_ramp_c','garden_mid'),('garden_ramp_c','garden_ramp_d'),('garden_ramp_d','spring'),('training','emergency_door')]:edge(a,b)
edge('home_ramp_c','home_upper');edge('garden_ramp_d','garden_upper');edge('garden_mid','garden_upper','stairs',3)
edge('relay_walk','gate_mouth','walk',3);edge('gate_mouth','relay_cabinet','walk',3)
edge('garden_base','garden_entry','stairs',3);edge('garden_entry','garden_mid','stairs',3);edge('home_low','home_entry','stairs',3)

water=[[-160,150,18],[-160,85,6],[-161,65,-1],[-160,30,-1.2],[-95,40,-1.4],[0,62,-1.6],[100,62,-1.8],[170,45,-2],[170,0,-2.2],[170,-90,-2.5],[160,-125,-2.8],[210,-145,-3]]
crossings=[dict(id='BRW-C01',name='East Bridge',position_m=[170,0,0],span_m=12,width_m=4.5,water_width_m=6,material='pale timber'),dict(id='BRW-C02',name='Garden Crossing',position_m=[0,62,0],span_m=12,width_m=4,water_width_m=6,material='flat limestone slab'),dict(id='BRW-C03',name='Service Crossing',position_m=[170,-90,0],span_m=12,width_m=4,water_width_m=6,material='flat limestone slab')]

rules=[
 ('C01','One shared place','Every episode, game hub and story illustration references the same location IDs, compass directions, routes and landmark relationships.'),
 ('C02','Permanent base, recorded change','Geography and built footprints form the baseline. Weather, repairs, new occupants and event damage belong in dated state overlays. Growth adds entries; it does not silently redraw the base.'),
 ('C03','Inside means inside','Episode 1 camera centers, visible ground and character actions remain within the inhabited basin and inside the East Gate exterior plane. Sky above the opening is allowed; exterior roads, landscapes, attackers and exterior cutaways are not.'),
 ('C04','Care has ordinary causes','Food, water, repairs and safety come from neighbors and working infrastructure. No magic lantern, universal energy core, or secretly indispensable hero sustains the town.'),
 ('C05','Trust can be checked','A message is evidence of a report, not proof that an event occurred. Digital, physical and personal observations can disagree.'),
 ('C06','The four remain themselves','Madger, Gorilla White, MADGER Bot and Snow White retain their established designs and approved voices. Snow has canine sounds only. No duplicate hero mascots as anonymous crowd fillers.'),
 ('C07','The pilot earns its warmth','Show skill, generosity, play and ordinary friction before clues. No pilot attack, named villain reveal or retroactive sabotage of the repaired bridge.'),
 ('C08','No convenience architecture','A chase may use an existing route or a newly documented extension. It cannot conjure a door through a previously solid wall or change which side of the canal a building occupies.'),
 ('C09','Same environment, different presentation','Anime may use painted linework and game assets may use 3D meshes. Their scale, silhouettes, sign placement, doors and travel connections agree.'),
 ('C10','Unknown is not permission to improvise','External lands, undisclosed tunnels and unnamed NPC biographies remain unassigned. Define and record them before using them as plot facts.'),
]

heroes=[
dict(id='MADGER',name='Madger',place='Sunwell, Common House and the shared home at Hearth Terraces',role='Organizer, explorer and friend; not the ruler.',design='Established black-and-cream design, black belly, high cream chest V, natural arms and small even teeth. Clean face; no decorative tear, sweat streak or oversized fang.',strength='Initiative, courage and a talent for bringing people together.',flaw='Mistakes taking every job for being dependable.',pilot='Accepts a neighbor\'s plan, shares the work, gives away credit and stops to listen to Snow.',long_arc='Learns that leadership means building a capable community, including disagreement and checks on his own judgment.',game='BURROW is a physical movement through designated soil, with a visible entry, dirt trail and emergence.'),
dict(id='GORILLA_WHITE',name='Gorilla White',place='Workshop, Waterhouse, bridge and common tables',role='Craftsperson and protector; not an unlimited force.',design='Approved white/tan fur and blue eyes; preserve established body proportions.',strength='Patience, strength, workmanship and an instinct to shield others.',flaw='Carries the burden alone until everyone mistakes his endurance for invulnerability.',pilot='Lets neighbors help and sits down for the meal.',long_arc='Builds others\' skill and trusts a team to protect him as well as the town.',game='Guard, rescue and safe support; no infinite saves or casual demolition of the home map.'),
dict(id='MADGER_BOT',name='MADGER Bot',place='Records House, relay cabinets and maintenance routes',role='Systems keeper and evidence partner; not an omniscient administrator.',design='Entirely mechanical face/visor and established metallic body; no fur muzzle, human skin or fang.',strength='Memory, method and a sincere wish to make daily life easier.',flaw='Feels that being useful requires having a definite answer.',pilot='Keeps the duplicate receipt and admits that its cause is not yet known.',long_arc='Trusts independent observation, states uncertainty and protects people without taking over their decisions.',game='Local electronics, evidence comparison and established boosts; bounded access and visible feedback.'),
dict(id='SNOW_WHITE',name='Snow White',place='Shared home, common tables, training yard and walks with the team',role='Adult quadrupedal shepherd, companion and scout; a real dog.',design='Approved adult shepherd form with rose collar; stable four-legged anatomy. Canine sounds only.',strength='Scent, hearing, attention, affection and decisive physical action.',flaw='An exciting sensation can pull her ahead before others understand.',pilot='Stops, looks back and holds an indication until Madger joins her.',long_arc='Develops reliable teamwork through indication, return and restraint; does not gain human speech.',game='Established companion support and physical threat response. She detects a physical trace, never a digital packet.')]

episode=[
dict(time='00:00-00:50',locations=['BRW-03','BRW-01','BRW-02'],beat='Wake inside the Burrow. Neighbors open shutters, prepare breakfast and share space. Introduce the four through helpful actions.',boundary='Camera begins on the south interior gallery and looks into the basin. No exterior approach shot.',clue='None. Give the place uninterrupted warmth.'),
dict(time='00:50-01:40',locations=['BRW-13','BRW-14','BRW-15'],beat='An already-admitted delivery is counted in the inner arrival court. One cart, one tag, ordinary good service.',boundary='Gate leaves remain closed in every pilot shot. All cart movement stays inside.',clue='A second receipt appears for D17; Bot keeps both. No accusation.'),
dict(time='01:40-03:00',locations=['BRW-07','BRW-12','BRW-01'],beat='Neighbors finish reopening preparations. Gorilla accepts help; Madger shares credit. The repaired bridge opens to normal use.',boundary='Travel is covered by elapsed-time cuts or a montage; do not show an impossible real-time sprint.',clue='None added. The bridge repair is ordinary weather recovery.'),
dict(time='03:00-04:10',locations=['BRW-02','BRW-15'],beat='The shared meal succeeds. After a clear time cut, a short walk with Snow reaches the service area. She holds an indication; Madger listens.',boundary='The journey between tables and gate takes several minutes in-world. A five-minute episode is not a five-minute day.',clue='An unfamiliar physical trace by the intact cabinet; source unknown and no maintenance booked.'),
dict(time='04:10-04:50',locations=['BRW-02','BRW-03'],beat='Return after another time cut. The four enjoy the table and the people around it. Questions can wait for careful checking.',boundary='Interior evening views only. Complete the small character changes.',clue='Bot retains both observations without claiming a link.'),
dict(time='04:50-05:00',locations=['BRW-14','BRW-15'],beat='The same closed, barred gate from inside. The empty vestibule receives another D17 acknowledgment and the familiar chime.',boundary='No reverse angle through the gate, silhouette outside or villain cutaway.',clue='An unexplained contradiction. Cause, attacker and mechanism remain unassigned.')]

cameras=[
 dict(id='CAM-01',name='South gallery / world master',at=[0,-175,24],target=[0,40,3],lens_mm=28,required=['Workshop left/west','Sunwell center','Bridge and gate right/east','Gardens behind/north'],note='Use a wide interior panorama. No view over the exterior rim.'),
 dict(id='CAM-02',name='Market / looking east',at=[-35,0,2],target=[170,0,1],lens_mm=40,required=['Well foreground','Gate Lane ahead','Bridge beyond','Gate farther east'],note='Do not collapse 294 m into one tiny set; use depth and partial occlusion.'),
 dict(id='CAM-03',name='Common porch / looking north',at=[8,-70,2],target=[0,15,1],lens_mm=50,required=['Table bases','Market north','Green awnings'],note='Kitchen and copper vent remain behind/left of camera.'),
 dict(id='CAM-04',name='Workshop court / looking west',at=[-142,18,2],target=[-185,18,1.8],lens_mm=40,required=['Workshop double doors','Waterhouse north/right'],note='Wheel on Waterhouse east wall, never on Workshop facade.'),
 dict(id='CAM-05',name='Bridge / looking east',at=[150,0,1.8],target=[225,0,1.4],lens_mm=50,required=['Pale flat deck','Canal under deck','Arrival court ahead'],note='North is screen-left; south is screen-right.'),
 dict(id='CAM-06',name='Gate / interior evidence view',at=[272,1,1.8],target=[294,0,1.6],lens_mm=28,required=['Closed leaves','Manual bar','Relay on right/south wall'],note='Camera and visible ground remain west of exterior leaf plane.'),
 dict(id='CAM-07',name='Service Walk / Snow indication',at=[274,1,1.1],target=[282,-8.5,1.2],lens_mm=40,required=['Flush cabinet','Shallow drain','Slate paving'],note='No invented cable, scratch, open panel or visible intruder as a clue.'),
 dict(id='CAM-08',name='Garden terrace / looking south',at=[0,135,14],target=[0,0,1],lens_mm=35,required=['Sunwell below','Homes beyond/south','Workshop screen-right/west'],note='A deliberate reverse orientation: east is now screen-left.')]

bible=dict(
 title='MADGER World Bible',volume='01 / Inside the Burrow',version='1.0.0',date='2026-10-19',owner='James Raymond Dean',
 status='Foundation edition created under the owner\'s world-development instruction. New mapped details are established in this edition; they are not represented as previously approved facts.',
 premise='A warm, inventive community built inside a sunlit limestone basin. Its greatest strength is that people look after one another; its recurring challenge is protecting that trust while keeping the place open and alive.',
 scope=dict(included='The inhabited interior, its fixed landmarks, everyday systems and Episode 1 boundary.',excluded='Exterior geography, attacker identities, origins not established by prior character canon, and detailed layouts of unshown extensions.'),
 authority_order=['Latest explicit owner decision','This World Bible and its matching versioned map data','Dated event and character records','Location/model sheets checked against this Bible','Individual episode, game and promotional assets'],
 provenance=dict(retained=['Four established heroes and character/voice corrections','Warm, prosperous settlement and gradual clues','Sunwell, west workshops, north gardens, south homes, east bridge/gate','Independent physical gate bar and local digital records'],new_in_this_edition=['600 x 440 m planning envelope and named coordinates','Three terraces, 16 location records, three fixed canal crossings','Care House, Records House and Makers\' Room placements','Routes, floor plans, camera registry and canon change protocol'],supersedes=['R6 schematic geography where it lacks precise dimensions','R6 shots showing a road beyond the gate','Unmatched or mirrored background variants','Lantern/Warden pilot plot and arbitrary architectural changes']),
 geography=dict(world_id='MADGER-BRW-HOME',units='metres',coordinates='right-handed: +X east, +Y north, +Z up',origin='Sunwell center at finished market paving level',planning_envelope_m=[600,440],rim_height_m=54,open_sky_aperture_m=[430,300],occupied_terraces_z_m=[0,6,12,18],baseline_population_approx=400,perimeter='Ellipse x^2/300^2 + y^2/220^2 = 1 is the planning boundary. Render rock as irregular inside this envelope without moving anchors.',inside_definition='The open-air basin counts as interior. Surrounding cliffs shelter the settlement; homes and service rooms extend into their inner faces. No view outside is required to show daylight.',scale_policy='Coordinates and anchored footprints are fixed production layout. Local decoration and rock texture vary only within their allocated bounds. Roof heights and building shell details remain production specifications, not surveyed real-world engineering.'),
 canon_rules=[dict(id=i,title=t,rule=r) for i,t,r in rules],locations=locations,nodes=nodes,routes=edges,crossings=crossings,
 water=dict(utility_race_centerline_m=water,headrace='The first two segments are enclosed under the western garden ramp. The open wheelrace begins on the east side of Waterhouse at (-161,65).',channel_width_m=6,water_below_path_m=2.2,potable='Covered spring tanks feed separate buried drinking-water pipes; no sewage, wheelrace water or garden runoff enters this system.',wastewater='Sealed collection lines run under service paths to a treatment room in the southeast rock; outflow is distinct from potable and irrigation systems.',surface_water='Storm drains and garden overflow enter a screened lower outlet. Canal edges near public paths have continuous simple rails.',maintenance='Manual isolation at each branch; log a local failure as local, with a visible fallback.'),
 heroes=heroes,episode_1=episode,cameras=cameras,
 palette=[dict(name=n,hex=h,use=u) for n,h,u in [('Warm limestone','#D7C8AA','Cliffs, foundations and well'),('Pale plaster','#EEE4CE','Occupied walls'),('Dark timber','#634B39','Balconies, frames and rails'),('Garden green','#557A53','Awnings, shutters and plants'),('Slate blue','#667D88','Roofs and civic workrooms'),('Copper','#B37848','Service details'),('Warm light','#E6BC73','Evening windows'),('Quiet status','#7DAD8C','Normal displays, including pilot clues')]],
 expansion=dict(version_policy='PATCH corrects wording without changing canon; MINOR adds compatible places/people/events; MAJOR records an owner-authorized retcon. Never overwrite the previous meaning silently.',event_fields=['event_id','story_date_or_sequence','source_episode_or_game_mission','location_ids','before','after','witnesses','who_knows','persistent_effect','canon_version'],location_addition_fields=['stable_id','name','parent_district','coordinate_and_elevation','footprint','doors_and_connections','access_rules','utilities','sightlines','first_appearance','reason_it_was_not_visible_before'],reserved=[dict(id='BRW-X01',anchor=[-240,-95,0],name='West emergency door',status='Fixed closed threshold; inspected emergency provision. Route beyond it remains unassigned and offscreen.'),dict(id='BRW-X02',anchor=[210,-145,-3],name='Southeast treatment/service access',status='Fixed service threshold; not a free public tunnel or an Episode 1 adventure route.'),dict(id='BRW-X03',anchor=[294,0,0],name='East exterior threshold',status='Fixed boundary; exterior roads/lands to be added later without moving the gate.')]),
 state_baseline=dict(id='BRW-E01-OPENING',time='Bridge reopening day / late spring',gate='Operated normally before the episode; closed and barred in shown pilot gate scenes.',bridge='Repaired after ordinary weather wear; sound throughout the pilot.',community='Peaceful, prosperous and capable; ordinary work and small disagreements continue.',knowledge='No character knows that an attack is underway. Receipt and physical trace are unexplained; they do not prove a shared cause.',season='Late spring, dry morning after recent seasonal rain; green gardens, warm afternoon and cool evening.'),
 voice_reference=dict(authority='MADGER_Official_Voices / approved profiles; unchanged by world development',madger='OvSI8qvaDkaFiIdSCWRw',gorilla_white='Mtmp3KhFIjYpWYRycDe3 / Chad with approved Baritone R7 processing',madger_bot='rHWSYoq8UlV0YIBKMryp / Brodie with approved Friendly Smooth R4 processing',snow_white='Approved canine source only; no speech or cloning'),
 sources=[dict(name='Owner world-development instruction',date='2026-10-19 America/New_York',scope='Permanent expandable shared world; interior first; Episode 1 only inside.'),dict(name='MADGER A Good Day Production Bible / R6',library_file_id='libfile_739d83c74d6c81918c44e31fae68b14c',scope='Prior provisional world, character arcs and practical systems.'),dict(name='MADGER Animation Project R6',library_file_id='libfile_a99a8a5c29a881919ea86f91253118a6',version=9,scope='Existing production/voice reference; archived, not rewritten by this edition.'),dict(name='MADGER 3D Expedition',url='https://github.com/madgercoin/madger/blob/a0e7141258cd957f3e44862327c299abb6890e4c/docs/game-expedition.md',scope='Existing movement, companion and character requirements. This edition does not change the build or course geometry.')],
 game_contract=dict(home_world_id='MADGER-BRW-HOME',import_policy='Use coordinates as layout data and location IDs as stable scene/entity IDs. Convert axes at the engine boundary only.',mapping={'Y-up engine':'engine (x,y,z) = bible (x,z,-y); 1 unit = 1 metre','Z-up engine':'engine (x,y,z) = bible (x,y,z); 1 unit = 1 metre'},hub='One continuous fixed home map. Loading screens may partition it without changing distance or adjacency.',separate_course_scope='Existing Overgrown Burrow, Forgotten Works and Crystal Grotto courses keep their current game layouts. Their exact geographical connection to the home Burrow is unassigned in Volume 01.',old_rooms={'Workshop':'BRW-07','Training Den':'BRW-08','Intelligence Room':'BRW-09','Strategy Chamber':'BRW-09 comparison table','Rescue Den':'BRW-11','Trading Post':'BRW-10','Creator Studio':'BRW-16','Trophy Chamber':'BRW-16 archive wall'},ground_rules='Provide authored soil volumes for BURROW. Stone, foundations, protected garden beds and utility lines block digging. Existing Expedition action timings remain unchanged unless separately revised.',state='Store world_canon_version, story_event_cursor and location_state separately from player upgrades, scores and difficulty.',acceptance=['Landmarks occupy matching coordinates and compass directions.','All intended routes connect; bridge maintenance still permits the southern bypass.','No unspecified secret passage or room is generated in the home hub.','Doors, stairs, ramps and rails use collision consistent with their visible shapes.','Hero designs and approved voices are unchanged.','A saved state restores the same event history and geography.'])
)

def dist(a,b):
 import heapq
 q=[(0,a)];seen=set()
 while q:
  d,n=heapq.heappop(q)
  if n==b:return d
  if n in seen:continue
  seen.add(n)
  for e in edges:
   if e['a']==n:heapq.heappush(q,(d+e['length_m'],e['b']))
   if e['b']==n:heapq.heappush(q,(d+e['length_m'],e['a']))

bible['walking_reference']=[dict(route=f'{a} to {b}',distance_m=round(dist(a,b)),unhurried_minutes=round(dist(a,b)/60,1)) for a,b in [('sunwell','gate_inner'),('tables','relay_walk'),('sunwell','workshop'),('sunwell','garden_mid'),('sunwell','home_entry')]]
bible['walking_reference_note']='Unhurried 1 m/s planning pace; crowding and stops add time. Story scenes may span a day through cuts.'
(OUT/'MADGER_World_Bible.json').write_text(json.dumps(bible,indent=2,ensure_ascii=False))
print(json.dumps({'locations':len(locations),'routes':len(edges),'cameras':len(cameras),'walks':bible['walking_reference']},indent=2))
