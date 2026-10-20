from pathlib import Path
import json, math, hashlib, html, textwrap
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image, ImageOps, ImageDraw
import fitz

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output'; (OUT/'svg').mkdir(parents=True,exist_ok=True); (OUT/'previews').mkdir(exist_ok=True)
D=json.loads((ROOT/'canon/MADGER_World_Bible.json').read_text())
W,H=1600,1131
BG='#091E31'; PANEL='#0D293F'; GRID='#16354A'; LINE='#A5D9E8'; WHITE='#E9F7FA'; MUTED='#82A9BA'; GREEN='#8DDFBD'; GOLD='#F1C378'; WATER='#56BEDD'; DIM='#648CA0'
for name,fn in [('Sans','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf'),('Mono','DejaVuSansMono.ttf')]:
    pdfmetrics.registerFont(TTFont(name,'/usr/share/fonts/truetype/dejavu/'+fn))

PDF=canvas.Canvas(str(OUT/'MADGER_Burrow_Blueprints.pdf'),pagesize=(1190.551,841.890),pageCompression=1)
PDF.setTitle('MADGER World - Burrow Blueprint Atlas / Issue 01')
PDF.setAuthor('MADGER / James Raymond Dean')
PAGES=[]; SPECS={}; TEXT_BOXES=[]

class Draw:
    def __init__(self,code,title,sub):
        self.code=code;self.title=title; self.svg=[]
        PDF.bookmarkPage(code);PDF.addOutlineEntry(code+' / '+title,code,level=0)
        PDF.saveState();PDF.scale(1190.551/W,841.890/H)
        self.rect(0,0,W,H,fill=BG,stroke=None)
        for x in range(40,W,40):self.line(x,138,x,1028,GRID,.35)
        for y in range(138,1029,40):self.line(40,y,1560,y,GRID,.35)
        self.rect(38,138,1524,890,stroke=DIM,lw=.7)
        self.text(54,48,'MADGER',23,WHITE,'Bold')
        self.text(214,48,'WORLD DEVELOPMENT  /  INSIDE THE BURROW',14,MUTED,'Mono')
        self.text(1546,48,code,21,GREEN,'Mono','right')
        self.text(54,91,title,32,WHITE,'Bold')
        self.text(54,121,sub,14,MUTED)
        self.line(38,1044,1562,1044,DIM,.8)
        self.text(54,1071,'BURROW BLUEPRINT ATLAS',15,WHITE,'Bold')
        self.text(54,1095,'Issue 01  |  20 OCT 2026  |  Base canon v1.0.0',12,MUTED,'Mono')
        self.text(635,1071,'WORLD: MADGER-BRW-HOME',13,GREEN,'Mono')
        self.text(635,1095,'Metres  |  +X east  /  +Y north  /  +Z up',12,MUTED,'Mono')
        self.text(1546,1071,f'{len(PAGES)+1:02d} / 21',16,WHITE,'Mono','right')
        self.text(1546,1095,'Production design - not construction engineering',12,MUTED,'Sans','right')
    def line(self,x1,y1,x2,y2,c=LINE,lw=1,dash=None):
        PDF.setStrokeColor(HexColor(c));PDF.setLineWidth(lw);PDF.setDash(dash or [])
        PDF.line(x1,H-y1,x2,H-y2)
        self.svg.append(f'<line x1="{x1:.3f}" y1="{y1:.3f}" x2="{x2:.3f}" y2="{y2:.3f}" stroke="{c}" stroke-width="{lw}"'+(f' stroke-dasharray="{",".join(map(str,dash))}"' if dash else '')+'/>')
    def rect(self,x,y,w,h,fill=None,stroke=LINE,lw=1,dash=None):
        PDF.setLineWidth(lw);PDF.setDash(dash or [])
        if fill:PDF.setFillColor(HexColor(fill))
        if stroke:PDF.setStrokeColor(HexColor(stroke))
        PDF.rect(x,H-y-h,w,h,stroke=int(bool(stroke)),fill=int(bool(fill)))
        self.svg.append(f'<rect x="{x:.3f}" y="{y:.3f}" width="{w:.3f}" height="{h:.3f}" fill="{fill or "none"}" stroke="{stroke or "none"}" stroke-width="{lw}"'+(f' stroke-dasharray="{",".join(map(str,dash))}"' if dash else '')+'/>')
    def circle(self,x,y,r,fill=None,stroke=LINE,lw=1):
        PDF.setLineWidth(lw);PDF.setDash([])
        if fill:PDF.setFillColor(HexColor(fill))
        if stroke:PDF.setStrokeColor(HexColor(stroke))
        PDF.circle(x,H-y,r,stroke=int(bool(stroke)),fill=int(bool(fill)))
        self.svg.append(f'<circle cx="{x:.3f}" cy="{y:.3f}" r="{r:.3f}" fill="{fill or "none"}" stroke="{stroke or "none"}" stroke-width="{lw}"/>')
    def poly(self,pts,c=LINE,lw=1,fill=None,closed=False,dash=None):
        if not pts:return
        PDF.setLineWidth(lw);PDF.setStrokeColor(HexColor(c));PDF.setDash(dash or [])
        if fill:PDF.setFillColor(HexColor(fill))
        p=PDF.beginPath();p.moveTo(pts[0][0],H-pts[0][1])
        for x,y in pts[1:]:p.lineTo(x,H-y)
        if closed:p.close()
        PDF.drawPath(p,stroke=1,fill=int(bool(fill)))
        self.svg.append(f'<{"polygon" if closed else "polyline"} points="'+ ' '.join(f'{x:.3f},{y:.3f}' for x,y in pts)+f'" fill="{fill or "none"}" stroke="{c}" stroke-width="{lw}"'+(f' stroke-dasharray="{",".join(map(str,dash))}"' if dash else '')+'/>')
    def text(self,x,y,s,size=14,c=WHITE,font='Sans',align='left'):
        s=str(s);PDF.setFont(font,size);PDF.setFillColor(HexColor(c))
        if align=='center':PDF.drawCentredString(x,H-y,s)
        elif align=='right':PDF.drawRightString(x,H-y,s)
        else:PDF.drawString(x,H-y,s)
        family='DejaVu Sans Mono' if font=='Mono' else 'DejaVu Sans'
        self.svg.append(f'<text x="{x:.3f}" y="{y:.3f}" fill="{c}" font-family="{family}" font-size="{size}" font-weight="{"bold" if font=="Bold" else "normal"}" text-anchor="'+{'left':'start','center':'middle','right':'end'}[align]+f'">{html.escape(s)}</text>')
    def para(self,x,y,text,width,size=15,c=MUTED,leading=None):
        leading=leading or size*1.45; lines=[]
        for p in text.split('\n'):
            line=''
            for word in p.split():
                test=(line+' '+word).strip()
                if pdfmetrics.stringWidth(test,'Sans',size)>width and line:lines.append(line);line=word
                else:line=test
            lines.append(line)
        for i,line in enumerate(lines):self.text(x,y+i*leading,line,size,c)
        return y+len(lines)*leading
    def finish(self):
        PDF.restoreState();PDF.showPage()
        path=OUT/'svg'/f'{self.code}.svg'
        path.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1131" viewBox="0 0 1600 1131">'+''.join(self.svg)+'</svg>')
        PAGES.append({'sheet':self.code,'title':self.title,'page':len(PAGES)+1,'svg':f'svg/{path.name}'})

