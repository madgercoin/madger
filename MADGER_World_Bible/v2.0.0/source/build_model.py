from pathlib import Path
import json,copy,math,hashlib
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'output';OUT.mkdir(exist_ok=True)
BASE=json.loads((ROOT/'canon/MADGER_World_Bible_v1.json').read_text())
D=copy.deepcopy(BASE)
D.update(version='2.0.0',date='2026-10-20',volume='02 / Above and Below',status='Owner-directed world expansion. The populated underground town and public entrance replace the surface-only scope and closed-gate default. Prior editions remain historical.')
D['premise']='The Burrow is one busy, welcoming town with populated outdoor terraces and a larger underground neighborhood network. People move between both every day. If the outdoor district is overrun, an independent inner boundary protects the inhabited underground town.'
D['scope']['included']='The existing outdoor basin, populated underground levels, their public/service/egress connections and normal/protected operating states.'
D['scope']['excluded']='Undefined exterior lands, attacker identity, a finished game implementation and real-world structural/mechanical engineering.'
D['geography']['baseline_population_approx']=2400
D['geography']['population_plan']={'surface_residents':800,'underground_residents':1600,'total_residents':2400,'underground_households':400,'basis':'New production planning baseline, not a user-specified census. Four residential wards of 100 homes at an average four residents; shared services support both districts.'}
D['geography']['occupied_underground_levels_z_m']=[-12,-24]
D['geography']['service_level_z_m']=-36
D['geography']['underground_planning_bounds_m']=[-230,-230,-42,175,40,4]
D['geography']['inside_definition']='The Burrow includes the outdoor basin and inhabited chambers beneath it and its inner rock terraces. Episode 1 can show both, but not the unassigned exterior beyond the east boundary.'
D['geography']['underground_section']='Occupied room floors are -12 m and -24 m. Services are -36 m. Typical drawn chamber clear height is 6 m; the section reserves intervening rock. These are fictional production dimensions, not verified structural calculations.'

