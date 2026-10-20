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
D=json.loads((ROOT/'output/MADGER_World_Bible.json').read_text())
W,H=1600,1131
BG='#091E31'; PANEL='#0D293F'; GRID='#16354A'; LINE='#A5D9E8'; WHITE='#E9F7FA'; MUTED='#82A9BA'; GREEN='#8DDFBD'; GOLD='#F1C378'; WATER='#56BEDD'; DIM='#648CA0'
for name,fn in [('Sans','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf'),('Mono','DejaVuSansMono.ttf')]:
    pdfmetrics.registerFont(TTFont(name,'/usr/share/fonts/truetype/dejavu/'+fn))

PDF=canvas.Canvas(str(OUT/'MADGER_Underground_Blueprints.pdf'),pagesize=(1190.551,841.890),pageCompression=1)
PDF.setTitle('MADGER World - Underground Blueprint Atlas / Issue 02')
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
        self.text(214,48,'WORLD DEVELOPMENT  /  ABOVE + BELOW',14,MUTED,'Mono')
        self.text(1546,48,code,21,GREEN,'Mono','right')
        self.text(54,91,title,32,WHITE,'Bold')
        self.text(54,121,sub,14,MUTED)
        self.line(38,1044,1562,1044,DIM,.8)
        self.text(54,1071,'UNDERGROUND BLUEPRINT ATLAS',15,WHITE,'Bold')
        self.text(54,1095,'Issue 02  |  20 OCT 2026  |  Canon v2.0.0',12,MUTED,'Mono')
        self.text(635,1071,'WORLD: MADGER-BRW-HOME',13,GREEN,'Mono')
        self.text(635,1095,'Metres  |  +X east  /  +Y north  /  +Z up',12,MUTED,'Mono')
        self.text(1546,1071,f'{len(PAGES)+1:02d} / 28',16,WHITE,'Mono','right')
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