class Map:
    def __init__(self,d,bounds,box):
        self.d=d;self.b=bounds;self.box=box
        x0,y0,x1,y1=bounds;bx,by,bw,bh=box
        self.labels=[];self.s=min(bw/(x1-x0),bh/(y1-y0));self.ox=bx+(bw-(x1-x0)*self.s)/2;self.oy=by+(bh-(y1-y0)*self.s)/2
    def p(self,x,y):return self.ox+(x-self.b[0])*self.s,self.oy+(self.b[3]-y)*self.s
    def line(self,a,b,c=LINE,lw=1,dash=None):self.d.line(*self.p(*a[:2]),*self.p(*b[:2]),c,lw,dash)
    def rect(self,x,y,w,h,fill=None,stroke=LINE,lw=1,dash=None):
        a,b=self.p(x,y+h);self.d.rect(a,b,w*self.s,h*self.s,fill,stroke,lw,dash)
    def circ(self,x,y,r,fill=None,stroke=LINE,lw=1):self.d.circle(*self.p(x,y),r*self.s,fill,stroke,lw)
    def poly(self,pts,c=LINE,lw=1,fill=None,closed=False,dash=None):self.d.poly([self.p(*p[:2]) for p in pts],c,lw,fill,closed,dash)
    def label(self,x,y,s,size=13,c=WHITE,font='Sans',align='center'):
        sx,sy=self.p(x,y);self.labels.append((sx,sy,s,size,c,font,align))
    def flush_labels(self):
        for x,y,s,size,c,font,align in self.labels:
            ww=pdfmetrics.stringWidth(s,font,size)
            left=x-ww/2 if align=='center' else x-ww if align=='right' else x
            self.d.rect(left-3,y-size,ww+6,size+5,PANEL,None)
            self.d.text(x,y,s,size,c,font,align)
        self.labels=[]
    def grid(self,step=10):
        x0,y0,x1,y1=self.b
        for x in range(math.ceil(x0/step)*step,int(x1)+1,step):self.line((x,y0),(x,y1),GRID,.6)
        for y in range(math.ceil(y0/step)*step,int(y1)+1,step):self.line((x0,y),(x1,y),GRID,.6)
    def dimx(self,x0,x1,y,label):
        self.line((x0,y),(x1,y),DIM,.8)
        for x in [x0,x1]:self.line((x,y-0.8/self.s*6),(x,y+0.8/self.s*6),DIM,.8)
        a,b=self.p((x0+x1)/2,y);self.d.rect(a-40,b-21,80,19,BG,None);self.d.text(a,b-6,label,13,LINE,'Mono','center')
    def dimy(self,y0,y1,x,label):
        self.line((x,y0),(x,y1),DIM,.8)
        for y in [y0,y1]:self.line((x-5/self.s,y),(x+5/self.s,y),DIM,.8)
        a,b=self.p(x,(y0+y1)/2);self.d.rect(a+3,b-11,74,22,BG,None);self.d.text(a+8,b+4,label,13,LINE,'Mono')

def north(d,x=1085,y=191):
    d.text(x,y-14,'N',15,GREEN,'Mono','center');d.line(x,y,x,y+38,GREEN,1.5)
    d.poly([(x,y),(x-5,y+12),(x+5,y+12)],GREEN,1,GREEN,True)

def scale(d,m,x,y,length):
    w=length*m.s;d.line(x,y,x+w,y,WHITE,2)
    for a in [x,x+w/2,x+w]:d.line(a,y-5,a,y+5,WHITE,1)
    d.text(x,y+22,'0',12,MUTED,'Mono');d.text(x+w,y+22,f'{length:g} m',12,MUTED,'Mono','right')
    d.text(x,y-12,'GRAPHIC SCALE',10,MUTED,'Mono')

def badge(d,x,y,s,c=GREEN,r=15):
    d.circle(x,y,r,BG,c,1.4);d.text(x,y+4,s,12,c,'Mono','center')

def base_map(d,box=(70,190,1040,740),highlight=None,labels=True):
    m=Map(d,(-320,-235,320,235),box)
    pts=[(300*math.cos(t*math.pi/180),220*math.sin(t*math.pi/180)) for t in range(361)]
    m.poly(pts,DIM,1.6,closed=True)
    for r in D['routes']:
        m.poly(r['points_m'],GREEN if r['mode']=='walk_cart' else MUTED,1.3,dash=[3,3] if r['mode']=='stairs' else None)
    w=D['water']['utility_race_centerline_m'];m.poly(w[:3],WATER,2,dash=[4,4]);m.poly(w[2:],WATER,6*m.s)
    for loc in D['locations']:
        x,y,z=loc['position_m'];a,b=loc['footprint_m'];active=loc['id']==highlight
        m.rect(x-a/2,y-b/2,a,b,PANEL,GOLD if active else LINE,2.2 if active else 1)
    for c in D['crossings']:
        x,y,z=c['position_m'];ww,hh=(c['width_m'],c['span_m']) if c['id']=='BRW-C02' else (c['span_m'],c['width_m'])
        m.rect(x-ww/2,y-hh/2,ww,hh,BG,GOLD,1.2)
    if labels:
        for loc in D['locations']:
            x,y,z=loc['position_m'];sx,sy=m.p(x,y)
            if loc['id']=='BRW-12':sy-=24
            if loc['id']=='BRW-14':sy-=28
            if loc['id']=='BRW-15':sy+=10
            badge(d,sx,sy,loc['id'][-2:],GOLD if loc['id']==highlight else GREEN,13)
    return m