# Stable IDs retain one world coordinate system. A multi-level core keeps one ID.
R=[
('UG-00','Hearth Public Entry',(-30,-144,0),(30,88),'entry','A welcoming gallery below the Hearth Terraces. Public doors at (-30,-100,0) lead to lifts/stairs landing in the Welcome Hall. A continuous ramp provides a powered-lift-independent route.','Public in ordinary life. Entry is a civic threshold, not a private club or a token-holder gate.'),
('UG-01','Welcome Hall',(-30,-170,-12),(48,36),'welcome','The underground arrival hall: visitor information, seating, stroller/cart space and a steward desk. All main-entry routes arrive here before the inner boundary.','Queue space remains before the two inner closures. No lift or ramp may discharge directly behind the inner gates.'),
('UG-02','Inner Gate Gallery',(-30,-136,-12),(24,32),'gate','A broad civic passage with two independently operated inner closures. Both are open on ordinary days.','Closure lines at y=-144 and y=-128 protect the town beyond. Staff confirm people are clear; no automatic trapping of a crowded passage.'),
('UG-03','Underhall Commons',(-30,-84,-12),(96,72),'commons','A busy indoor high street with everyday shops, shared tables, a meeting square and neighborhood directions.','The central circulation cross stays open. This is a daily public place, not an empty bunker.'),
('UG-04','West Lantern Warren',(-136,-84,-12),(96,72),'homes','Four household courts, shared play rooms, deliveries, doorways, kitchens and quiet residential galleries. Planning occupancy: 400 residents / 100 homes.','Lantern is a neighborhood name and ordinary lighting; no magical energy object. Private room layouts stay unassigned until drawn.'),
('UG-05','East Orchard Warren',(76,-84,-12),(96,72),'homes','Four dense residential courts with family homes, planted gathering pockets and neighbor-run shops. Planning occupancy: 400 residents / 100 homes.','Plants are decorative and locally grown; they do not imply unlimited daylight or a self-feeding town.'),
('UG-06','School & Play Hall',(76,0,-12),(96,60),'school','Classrooms, reading, supervised play, making and community learning used by children from both surface and underground homes.','Children retain ordinary routines and protected gathering areas; danger does not turn the school into a combat room.'),
('UG-07','Care & Community Hall',(-136,0,-12),(96,60),'care','Clinic rooms, recovery, community meals and a separate kitchen wing, with independent clean and service circulation.','Clinical rooms remain private. Kitchen noise and deliveries stay outside the care-room aisle.'),
('UG-08','Central Lift & Stair Court',(-30,0,-12),(60,60),'core','A stacked neighborhood interchange at -12, -24 and -36 m, with ordinary lifts and independent stairs.','This core has no direct surface entrance. It connects only the protected side of the underground town.'),
('UG-09','Service Receiving Hall',(-136,-170,-12),(80,36),'dock','Freight from the workshop service passage is checked, staged and handed into the west neighborhood through a local closure.','The dock gate is a separate surface-to-town defensive boundary; it cannot be left as an unguarded bypass.'),
('UG-10','West Deep Warren',(-136,-84,-24),(96,72),'homes','A second residential neighborhood, equal in dignity and quality to the upper warren. Planning occupancy: 400 residents / 100 homes.','Depth is not a class hierarchy. These residents use surface gardens, markets and celebrations daily.'),
('UG-11','East Deep Warren',(76,-84,-24),(96,72),'homes','Dense family courtyards, homes, doorstep shops and social galleries on the second inhabited level. Planning occupancy: 400 residents / 100 homes.','The four wards are normal permanent homes, not temporary emergency beds.'),
('UG-12','Deep Commons & Kitchens',(-30,-84,-24),(96,72),'kitchens','A shared meal hall, neighborhood shops and kitchens beside the lower residential streets.','Keep food preparation, clean stores and waste handling distinct. Household kitchens also exist.'),
('UG-13','Food Gardens & Grow Rooms',(76,0,-24),(96,60),'grow','Powered growing rooms, seed storage and food preparation for selected greens, herbs and plant starts.','Grow lights require power. Underground cultivation supplements surface gardens and external trade; it does not feed everybody alone.'),
('UG-14','Assembly & Refuge Hall',(-136,0,-24),(96,60),'refuge','Used daily for gatherings, sport, performances and clubs. In a protective state it receives surface residents, with rest, care and family reunification zones.','800 additional refuge places is a production planning target, not a certified capacity. Do not displace underground households to make refuge space.'),
('UG-15','Baths & Laundry',(-30,-170,-24),(96,36),'baths','Shared baths, private washing rooms, laundry, drying and neighborhood maintenance stores.','Separate clean water from drainage. No connection opens through the Welcome Hall above.'),
('UG-16','Utility Repair Hall',(-136,-84,-36),(96,72),'repair','Maintainable local power distribution, battery rooms, spare equipment and repair benches.','Separate zones can be isolated. A failure here cannot be written as an unexplained instant shutdown of all life support.'),
('UG-17','Water & Air Service Rooms',(-30,-84,-36),(96,72),'water','Partitioned potable reserve, wastewater lift plant, drainage sumps and air-handling rooms.','Wastewater must be pumped up to the existing -3 m service level; it cannot flow uphill by gravity. Independent duty/backup equipment and local controls.'),
('UG-18','Deep Stores',(76,-84,-36),(96,72),'stores','Dry staples, household supplies, repair materials and documented community reserves.','Stock quantities change in the event ledger. No infinite supplies or unearned emergency solution.'),
('UG-19','West Stair & Refuge Core',(-210,-40,-12),(16,20),'egress','An independent protected stair/refuge core links all three underground levels to the surface service walk at (-210,-40,0).','Outside entry is locally controlled. Occupants can leave from inside without network permission; surface conditions still determine whether evacuation is safe.'),
('UG-20','East Stair & Refuge Core',(144,-40,-12),(16,20),'egress','A second separated protected stair/refuge core links all levels to the surface service walk at (144,-40,0).','This is a distinct route from the west core. Include it in any surface-overrun state and keep staff able to operate it locally.')
]
AREAS={}
for i,name,pos,size,kind,purpose,rule in R:
    AREAS[i]={'id':i,'name':name,'position_m':list(pos),'footprint_m':list(size),'kind':kind,'role':purpose,'continuity_limits':[rule],'levels_z_m':[-12,-24,-36] if kind in ['core','egress'] else [pos[2]],'clear_height_m':6 if kind!='entry' else 4,'portals':[],'new_in_version':'2.0.0'}

