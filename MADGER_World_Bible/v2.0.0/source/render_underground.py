from drawing import *
UG=D['underground']; AREAS={a['id']:a for a in UG['areas']}
TEAL='#123B46'; GOLD_FILL='#3A3324'; HOME='#153342'

def zone(m,x,y,w,h,label,color=LINE):
    m.rect(x,y,w,h,stroke=DIM,lw=.8,dash=[4,3]);
    lines=label.split('|')
    for i,s in enumerate(lines):m.label(x+w/2,y+h/2+(len(lines)-1)*1.1-i*2.2,s,12,color)
def shelves(m,x,y,w,h):
    m.rect(x,y,w,h,stroke=LINE,lw=.9)
    for j in range(1,6):m.line((x+j*w/6,y),(x+j*w/6,y+h),DIM,.6)
def desk(m,x,y,w=7,h=2):
    m.rect(x,y,w,h,stroke=LINE,lw=1)
    for xx in [x+1,x+w-1]:m.rect(xx-.5,y-1.2,1,.7,stroke=DIM,lw=.8)
def portal_marks(m,l,local=False,z=None):
    cx,cy,cz=l['position_m']
    for p in l['portals']:
        if z is not None and p['position_m'][2]!=z:continue
        x,y,zz=p['position_m'];x-=cx if local else 0;y-=cy if local else 0;w=p['width_m']
        if p['side'] in ['N','S']:
            m.line((x-w/2,y),(x+w/2,y),PANEL,5);m.line((x-w/2,y),(x+w/2,y),GREEN,1.3)
        else:m.line((x,y-w/2),(x,y+w/2),PANEL,5);m.line((x,y-w/2),(x,y+w/2),GREEN,1.3)