def section_title(d,x,y,s):d.text(x,y,s,13,GREEN,'Mono')
def info_block(d,y,title,text,width=350):
    section_title(d,1180,y,title);return d.para(1180,y+28,text,width,14)+19

def local_zone(m,x,y,w,h,label,kind='zone'):
    m.rect(x,y,w,h,fill=None,stroke=DIM,lw=.9,dash=[4,4] if kind=='zone' else None)
    sx,sy=m.p(x+w/2,y+h/2)
    lines=label.split('|');sz=min(14,max(9,w*m.s/max(max(map(len,lines)),1)*1.45))
    for i,line in enumerate(lines):m.labels.append((sx,sy+(i-(len(lines)-1)/2)*18+4,line,sz,LINE,'Sans','center'))

def table(m,x,y,w=6,h=2):
    m.rect(x,y,w,h,fill=PANEL,stroke=LINE,lw=.9)
    for xx in [x+w*.2,x+w*.5,x+w*.8]:
        m.rect(xx-.4,y-.9,.8,.55,stroke=DIM,lw=.7);m.rect(xx-.4,y+h+.35,.8,.55,stroke=DIM,lw=.7)

def shelf(m,x,y,w,h):
    m.rect(x,y,w,h,stroke=LINE,lw=.8)
    for a in range(1,5):m.line((x+a*w/5,y),(x+a*w/5,y+h),DIM,.6)

def door(m,x,y,w,side,ident):
    # erase the wall at an authored portal; cyan threshold + green movement mark
    if side in 'NS':
        m.line((x-w/2,y),(x+w/2,y),BG,5);m.line((x-w/2,y),(x+w/2,y),GREEN,1.2)
        direction=1 if side=='N' else -1
        m.line((x,y),(x,y+direction*2),GREEN,1)
        sx,sy=m.p(x,y+direction*3);m.d.text(sx,sy+4,ident,11,GREEN,'Mono','center')
    else:
        m.line((x,y-w/2),(x,y+w/2),BG,5);m.line((x,y-w/2),(x,y+w/2),GREEN,1.2)
        direction=1 if side=='E' else -1
        m.line((x,y),(x+direction*2,y),GREEN,1)
        sx,sy=m.p(x+direction*3,y);m.d.text(sx,sy+4,ident,11,GREEN,'Mono','center')

# Detail layer: all coordinates below are local metres, translated without rotation.
# Doors/shell sub-divisions are new production specifications, never asserted as old canon.
PORTALS={
1:[('E',42,0,8,'P1'),('S',0,-32,6,'P2'),('W',-42,0,6,'P3'),('N',0,32,6,'P4')],
2:[('N',0,14,3,'P1'),('W',-25,-4,2,'P2'),('S',21,-14,2,'P3')],
3:[('W',-50,0,2,'P1')],
4:[('S',0,-31,3,'P1'),('W',-80,0,4,'P2')],
5:[('S',0,-12,2,'P1')],
6:[('S',0,-15,3,'P1'),('W',-20,0,4,'P2')],
7:[('E',22,0,5,'P1'),('N',0,15,2,'P2'),('S',12,-15,2,'P3')],
8:[('E',29,0,6,'P1'),('N',0,21,4,'P2')],
9:[('S',0,-14,2.4,'P1'),('E',19,0,2,'P2')],
10:[('E',26,0,5,'P1'),('N',0,19,2,'P2'),('W',-26,0,2,'P3')],
11:[('N',0,12,2.4,'P1'),('W',-15,4,2,'P2')],
12:[('W',-6,0,4.5,'P1'),('E',6,0,4.5,'P2')],
13:[('W',-36,0,8,'P1'),('E',36,0,8,'P2'),('S',20,-26,5,'P3')],
14:[('W',-12,0,12,'P1'),('E',12,0,12,'P2')],
15:[('W',-17,0,4,'P1'),('N',0,7,3,'P2')],
16:[('S',0,-11,2.4,'P1'),('W',-19,0,2,'P2')]
}
CONNECTIONS={
1:'East: BRW-12 via Gate Lane. South: BRW-02. West: BRW-07 / BRW-16. North: BRW-C02 then BRW-04.',
2:'North to BRW-01. West service approach to BRW-11. South neighborhood approach to BRW-03. East delivery route to BRW-10.',
3:'Public galleries connect to the western ramp and home_low stair route. The exact Madger / Snow entry remains (-80, -132, +12).',
4:'South stair via BRW-C02. West cart ramp connects +0 / +6 / +12 / +18 landings and BRW-05. Terrace paths never cross planted beds.',
5:'South inspection entry (-160, 138, +18) joins the upper garden ramp. Water exits into the enclosed headrace; no public tunnel.',
6:'South approach to BRW-07. West equipment access. East wheel interfaces with the existing race; no pedestrian crossing is added.',
7:'East court to works_junction and BRW-01. North service route to BRW-06. South walk to BRW-08.',
8:'East entrance to the lower walk. North equipment route to BRW-07. West emergency threshold BRW-X01 remains closed.',
9:'South entrance to market_e. East maintenance door stays local. Cable links serve local records; no physical control of the gate bar.',
10:'East receiving court to Gate Lane. North staff approach to lane_e. West inventory exit to the common-house delivery route.',
11:'North reception from the public walk. West service exit. Quiet south rooms remain private; no shortcut through patient space.',
12:'West landing (164, 0, 0); east landing (176, 0, 0). C03 at y=-90 provides the existing maintenance bypass.',
13:'West to BRW-12. East to BRW-14 mouth at x=270. South to BRW-15 and BRW-C03. No exterior view in Episode 1.',
14:'Enter from west at x=270. Exterior leaf plane x=294 stays closed in shown pilot scenes. Relay is on the SOUTH wall.',
15:'Return north to gate_mouth (270, 0, 0), then inside to the cabinet. The walk and cabinet are two parts of one location record.',
16:'South public entrance to the market / west lane. West service exit. Archive and Creator Studio share this one footprint.'}