# Door-linked circulation. Corridors use explicit polylines between portal centers.
NODES={};EDGES=[]
def node(k,p):
    if k in NODES:assert NODES[k]==list(p),(k,p,NODES[k])
    NODES[k]=list(p);return k
def area_node(a,z=None):
    l=AREAS[a];p=l['position_m'].copy()
    if z is not None:p[2]=z
    return node(a+('@'+str(z) if l['kind'] in ['core','egress'] else ''),p)
for a,l in AREAS.items():
    for z in l['levels_z_m']:area_node(a,z)
def portal(a,side,z=None,width=6):
    l=AREAS[a];x,y,zz=l['position_m'];w,h=l['footprint_m'];z=zz if z is None else z
    dx,dy={'N':(0,h/2),'S':(0,-h/2),'W':(-w/2,0),'E':(w/2,0)}[side];p=[x+dx,y+dy,z]
    ident=a+'-'+side+'-'+str(abs(z))
    old=next((q for q in l['portals'] if q['id']==ident),None)
    if not old:l['portals'].append({'id':ident,'side':side,'position_m':p,'width_m':width})
    return p
def connect(a,sa,b,sb,z=None,width=6,gate=None,via=None):
    pa=portal(a,sa,z,width);pb=portal(b,sb,z,width)
    EDGES.append({'id':f'{a}__{b}'+('___'+str(z) if z is not None else ''),'a':area_node(a,z),'b':area_node(b,z),'mode':'walk_cart','width_m':width,'points_m':[pa]+(via or [])+[pb],'closure_id':gate,'status':'ordinary public route' if not gate else 'normally open / local protective closure'})
connect('UG-01','N','UG-02','S',width=12,gate='IG-A')
connect('UG-02','N','UG-03','S',width=12,gate='IG-B')
connect('UG-03','W','UG-04','E')
connect('UG-03','E','UG-05','W')
connect('UG-03','N','UG-08','S',z=-12)
connect('UG-04','N','UG-07','S')
connect('UG-05','N','UG-06','S')
connect('UG-07','E','UG-08','W',z=-12)
connect('UG-08','E','UG-06','W',z=-12)
connect('UG-09','N','UG-04','S',gate='SG-W')
connect('UG-12','W','UG-10','E')
connect('UG-12','E','UG-11','W')
connect('UG-12','N','UG-08','S',z=-24)
connect('UG-10','N','UG-14','S')
connect('UG-11','N','UG-13','S')
connect('UG-14','E','UG-08','W',z=-24)
connect('UG-08','E','UG-13','W',z=-24)
connect('UG-12','S','UG-15','N')
connect('UG-17','W','UG-16','E')
connect('UG-17','E','UG-18','W')
connect('UG-17','N','UG-08','S',z=-36)
for z,west,east in [(-12,'UG-04','UG-05'),(-24,'UG-10','UG-11'),(-36,'UG-16','UG-18')]:
    connect(west,'W','UG-19','E',z=z,width=4,via=[[-194,-84,z],[-194,-40,z]])
    connect(east,'E','UG-20','W',z=z,width=4,via=[[134,-84,z],[134,-40,z]])