def slab_detail(m,l):
    kind=l['kind'];w,h=l['footprint_m']
    if kind=='homes':
        for x,y in [(-44,-32),(4,-32),(-44,4),(4,4)]:
            m.rect(x,y,40,28,stroke=LINE,lw=1)
            # Four neighborhood courts; small frontage symbols are not an apartment-count claim.
            for i in range(5):
                m.rect(x+i*8,y,8,6,stroke=DIM,lw=.6);m.rect(x+i*8,y+22,8,6,stroke=DIM,lw=.6)
            m.label(x+20,y+15,'25-HOME COURT',12);m.label(x+20,y+11,'interiors reserved',10,MUTED)
        m.line((-47,0),(47,0),GREEN,1.4);m.line((0,-35),(0,35),GREEN,1.4)
        m.label(0,-40,'100 HOMES / PLANNING OCCUPANCY 400',12,GOLD)
    elif kind=='entry':
        zone(m,-12,-15,24,55,'PUBLIC GALLERY|level +0.0 m')
        m.rect(-11,-36,9,16,stroke=LINE,lw=1);m.rect(3,-32,9,12,stroke=GOLD,lw=1.5)
        for y in range(-35,-20,2):m.line((-10,y),(-3,y),DIM,.8)
        m.label(7,-36,'LIFTS',11,GOLD);m.label(-7,-39,'STAIR',11)
        m.label(0,47,'TO HEARTH APPROACH',11,GREEN)
        m.label(0,-48,'ALL LANDINGS ENTER UG-01 BEFORE THE GATES',10,GOLD)
    elif kind=='welcome':
        zone(m,-21,4,17,11,'INFORMATION|& STEWARD');desk(m,-19,7,12,2)
        zone(m,4,4,17,11,'WAITING|& FAMILIES')
        for x in [6,12]:desk(m,x,6,4,2)
        m.rect(-10,-10,7,7,stroke=GOLD,lw=1);m.label(-6.5,-13,'LIFT',10,GOLD)
        zone(m,3,-12,17,12,'STAIR|LANDING')
        m.line((0,-1),(0,17),GREEN,1.6);m.label(0,0,'PUBLIC ARRIVAL',11)
    elif kind=='gate':
        for y,t in [(-8,'IG-A'),(8,'IG-B')]:
            m.line((-11,y),(-6,y),LINE,2);m.line((6,y),(11,y),LINE,2)
            m.line((-6,y),(6,y),GOLD,2,dash=[6,4]);m.label(0,y+2,t+' / OPEN NORMALLY',10,GOLD)
        zone(m,-11,-4,4,8,'LOCAL|CONTROL');m.line((0,-16),(0,16),GREEN,1.3)
        m.label(4,0,'CLEAR PASSAGE',10)
    elif kind=='commons':
        for x in [-43,-23,4,24]:zone(m,x,22,16,11,'SHOP')
        for x in [-43,-22,4,25]:zone(m,x,-33,15,11,'SHOP')
        for x in [-35,23]:
            for y in [-12,8]:desk(m,x,y,12,3)
        m.line((-46,0),(46,0),GREEN,1.3);m.line((0,-35),(0,35),GREEN,1.3)
        m.label(0,5,'SHARED SQUARE',15);m.label(0,-7,'DAY-TO-DAY PUBLIC LIFE',12,GREEN)
    elif kind=='school':
        for x in [-44,-20,4,28]:
            zone(m,x,6,20,20,'LEARNING|ROOM')
            for xx in [x+3,x+11]:desk(m,xx,9,5,2)
        zone(m,-44,-26,42,24,'PLAY / MAKING');zone(m,4,-26,40,24,'READING / CLUBS')
        m.line((-47,0),(47,0),GREEN,1.4)
    elif kind=='care':
        for x in [-44,-28,-12]:
            zone(m,x,6,12,20,'CARE');m.rect(x+3,10,6,3,stroke=LINE,lw=.8)
        zone(m,-44,-26,42,24,'RECOVERY|& WAITING')
        zone(m,4,6,40,20,'SEPARATE KITCHEN|& CLEAN STORE')
        zone(m,4,-26,40,24,'COMMUNITY MEALS')
        for x in [9,27]:desk(m,x,-18,11,3)
        m.line((0,-29),(0,29),LINE,2);m.line((0,-3),(0,3),PANEL,4)
        m.line((-47,0),(47,0),GREEN,1.3)
    elif kind=='core':
        for x in [-24,4]:
            m.rect(x,-23,19,46,stroke=LINE,lw=1)
            for y in range(-21,22,3):m.line((x+1,y),(x+8,y),DIM,.8)
            m.label(x+9.5,0,'STAIRS',11)
        for y in [-20,10]:m.rect(-4,y,8,10,stroke=GOLD,lw=1.4)
        m.label(0,0,'LIFTS',11,GOLD);m.label(0,33,'NO DIRECT SURFACE ACCESS',11,GREEN)
    elif kind=='egress':
        m.rect(-7,-9,6,18,stroke=LINE,lw=1)
        for y in range(-8,9,2):m.line((-6.5,y),(-1.5,y),DIM,.8)
        zone(m,0,-8,7,16,'REFUGE|LANDING')
        m.label(-4,0,'STAIR',10);m.label(0,12,'LOCAL INGRESS CONTROL',10,GOLD)
    elif kind=='dock':
        for x in [-36,-19,6,23]:shelves(m,x,-13,11,18)
        m.line((-39,0),(39,0),GREEN,1.2)
        zone(m,-16,8,32,7,'RECEIVING / TAG CHECK')
        m.label(0,-22,'SG-W CLOSURE ON NORTH APPROACH',11,GOLD)
    elif kind=='kitchens':
        for x in [-44,-22]:zone(m,x,18,18,15,'KITCHEN|& PREP')
        for x in [4,26]:zone(m,x,18,18,15,'SHOP|& STORE')
        for x in [-36,-13,10,32]:
            for y in [-27,-12,4]:desk(m,x,y,11,3)
        m.label(0,12,'NEIGHBORHOOD MEAL HALL',14,GREEN)
    elif kind=='grow':
        for x in [-44,-25,6,25]:
            for y in [-25,5]:
                m.rect(x,y,15,20,stroke=GREEN,lw=1)
                for xx in range(3):m.line((x+3+xx*4,y+1),(x+3+xx*4,y+19),DIM,.7)
        m.line((-47,0),(47,0),GREEN,1.3);m.line((0,-29),(0,29),GREEN,1.3)
        m.label(0,0,'POWERED GROWING ROOMS',12,GOLD)
    elif kind=='refuge':
        zone(m,-43,-25,62,50,'DAILY ASSEMBLY / SPORT / PERFORMANCE|CLEAR HALL IN NORMAL LIFE')
        zone(m,23,6,21,19,'CARE|& FAMILY DESK');zone(m,23,-25,21,25,'REST / WC|SUPPORT')
        for y in [-19,-9,1,11]:m.line((-39,y),(15,y),DIM,.8,dash=[3,5])
        m.label(-10,-33,'REFUGE OVERLAY: 800 ADDITIONAL PLACES PLANNED',11,GOLD)
    elif kind=='baths':
        for x in [-43,-27,-11]:zone(m,x,-14,12,27,'PRIVATE|WASH')
        zone(m,7,-14,36,27,'LAUNDRY|& DRYING')
        for x in [11,21,31]:m.circ(x,-4,2,stroke=LINE,lw=1)
        m.label(0,21,'CLEAN SUPPLY / SEPARATE SEALED DRAINS',11,WATER)
    elif kind=='repair':
        zone(m,-44,7,40,25,'LOCAL POWER|& BATTERY ROOMS');zone(m,4,7,40,25,'SPARES / ISOLATION')
        for x in [-35,-13,10,32]:desk(m,x,-20,11,3)
        m.label(0,0,'MAINTENANCE AISLE',13,GREEN)
    elif kind=='water':
        zone(m,-44,4,40,28,'COVERED POTABLE|RESERVE',WATER)
        for x in [-33,-16]:m.circ(x,18,6,stroke=WATER,lw=1)
        zone(m,4,4,40,28,'AIR HANDLERS|SEPARATE ZONES')
        zone(m,-44,-32,40,28,'WASTEWATER LIFT|DUTY + BACKUP',GOLD)
        zone(m,4,-32,40,28,'DRAINAGE SUMPS|LOCAL CONTROL')
        m.line((-47,0),(47,0),GREEN,1.4);m.line((0,-35),(0,35),LINE,2)
    elif kind=='stores':
        for x in [-43,-26,-9,8,25]:
            for y in [-30,7]:shelves(m,x,y,10,23)
        m.label(0,0,'CLEAR STOCK AISLE / FINITE RESERVES',12,GREEN)

