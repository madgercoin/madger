import json, math, re
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color, white
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader

R=Path('/workspace/scratch/ae9a6a9bf3bf/world_bible'); O=R/'output'
B=json.loads((O/'MADGER_World_Bible.json').read_text())
for name,path in [('Sans','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'),('Bold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'),('Serif','/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf')]:pdfmetrics.registerFont(TTFont(name,path))
pdfmetrics.registerFontFamily('Sans',normal='Sans',bold='Bold',italic='Sans',boldItalic='Bold')
W,H=1000,700
PAPER=HexColor('#F5F1E7'); INK=HexColor('#243C39'); MUTED=HexColor('#5E7069'); GREEN=HexColor('#557A53'); GOLD=HexColor('#B88643'); LINE=HexColor('#D8D9CA'); WATER=HexColor('#91B7BF'); TERRACE=HexColor('#D9DCC5')
C=canvas.Canvas(str(O/'MADGER_World_Bible.pdf'),pagesize=(W,H),pageCompression=1)
C.setTitle('MADGER World Bible | Volume 01: Inside the Burrow');C.setAuthor('MADGER / James Raymond Dean');C.setSubject('Permanent interior canon, map and adaptation guide - foundation v1.0.0')
N=0; OVER=[]

def text(x,y,s,size=11,font='Sans',color=INK):
 C.setFillColor(color);C.setFont(font,size);C.drawString(x,y,str(s))
def para(s,x,y,w,size=12,leading=None,color=INK):
 st=ParagraphStyle('p',fontName='Sans',fontSize=size,leading=leading or size*1.48,textColor=color,spaceAfter=0)
 p=Paragraph(s,st);_,h=p.wrap(w,1000);p.drawOn(C,x,y-h)
 return y-h
def heading(s,x,y,w=430):return para(s,x,y,w,17,22,INK)-12
def block(title,body,x,y,w=430,size=12):
 y=para(title,x,y,w,14,19,INK)-6
 y=para(body,x,y,w,size,size*1.48)-17
 return y
def bullets(items,x,y,w=430,size=11.5):
 for item in items:
  C.setFillColor(GOLD);C.circle(x+3,y-7,2,fill=1,stroke=0)
  y=para(item,x+14,y,w-14,size,size*1.43)-9
 return y
def line(x1,y1,x2,y2,color=LINE,width=1):
 C.setStrokeColor(color);C.setLineWidth(width);C.line(x1,y1,x2,y2)
def page(title,kicker='FOUNDATION / INSIDE THE BURROW',sub=None):
 global N
 if N:C.showPage()
 N+=1;C.setFillColor(PAPER);C.rect(0,0,W,H,fill=1,stroke=0)
 text(42,658,'MADGER',12,'Bold');text(145,659,kicker,9,color=MUTED)
 text(42,607,title,29,'Serif')
 if sub:para(sub,42,587,916,11,15,MUTED)
 line(42,552,958,552)
 text(42,26,'MADGER WORLD BIBLE  /  VOLUME 01  /  v1.0.0',8,color=MUTED)
 text(888,26,f'{N:02d}  /  23',8,color=MUTED)
 C.bookmarkPage(f'p{N}');C.addOutlineEntry(title,f'p{N}',level=0,closed=False)
def check(y,name):
 if y<55:OVER.append((N,name,round(y,1)))
def chip(x,y,s,color=GREEN):
 C.setFillColor(color);C.roundRect(x,y-3,pdfmetrics.stringWidth(s,'Bold',8)+18,18,4,fill=1,stroke=0);text(x+9,y+2,s,8,'Bold',white)