def details(n,m):
    # m uses local coordinates, north-up throughout.
    if n==1:
        m.circ(0,0,3.2,stroke=LINE,lw=2);m.circ(0,0,2.2,stroke=DIM,lw=.8)
        for a,b in [((0,4),(0,20)),((4,0),(32,0)),((0,-4),(0,-22)),((-4,0),(-30,0))]:m.line(a,b,LINE,2)
        for x in [-32,-19,-6,20]:local_zone(m,x,23,10,7,'STALL','fixed')
        for y in [-23,-10,3]:local_zone(m,-39,y,8,9,'STALL','fixed')
        m.rect(16,19,4,2,stroke=GOLD,lw=1.5);m.label(18,16,'NOTICEBOARD',11,GOLD)
        m.label(20,-18,'CLEAR CIVIC FLOOR',14);m.label(0,-7,'SUNWELL / ORIGIN',11)
    elif n==2:
        local_zone(m,-24,-13,15,22,'KITCHEN|& PANTRY','fixed')
        m.line((-9,-13),(-9,9),LINE,1.6);m.line((-9,-1),(-9,3),BG,4)
        for x in [-23,-17]:shelf(m,x,-11,4,1.7)
        local_zone(m,-7,-13,30,22,'SHARED MEAL ROOM')
        for x in [-3,11]:
            for y in [-8,1]:table(m,x,y,8,2.5)
        local_zone(m,-24,9,48,4,'NORTH PORCH')
        for x in [-17,-3,11]:m.rect(x,9.5,7,2.2,stroke=GOLD,lw=1.3)
        m.circ(-23,-12,1,stroke=GOLD,lw=1.4);m.label(-17,-16.5,'COPPER VENT',11,GOLD)
    elif n==3:
        for y,z in [(12,6),(-8,12),(-25,18)]:
            m.rect(-68,y,136,13,stroke=DIM,lw=1,dash=[5,4])
            m.label(18,y+7,f'RESIDENTIAL BAND / +{z} m',13)
        m.rect(-50,-8,22,16,stroke=LINE,lw=2)
        m.label(-39,1,'MADGER / SNOW',10);m.label(-39,-3,'HOME ALLOCATION',9)
        m.line((-68,9),(68,9),GREEN,1.8);m.line((-68,-9),(68,-9),GREEN,1.8)
        m.label(12,-3,'PUBLIC GALLERY / +12 m',11,GREEN)
        m.label(12,-20,'PRIVATE ROOMS UNASSIGNED',11,MUTED)
    elif n==4:
        for y,z in [(-30,6),(-10,12),(10,18)]:
            for x in [-76,-51,-26,8,33]:
                m.rect(x,y+3,19,12,stroke=LINE,lw=.8)
                for q in range(1,5):m.line((x+q*3.5,y+4),(x+q*3.5,y+14),DIM,.6)
            m.line((-78,y+1),(78,y+1),GREEN,1.2);m.label(-63,y+18,f'+{z} m',11,GREEN)
        for x in [57,68]:local_zone(m,x,-7,9,14,'GLASS','fixed')
        m.rect(-2,-31,4,62,stroke=GREEN,lw=1)
        for y in range(-30,31,2):m.line((-2,y),(2,y),DIM,.6)
    elif n==5:
        local_zone(m,-15,3,20,8,'COVERED POTABLE TANKS','fixed')
        for x in [-10,-2]:m.circ(x,7,3,stroke=LINE,lw=1.2)
        local_zone(m,7,0,8,11,'UTILITY|SETTLING','fixed')
        local_zone(m,-15,-10,12,10,'INSPECTION|& SAMPLE DESK')
        for x in [-2,3,8]:m.circ(x,-5,1,stroke=GOLD,lw=1.2)
        m.label(3,-8,'THREE VALVE WHEELS',10,GOLD)
        m.line((6,-11),(6,11),LINE,2)
    elif n==6:
        local_zone(m,-18,-13,17,12,'MAINTENANCE BAY')
        local_zone(m,-18,2,12,11,'LOCAL ELECTRICS|& BATTERY','fixed')
        local_zone(m,1,-11,17,24,'DRIVE / GENERATOR')
        m.rect(8,-4,8,7,stroke=LINE,lw=1.6)
        m.line((16,0),(20,0),LINE,2.5)
        m.rect(17,-3,3,6,stroke=WATER,lw=1.8);m.label(6,9,'6 m WHEEL ON EAST WALL',11,WATER)
        m.rect(13,11,3,2,stroke=GOLD,lw=1);m.rect(-13,11,3,2,stroke=GOLD,lw=1)
        m.label(3,-20,'EAST RACE IS OUTSIDE THIS SHELL',11,MUTED)
    elif n==7:
        shelf(m,-20,-7,3,18)
        m.label(-11,5,'BLUE TOOL RACK',10)
        table(m,-13,9,23,3);m.label(0,13.5,'NORTH WINDOWS',10,GREEN)
        for x in [-8,5]:table(m,x,-4,8,3)
        m.line((-21,-9),(5,-9),LINE,2);m.line((5,-9),(5,-14),LINE,2)
        m.line((-4,-9),(-1,-9),BG,4)
        local_zone(m,-20,-14,24,4,'PRIVATE REST ALCOVE','fixed')
        m.label(14,-9,'CLEAR TOOL AISLE',10,GREEN)
    elif n==8:
        for x,label in [(-22,'SOIL A'),(-7,'SOIL B')]:
            m.rect(x,-16,9,32,stroke=GOLD,lw=1.5);m.label(x+4.5,1,label,12,GOLD)
            for y in [-12,-5,5,12]:m.line((x+1,y),(x+8,y+2),DIM,.7)
        local_zone(m,9,2,16,16,'ROPE RESCUE|FRAME','fixed')
        for x in [10,18]:m.circ(x,-9,1.8,stroke=LINE,lw=1)
        m.label(17,-15,'MOVEABLE OBSTACLES',9)
        m.label(17,-19,'NO BURIED UTILITIES',9,GOLD)
    elif n==9:
        local_zone(m,-17,-12,34,7,'PUBLIC RECEPTION')
        m.rect(-13,-5,22,1.5,stroke=LINE,lw=1.5)
        table(m,-6,-.5,12,4);m.label(0,6,'COMPARISON TABLE',12)
        shelf(m,-16,10,23,2);m.label(-4,8,'OFFLINE CABINET',10,GOLD)
        m.rect(11,8,6,4,stroke=GOLD,lw=1.4);m.label(14,6,'BOT DOCK',10,GOLD)
        m.label(0,-10,'SOUTH PUBLIC COUNTER',10)
    elif n==10:
        for x in [-22,-11,0]:
            for y in [-14,5]:shelf(m,x,y,6,10)
        m.label(-8,0,'INVENTORY AISLE',12,GREEN)
        local_zone(m,10,-17,14,34,'COVERED|RECEIVING|COURT')
        m.circ(17,0,5,stroke=GREEN,lw=.8)
        m.label(17,-11,'CART TURN',10,GREEN)
        m.rect(11,12,9,3,stroke=LINE,lw=1);m.label(15.5,10,'TAG DESK',10)
    elif n==11:
        m.line((-14,1),(14,1),LINE,1.8);m.line((-1,1),(1,1),BG,4)
        m.line((0,-11),(0,1),LINE,1.8)
        local_zone(m,-14,-11,13,11,'REST ROOM 1');local_zone(m,1,-11,13,11,'REST ROOM 2')
        for x in [-11,4]:m.rect(x,-9,6,3,stroke=LINE,lw=.9)
        m.line((-9,1),(-6,1),BG,4);m.line((6,1),(9,1),BG,4)
        local_zone(m,-14,3,28,7,'RECEPTION / QUIET WAITING')
        for x in [-12,-7,6,11]:m.circ(x,10,1,stroke=GREEN,lw=.7)
    elif n==12:
        for x in [i*.6-5.7 for i in range(20)]:m.line((x,-2.1),(x,2.1),DIM,.8)
        m.line((-6,-2.25),(6,-2.25),LINE,2);m.line((-6,2.25),(6,2.25),LINE,2)
        for x in [-4,0,4]:m.circ(x,2.25,.12,fill=GOLD,stroke=GOLD);m.line((x,2.25),(x,3),GOLD,1)
        m.label(0,0,'PALE TIMBER DECK',13)
        m.label(0,-3.5,'NO OVERHEAD STRUCTURE',11,MUTED)
    elif n==13:
        local_zone(m,-31,15,45,8,'SHADED WAITING BENCH')
        for x in [-25,-5]:m.rect(x,17,15,2,stroke=LINE,lw=1)
        for x in [0,17]:local_zone(m,x,-22,13,12,'CART BAY','fixed')
        m.rect(29,9,2,3,stroke=GOLD,lw=1.2);m.label(24,6,'BELL / STATUS',10,GOLD)
        m.line((-36,0),(36,0),GREEN,1.2,dash=[6,4]);m.label(-9,4,'CLEAR GATE APPROACH',13,GREEN)
    elif n==14:
        m.line((-12,9),(12,9),LINE,3);m.line((-12,-9),(12,-9),LINE,3)
        m.line((12,-9),(12,9),GOLD,3)
        m.line((11,-6),(11,6),LINE,2);m.line((10.3,-5),(10.3,5),GOLD,3)
        m.rect(-1,-8.8,2,.6,stroke=GOLD,lw=2)
        m.label(0,-6.8,'R-E01 / SOUTH WALL',10,GOLD)
        m.label(0,3,'CLEAR VESTIBULE',13);m.label(5,6,'MANUAL BAR',10,GOLD)
        m.label(14,0,'',10)
    elif n==15:
        m.line((-16,-3),(16,-3),WATER,1)
        m.rect(-7,-1,2,2,stroke=GOLD,lw=1.5);m.label(-6,3,'INSPECTION HATCH',10,GOLD)
        m.label(5,0,'SERVICE WALK',14)
        m.label(3,-5,'SHALLOW DRAIN',10,WATER)
    elif n==16:
        table(m,-15,6,23,3);m.label(-3,10,'NORTH WORKTABLE',10)
        shelf(m,15,-8,2.5,17);m.label(10,0,'ARCHIVE',10,GOLD)
        for x in [-11,0]:table(m,x,-4,7,3)
        m.label(-5,-8,'READING / MAKING',11)