def panel(d,y,title,text):
    d.text(1180,y,title,13,GREEN,'Mono');return d.para(1180,y+28,text,350,14)+22
def level_map(d,z,box=(76,205,1025,725),labels=True,highlight=None):
    m=Map(d,(-235,-235,175,45),box)
    m.grid(20)
    for e in UG['routes']:
        pts=e['points_m']
        if e['mode']!='walk_cart' or not all(p[2]==z for p in pts) or e['a'].startswith('SURFACE'):continue
        m.poly(pts,'#1B4854',max(2,e['width_m']*m.s));m.poly(pts,GREEN,1.2)
    for l in AREAS.values():
        if z not in l['levels_z_m']:continue
        x,y,_=l['position_m'];w,h=l['footprint_m']
        color=GOLD if l['id']==highlight or l['kind'] in ['gate','welcome','dock'] else LINE
        fill=HOME if l['kind']=='homes' else GOLD_FILL if l['kind']=='gate' else PANEL
        m.rect(x-w/2,y-h/2,w,h,fill, color,1.4)
        portal_marks(m,l,z=z)
        if labels:
            if l['kind'] in ['egress']:m.label(x,y,l['id'][-2:],11,GREEN)
            else:
                m.label(x,y+2,l['id'],14,color,'Mono')
                if l['kind']=='homes':m.label(x,y-8,'400 RESIDENTS',10,GREEN)
    if z==-12:
        for yy in [-144,-128]:m.line((-36,yy),(-24,yy),GOLD,2,dash=[4,3])
        m.line((-139,-144),(-133,-144),GOLD,2,dash=[4,3])
        m.poly([[-54,-220],[-54,-170]],GOLD,1.5,dash=[4,4]);m.label(-40,-215,'PUBLIC ARRIVAL',10,GOLD,'Sans','left')
        m.poly([[-222,-170],[-176,-170]],GOLD,1.5,dash=[4,4])
        for x,y in [(-120,-40),(55,-40)]:m.rect(x-2,y-2,4,4,fill=GOLD,stroke=GOLD)
    m.flush_labels();return m