def mapdraw(x,y,w,h,labels=True,cams=False,route=None):
 # The map is generated from the same coordinates as the data contract.
 scale=min(w/650,h/490);cx=x+w/2;cy=y+h/2
 def pt(p):return cx+p[0]*scale,cy+p[1]*scale
 C.saveState();C.setFillColor(HexColor('#E9E1CF'));C.setStrokeColor(HexColor('#B5AB94'));C.setLineWidth(1.4)
 C.ellipse(cx-300*scale,cy-220*scale,cx+300*scale,cy+220*scale,fill=1,stroke=1)
 C.setFillColor(HexColor('#F0EAD9'));C.ellipse(cx-278*scale,cy-198*scale,cx+278*scale,cy+198*scale,fill=1,stroke=0)
 # six-metre contour bands for the occupied north/south terraces
 for yy in [105,135,165,-108,-135,-162]:
  C.setStrokeColor(HexColor('#BFC4A4'));C.setLineWidth(7*scale)
  a=pt([-100,yy]);b=pt([100,yy]);C.line(*a,*b)
 # roads: civic paths, including the southern bypass and ramp switchbacks
 for e in B['routes']:
  a,b=pt(B['nodes'][e['a']]),pt(B['nodes'][e['b']]);C.setStrokeColor(HexColor('#D2C4A8'));C.setLineWidth((3 if e['mode']=='stairs' else 5.5)*scale);C.setDash(2,2) if e['mode']=='stairs' else C.setDash();C.line(*a,*b)
 C.setDash()
 # Enclosed headrace vs open utility canal.
 wp=B['water']['utility_race_centerline_m']
 for k in range(len(wp)-1):
  C.setStrokeColor(WATER);C.setLineWidth((3 if k<2 else 6)*scale);C.setDash(3,3) if k<2 else C.setDash();C.line(*pt(wp[k]),*pt(wp[k+1]))
 C.setDash()
 for l in B['locations']:
  px,py=pt(l['position_m']);ww,hh=[v*scale for v in l['footprint_m']]
  C.setFillColor(HexColor('#BCC8A3') if l['id'] in ['BRW-04'] else HexColor('#D9C9AD') if l['id'] in ['BRW-03','BRW-01','BRW-08','BRW-13','BRW-15'] else HexColor('#6C837B'))
  C.setStrokeColor(HexColor('#627063'));C.setLineWidth(.6)
  C.roundRect(px-ww/2,py-hh/2,ww,hh,min(2,ww/8),fill=1,stroke=1)
 for cross in B['crossings']:
  px,py=pt(cross['position_m']);horizontal=cross['id']!='BRW-C02';ww=(cross['span_m'] if horizontal else cross['width_m'])*scale;hh=(cross['width_m'] if horizontal else cross['span_m'])*scale
  C.setFillColor(HexColor('#F0DEC1'));C.setStrokeColor(GOLD);C.setLineWidth(1.2);C.rect(px-ww/2,py-hh/2,ww,hh,fill=1,stroke=1)
 # permanent round well and wheel
 px,py=pt([0,0]);C.setFillColor(PAPER);C.setStrokeColor(GOLD);C.circle(px,py,3.5*scale,fill=1,stroke=1)
 px,py=pt([-162,65]);C.setStrokeColor(GOLD);C.circle(px,py,3*scale,fill=0,stroke=1)
 # closed exterior plane
 a,b=pt([294,-9]),pt([294,9]);line(*a,*b,INK,3)
 if route:
  C.setStrokeColor(GOLD);C.setLineWidth(2)
  for a,b in zip(route,route[1:]):C.line(*pt(a),*pt(b))
 if labels:
  offsets={'BRW-01':(0,-1),'BRW-12':(0,15),'BRW-14':(7,12),'BRW-15':(0,-3),'BRW-16':(0,1),'BRW-06':(0,0)}
  for l in B['locations']:
   px,py=pt(l['position_m']);dx,dy=offsets.get(l['id'],(0,0));px+=dx;py+=dy
   C.setFillColor(INK);C.circle(px,py,8.2,fill=1,stroke=0);C.setFont('Bold',7.5);C.setFillColor(white);C.drawCentredString(px,py-2.7,l['id'][-2:])
  text(cx-12,cy+194*scale,'NORTH',7,'Bold',MUTED)
  text(cx-14,cy-192*scale,'SOUTH',7,'Bold',MUTED)
 if cams:
  for cam in B['cameras']:
   px,py=pt(cam['at']);tx,ty=pt(cam['target']);C.setStrokeColor(GOLD);C.setLineWidth(.9);C.line(px,py,px+(tx-px)*.17,py+(ty-py)*.17);C.setFillColor(GOLD);C.circle(px,py,4,fill=1,stroke=0);text(px+6,py+4,cam['id'][-2:],7,'Bold',GOLD)
 # compass and scale bar
 ax=x+30;ay=y+h-45;line(ax,ay-15,ax,ay+15,INK,1.4);C.setFillColor(INK);p=C.beginPath();p.moveTo(ax,ay+20);p.lineTo(ax-4,ay+11);p.lineTo(ax+4,ay+11);p.close();C.drawPath(p,fill=1,stroke=0);text(ax-4,ay+25,'N',8,'Bold')
 sx=x+27;sy=y+14;line(sx,sy,sx+100*scale,sy,INK,2);line(sx,sy-3,sx,sy+3,INK);line(sx+100*scale,sy-3,sx+100*scale,sy+3,INK);text(sx,sy+8,'0',7,color=MUTED);text(sx+100*scale-12,sy+8,'100 m',7,color=MUTED)
 C.restoreState()