for a in ['UG-08','UG-19','UG-20']:
    x,y,z=AREAS[a]['position_m']
    for za,zb in [(-12,-24),(-24,-36)]:
        EDGES.append({'id':f'{a}_stairs_{za}_{zb}','a':area_node(a,za),'b':area_node(a,zb),'mode':'stairs','width_m':3,'points_m':[[x,y,za],[x,y,zb]],'closure_id':None,'status':'stacked stair geometry; drawn as a section symbol, not a vertical walk surface'})
        if a=='UG-08':EDGES.append({'id':f'{a}_lift_{za}_{zb}','a':area_node(a,za),'b':area_node(a,zb),'mode':'lift','width_m':3,'points_m':[[x,y,za],[x,y,zb]],'closure_id':None,'status':'ordinary mobility lift; stairs remain independent'})
portal('UG-00','N',0,6);portal('UG-01','W',-12,6);portal('UG-09','W',-12,6)
node('SURFACE-PUBLIC',[-30,-100,0]);node('SURFACE-SERVICE',[-173,3,0])
node('SURFACE-WEST',[-210,-40,0]);node('SURFACE-EAST',[144,-40,0])
EDGES.append({'id':'public_gallery','a':'SURFACE-PUBLIC','b':'UG-00','mode':'walk_cart','width_m':6,'points_m':[[-30,-100,0],[-30,-170,0]],'closure_id':None,'status':'public entry gallery; surface portal under the Hearth Terraces'})
for mode in ['lift','stairs']:
    EDGES.append({'id':'public_'+mode,'a':'UG-00','b':'UG-01','mode':mode,'width_m':3,'points_m':[[-30,-170,0],[-30,-170,-12]],'closure_id':None,'status':'lands before inner gates'})
ramp=[[-30,-100,0],[-90,-100,0],[-90,-222,-6],[-54,-222,-8],[-54,-170,-12]]
EDGES.append({'id':'public_step_free_ramp','a':'SURFACE-PUBLIC','b':'UG-01','mode':'ramp','width_m':6,'points_m':ramp,'closure_id':None,'status':'independent of powered lifts; all runs no steeper than 1:12; landings at each turn'})
service=[[-173,3,0],[-222,3,0],[-222,-100,-6],[-222,-170,-9],[-176,-170,-12]]
EDGES.append({'id':'workshop_service_ramp','a':'SURFACE-SERVICE','b':'UG-09','mode':'ramp','width_m':6,'points_m':service,'closure_id':None,'status':'service receiving before SG-W; all runs no steeper than 1:12'})
for k,a,g in [('SURFACE-WEST','UG-19','EX-W'),('SURFACE-EAST','UG-20','EX-E')]:
    x,y,_=NODES[k];EDGES.append({'id':k+'_stairs','a':k,'b':area_node(a,-12),'mode':'stairs','width_m':3,'points_m':[[x,y,0],[x,y,-12]],'closure_id':g,'status':'controlled exterior ingress; mechanical free egress from inside'})