def section_sheet():
    d=Draw('UG-A0','The Burrow / life above and below','World section at X=-30 m / homes and public streets continue beneath the outdoor settlement')
    d.text(80,182,'SOUTH',13,GREEN,'Mono');d.text(620,182,'NORTH',13,GREEN,'Mono')
    d.line(140,178,605,178,GREEN,.8)
    def p(y,z):return 85+(y+230)*3.55,430-z*8.0
    # Ground and reserved rock; room rectangles are cut out of the same datum.
    d.rect(85,430,958,336,'#122D40',DIM,.5)
    for zz in [-12,-24,-36]:
        y=p(-230,zz)[1];d.line(85,y,1043,y,DIM,.6,dash=[3,5]);d.text(85,y+22,f'{zz:g} m',12,GREEN,'Mono')
    d.line(*p(-230,0),*p(40,0),LINE,2)
    # Existing Hearth houses are above the entrance gallery.
    x1,y1=p(-158,18);x2,y2=p(-106,12);d.rect(x1,y1,x2-x1,y2-y1,PANEL,LINE,1.5)
    d.text((x1+x2)/2,y1-16,'HEARTH HOMES +12 m',13,WHITE,'Sans','center')
    for yy in range(-153,-110,9):
        xx,yy2=p(yy,12);d.rect(xx,yy2-23,18,23,stroke=DIM,lw=.7)
    d.text(736,394,'OUTDOOR STREETS / SUNLIT BASIN',13,WHITE,'Sans','center')
    for l in AREAS.values():
        x,y,z=l['position_m'];w,h=l['footprint_m']
        if not x-w/2<=-30<=x+w/2 or l['kind'] in ['egress']:continue
        for lev in l['levels_z_m']:
            top=lev+l['clear_height_m'];a,b=p(y-h/2,top);c,dd=p(y+h/2,lev)
            d.rect(a,b,c-a,dd-b,PANEL,GOLD if l['kind']=='gate' else LINE,1.2)
            label={'entry':'PUBLIC ENTRY','welcome':'WELCOME','gate':'INNER GATES','commons':'UNDERHALL COMMONS','core':'LIFT / STAIR','kitchens':'DEEP COMMONS','baths':'BATHS / LAUNDRY','water':'WATER / AIR / PUMPS'}.get(l['kind'],l['id'])
            if l['kind'] not in ['welcome','gate']:
                d.text((a+c)/2,(b+dd)/2+4,label,11,WHITE,'Sans','center')
    # Main entry lift is entirely before the defensive gate gallery.
    a,b=p(-174,0);c,e=p(-166,-12);d.rect(a,b,c-a,e-b,fill=GOLD_FILL,stroke=GOLD,lw=1.5)
    for yy in [-144,-128]:d.line(*p(yy,-12),*p(yy,-6),GOLD,2)
    # Labels stay below the rooms so the shaft and closure planes do not cut text.
    for yy,label in [(-170,'WELCOME'),(-136,'INNER GATES')]:
        xx,zz=p(yy,-12);d.text(xx,zz+24,label,11,WHITE,'Sans','center')
    d.text(95,830,'Section uses vertical exaggeration for clarity. Primary floor levels and Y positions are fixed.',13,MUTED)
    d.text(95,864,'Residential wards flank the commons east and west; they sit outside this section cut.',14,WHITE)
    d.line(95,902,1088,902,DIM,.8)
    d.para(95,934,'Above: busy markets, gardens and homes. Below: two populated neighborhood levels, then maintainable services. The refuge is a part of normal civic life, ready to receive surface residents if needed.',980,18)
    d.line(1140,160,1140,1010,DIM,.8)
    y=184
    for title,txt in [('ONE SHARED TOWN','The outdoor Burrow remains important. Underground streets are also permanent, crowded neighborhoods with their own daily rhythms.'),('POPULATION PLAN','2,400 residents: 800 above ground and 1,600 below, across four 400-resident wards. These are new planning figures, not a previously approved census.'),('PUBLIC BY DEFAULT','The outdoor entrance and main underground entry welcome the public during ordinary life. Shops, school, meals and civic spaces remain active.'),('A SECOND DEFENSIVE LINE','The underground Welcome Hall lies before the Inner Gate Gallery. If the surface is overrun, the inhabited town can be isolated behind it.'),('CONSISTENT GEOMETRY','The 16 surface footprints stay where they are. New underground area IDs, vertical connections and entrances share the same Sunwell origin.')]:y=panel(d,y,title,txt)
    d.finish()

