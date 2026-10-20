from pathlib import Path
import json,math,html
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image,ImageDraw
import fitz
from world import build,ROOT,OUT
D=build();PAGES=D['present_day']['chapters'];SUBS={s['id']:s for s in D['sub_locations']}
for n,f in [('Sans','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf'),('Mono','DejaVuSansMono.ttf')]:pdfmetrics.registerFont(TTFont(n,'/usr/share/fonts/truetype/dejavu/'+f))
W,H=1120,792
PAPER='#F2EBDD';INK='#162D38';MUTED='#48616A';GREEN='#426A57';GOLD='#B57F3D';LINE='#C6CABC';WHITE='#FFFDF6';BLUE='#102B3D';CYAN='#A8D8DC';MINT='#9CD5BC';GRID='#244452'
(OUT/'previews').mkdir(exist_ok=True);(OUT/'blueprints').mkdir(exist_ok=True)
C=canvas.Canvas(str(OUT/'MADGER_Living_World.pdf'),pagesize=(W,H),pageCompression=1)
C.setTitle('MADGER World Bible v2.1.0 - The Living Burrow');C.setAuthor('MADGER / James Raymond Dean')
NUM=0;REGISTER=[];CHECKS=[];SV=None
def esc(x):return html.escape(str(x),quote=True)
def rect(x,y,w,h,fill=None,stroke=None,lw=1):
 C.setLineWidth(lw)
 if fill:C.setFillColor(HexColor(fill))
 if stroke:C.setStrokeColor(HexColor(stroke))
 C.rect(x,H-y-h,w,h,stroke=int(bool(stroke)),fill=int(bool(fill)))
 if SV is not None:SV.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill or "none"}" stroke="{stroke or "none"}" stroke-width="{lw}"/>')
def line(x1,y1,x2,y2,col=LINE,lw=1):
 C.setStrokeColor(HexColor(col));C.setLineWidth(lw);C.line(x1,H-y1,x2,H-y2)
 if SV is not None:SV.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{col}" stroke-width="{lw}"/>')
def circle(x,y,r,col=LINE,fill=None):
 C.setStrokeColor(HexColor(col))
 if fill:C.setFillColor(HexColor(fill))
 C.circle(x,H-y,r,stroke=1,fill=int(bool(fill)))
 if SV is not None:SV.append(f'<circle cx="{x}" cy="{y}" r="{r}" stroke="{col}" fill="{fill or "none"}"/>')
def txt(x,y,s,size=12,font='Sans',col=INK,align='left'):
 C.setFont(font,size);C.setFillColor(HexColor(col))
 if align=='center':C.drawCentredString(x,H-y,str(s))
 elif align=='right':C.drawRightString(x,H-y,str(s))
 else:C.drawString(x,H-y,str(s))
 if SV is not None:SV.append(f'<text x="{x}" y="{y}" font-family="DejaVu Sans{",monospace" if font=="Mono" else ""}" font-size="{size}" font-weight="{"bold" if font=="Bold" else "normal"}" text-anchor="{dict(left="start",center="middle",right="end")[align]}" fill="{col}">{esc(s)}</text>')
def wrap(s,width,size,font='Sans'):
 lines=[];cur=''
 for word in s.split():
  trial=(cur+' '+word).strip()
  if cur and pdfmetrics.stringWidth(trial,font,size)>width:lines.append(cur);cur=word
  else:cur=trial
 if cur:lines.append(cur)
 return lines
def para(x,y,s,width,size=13,col=INK,leading=None,font='Sans'):
 leading=leading or size*1.42
 for line_ in wrap(s,width,size,font):txt(x,y,line_,size,font,col);y+=leading
 return y