def sheet_master():
    d=Draw('BP-00','The Burrow / master blueprint','Master assembly plan / fixed footprints, public route graph and three canal crossings')
    m=base_map(d);north(d,1080,189);scale(d,m,80,977,100)
    d.text(80,168,'PLAN / NORTH UP',13,GREEN,'Mono')
    d.text(560,977,'600 x 440 m planning envelope',14,WHITE,'Mono')
    d.text(560,1003,'Origin: Sunwell (0, 0, 0)',13,MUTED,'Mono')
    d.line(1140,160,1140,1010,DIM,.7)
    section_title(d,1180,184,'AREA / DRAWING INDEX')
    for i,l in enumerate(D['locations']):
        y=218+i*35;d.text(1180,y,l['id'][-2:],14,GREEN,'Mono')
        title=l['name'].replace('Gorilla White\'s Workshop','Gorilla White Workshop')
        d.text(1218,y,title,13,WHITE)
    y=805
    for color,label in [(LINE,'Fixed footprint'),(GREEN,'Public circulation graph'),(WATER,'Separate utility race'),(GOLD,'Bridge / detailed anchor')]:
        d.line(1180,y,1210,y,color,2);d.text(1224,y+4,label,13,MUTED);y+=31
    d.para(1180,950,'Every detail sheet plugs into this map. Rock texture may vary; anchors and compass directions do not.',350,14)
    d.finish()