def surface_sheet():
    d=Draw('UG-A1','Surface connections / one joined world','New openings and passage routes / existing outdoor footprints and three crossings are preserved')
    m=Map(d,(-320,-250,320,230),(75,190,1030,770));m.grid(50)
    pts=[(300*math.cos(math.radians(t)),220*math.sin(math.radians(t))) for t in range(361)]
    m.poly(pts,DIM,1.1,closed=True)
    for l in D['locations'][:16]:
        x,y,z=l['position_m'];w,h=l['footprint_m'];m.rect(x-w/2,y-h/2,w,h,PANEL,DIM,.8);m.label(x,y,l['id'][-2:],11,MUTED,'Mono')
    m.poly(D['water']['utility_race_centerline_m'],WATER,2)
    for e in UG['routes']:
        if e['mode']=='ramp':m.poly(e['points_m'],GOLD,1.8,dash=[5,4])
    for j in UG['surface_interfaces']:
        x,y,z=j['at'];m.circ(x,y,3,fill=GOLD,stroke=GOLD);m.label(x,y+12,j['id'],12,GOLD,'Mono')
    m.flush_labels();north(d,1080,188);scale(d,m,80,975,100)
    d.line(1140,160,1140,1010,DIM,.8);y=184
    for title,txt in [('ENT-P / PUBLIC','(-30,-100,0), beneath the Hearth approach. The gallery, stairs and lift land in UG-01. The continuous step-free ramp also lands before the inner gates.'),('ENT-S / SERVICE','(-173,3,0), at the workshop south approach. Its ramp reaches UG-09, then the separate SG-W boundary. Deliveries never bypass the protected line.'),('ENT-W + ENT-E','(-210,-40,0) and (144,-40,0). Two independent stair cores link all underground levels. Controlled inward access; mechanical outward operation.'),('LIGHT AND AIR','LW-W and LW-E are sealed daylight ducts, not human entrances. Independent air systems and compartment controls are specified separately.'),('KEEP THE EXISTING MAP','All prior surface anchors, footprints, water alignment and three canal crossings remain unchanged. New openings are recorded additions.')]:y=panel(d,y,title,txt)
    d.finish()

def plan_sheet(z,code,title):
    d=Draw(code,title,f'North-up level plan / finished floor {z:g} m / all coordinates share the Sunwell origin')
    m=level_map(d,z);north(d,1080,189);scale(d,m,80,975,50)
    d.text(420,976,'GREEN: public circulation / GOLD: entry boundary',13,MUTED)
    d.line(1140,160,1140,1010,DIM,.8);d.text(1180,184,'AREA REGISTER',13,GREEN,'Mono');y=222
    for l in AREAS.values():
        if z not in l['levels_z_m']:continue
        d.text(1180,y,l['id'],13,GREEN,'Mono');y=d.para(1250,y,l['name'],280,13)+18
    if z==-12:txt='800 permanent residents on this level. Welcome Hall and the service dock sit before their local protective closures; ordinary public life continues beyond.'
    elif z==-24:txt='800 permanent residents on this level. The assembly hall supports daily activity and a planned additional 800 refuge places for surface residents.'
    else:txt='Service level, with no assigned permanent homes. Separate stores, power repair, potable reserve, air handling and pumped drainage support both inhabited levels.'
    y=panel(d,max(y+12,755),'DAILY USE',txt)
    d.para(1180,y,'Door-linked routes are registered in the data. Game navigation and structural details require their own implementation checks.',350,13)
    d.finish()