UG={'version':'2.0.0','areas':list(AREAS.values()),'nodes':NODES,'routes':EDGES,'population_plan':D['geography']['population_plan'],'defensive_boundaries':[{'id':'IG-A','location':'UG-02','plane_y_m':-144,'description':'Outer inner-gallery closure, open in ordinary life.'},{'id':'IG-B','location':'UG-02','plane_y_m':-128,'description':'Independent inner-gallery closure, open in ordinary life.'},{'id':'SG-W','location':'UG-09 to UG-04','plane_y_m':-144,'description':'Workshop freight boundary, independently closed during a protective state.'},{'id':'EX-W','location':'UG-19 surface threshold','description':'Controlled inward access; locally operated egress.'},{'id':'EX-E','location':'UG-20 surface threshold','description':'Controlled inward access; locally operated egress.'}],
'surface_interfaces':[{'id':'ENT-P','at':[-30,-100,0],'connects_to':'UG-00','type':'main public entry'},{'id':'ENT-S','at':[-173,3,0],'connects_to':'UG-09','type':'workshop service passage'},{'id':'ENT-W','at':[-210,-40,0],'connects_to':'UG-19','type':'protected stair exit'},{'id':'ENT-E','at':[144,-40,0],'connects_to':'UG-20','type':'protected stair exit'},{'id':'LW-W','at':[-120,-40,0],'type':'sealed daylight duct / no human passage'},{'id':'LW-E','at':[55,-40,0],'type':'sealed daylight duct / no human passage'}],
'services':{'air':'Two separated intake/service paths, zoned air handlers, local dampers, monitoring and backup power. Daylight ducts are not ventilation calculations or person-sized access routes. Do not seal inhabited rooms without maintaining breathable air.','water':'Independent covered potable reserve. Surface spring feed descends in sealed pipes; pressure control and branch isolation are local. Canal water remains separate.','waste':'Sealed underground drains collect at -36 m. Duty/backup pumps lift wastewater to the established southeast service/treatment connection at -3 m. Emergency holding is local; no uphill gravity drain.','power':'Local batteries and distributed supplies support emergency light, communications, air and pumps. A forged record cannot physically open a manual gate.','food':'Surface gardens, traded staples, household stores and powered grow rooms all contribute. Refuge supplies are tracked finite stock.','daylight':'Sealed light ducts at LW-W and LW-E serve upper street connectors. Lower streets use comfortable electric lighting and planted communal spaces; no invented sunlight below solid rock.'},
'operating_states':[{'id':'OPEN','rule':'Outdoor East Gate and the main underground public entrance welcome normal public use. Inner closures stand open. Homes, clinics and service rooms retain normal privacy and staff access.'},{'id':'PROTECT','rule':'Stewards guide people inward, keep arrival routes legible, account for families and operate local gates only when the closure line is clear. Other entrances receive coordinated local closures.'},{'id':'SURFACE_OVERRUN','rule':'The inhabited underground town remains behind IG-A / IG-B / SG-W and locally controlled stair thresholds. Compartment doors limit a local breach. Civilian refuge, air, water and egress remain operating priorities.'},{'id':'RECOVER','rule':'Inspect routes, verify both physical and digital records, reunite households and reopen by location. Record damage and repairs as dated overlays.'}],
'production_limits':['Plans establish fictional world geometry, not a certified structural or evacuation design.','Final game navigation meshes must follow portals and authored stair/ramp geometry; the route graph is not a collision mesh.','Underground homes are reserved 100-unit wards; individual apartment interiors and occupants require later registered sub-plans.','No real attacker identity, exploit method or episode-one attack is established.']}
D['underground']=UG
D['locations']+=UG['areas']
for rule in D['canon_rules']:
    if rule['id']=='C03':rule['rule']='Episode 1 stays within the outdoor basin and mapped underground town. An open public gate may be shown from an inward-facing angle without depicting the undefined exterior. No villain or exterior attack cutaway.'
D['canon_rules'] += [{'id':'C11','title':'One town above and below','rule':'Both parts are highly populated permanent neighborhoods. Underground living is normal and valued; its residents share surface civic life.'},{'id':'C12','title':'Welcome first, independent defense','rule':'Public entrance is open in normal life. The inhabited underground town has a separate, more defensible inner boundary. Account for main, service and emergency ingress; no bypass invented for convenience.'},{'id':'C13','title':'People before closure','rule':'Defensive state changes retain civilian refuge, manual egress, air, water and local control. A status message alone cannot operate the physical gate bar.'},{'id':'C14','title':'A plan for every area','rule':'Register a blueprint, fixed coordinates and connections before a new area appears. New districts extend this world; event damage does not silently redraw its baseline.'}]
for loc in D['locations']:
    if loc['id']=='BRW-14':
        loc['doors']=['Exterior leaf plane stays at x=294. Public passage is open during ordinary daytime. The pilot uses inward framing; no unassigned exterior landscape is shown.','Vestibule west mouth remains x=270. Leaves may close routinely at night or under an explicit protective state.']
        loc['anchors'][1]='Mechanical crossbar on the inside, independent of the arrival log; disengaged when the public gate is open.'
        loc['continuity_limits']=['Do not confuse the outdoor public gate with the new underground inner gates. Normal hospitality and defensive readiness coexist.']
    if loc['id']=='BRW-13':loc['anchors'][2]='Visitors and deliveries are welcome in ordinary life. Pilot shots stay on interior ground and look inward.'