def sheet_east():
    d=Draw('BP-17','East precinct / connected assembly','BRW-12 + BRW-13 + BRW-14 + BRW-15 / one continuous interior sequence')
    m=Map(d,(145,-110,300,42),(85,210,1020,710));m.grid(10)
    for r in D['routes']:
        if all(p[0]>=130 for p in r['points_m']):m.poly(r['points_m'],GREEN,2,dash=[5,4] if r['mode']=='walk' else None)
    m.line((170,42),(170,-90),WATER,6*m.s);m.line((170,-90),(166,-104),WATER,6*m.s)
    for i in [12,13,14,15]:
        l=D['locations'][i-1];x,y,z=l['position_m'];a,b=l['footprint_m'];m.rect(x-a/2,y-b/2,a,b,PANEL,LINE,1.5)
        m.label(x,y+6 if i!=12 else y+8,l['id'],15,GREEN,'Mono')
    m.rect(164,-92,12,4,BG,GOLD,1.5);m.label(184,-90,'C03 BYPASS',12,GOLD,'Mono','left')
    m.line((294,-9),(294,9),GOLD,3);m.line((270,-9),(294,-9),LINE,3)
    m.circ(282,-8.5,1,GOLD,GOLD);m.poly([(270,-26),(270,0),(282,-6)],GOLD,2,dash=[5,3])
    m.circ(264,-26,1,stroke=GOLD,lw=1.3)
    m.label(225,34,'ARRIVAL COURT',15);m.label(170,18,'EAST BRIDGE',12)
    m.label(270,-45,'SERVICE WALK',13);m.label(228,-57,'USE WEST MOUTH TO REACH RELAY',11,GOLD)
    m.flush_labels()
    north(d,1080,189);scale(d,m,85,977,20)
    d.line(1140,160,1140,1010,DIM,.7)
    y=184
    for title,txt in [('CONTINUOUS ROUTE','Gate Lane -> East Bridge -> Inner Arrival Court -> west vestibule mouth. All visible pilot ground stays inside.'),('FIXED PLANES','Bridge landings: x=164 and x=176. Vestibule mouth: x=270. Closed exterior leaves: x=294.'),('RELAY ACCESS','Walk anchor (270,-26,0). Return to (270,0,0), then approach (282,-6,0). Cabinet center is (282,-8.5,1.2).'),('NO FALSE CONNECTION','The south vestibule wall is solid. The gold access route goes around its western end; it never cuts through the wall.'),('EXISTING BYPASS','C03 at y=-90 remains available when East Bridge is closed for maintenance. This creates no fourth crossing.')]:y=info_block(d,y,title,txt)
    d.finish()

def area_sheet(n):
    loc=D['locations'][n-1];id=loc['id'];w,h=loc['footprint_m'];cx,cy,cz=loc['position_m']
    d=Draw('BP-'+f'{n:02}',loc['name'],f'{id} / area plan and connection schedule / fixed world anchor ({cx:g}, {cy:g}, {cz:g}) m')
    d.text(80,178,'PLAN / LOCAL METRES / NORTH UP',13,GREEN,'Mono');north(d,1080,189)
    padx=max(10,w*.14);pady=max(10,h*.23)
    m=Map(d,(-w/2-padx,-h/2-pady,w/2+padx,h/2+pady),(95,240,985,610))
    m.grid(10 if w>60 else 5)
    boundary_only=n in [1,3,4,8,13,15]
    m.rect(-w/2,-h/2,w,h,fill=PANEL,stroke=LINE,lw=1.8,dash=[7,4] if boundary_only else None)
    details(n,m)
    for side,x,y,width,p in PORTALS[n]:
        # Garden west gateway and home entry are gallery interfaces, not outer-shell doors.
        if n==14 and side=='E':continue
        if n==12:continue
        door(m,x,y,width,side,p)
    m.dimx(-w/2,w/2,-h/2-pady*.90,f'{w:g} m')
    m.dimy(-h/2,h/2,w/2+padx*.75,f'{h:g} m')
    m.circ(0,0,.25,stroke=GREEN,lw=1);m.line((-1,0),(1,0),GREEN,.8);m.line((0,-1),(0,1),GREEN,.8)
    m.flush_labels()
    scale(d,m,90,924,5 if w<45 else 10 if w<85 else 20)
    d.text(480,920,'LOCAL (0,0) = WORLD ANCHOR',11,GREEN,'Mono')
    d.text(480,944,f'X = {cx:g} + local x   |   Y = {cy:g} + local y',13,WHITE,'Mono')
    d.text(480,968,f'Baseline Z = {cz:g} m  |  No rotation or mirroring',13,MUTED,'Mono')
    d.line(80,986,1095,986,DIM,.7)
    note='Solid lines: shell / fixed anchor. Dashed: planning or functional zone. Green: access. Gold: critical anchor.'
    if n==3:note='Tier bands show neighborhood allocation. Unseen private rooms stay unassigned. Ramp approaches are on BP-00.'
    if n==14:note='South cabinet fixed. East leaf plane closed. Physical crossbar and electronic record remain independent.'
    if n==15:note='This footprint is the walk. Cabinet R-E01 is separately anchored inside BRW-14; see BP-17 for the joined plan.'
    if n==12:note='Deck: 12 x 4.5 m. Canal: 6 m. Three reopening pennants. Water below path at this crossing: 2.2 m.'
    d.para(80,1010,note,1010,12)
    d.line(1140,160,1140,1010,DIM,.7)
    section_title(d,1180,184,'POSITION IN THE WORLD')
    base_map(d,(1172,202,365,230),highlight=id,labels=False)
    d.text(1180,450,f'FOOTPRINT {w:g} x {h:g} m',14,WHITE,'Mono')
    y=482
    y=info_block(d,y,'PURPOSE',loc['role'])
    y=info_block(d,y,'CONNECTIONS',CONNECTIONS[n])
    section_title(d,1180,y,'PORTAL SCHEDULE / WORLD XYZ');y+=28
    for side,x,yy,width,p in PORTALS[n]:
        z=cz
        if n==4 and p=='P1':z=6
        if n==14 and p=='P2':kind='CLOSED LEAVES'
        else:kind=f'{side} / {width:g} m'
        d.text(1180,y,f'{p}  {kind}',12,GREEN,'Mono');y+=20
        d.text(1180,y,f'({cx+x:g}, {cy+yy:g}, {z:g})',12,MUTED,'Mono');y+=26
    if y<941:
        d.para(1180,y+2,'Shell subdivisions and portal widths are authored in this issue. Existing footprint and named anchors are inherited unchanged.',350,12)
    SPECS[id]={'sheet':f'BP-{n:02}','name':loc['name'],'world_anchor_m':loc['position_m'],'footprint_m':loc['footprint_m'],'rotation_deg':0,'portals':[{'id':f'{id}-{p}','side':side,'width_m':width,'world_position_m':[cx+x,cy+y,6 if n==4 and p=='P1' else cz],'status':'closed exterior threshold' if n==14 and p=='P2' else 'authored production portal'} for side,x,y,width,p in PORTALS[n]],'connections':CONNECTIONS[n],'detail_status':'Additive production design; original world anchor and footprint preserved','private_interiors':'Unassigned where not drawn; no permission to invent hidden passages'}
    d.finish()