def states_sheet():
    d=Draw('UG-A5','Open community / protected inner town','Normal public access and a separate defensive boundary / local controls and civilian movement')
    rows=[('01 / NORMAL DAY',GREEN,'Outdoor entrance open','Public welcome hall','Inner gates open','Busy homes + services'),('02 / PROTECTIVE TRANSITION',GOLD,'Guide people inward','Receive + account','Clear closure lines','Staff local boundaries'),('03 / SURFACE OVERRUN',GOLD,'Surface unsafe','Arrival zone isolated','IG-A / IG-B closed','Inner town protected')]
    for j,(label,color,*cells) in enumerate(rows):
        yy=200+j*210;d.text(80,yy,label,18,color,'Mono')
        for i,t in enumerate(cells):
            xx=80+i*265;d.rect(xx,yy+32,235,100,PANEL,color,1.2);d.para(xx+18,yy+67,t,199,17,WHITE)
            if i<3:d.line(xx+236,yy+82,xx+263,yy+82,color,1.5)
    d.text(80,887,'ALL SURFACE CONNECTIONS COUNT',15,GREEN,'Mono')
    d.para(80,925,'The service dock and both stair exits have their own controlled inward thresholds. There is no unrecorded lift, hatch or tunnel that bypasses the inner boundary.',1000,18)
    d.line(1140,160,1140,1010,DIM,.8);y=184
    for title,txt in [('PEOPLE BEFORE CLOSURE','Stewards keep families together and confirm a gate line is clear. A busy public hall does not become an automatic trap.'),('LOCAL PHYSICAL CONTROL','Records can help staff, but cannot move manual bars by themselves. A network fault does not produce a universal unlock command.'),('TWO INDEPENDENT STAIRS','The west and east cores are separate from the central lift court. Occupants do not need network approval to exit from inside.'),('LIFE SUPPORT CONTINUES','Air, water, sanitation, communication and emergency lighting are zoned and locally controlled. A sealed refuge still needs working services.'),('REFUGE HAS A DAILY LIFE','The assembly hall hosts sport, meetings and performances. Its emergency use is an overlay, not the entire purpose of underground life.')]:y=panel(d,y,title,txt)
    d.finish()

def detail_sheet(l):
    id=l['id'];cx,cy,cz=l['position_m'];w,h=l['footprint_m']
    d=Draw(id,l['name'],f'Area blueprint / world anchor ({cx:g}, {cy:g}, {cz:g}) m / inherited axes, new underground area')
    d.text(80,182,'PLAN / NORTH UP / DIMENSIONS IN METRES',13,GREEN,'Mono');north(d,1080,189)
    padx=max(11,w*.13);pady=max(12,h*.18)
    m=Map(d,(-w/2-padx,-h/2-pady,w/2+padx,h/2+pady),(95,233,985,620))
    m.grid(10 if w>60 else 5);m.rect(-w/2,-h/2,w,h,PANEL,LINE,1.8)
    slab_detail(m,l);portal_marks(m,l,local=True,z=cz)
    m.dimx(-w/2,w/2,-h/2-pady*.9,f'{w:g} m');m.dimy(-h/2,h/2,w/2+padx*.8,f'{h:g} m')
    m.flush_labels();scale(d,m,85,929,10 if w>60 else 5)
    d.text(440,923,f'WORLD X = {cx:g} + local x  /  Y = {cy:g} + local y',12,WHITE,'Mono')
    d.text(440,951,'LEVELS: '+', '.join(str(z)+' m' for z in l['levels_z_m']),13,GREEN,'Mono')
    d.para(85,991,l['continuity_limits'][0],1010,13)
    d.line(1140,160,1140,1010,DIM,.8);d.text(1180,184,'POSITION IN THE UNDERGROUND TOWN',12,GREEN,'Mono')
    if cz==0:
        level_map(d,-12,(1174,200,355,240),False,'UG-01')
    else:level_map(d,cz,(1174,200,355,240),False,id)
    y=panel(d,470,'DAILY PURPOSE',l['role'])
    d.text(1180,y,'CONNECTIONS / WORLD XYZ',13,GREEN,'Mono');y+=27
    shown=[p for p in l['portals'] if p['position_m'][2]==cz]
    for p in shown:
        d.text(1180,y,f'{p["side"]} / {p["width_m"]:g} m clear',12,GREEN,'Mono');y+=19
        d.text(1180,y,str(tuple(p['position_m'])),12,MUTED,'Mono');y+=27
    if l['kind'] in ['core','egress']:
        y=d.para(1180,y,'The same horizontal footprint and matching landings repeat at -12, -24 and -36 m. Stairs are independent of powered lifts.',350,13)+15
    if l['kind']=='entry':y=d.para(1180,y,'Lift/stair anchor: (-30,-170), from level 0 to -12. The step-free ramp is shown on UG-A1 and recorded as a separate route.',350,13)+15
    if y<950:d.para(1180,y,'Linework fixes area allocation, key openings and functional zones. Individual rooms and fixtures can gain further registered detail within these bounds.',350,12)
    d.finish()