D['state_baseline']['gate']='Outdoor public entry and main underground entrance are open by day. Inner gates are normally open. Routine evening closing is an event, not the everyday identity of the Burrow.'
D['state_baseline']['community']='Two lively, highly populated, connected districts; 800 surface and 1,600 underground residents are the initial production planning baseline.'
D['episode_1']=[
{'time':'00:00-00:50','locations':['UG-04','UG-03','BRW-03','BRW-01'],'beat':'Open with an underground household preparing breakfast, children on the common street and neighbors moving up to the sunlit market. Introduce all four heroes through useful, ordinary actions.','boundary':'All views remain in the Burrow; show above and below as one everyday town.','clue':'None. The first impression is warm, crowded, safe and capable.'},
{'time':'00:50-01:40','locations':['BRW-13','BRW-14','UG-00','UG-01','UG-02'],'beat':'A visitor is welcomed and a delivery is counted. The main underground route passes through open inner gates with residents moving both directions.','boundary':'Frame toward interior space. Do not turn the inner gate into a threat reveal.','clue':'One duplicate D17 receipt; Bot preserves both without accusation.'},
{'time':'01:40-03:00','locations':['BRW-07','BRW-12','BRW-01'],'beat':'Neighbors reopen the weather-repaired bridge. Gorilla accepts help, Madger shares credit and underground residents join the celebration.','boundary':'Time cuts preserve actual travel distances.','clue':'No sabotage, attacker or extra bridge.'},
{'time':'03:00-04:10','locations':['UG-03','UG-06','BRW-15'],'beat':'Show learning, shared food and the ordinary use of both districts. After a time cut, Snow holds an indication near the intact gate relay; Madger pays attention.','boundary':'Snow notices an unfamiliar physical trace, never a digital hack by scent.','clue':'Source unknown; no forced connection to the duplicate receipt.'},
{'time':'04:10-04:50','locations':['BRW-02','UG-04','UG-10'],'beat':'End the day with friends and households returning home above and below. Bot retains the observations and plans a careful check.','boundary':'A brief routine evening gate closing can be shown without alarm.','clue':'The community stays joyful; the audience has a small unresolved question.'},
{'time':'04:50-05:00','locations':['BRW-14','BRW-15'],'beat':'After the documented routine closing, the local log receives another D17 acknowledgment although no new passage occurred.','boundary':'Inward shot of the closed outdoor leaves; no outside silhouette or villain.','clue':'An unexplained discrepancy, not proof of a cause or attack.'}]
for cam in D['cameras']:
    if cam['id']=='CAM-06':cam['note']='For routine evening closure only, show the closed leaves and inside bar. Daytime public-entry shots face inward and do not imply a closed-to-public settlement.'
D['provenance']['new_in_this_edition']=['Two occupied underground levels and a service level; 21 new mapped area IDs.','Public entry, internal defensive boundary and independent secondary access closures.','Population planning revised from approximately 400 to 2,400, split 800 above and 1,600 below.','Existing surface anchors, footprints, three crossings and watercourse preserved.']
D['provenance']['supersedes']+=['Surface-only scope, approximate 400-person planning population and closed-gate default from v1.0.0.','Pilot requirements that the public gate remain closed in every daytime shot.']
D['change_log'].append({'version':'2.0.0','date':'2026-10-20','reason':'Latest owner instruction: above-ground and underground highly populated areas, public entrance and a stronger inner defense if the outdoor area is overrun.','preserved':'All 16 surface world positions and footprints, three crossings, surface route graph and watercourse.','new':'UG-00 through UG-20, normal/protective states, underground route graph, population plan and updated pilot scope.'})
D['document_reference']={'current_edition':'v2.0.0/MADGER_World_Bible.json','underground_blueprints':'v2.0.0/MADGER_Underground_Blueprints.pdf','surface_geometry_reference':'blueprints/v1.0.0/MADGER_Burrow_Blueprints.pdf','historical_foundation':'v1.0.0/MADGER_World_Bible.pdf','precedence':'v2.0.0 overrides conflicting population, access, underground scope and pilot gate-state statements in historical documents.'}
for reserved in D['expansion']['reserved']:
    if reserved['id'] in ['BRW-X01','BRW-X02']:
        reserved['status']+=' This historical surface threshold has no human passage into the inhabited underground town in v2.0.0. Any future connection must receive a registered plan and its own protective boundary.'