def sheet_crossings():
    d=Draw('BP-18','Three crossings / fixed connections','Crossing register / true plan geometry and fixed landing coordinates')
    for i,c in enumerate(D['crossings']):
        x=62+i*500;d.rect(x,174,478,658,PANEL,DIM,.8)
        d.text(x+22,211,c['id'],16,GREEN,'Mono');d.text(x+22,243,c['name'],22,WHITE,'Bold')
        vertical=c['id']=='BRW-C02'
        m=Map(d,(-10,-10,10,10),(x+38,287,400,385))
        if vertical:m.rect(-10,-3,20,6,fill='#12405A',stroke=WATER)
        else:m.rect(-3,-10,6,20,fill='#12405A',stroke=WATER)
        w,h=(c['width_m'],12) if vertical else (12,c['width_m'])
        m.rect(-w/2,-h/2,w,h,BG,LINE,2)
        if vertical:
            m.line((-2,-6),(-2,6),LINE,2);m.line((2,-6),(2,6),LINE,2)
            m.label(0,8,'N',13,GREEN)
        else:
            if c['id']=='BRW-C01':
                for a in range(-5,6):m.line((a,-h/2),(a,h/2),DIM,.8)
        if vertical:
            m.dimx(-2,2,-8,'4 m')
            m.dimy(-6,6,7,'12 m')
            m.label(-6,0,'6 m',12,WATER)
        else:m.dimx(-6,6,-8,'12 m')
        m.flush_labels()
        d.text(x+24,710,f'Span 12 m  |  clear width {c["width_m"]:g} m',14,WHITE,'Mono')
        xx,yy,zz=c['position_m']
        lands=[(xx,yy-6,0),(xx,yy+6,0)] if vertical else [(xx-6,yy,0),(xx+6,yy,0)]
        d.text(x+24,747,'LANDINGS / WORLD XYZ',12,GREEN,'Mono')
        d.text(x+24,776,str(lands[0])+'  /  '+str(lands[1]),11,MUTED,'Mono')
        d.text(x+24,809,c['material'].upper(),12,LINE,'Mono')
    d.text(84,879,'DECK / WATER RELATIONSHIP AT EAST BRIDGE',13,GREEN,'Mono')
    d.line(90,924,720,924,LINE,4);d.line(252,970,558,970,WATER,4)
    d.line(252,914,252,989,DIM,1);d.line(558,914,558,989,DIM,1)
    d.text(735,927,'+0.0 m deck',13,WHITE,'Mono');d.text(735,974,'-2.2 m water',13,WATER,'Mono')
    d.para(1000,879,'These are the only canal crossings. Garden Crossing runs north-south; the other two run east-west. Sluice hardware, rails and decorations cannot become extra bridges.',490,15)
    d.finish()

def sheet_systems():
    d=Draw('BP-19','Systems that support daily life','Fixed watercourse plus functional network / utility branch routing is reserved, not fabricated')
    m=base_map(d,(70,190,1040,740));north(d,1080,189)
    pts=D['water']['utility_race_centerline_m']
    for idx in [0,2,8,11]:
        x,y,z=pts[idx];sx,sy=m.p(x,y);d.rect(sx-31,sy-40,62,21,BG,None);d.text(sx,sy-25,f'{z:g} m',12,WATER,'Mono','center')
    scale(d,m,80,977,100)
    d.text(490,977,'FLOW: SPRING -> WHEEL -> CANAL -> OUTLET',12,WATER,'Mono')
    d.text(490,1003,'Open canal width 6 m; first headrace segments enclosed.',12,MUTED)
    d.line(1140,160,1140,1010,DIM,.7)
    y=184
    for title,txt in [('WATER / FIXED ALIGNMENT','The plotted race is copied from canon point-for-point. Covered potable tanks supply a separate buried pipe system.'),('POWER / LOCAL CONTROL','Waterhouse generation is supplemented by roof solar and local batteries. Separate electrical isolation from mechanical water flow.'),('RECORDS / LOCAL LINKS','Records House compares reports and offline evidence. The gate relay records observations; it cannot move the manual bar.'),('WASTE / SEPARATE SYSTEM','Sealed collection follows service corridors toward the southeast treatment threshold. Detailed pipe sizes and branch alignments remain unassigned.'),('BURROWING / EXCLUSION','Only authored soil volumes permit digging. Keep foundations, stone, protected planting, cables and pipe corridors outside those volumes.'),('DESIGN BOUNDARY','Do not read this network as engineered services. This issue fixes interfaces and story logic; later system sheets must add surveyed production routes.')]:y=info_block(d,y,title,txt)
    d.finish()