def canon_sheet():
    d=Draw('UG-C0','World canon / a populated Burrow','Current edition v2.0.0 / owner-directed changes, daily life and story continuity')
    y=190
    for title,txt in [('A FULL NEIGHBORHOOD WORLD','Plan for 2,400 residents: 800 in the outdoor district and 1,600 in four underground wards. The numbers are authored planning figures. Residents cross between both parts for work, learning, meals and leisure.'),('LIFE BELOW GROUND','Show doorsteps, household kitchens, children going to school, deliveries, laundry, quiet hours, workshops and neighbor-run shops. Warm light, varied door colors, planted communal pockets and readable street names distinguish districts.'),('WELCOMING ENTRANCES','Normal public access replaces the earlier closed-gate default. Visitors can reach public civic areas. Private homes and working service rooms retain ordinary boundaries; access never depends on a token, wallet or game rank.'),('DEFENSE AS A STATE','The underground town has a stronger independent boundary if the outdoor district is overrun. Gates, service thresholds and stair access are handled together. Local physical control, civilian refuge and breathable spaces remain essential.')]:
        d.text(80,y,title,16,GREEN,'Mono');y=d.para(80,y+34,txt,660,17)+35
    d.line(790,166,790,1005,DIM,.8);y=190
    for title,txt in [('EPISODE 1','Begin with ordinary life above and below. The underground is familiar and joyful before any clue. All four heroes appear through helpful actions. No pilot invasion, named villain or threatening bunker reveal.'),('SUBTLE CLUES','Retain the duplicate D17 receipt and Snow\'s unfamiliar physical trace. The final receipt can occur after a clearly established routine evening closing; daytime public access stays open.'),('WHAT REMAINS FIXED','Keep all 16 surface positions and footprints, three canal crossings, the watercourse, hero designs and approved voices. Snow has canine sounds only. No oversized Madger fang.'),('VERSION PRECEDENCE','This is v2.0.0 because the owner changed scope, population assumptions and access rules. Earlier editions stay archived. Their conflicting closed-gate and 400-resident statements are superseded.'),('REUSABLE FOR ALL CONTENT','Every future area receives a measured plan and registered connections. The drawing set guides stories, anime and game environments; it does not claim those releases are already rebuilt.')]:
        d.text(835,y,title,15,GREEN,'Mono');y=d.para(835,y+31,txt,650,16)+29
    d.finish()

section_sheet();surface_sheet();plan_sheet(-12,'UG-A2','Upper underground / homes and civic life');plan_sheet(-24,'UG-A3','Deep neighborhood / homes and shared life');plan_sheet(-36,'UG-A4','Service level / maintainable infrastructure');states_sheet()
for l in AREAS.values():detail_sheet(l)
canon_sheet();PDF.save()
assert len(PAGES)==28
(OUT/'sheet_register.json').write_text(json.dumps(PAGES,indent=2)+'\n')
doc=fitz.open(OUT/'MADGER_Underground_Blueprints.pdf')
for i,p in enumerate(doc):p.get_pixmap(matrix=fitz.Matrix(1.35,1.35),alpha=False).save(OUT/'previews'/f'{PAGES[i]["sheet"]}.png')
thumbs=[]
for p in PAGES:
    im=Image.open(OUT/'previews'/f'{p["sheet"]}.png').convert('RGB');im.thumbnail((480,340));t=Image.new('RGB',(500,376),BG);t.paste(im,((500-im.width)//2,8));ImageDraw.Draw(t).text((12,354),p['sheet']+' / '+p['title'],fill=WHITE);thumbs.append(t)
for group in range(4):
    subset=thumbs[group*7:(group+1)*7];im=Image.new('RGB',(1000,376*4),BG)
    for i,t in enumerate(subset):im.paste(t,((i%2)*500,(i//2)*376))
    im.save(OUT/f'review_{group+1}.jpg',quality=94)
import shutil
shutil.copy2(OUT/'previews/UG-A0.png',OUT/'MADGER_Above_and_Below_Section.png')
shutil.copy2(OUT/'previews/UG-A2.png',OUT/'MADGER_Underground_Master_Plan.png')
print(json.dumps({'pages':len(doc),'pdf_bytes':(OUT/'MADGER_Underground_Blueprints.pdf').stat().st_size},indent=2))