def loccard(index,x,y,w=430,full=False):
 l=B['locations'][index-1]
 y=heading(f'{index:02d}  {l["name"]}',x,y,w)
 y=para(l['role'],x,y,w,12,17)-12
 y=bullets(l['anchors'],x,y,w,10.5)
 y=block('Everyday life',l['daily_life'],x,y,w,10.8)
 if full:y=block('Story / play',l['story_use']+' '+l['game_use'],x,y,w,10.5)
 y=block('Continuity lock',' '.join(l['continuity_limits']),x,y,w,10.5)
 return y

def floorplan(x,y,w,h,kind):
 C.setFillColor(HexColor('#E9E5D9'));C.roundRect(x,y,w,h,7,fill=1,stroke=0)
 if kind=='common':
  xx=x+30;yy=y+25;ww=w-60;hh=h-60
  C.setStrokeColor(INK);C.setLineWidth(2);C.rect(xx,yy,ww,hh,fill=0,stroke=1)
  line(xx+ww*.32,yy,xx+ww*.32,yy+hh,INK);line(xx,yy+hh*.45,xx+ww*.32,yy+hh*.45,INK)
  text(xx+10,yy+hh*.70,'KITCHEN',8,'Bold');text(xx+12,yy+hh*.20,'PANTRY',8,'Bold');text(xx+ww*.48,yy+hh*.65,'COMMON ROOM',9,'Bold')
  for i in range(3):
   C.setFillColor(HexColor('#B99B70'));C.rect(xx+ww*.44+i*ww*.16,yy+hh*.20,ww*.09,hh*.23,fill=1,stroke=0)
  line(xx+ww*.55,yy+hh,xx+ww*.68,yy+hh,PAPER,5);text(xx+ww*.36,yy+hh+13,'NORTH / PORCH TO SUNWELL',8,'Bold',MUTED)
  text(x+12,y+9,'Room relationships fixed; 50 x 28 m building envelope.',8,color=MUTED)
 elif kind=='workshop':
  xx=x+28;yy=y+24;ww=w-56;hh=h-56
  C.setStrokeColor(INK);C.setLineWidth(2);C.rect(xx,yy,ww,hh,fill=0,stroke=1)
  line(xx,yy+hh*.26,xx+ww*.38,yy+hh*.26,INK);line(xx+ww*.38,yy,xx+ww*.38,yy+hh*.26,INK)
  text(xx+9,yy+hh*.10,'REST',8,'Bold');text(xx+9,yy+hh*.55,'TOOL RACK',8,'Bold');text(xx+ww*.4,yy+hh*.78,'NORTH BENCH',8,'Bold')
  C.setFillColor(HexColor('#B99B70'));C.rect(xx+ww*.34,yy+hh*.35,ww*.36,hh*.16,fill=1,stroke=0)
  line(xx+ww,yy+hh*.35,xx+ww,yy+hh*.65,PAPER,5);text(xx+ww-42,yy+hh*.51,'DOORS',7,'Bold');text(x+12,y+9,'44 x 30 m envelope / east entrance / waterhouse to north.',8,color=MUTED)
 elif kind=='gate':
  # north-up exact inner vestibule: x270..294, y-9..9
  s=min((w-130)/34,(h-85)/45);ox=x+55;oy=y+h*.57
  def p(a,b):return ox+(a-265)*s,oy+b*s
  C.setFillColor(HexColor('#D9D4C5'));C.rect(*p(270,-9),24*s,18*s,fill=1,stroke=0)
  line(*p(270,9),*p(294,9),INK,4);line(*p(270,-9),*p(294,-9),INK,4);line(*p(294,-9),*p(294,9),INK,5)
  line(*p(291,-7),*p(291,7),GOLD,4)
  C.setFillColor(GREEN);C.rect(*p(281,-9),2*s,1.3*s,fill=1,stroke=0)
  C.setStrokeColor(GOLD);C.setDash(3,3);C.setLineWidth(1.8)
  pts=[p(268,-24),p(268,0),p(275,0),p(282,-6)]
  for a,b in zip(pts,pts[1:]):C.line(*a,*b)
  C.setDash();text(x+15,y+h-24,'NORTH',8,'Bold');text(*p(270,12),'NORTH WALL',8,'Bold');text(x+15,y+23,'Dashed path enters the open west mouth, then turns right.',8,color=MUTED)
  tx,ty=p(282,-12);text(tx-60,ty,'R-E01 / INNER SOUTH WALL',7.5,'Bold');tx,ty=p(294,0);text(tx+7,ty+12,'GATE',8,'Bold');text(tx+7,ty,'x = 294',8);text(x+15,oy+4,'COURT',8,'Bold')