def new(title,kicker,lead='',code=None,svg=False):
 global NUM,SV
 NUM+=1;SV=[] if svg else None
 rect(0,0,W,H,PAPER)
 C.bookmarkPage(code or f'LW-{NUM:02}');C.addOutlineEntry(title,code or f'LW-{NUM:02}',level=0)
 txt(42,35,'MADGER  /  WORLD BIBLE',11,'Bold',GREEN)
 txt(1078,35,'v2.1.0  |  20 OCT 2026',10,'Mono',MUTED,'right')
 txt(42,66,kicker,11,'Mono',GREEN)
 title_size=32 if pdfmetrics.stringWidth(title,'Bold',32)<1036 else 29
 txt(42,109,title,title_size,'Bold')
 if lead:para(42,140,lead,1015,12.5,MUTED,17)
 line(42,745,1078,745)
 txt(42,768,'THE LIVING BURROW  /  PRESENT-DAY CANON',10,'Mono',MUTED)
 txt(1078,768,f'{NUM:02} / {len(PAGES)+1:02}',11,'Mono',MUTED,'right')
 REGISTER.append({'page':NUM,'title':title,'sheet':code or f'LW-{NUM:02}'})
def finish(code=None):
 global SV
 if SV is not None:
  (OUT/'blueprints'/f'{code}.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="1120" height="792" viewBox="0 0 1120 792">'+''.join(SV)+'</svg>')
 C.showPage();SV=None
def ordinary(p):
 new(p['title'],p['kicker'],p['lead'])
 n=len(p['sections']);rows=3 if n>4 else 2;cellh=(540-(rows-1)*16)/rows
 for i,s in enumerate(p['sections']):
  col=i%2;row=i//2;x=42+col*530;y=181+row*(cellh+16)
  rect(x,y,506,cellh,WHITE)
  rect(x,y,4,cellh,GOLD if 'history' in p['kicker'].lower() else GREEN)
  txt(x+20,y+29,s['title'],15,'Bold')
  end=para(x+20,y+55,s['text'],464,13,INK,18)
  assert end<=y+cellh-5,(p['title'],s['title'],end,y+cellh)
 finish()
def neighborhoods(p):
 new(p['title'],p['kicker'],p['lead'])
 for i,n in enumerate(D['present_day']['neighborhoods']):
  y=181+i*107;rect(42,y,1036,98,WHITE);rect(42,y,4,98,GREEN)
  txt(58,y+25,n['name'],14,'Bold');txt(58,y+46,n['area'],10,'Mono',GREEN)
  txt(58,y+67,str(n['residents'])+' planned residents',10,'Sans',MUTED)
  end=para(263,y+22,n['identity'],420,12,INK,16)
  end2=para(713,y+22,n['rhythm'],341,12,MUTED,16)
  assert max(end,end2)<y+98
 finish()