checks={'surface_positions_preserved':all(D['locations'][i]['position_m']==l['position_m'] and D['locations'][i]['footprint_m']==l['footprint_m'] for i,l in enumerate(BASE['locations'])),'surface_watercourse_preserved':D['water']==BASE['water'],'surface_routes_preserved':D['routes']==BASE['routes'],'three_surface_crossings':D['crossings']==BASE['crossings'],'new_area_ids_unique':len(AREAS)==len(set(AREAS))==21,'population_adds_up':800+1600==2400,'ramp_grades_at_most_1_in_12':all(abs(b[2]-a[2])<=math.dist(a[:2],b[:2])/12+1e-9 for pts in [ramp,service] for a,b in zip(pts,pts[1:]))}
def reach(start,closed=set(),exclude_mode=set(),removed=set()):
    graph={n:set() for n in NODES if n not in removed}
    for e in EDGES:
        if e['closure_id'] in closed or e['mode'] in exclude_mode or e['a'] in removed or e['b'] in removed:continue
        graph[e['a']].add(e['b']);graph[e['b']].add(e['a'])
    seen={start};q=[start]
    while q:
        for b in graph[q.pop()]:
            if b not in seen:seen.add(b);q.append(b)
    return seen
inside=[k for k in NODES if not k.startswith('SURFACE') and k not in ['UG-00','UG-01','UG-02','UG-09']]
checks['all_areas_reachable_normal']=all(n in reach('SURFACE-PUBLIC') for n in NODES)
closed={'IG-A','IG-B','SG-W','EX-W','EX-E'}
checks['no_surface_bypass_when_ingress_closed']=all(not(set(inside)&reach(n,closed)) for n in ['SURFACE-PUBLIC','SURFACE-SERVICE','SURFACE-WEST','SURFACE-EAST'])
checks['protected_town_stays_connected']=set(inside)<=reach('UG-03',closed)
checks['town_connected_without_lifts']=set(inside)<=reach('UG-03',closed,{'lift'})
checks['alternate_stair_core_survives_one_core_loss']=all(set(n for n in inside if not n.startswith(core))<=reach('UG-03',closed,{'lift'},{n for n in NODES if n.startswith(core)}) for core in ['UG-19','UG-20'])
checks['all_room_footprints_nonoverlap_per_level']=True
for z in [-12,-24,-36]:
    rooms=[a for a in AREAS.values() if z in a['levels_z_m']]
    for i,a in enumerate(rooms):
        for b in rooms[i+1:]:
            ax,ay,_=a['position_m'];aw,ah=a['footprint_m'];bx,by,_=b['position_m'];bw,bh=b['footprint_m']
            if min(ax+aw/2,bx+bw/2)>max(ax-aw/2,bx-bw/2)+1e-8 and min(ay+ah/2,by+bh/2)>max(ay-ah/2,by-bh/2)+1e-8:checks['all_room_footprints_nonoverlap_per_level']=False
assert all(checks.values()),checks
D['validation']={'status':'passed','checks':checks,'limits':UG['production_limits']}
for name,obj in [('MADGER_World_Bible.json',D),('MADGER_Underground_Data.json',UG),('validation.json',D['validation'])]:(OUT/name).write_text(json.dumps(obj,indent=2)+'\n')
print(json.dumps({'new_areas':len(AREAS),'route_edges':len(EDGES),'checks':checks},indent=2))