def render():
 page('Inside the Burrow','VOLUME 01 / OFFICIAL WORLD FOUNDATION')
 art=R/'source/Burrow_Atmosphere.png'
 if art.exists():
  from PIL import Image
  im=Image.open(art);iw,ih=im.size;cw,ch=916,330;ratio=max(cw/iw,ch/ih);nw,nh=iw*ratio,ih*ratio
  C.saveState();p=C.beginPath();p.rect(42,198,cw,ch);C.clipPath(p,stroke=0,fill=0);C.drawImage(ImageReader(im),42-(nw-cw)/2,198-(nh-ch)/2,nw,nh);C.restoreState()
 else:mapdraw(42,200,916,330,False)
 text(42,185,'Materials and light study. The measured plan on page 3 controls geometry and scale.',8,color=MUTED)
 chip(42,157,'ONE PLACE. EVERY STORY.')
 para('A home worth returning to. A world worth defending.',42,136,900,23,30)
 para('Fixed geography, lived-in places and a shared foundation for animation, stories and the video game. Adventures add history to the Burrow without moving it.',42,97,870,11.5,17)
 text(42,57,'FOUNDATION v1.0.0  /  19 OCTOBER 2026  /  WORLD OWNER: JAMES RAYMOND DEAN',8,'Bold',MUTED)

 page('The canon agreement',sub='This edition establishes the interior baseline. New details here are deliberate world development, not claims of earlier approval.')
 y=530
 for r in B['canon_rules'][:5]:y=block(r['id']+' / '+r['title'],r['rule'],42,y,435,11)
 check(y,'rules left');y=530
 for r in B['canon_rules'][5:]:y=block(r['id']+' / '+r['title'],r['rule'],520,y,438,11)
 check(y,'rules right')

 page('The permanent interior map',sub='North-up master plan. Numbered footprints, routes and crossings use the same coordinates as the accompanying JSON.')
 mapdraw(35,75,650,455)
 y=528
 for l in B['locations']:
  text(710,y,l['id'][-2:],9,'Bold',GOLD);y=para(l['name'],738,y+9,217,10,14)-9
 para('600 x 440 m planning envelope.\nSunwell is (0, 0, 0).\n1 unit = 1 metre.<br/><br/>Dotted blue: enclosed headrace.<br/>Blue: open utility canal.<br/>Pale paths: public routes.<br/>Three fixed canal crossings.',710,152,230,9,13,MUTED)

 page('Scale, levels and believable travel',sub='The sky is above the Burrow. All inhabited ground, galleries and pilot viewpoints remain inside the limestone basin.')
 # South-north section: horizontal / vertical scales intentionally distinct.
 x0,y0=60,345; sx=1.8;sz=2.0
 def sec(n,z):return x0+(n+220)*sx,y0+z*sz
 p=C.beginPath();pts=[(-220,54),(-190,30),(-165,18),(-135,12),(-105,6),(-80,0),(80,0),(105,6),(135,12),(165,18),(190,30),(220,54)]
 p.moveTo(*sec(*pts[0]));
 for a in pts[1:]:p.lineTo(*sec(*a))
 p.lineTo(*sec(220,-8));p.lineTo(*sec(-220,-8));p.close();C.setFillColor(HexColor('#D7C8AA'));C.setStrokeColor(MUTED);C.drawPath(p,fill=1,stroke=1)
 for n,z,lab in [(-190,30,'SOUTH HOMES'),(0,0,'SUNWELL / 0 m'),(135,12,'NORTH GARDENS')]:
  xx,yy=sec(n,z);text(xx-25,yy+18,lab,9,'Bold')
 text(65,505,'OPEN SKY / NO SEALED CAVERN CEILING',10,'Bold',GREEN)
 text(65,310,'Diagram: north-south section. Vertical scale exaggerated for clarity; anchor elevations remain exact.',9,color=MUTED)
 y=281
 y=block('A compact town, not a tiny room','About 400 residents live on several tiers around a 600 x 440 m basin. The +54 m rim encloses a broad opening; most occupied terraces sit at +6, +12 and +18 m. A warm season does not remove the need for drains, ventilation and sheltered galleries.',42,y,435,11)
 y=block('Access has a route','Stairs are shortcuts. Longer ramps reach the occupied terraces. Keep the southern Service Crossing available when East Bridge is closed for maintenance. Do not draw a new crossing to shorten a scene.',42,y,435,11)
 check(y,'scale');y=281
 for row in B['walking_reference']:
  name=row['route'].replace('sunwell','Sunwell').replace('gate_inner','inner gate').replace('relay_walk','Service Walk').replace('tables','common tables').replace('garden_mid','gardens').replace('home_entry','home entry')
  y=para(f'<b>{name}</b> - {row["distance_m"]} m / about {row["unhurried_minutes"]} min',520,y,438,10.7,16)-9
 para('Planning pace: 1 m/s, with stops and crowding additional. Five minutes of screen time can contain a full day through clear ellipses.',520,y-4,438,10.5,15,MUTED)

 page('Sunwell and the common table','PLACE SHEETS / BRW-01 + BRW-02')
 check(loccard(1,42,530,435,True),'market')
 y=loccard(2,520,530,438,False);check(y,'common')
 floorplan(520,65,438,160,'common')

 page('Homes, privacy and care','PLACE SHEETS / BRW-03 + BRW-11')
 y=loccard(3,42,530,435,True);check(y,'homes')
 y=loccard(11,520,530,438,True);check(y,'care')
 para('Home entry belongs to the mapped +12 m gallery. Room details beyond the entry are added as a named location sheet before first use; the entire neighborhood is not a single enormous house.',42,116,435,10.5,15,MUTED)

 page('The gardens and the spring','PLACE SHEETS / BRW-04 + BRW-05')
 check(loccard(4,42,530,435,True),'gardens');check(loccard(5,520,530,438,True),'spring')
 para('Ecology lock: planted limestone terraces, familiar temperate vegetation, garden birds and a maintained water system. Seasons change crops and light. They do not swap the town into a different biome.',42,108,916,11,16,MUTED)

 page('Working hands, working systems','PLACE SHEETS / BRW-06 + BRW-07')
 check(loccard(6,42,530,435,True),'waterhouse')
 y=loccard(7,520,530,438,False);check(y,'workshop');floorplan(520,64,438,155,'workshop')
 para('Wheel location: east wall of Waterhouse, north of the workshop. The enclosed headrace comes down from the spring under the western garden ramp; the open canal begins beside the wheel.',42,110,435,10.5,15,MUTED)

 page('The east threshold','PLACE SHEETS / BRW-12 + BRW-13 + BRW-14')
 y=530
 for idx in [12,13,14]:
  l=B['locations'][idx-1];y=block(f'{idx:02d} / {l["name"]}',l['role']+'<br/>'+l['anchors'][0]+' '+l['continuity_limits'][0],42,y,435,11)
 check(y,'eastleft')
 floorplan(520,220,438,310,'gate')
 y=block('A readable threshold','The exterior leaves sit at x=294. Inside them, the crossbar remains a physical object. The relay is mounted on the inner south wall: the right side when facing east. Enter the vestibule through the west mouth to reach it.',520,195,438,11)
 check(y,'eastright')

 page('Records, receiving and the quiet clue','PLACE SHEETS / BRW-09 + BRW-10 + BRW-15')
 y=530
 for idx in [9,10]:
  l=B['locations'][idx-1];y=block(f'{idx:02d} / {l["name"]}',l['role']+'<br/><br/>'+l['daily_life']+'<br/>'+l['anchors'][1],42,y,435,11)
 check(y,'recordsstore')
 y=loccard(15,520,530,438,True);check(y,'relay')
 para('Evidence rule: the receipt anomaly and Snow\'s physical observation are separate facts. Neither proves an attacker, a method or a connection. Preserve uncertainty until a later story earns an answer.',42,112,435,10.5,15,MUTED)

 page('Practice, creativity and shared memory','PLACE SHEETS / BRW-08 + BRW-16')
 check(loccard(8,42,530,435,True),'training');check(loccard(16,520,530,438,True),'makers')
 para('New history accumulates here. A repaired object, drawing or thank-you can return in later episodes with the same date, maker and story attached. A trophy is not evidence of an adventure until that adventure is in the event ledger.',42,108,916,11,16,MUTED)

 page('How the Burrow lives','CULTURE / DAILY RHYTHM / ORDINARY FRICTION')
 left=[('A community of neighbors','The settlement includes established human and animal people; ordinary companion animals remain distinct. Background residents have jobs, households, different ages and their own concerns. The four heroes are singular characters, not a crowd template.'),('How it grew','Families and craftspeople expanded a practical waystation around the spring. Success came through building, trade and repair. No secret royal bloodline or ancient civilization is needed to explain why it works.'),('Decisions and responsibility','Residents choose a rotating maintenance council and task leads. Public works and reserve supplies are recorded; people can question a plan. The heroes participate and can be overruled. New named officials require character entries.'),('Personal space and shared work','People keep homes, tools and private belongings. Public resources have stewards. Help is valued, but exhaustion is not the price of belonging. The community is capable even when the heroes are elsewhere.')]
 y=530
 for t,b in left:y=block(t,b,42,y,435,11)
 check(y,'culture')
 y=530
 for t,b in [('Dawn','Water checks, shutters open, breakfast and garden work. Quiet voices carry along the galleries.'),('Morning','Deliveries, repair jobs, lessons and market business. Paths show workers going somewhere specific.'),('Midday','Shared meals and shade. Most people eat at home or work; a large common meal marks an occasion.'),('Afternoon','Trade, practice, repairs and play. A cart can wait while a neighbor finishes crossing.'),('Evening','Tools return, records are reconciled, windows warm and the gate closes. Late work still has people responsible for it.'),('Small tensions','A repair takes too long; two groups want the same table; someone feels unheard. Resolve such friction through character choices. Prosperity is credible because it includes ordinary disagreement.')]:y=block(t,b,520,y,438,10.6)
 check(y,'rhythm')

 page('What keeps the town running','WATER / FOOD / POWER / MESSAGES')
 y=530
 for t,b in [('Food and trade','Gardens and greenhouses supply fresh produce. Grain, cloth and spare parts arrive through trade. Storehouse reserves buy time during delays; they are finite. Friendly traders remain welcome.'),('Water and waste','Covered spring tanks feed buried potable pipes. The enclosed headrace serves the wheel and then an open utility canal. Sewage stays in sealed lines to southeast treatment access. These flows are never interchangeable.'),('Power','Water-driven generation, modest rooftop panels and local batteries feed separate neighborhood circuits. Manual isolation and ordinary backup lighting prevent one failed sensor from darkening every home.')]:y=block(t,b,42,y,435,12)
 check(y,'systemsleft')
 y=530
 for t,b in [('Physical entry','Gate stewards operate the leaves and bar. Arrival records support their work. A valid-looking acknowledgment cannot move a mechanical crossbar by itself.'),('Messages and records','Relays carry schedules, notices and local reports. Records House compares them with paper tags, local instruments and people\'s accounts. There is no universal machine that sees or controls everything.'),('Maintenance and failure','Assign every failure a source, a local effect, a person who notices and a fallback. A garden valve fault affects that branch; a false delivery message can waste a trip. Consequences should match the actual system.')]:y=block(t,b,520,y,438,12)
 check(y,'systemsright')

 page('What future enemies can threaten','STORY LOGIC / THE PILOT REVEALS ONLY QUESTIONS')
 y=530
 for t,b in [('The central conflict','How can an open community defend itself against attackers who exploit its trust while remaining a place people want to live? Defense must protect meals, safe paths, relationships and the freedom to ask questions.'),('Plausible pressure','Later adversaries may falsify a notice, replay an acknowledgment, misdirect supplies, impersonate authority or tamper with a local device. Each act needs access, limits, evidence and a cost. No remote magic that ignores the architecture.'),('Different observations matter','Madger listens and organizes; Gorilla checks physical conditions; Bot compares records; Snow notices physical changes. Neighbors supply context. A solution should require useful contributions from more than one source.')]:y=block(t,b,42,y,435,11.5)
 check(y,'threatleft');y=530
 for t,b in [('Defense without occupation','Watch routes, staffed thresholds, drills, local alarms and manual fallback are normal civic habits. No automated lethal defenses in the peaceful home baseline.'),('The three pilot clues','1. Two receipts for one cart.<br/>2. Snow indicates an unfamiliar physical trace beside an intact cabinet.<br/>3. Another acknowledgment appears at the closed, empty gate.<br/><br/>The cause, actor and relationship between these observations remain unset.'),('Story boundaries','Do not reveal an attacker, cut to a villain\'s control room, label the bridge repair as sabotage or use ominous lighting on every ordinary device. The good day really happened. Later episodes must earn the threat.')]:y=block(t,b,520,y,438,11.5)
 check(y,'threatright')

 page('Four lives within one home','CHARACTER CONTINUITY / SEASON ARCS')
 for i,h in enumerate(B['heroes']):
  x=42 if i%2==0 else 520;y=530 if i<2 else 286
  y=heading(h['name'],x,y)
  y=para('<b>Belongs:</b> '+h['place']+'<br/><b>Gift:</b> '+h['strength']+'<br/><b>Friction:</b> '+h['flaw'],x,y,438,10.6,15)-9
  y=para('<b>Pilot step:</b> '+h['pilot']+'<br/><b>Long arc:</b> '+h['long_arc'],x,y,438,10.6,15)
  check(y,h['id'])

 page('The visual grammar','ARCHITECTURE / MATERIALS / LIGHT / SOUND')
 y=530
 for t,b in [('Silhouette before detail','A broad limestone bowl; low central buildings; occupied terraces climbing the north and south; a working wheel on the west; a modest, recessed gate on the east. No tower, giant crystal or fortress suddenly dominates the silhouette.'),('A practical building family','Stone foundations, pale plaster, dark timber galleries, slate roofs, canvas shade and restrained copper fittings. Civic signs are simple and readable. Shared construction methods coexist with personal doors, plants and repairs.'),('Anime and game share the same design','Use clean shapes, selective line detail and controlled value groups. The warm, handmade setting stays legible behind the four distinct heroes. Japanese anime influence is in staging, restraint and expression; it does not require placing arbitrary Japanese landmarks in this world.')]:y=block(t,b,42,y,435,11)
 check(y,'visualleft')
 y=530
 for p in B['palette']:
  C.setFillColor(HexColor(p['hex']));C.roundRect(520,y-25,32,26,3,fill=1,stroke=0);text(565,y-6,p['name']+'  '+p['hex'],9.5,'Bold');text(565,y-22,p['use'],8.8,color=MUTED);y-=42
 y=block('Lighting and sound','Warm morning comes from the east/right of the south master view; evening reverses that emphasis. Water, tools, footsteps and voices have sources. The ordinary receipt chime stays the same when a clue appears.',520,y-8,438,10.5)
 check(y,'palette')

 page('Cameras that remember the geography','SHOT REGISTRY / EIGHT REUSABLE SETUPS')
 mapdraw(40,80,465,450,False,True)
 y=530
 for cam in B['cameras']:
  y=para('<b>'+cam['id']+' / '+cam['name']+'</b><br/>'+', '.join(cam['required'])+'.',530,y,428,10.1,14)-12
 check(y,'cameralist')
 para('Lens values and target points are starting setups, not permission to move the town. Wider crops may hide a landmark; they cannot replace it. Reverse angles must reverse screen direction consistently.',42,73,450,9.7,14,MUTED)

 page('Episode 1 stays inside','A GOOD DAY / WORLD-COMPLIANT REVISION BRIEF')
 y=530
 for i,e in enumerate(B['episode_1']):
  if i==3:y=530
  x=42 if i<3 else 520
  y=para('<b>'+e['time']+'</b>  /  '+', '.join(a.replace('BRW-','') for a in e['locations']),x,y,435,10.5,15)-6
  y=para(e['beat'],x,y,435,11.2,16)-8
  y=para('<b>Boundary:</b> '+e['boundary']+'<br/><b>Clue:</b> '+e['clue'],x,y,435,10,14.5)-20
  check(y,'episodebeat')

 page('The same Burrow in the game','ADAPTATION CONTRACT / NO BUILD CHANGED BY THIS DOCUMENT')
 y=530
 for t,b in [('One home map','Use MADGER-BRW-HOME as the stable world ID. Import the location anchors, route graph and crossings from the JSON. Loading zones may divide the map; they may not rearrange it.'),('Preserve the established controls','Down, S, downward swipe and BURROW dig through authored soil with a dirt trail and emergence. Airborne Down retains descent. Foundations, stone and utilities block digging. Do not silently rebalance the existing Expedition course.'),('Existing adventure courses','Overgrown Burrow, Forgotten Works and Crystal Grotto retain their established game layouts. Their precise connection to the home settlement is reserved for a later volume. A course name does not make its obstacles the home town\'s streets.'),('Scale and engine axes','World units are metres: +X east, +Y north, +Z up. A Y-up engine maps (x, y, z) to (x, z, -y). Use one explicit conversion at import; do not mirror signs or invert east/west.')]:y=block(t,b,42,y,435,10.8)
 check(y,'gameleft');y=530
 y=heading('Earlier room concepts, fixed homes',520,y)
 for old,new in B['game_contract']['old_rooms'].items():y=para(f'<b>{old}</b>  /  {new}',520,y,438,10.6,16)-7
 y=block('State is separate from geography','Store canon version and story events independently from score, upgrades and difficulty. A replay does not rebuild the settlement. Gameplay power-ups and respawns do not establish story-world immortality.',520,y-14,438,10.8)
 check(y,'gameright')

 page('A world that grows without drifting','CANON VERSIONING / EVENT LEDGER / RESERVED SPACE')
 y=530
 for t,b in [('Permanent baseline','Stable IDs, coordinates, elevations, door directions, landmarks and infrastructure relationships remain fixed across content. Keep each published version so old scenes can be understood in their proper state.'),('Additive growth','A new resident gets a character entry and home/work links. An unused interior room gets a floor plan before first appearance. A new district attaches through a documented boundary without moving the existing town.'),('Changes caused by adventures','Record damage, repairs, discoveries, new relationships and changed access as dated events with before/after states. Name who witnessed it and who knows. A scene may show a different state; it may not silently rewrite the past.'),('Deliberate revisions','Patch: clarify wording. Minor: compatible additions. Major: an owner-directed retcon with reason and migration notes. A generated image never overrules the Bible merely because it looks attractive.')]:y=block(t,b,42,y,435,11)
 check(y,'growthleft');y=530
 for r in B['expansion']['reserved']:y=block(r['id']+' / '+r['name'],r['status'],520,y,438,11)
 y=block('Still deliberately undefined','Exterior lands and political map; attacker identity and method; detailed unseen tunnels; every resident\'s biography; exact hero origin dates. These are future entries, not blanks that individual scenes may fill at random.',520,y,438,11)
 check(y,'growthright')

 page('A repeatable production method','SHARED ASSETS / CONTINUITY CHECK / CONTROLLED ANIMATION')
 y=530
 for t,b in [('Build once, reuse','Create a greybox from the map, then a reusable environment model and verified camera plates. Produce the anime backgrounds from these same locations. Save day, dusk and night lighting as states of the same set.'),('Art has a reference chain','Every asset carries world version, location ID, camera ID, time/weather state and visible event state. The measured map outranks atmosphere art. Keep door positions, railings, windows, cabinet side and canal crossings on a continuity sheet.'),('Stable image-based animation','Hold bodies and backgrounds during dialogue. Mouths are separate controlled patches; expressions and action poses change only when the story calls for them. No whole-frame rerolls to manufacture movement. Use deliberate cuts and motivated face close-ups.')]:y=block(t,b,42,y,435,11.5)
 check(y,'prodleft');y=530
 for t,b in [('Check before rendering','Match the camera orientation and visible route. Verify character scale, approved designs and voices. Confirm the correct light/state and that the image actually supports the scene\'s action.'),('Check the episode','No camera or visible ground outside the Burrow. No premature villain, attack or red-alarm escalation. Clear time cuts between distant places. All four heroes make meaningful choices; residents remain participants.'),('Check before game integration','Walk the map and bypasses. Test collision at doors, stairs, rails and soil boundaries. Confirm scene IDs survive save/load. Validate the canonical layout separately from combat balance and course timing.')]:y=block(t,b,520,y,438,11.5)
 check(y,'prodright')

 page('The fixed location register','IMPLEMENTATION REFERENCE / CENTERS AND ENVELOPES')
 cols=[42,135,495,650,800];heads=['ID','LOCATION','CENTER (E, N, UP)','FOOTPRINT','LEVEL']
 for x,t in zip(cols,heads):text(x,528,t,9,'Bold',MUTED)
 line(42,516,958,516)
 yy=494
 for l in B['locations']:
  text(cols[0],yy,l['id'],9,'Bold');text(cols[1],yy,l['name'],10);text(cols[2],yy,str(tuple(l['position_m'])),9);text(cols[3],yy,' x '.join(str(a) for a in l['footprint_m'])+' m',9);text(cols[4],yy,('+' if l['position_m'][2]>0 else '')+str(l['position_m'][2])+' m',9)
  line(42,yy-10,958,yy-10);yy-=25
 para('Footprints describe building shells, neighborhoods or activity areas as identified in the place sheets. A district envelope is not a solid building. Interiors are topology diagrams until a detailed room model is added. East Gate details and the named crossings remain exact.',42,83,916,9.5,14,MUTED)

 page('Authority, sources and the next addition','EDITION RECORD / KEEP THIS BOOK WITH THE MAP DATA')
 y=530
 for t,b in [('Created in this edition','The measured 600 x 440 m layout, location registry, routes, levels, fixed crossing count, floor-plan relationships, camera registry and growth protocol. These are the new foundation commissioned by the owner.'),('Retained from established work','The four heroes and their corrections; the warm interior settlement; west workshop, north gardens, south homes and east threshold; practical civic systems; subtle unexplained clues; approved voice identities.'),('Superseded for future production','Earlier schematic geography and inconsistent generated backgrounds. Road views beyond the gate are excluded from Episode 1. The lantern rescue / Warden pilot storyline does not define this home canon.'),('What this delivery changes','It creates the World Bible and reusable map data. It does not regenerate the pilot, update the live game, rename existing assets or publish to GitHub. Those adaptations should reference this edition when they are next produced.')]:y=block(t,b,42,y,435,10.8)
 check(y,'sourcesleft');y=530
 refs=[('Owner instruction / 19 Oct 2026','Establish a permanent, expandable shared MADGER world; interior first; all of Episode 1 inside.'),('A Good Day / R6 production bible','Prior provisional world, character arcs and practical systems. The old diagram was schematic.'),('Animation Project R6 / version 9','Archived production and approved voice references. Voices and character designs remain authoritative.'),('MADGER 3D Expedition / GitHub','docs/game-expedition.md at a0e7141. Existing controls, companion roles and character corrections; no existing build modified.')]
 for t,b in refs:y=block(t,b,520,y,438,10.5)
 y=block('Next entry template','ID / name / district / coordinates / footprint / doors / routes / utility connections / daily purpose / first appearance / before and after state / who knows / source / canon version.',520,y,438,10.5)
 check(y,'sourcesright')
 C.save()
 print(json.dumps({'pages':N,'layout_overflows':OVER,'pdf':str(O/'MADGER_World_Bible.pdf')}))

if __name__=='__main__':render()