def residents(p):
 new(p['title'],p['kicker'],p['lead'])
 by={r['id']:r for r in D['present_day']['residents']}
 for i,rid in enumerate(p['resident_ids']):
  r=by[rid];x=42+(i%2)*530;y=181+(i//2)*278
  rect(x,y,506,262,WHITE);rect(x,y,506,5,GREEN)
  txt(x+18,y+30,r['name'],22,'Bold');txt(x+486,y+29,r['id'],11,'Mono',GREEN,'right')
  txt(x+18,y+50,r['species'].upper()+'  /  '+r['home'],10,'Mono',MUTED)
  yy=para(x+18,y+73,r['role'],468,13,GREEN,17,'Bold')+4
  for label,key in [('Wants','want'),('Strength','strength'),('Pressure','flaw'),('Connection','relationship')]:
   yy=para(x+18,yy,label+': '+r[key],468,11.6,INK,15.3)+6
  assert yy<y+256,(r['name'],yy,y+256)
 finish()

class Map:
 def __init__(self,bounds,box):
  self.b=bounds;self.box=box;x0,y0,x1,y1=bounds;bx,by,bw,bh=box
  self.s=min(bw/(x1-x0),bh/(y1-y0));self.ox=bx+(bw-(x1-x0)*self.s)/2;self.oy=by+(bh-(y1-y0)*self.s)/2
 def p(self,x,y):return self.ox+(x-self.b[0])*self.s,self.oy+(self.b[3]-y)*self.s
 def rect(self,x,y,w,h,fill=None,stroke=CYAN,lw=1):
  xx,yy=self.p(x,y+h);rect(xx,yy,w*self.s,h*self.s,fill,stroke,lw)
 def line(self,a,b,col=CYAN,lw=1):line(*self.p(*a),*self.p(*b),col,lw)
 def circ(self,x,y,r):circle(*self.p(x,y),r*self.s,CYAN)
 def label(self,x,y,s,size=10,col=CYAN):
  xx,yy=self.p(x,y);lines=s.split('|')
  for i,l in enumerate(lines):
   tw=pdfmetrics.stringWidth(l,'Sans',size);rect(xx-tw/2-2,yy+i*13-size+1,tw+4,size+3,BLUE)
   txt(xx,yy+i*13,l,size,'Sans',col,'center')
 def grid(self,step=2):
  x0,y0,x1,y1=self.b
  for x in range(math.ceil(x0/step)*step,math.floor(x1/step)*step+1,step):self.line((x,y0),(x,y1),GRID,.4)
  for y in range(math.ceil(y0/step)*step,math.floor(y1/step)*step+1,step):self.line((x0,y),(x1,y),GRID,.4)
def furniture(m,x,y,w,h,label=None):
 m.rect(x,y,w,h,stroke='#6C939B',lw=.9)
 if label:m.label(x+w/2,y+h/2,label,9)
def opening(m,a,b):m.line(a,b,BLUE,5);m.line(a,b,MINT,1.3)
def draw_room(m,s):
 w,h=s['size_m'];x0=-w/2;y0=-h/2;kind=s['kind']
 m.rect(x0,y0,w,h,BLUE,CYAN,2)
 if kind in ['bread','repair','produce','mend']:
  if kind=='bread':
   furniture(m,-7,3.1,14,1.6,'BREAD / BASKET STOCK');furniture(m,-6,.3,12,1.5,'PICKUP COUNTER')
   furniture(m,5,-4,2,2,'WASH');m.label(-2,-2.6,'CUSTOMER / QUEUE',11,MINT)
  elif kind=='repair':
   furniture(m,-6,3,12,1.6,'SUPERVISED BENCH');furniture(m,-7,-.7,2.2,2.8,'RETURN')
   furniture(m,4.8,-.7,2.2,2.8,'READY');furniture(m,-3,.5,6,1.2,'TICKETS');m.label(0,-3,'CLEAR HANDOFF',11,MINT)
  elif kind=='produce':
   furniture(m,-7,3,14,1.7,'COVERED STOCK');furniture(m,-6,-1.5,4,2,'PRODUCE');furniture(m,2,-1.5,4,2,'STAPLES')
   m.label(0,-3.8,'PUBLIC ENTRY / COUNTER',10,MINT)
  else:
   furniture(m,-7,3.2,10,1.4,'FABRIC / SUPPLIES');furniture(m,-5,-.5,6,2,'WORK / CONSULT')
   furniture(m,4,1.5,3,3,'FITTING');furniture(m,4,-3.5,3,2,'PICKUP')
   m.label(-1,-3.7,'PUBLIC ENTRY',10,MINT)
 elif kind=='classroom':
  furniture(m,-6.5,7.4,13,1.2,'TEACHING WALL')
  for x in [-7,3]:
   for y in [-4.5,1]:
    furniture(m,x,y,4,2)
    for dx in [.7,3.2]:
     furniture(m,x+dx-.35,y-.9,.7,.7);furniture(m,x+dx-.35,y+2.2,.7,.7)
  furniture(m,-9,4.5,2,4,'MATERIALS');furniture(m,5,5,4,3,'READING')
  m.label(0,-7.2,'CLEAR CENTRAL AISLE',11,MINT);m.label(0,.5,'16 LEARNING PLACES',10)
 elif kind=='care':
  furniture(m,-5,3,3.3,5,'ASSESS');furniture(m,1.7,3,3.3,5,'REST')
  m.line((0,2),(0,9),CYAN,1);m.label(0,1,'PRIVACY SCREENS',10,MINT)
  furniture(m,-5,-1,2,2,'WASH');furniture(m,-5,-7,2,3,'STORE')
  furniture(m,1.5,-6,3,2,'VISITOR');m.label(0,-8.4,'QUIET ENTRY',11,MINT)
 elif kind=='home':
  m.line((-4,.6),(4,.6),CYAN,1.3);m.line((0,.6),(0,3),CYAN,1.3)
  m.line((-1.7,-3),(-1.7,.6),CYAN,1.3);m.line((-4,-.6),(-1.7,-.6),CYAN,1.3)
  opening(m,(-1.55,.6),(-.75,.6));opening(m,(.75,.6),(1.55,.6));opening(m,(-1.7,-1.7),(-1.7,-.9));opening(m,(-1.7,-.4),(-1.7,.4))
  furniture(m,-3.8,1.3,2,1.4);furniture(m,.5,1.7,2,.9);furniture(m,2.8,.8,.9,2)
  furniture(m,3.25,-2.5,.6,2.8);furniture(m,.6,-1.8,1.2,.8)
  m.label(-2,.95,'SLEEP A',9);m.label(2,1.2,'SLEEP B',9)
  m.label(-2.85,-2,'WASH',9);m.label(-2.85,-.05,'STORE',9);m.label(.8,-.2,'LIVING / KITCHEN',9,MINT)
 opening(m,(-s['door_width_m']/2,-h/2),(s['door_width_m']/2,-h/2))
 m.label(0,-h/2-1.0,'TO '+s['parent'],10,MINT)

def plan(p):
 s=SUBS[p['plan_id']];new(p['title'],p['kicker'],p['lead'],s['id'],True)
 rect(42,184,706,539,BLUE)
 w,h=s['size_m'];pad=2 if s['kind']=='home' else 4
 m=Map((-w/2-pad,-h/2-pad,w/2+pad,h/2+pad),(70,222,650,451));m.grid(1 if s['kind']=='home' else 2);draw_room(m,s)
 # Measured outside dimensions, same scale along both axes.
 yy=-h/2-pad*.7;m.line((-w/2,yy),(w/2,yy),CYAN,.8)
 for xx in [-w/2,w/2]:m.line((xx,yy-.2),(xx,yy+.2),CYAN,.8)
 m.label(0,yy-.45,f'{w:g} m',10)
 xx=w/2+pad*.65;m.line((xx,-h/2),(xx,h/2),CYAN,.8);m.label(xx,0,f'{h:g} m',10)
 txt(63,209,'NORTH UP  /  METRES',10,'Mono',MINT);txt(727,209,'Z = '+str(s['position_m'][2])+' m',10,'Mono',MINT,'right')
 line(705,251,705,229,MINT,1.3);line(705,229,702,237,MINT,1.3);line(705,229,708,237,MINT,1.3)
 txt(63,704,'LOCAL ORIGIN = ROOM CENTER  /  GREEN OPENINGS = DOORWAYS',9,'Mono',MINT)
 x=774;y=203
 for heading,text in [('WORLD ADDRESS',s['id']+'\n'),('CENTER / FOOTPRINT',str(tuple(s['position_m']))+' m; '+str(w)+' x '+str(h)+' m'),('ENTRY',str(tuple(s['portal']['position_m']))+' m; '+str(s['door_width_m'])+' m clear, south side'),('ROUTE',s['route']),('ACCESS',s['public']),('STORY USE',s['story'])]:
  txt(x,y,heading,10,'Mono',GREEN);y=para(x,y+20,text,300,11.5,INK,15.5)+17
 assert y<733,(s['id'],y)
 finish(s['id'])

def underhall(p):
 new(p['title'],p['kicker'],p['lead'],code='UG-03-INDEX',svg=True)
 rect(42,184,706,539,BLUE);m=Map((-55,-43,55,43),(63,208,664,480));m.grid(10)
 m.rect(-48,-36,96,72,BLUE,CYAN,1.8)
 for s in D['sub_locations']:
  if s['parent']!='UG-03':continue
  x,y=s['center_local_m'];w,h=s['size_m'];m.rect(x-w/2,y-h/2,w,h,stroke=MINT)
  opening(m,(x-1.2,y-h/2),(x+1.2,y-h/2));m.label(x,y,s['id'].split('-')[-1],11,MINT)
 for x in [-43,-22,4,25]:m.rect(x,-33,15,11,stroke='#628793');m.label(x+7.5,-27,'BAY',9)
 m.line((-47,0),(47,0),MINT,1.3);m.line((0,-35),(0,35),MINT,1.3)
 m.label(0,6,'SHARED SQUARE',14);m.label(0,-8,'PUBLIC CROSSING',11,MINT)
 for x in [-35,23]:
  for y in [-12,8]:furniture(m,x,y,12,3)
 opening(m,(-6,-36),(6,-36));opening(m,(-3,36),(3,36));opening(m,(-48,-3),(-48,3));opening(m,(48,-3),(48,3))
 txt(63,704,'UG-03  /  CENTER (-30, -84, -12) m  /  FOOTPRINT 96 x 72 m',9,'Mono',MINT)
 y=204
 for title,body in [('S01 / BREAD COUNTER','Prepared batches, a pickup counter and room to queue.'),('S02 / REPAIR & TOOL LOAN','Repair tickets, returns, ready shelves and supervised work.'),('S03 / PANTRY & PRODUCE','Counted stock and specific alternatives when supply changes.'),('S04 / MENDING ROOM','Consultation, private fitting and visible pickup.'),('EXISTING SOUTH BAYS','Remain allocated shops. Tenants and detailed plans are still unassigned.'),('UNCHANGED CONNECTIONS','West to UG-04; east to UG-05; north to UG-08; south through UG-02. Tables and queues stay outside the clear crossing.')]:
  txt(774,y,title,10,'Mono',GREEN);y=para(774,y+20,body,300,12,INK,16)+20
 assert y<735
 finish('UG-03-INDEX')

new('The Living Burrow','VOLUME 03  /  PRESENT LIFE BEFORE HISTORY')
C.drawImage(str(ROOT/'source/Underhall_Atmosphere.png'),42,H-132-582.75,width=1036,height=582.75,mask='auto')
txt(42,735,'Underhall atmosphere study: materials and daily life. The measured plans remain authoritative.',10,'Sans',MUTED)
finish()
for p in PAGES:
 {'neighborhoods':neighborhoods,'residents':residents,'plan':plan,'underhall':underhall}.get(p.get('kind'),ordinary)(p)
C.save()
doc=fitz.open(OUT/'MADGER_Living_World.pdf');assert len(doc)==26
out_of_bounds=[]
for i,p in enumerate(doc):
 for b in p.get_text('dict')['blocks']:
  for l in b.get('lines',[]):
   for s in l['spans']:
    r=fitz.Rect(s['bbox'])
    if r.x0<0 or r.x1>W or r.y0<0 or r.y1>H:out_of_bounds.append((i+1,s['text']))
 p.get_pixmap(matrix=fitz.Matrix(1.45,1.45),alpha=False).save(OUT/'previews'/f'LW-{i+1:02}.png')
assert not out_of_bounds,out_of_bounds
for group in range(4):
 ids=list(range(group*7,min(group*7+7,len(doc))))
 im=Image.new('RGB',(1000,1472),PAPER)
 for j,i in enumerate(ids):
  t=Image.open(OUT/'previews'/f'LW-{i+1:02}.png').convert('RGB');t.thumbnail((480,340));x=(j%2)*500+10;y=(j//2)*368+5;im.paste(t,(x,y));ImageDraw.Draw(im).text((x,y+342),f'{i+1:02} / '+REGISTER[i]['title'],fill=INK)
 im.save(OUT/f'review_{group+1}.jpg',quality=94)
(OUT/'page_register.json').write_text(json.dumps(REGISTER,indent=2)+'\n')
v=json.loads((OUT/'validation.json').read_text());v['pdf']={'pages':len(doc),'text_within_page_bounds':True,'svg_blueprints':8,'rendered_previews':26};(OUT/'validation.json').write_text(json.dumps(v,indent=2)+'\n')
print(json.dumps({'pages':len(doc),'bytes':(OUT/'MADGER_Living_World.pdf').stat().st_size,'blueprints':8},indent=2))