def sheet_growth():
    d=Draw('BP-20','How the Madger world grows','Assembly contract / every new area gets a measured plan and a declared connection')
    d.text(82,190,'01  LOCK THE EXISTING WORLD',18,GREEN,'Mono')
    d.para(82,226,'The Burrow is the first district. Keep its 16 anchors, three crossings, north direction and elevation datum unchanged. New stories add events; new districts attach to documented thresholds.',650,18)
    d.text(82,361,'02  BUILD AN AREA PACKET',18,GREEN,'Mono')
    fields=[('IDENTITY','Stable ID, name, parent district, first appearance.'),('GEOMETRY','World origin, footprint, rotation, elevation, plan and section.'),('CONNECTIONS','Portal IDs, coordinates, width, level and adjoining portal.'),('SYSTEMS','Walk / cart routes, water, power, data and manual fallbacks.'),('CONTINUITY','Materials, sightlines, soil volumes and event-state overlays.')]
    yy=405
    for head,txt in fields:
        d.text(82,yy,head,13,WHITE,'Mono');d.para(242,yy,txt,500,15);yy+=69
    d.text(82,798,'03  CHECK THE JOIN BEFORE USE',18,GREEN,'Mono')
    d.para(82,837,'Shared portals must match world position, elevation and orientation. Check reachable routes, collision, sightlines and scene transitions. Publish the area packet before using it in a story, game or image.',650,18)
    d.line(788,170,788,1004,DIM,.8)
    section_title(d,840,190,'RESERVED WORLD CONNECTIONS')
    yy=236
    for r in D['expansion']['reserved']:
        d.text(840,yy,r['id']+' / '+r['name'],18,WHITE,'Bold');yy+=31
        d.text(840,yy,str(tuple(r['anchor']))+' m',16,GREEN,'Mono');yy+=30
        yy=d.para(840,yy,r['status'],650,16)+45
    section_title(d,840,758,'VERSIONING AND SOURCE OF TRUTH')
    d.para(840,794,'This atlas is Blueprint Issue 01, an additive production drawing set based on World Bible v1.0.0. Footprints and anchors are inherited; new partitions, zone layouts and portal widths are authored here.',650,16)
    d.para(840,919,'Exterior lands remain unassigned. Existing Expedition courses keep their layouts until connection sheets establish where they join this world.',650,16)
    d.finish()

sheet_master();sheet_east()
for n in range(1,17):area_sheet(n)
sheet_crossings();sheet_systems();sheet_growth();PDF.save()

# Stable additive manifest: everything needed to place area scenes without reinterpretation.
model={'title':'MADGER Burrow Blueprint Atlas','blueprint_version':'1.0.0','issue':'01','date':'2026-10-20','world_id':D['geography']['world_id'],'base_canon_version':D['version'],'source_canon_sha256':hashlib.sha256((ROOT/'canon/MADGER_World_Bible.json').read_bytes()).hexdigest(),'status':'Authored production design under owner instruction. Geometry inherited from canon is immutable; local detail is additive. Not a real-world construction specification.','coordinates':D['geography'],'areas':SPECS,'route_graph':D['routes'],'route_graph_policy':'Canonical route graph expresses destinations and topology. It is not an indoor collision mesh. Authored portals govern wall openings; final walkable paths must approach them without penetrating solid walls.','crossings':D['crossings'],'water':D['water'],'reserved_expansion':D['expansion']['reserved'],'sheets':PAGES,'engine_mapping':D['game_contract']['mapping'],'design_exceptions':[{'area':'BRW-15','rule':'Service Walk footprint and relay cabinet are disjoint components. Cabinet stays at (282,-8.5,1.2), on BRW-14 south wall. Route through gate_mouth, never through wall.'},{'area':'BRW-03','rule':'Residential bands show allocation, not an exhaustive dwelling inventory. Existing ramp anchors extend beyond the neighborhood planning footprint.'},{'area':'BRW-06','rule':'Wheel shown on east wall. Race interface routing and hardware require a future mechanism sheet; do not shift wall or race.'}]}
(OUT/'MADGER_Blueprint_Data.json').write_text(json.dumps(model,indent=2)+'\n')

# Verification is deliberately limited to the guarantees made by this drawing issue.
checks={}
checks['all_16_areas_present']=len(SPECS)==16
checks['all_world_anchors_and_footprints_unchanged']=all(SPECS[l['id']]['world_anchor_m']==l['position_m'] and SPECS[l['id']]['footprint_m']==l['footprint_m'] for l in D['locations'])
checks['route_graph_preserved']=model['route_graph']==D['routes']
checks['exactly_three_canal_crossings']=len(model['crossings'])==3
checks['fixed_crossing_positions_preserved']=model['crossings']==D['crossings']
checks['watercourse_preserved']=model['water']==D['water']
checks['unique_portal_ids']=len({p['id'] for s in SPECS.values() for p in s['portals']})==sum(len(s['portals']) for s in SPECS.values())
checks['all_drawings_registered']=len(PAGES)==21 and len({p['sheet'] for p in PAGES})==21
graph={k:set() for k in D['nodes']}
for r in D['routes']:
    if r['id']=='bridge_w__bridge_e':continue
    graph[r['a']].add(r['b']);graph[r['b']].add(r['a'])
seen={'sunwell'};todo=['sunwell']
while todo:
    for b in graph[todo.pop()]:
        if b not in seen:seen.add(b);todo.append(b)
checks['gate_accessible_with_east_bridge_closed']='gate_inner' in seen
checks['relay_reached_via_west_mouth']=any(r['a']=='relay_walk' and r['b']=='gate_mouth' for r in D['routes']) and any(r['a']=='gate_mouth' and r['b']=='relay_cabinet' for r in D['routes'])
assert all(checks.values()),checks
(OUT/'validation.json').write_text(json.dumps({'status':'passed','checks':checks,'limits':['Route graph validation is topological; final game collision and walkable surface meshes are not delivered here.','Door dimensions and internal zoning are production-design additions, not independently approved prior canon.','Private residential rooms, exterior lands and utility branch engineering remain unassigned.']},indent=2)+'\n')

doc=fitz.open(OUT/'MADGER_Burrow_Blueprints.pdf')
for i,p in enumerate(doc):
    pix=p.get_pixmap(matrix=fitz.Matrix(1.35,1.35),alpha=False)
    pix.save(OUT/'previews'/f'{PAGES[i]["sheet"]}.png')
thumbs=[]
for p in PAGES:
    im=Image.open(OUT/'previews'/f'{p["sheet"]}.png').convert('RGB');im.thumbnail((500,354))
    thumb=Image.new('RGB',(530,396),BG);thumb.paste(im,((530-im.width)//2,12))
    dr=ImageDraw.Draw(thumb);dr.text((16,374),p['sheet']+'  '+p['title'],fill=WHITE)
    thumbs.append(thumb)
contact=Image.new('RGB',(530*3,396*7),BG)
for i,t in enumerate(thumbs):contact.paste(t,((i%3)*530,(i//3)*396))
contact.save(OUT/'MADGER_Blueprint_Overview.jpg',quality=92)
print(json.dumps({'pages':len(doc),'checks':checks,'pdf_bytes':(OUT/'MADGER_Burrow_Blueprints.pdf').stat().st_size},indent=2))
