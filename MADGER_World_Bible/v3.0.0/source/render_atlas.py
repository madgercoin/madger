import json,math,re,html,textwrap,os,io
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4,landscape,A3
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak,Table,TableStyle,Image,Flowable,KeepTogether
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT
import fitz
from PIL import Image as PILImage
from pypdf import PdfReader,PdfWriter
R=Path(__file__).parent;P=R/'output';A=R/'art';PL=R/'plans';PL.mkdir(exist_ok=True);(P/'cards').mkdir(exist_ok=True)
w=json.loads((P/'World_Atlas.json').read_text());g=json.loads((P/'Blueprint_Data.json').read_text());b=json.loads((R/'source/Burrow_v2.1.json').read_text())
for name,path in [('Body','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'),('Bold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'),('Display','/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf')]:pdfmetrics.registerFont(TTFont(name,path))
INK='#203B3A';ACC='#A66C3A';PALE='#F4F0E5';GREEN='#5D7E75';BLUE='#A6C8D1'
styles=getSampleStyleSheet();styles.add(ParagraphStyle('BodyA',fontName='Body',fontSize=9.5,leading=14,textColor=colors.HexColor(INK),spaceAfter=8));styles.add(ParagraphStyle('TitleA',fontName='Display',fontSize=28,leading=33,textColor=colors.HexColor(INK),spaceAfter=18));styles.add(ParagraphStyle('H1A',fontName='Bold',fontSize=18,leading=23,textColor=colors.HexColor(INK),spaceBefore=8,spaceAfter=12,keepWithNext=True));styles.add(ParagraphStyle('H2A',fontName='Bold',fontSize=11,leading=15,textColor=colors.HexColor(ACC),spaceBefore=6,spaceAfter=5,keepWithNext=True));styles.add(ParagraphStyle('SmallA',fontName='Body',fontSize=8,leading=11,textColor=colors.HexColor(INK),spaceAfter=6));styles.add(ParagraphStyle('Kicker',fontName='Bold',fontSize=9,leading=14,textColor=colors.HexColor(ACC),spaceAfter=10))
def clean(s):return str(s).replace('—','-').replace('–','-').replace('‑','-')
def p(s,style='BodyA'):return Paragraph(html.escape(clean(s)),styles[style])
def field(label,text):return [p(label,'H2A'),p(text)]
def footer(c,doc):
 W,H=doc.pagesize;c.setStrokeColor(colors.HexColor('#D7CEC0'));c.line(40,37,W-40,37);c.setFont('Body',7);c.setFillColor(colors.HexColor(INK));c.drawString(40,24,'MADGER / OPEN WAYS ATLAS / 3.0');c.drawRightString(W-40,24,str(doc.page))
def doc(path,flow,pagesize=A4):
 buffer=io.BytesIO()
 SimpleDocTemplate(buffer,pagesize=pagesize,rightMargin=42,leftMargin=42,topMargin=42,bottomMargin=49,title=path.stem.replace('_',' '),author='MADGER World Development').build(flow,onFirstPage=footer,onLaterPages=footer)
 tmp=path.with_suffix('.ready');tmp.write_bytes(buffer.getvalue());os.replace(tmp,path)
def fitimg(path,W=510,H=400):
 im=PILImage.open(path);s=min(W/im.width,H/im.height);return Image(str(path),width=im.width*s,height=im.height*s)
class Panel(Flowable):
 def __init__(self,path,col,row,nc,nr,W=164,H=260):
  super().__init__();self.path=str(path);im=PILImage.open(path);self.iw,self.ih=im.size;self.col=col;self.row=row;self.nc=nc;self.nr=nr;pw=self.iw/nc;ph=self.ih/nr;s=min(W/pw,H/ph);self.width=pw*s;self.height=ph*s;self.scale=s
 def draw(self):
  c=self.canv;c.saveState();path=c.beginPath();path.rect(0,0,self.width,self.height);c.clipPath(path,stroke=0);c.drawImage(self.path,-self.col*self.width,-(self.nr-1-self.row)*self.height,width=self.iw*self.scale,height=self.ih*self.scale,mask='auto');c.restoreState()
def title(k,t,lead):return [p(k,'Kicker'),p(t,'TitleA'),p(lead),Spacer(1,12)]
def textlines(svg,x,y,t,width=44,size=15,color=INK,leading=21):
 for ln in textwrap.wrap(clean(t),width):svg.append(f'<text x="{x}" y="{y}" font-family="DejaVu Sans,sans-serif" font-size="{size}" fill="{color}">{html.escape(ln)}</text>');y+=leading
 return y
def startsvg(id,name,sub):
 s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="840" viewBox="0 0 1200 840"><rect width="1200" height="840" fill="{PALE}"/><rect x="25" y="25" width="1150" height="790" fill="none" stroke="{INK}" stroke-width="1"/>',f'<text x="50" y="61" font-family="DejaVu Sans" font-size="14" fill="{ACC}">MADGER / {id} / EDITION 3.0</text>',f'<text x="50" y="98" font-family="DejaVu Sans" font-size="29" fill="{INK}">{html.escape(name)}</text>'];textlines(s,50,123,sub,110,13,leading=18);return s
def finishsvg(id,s):
 s.append(f'<text x="50" y="797" font-family="DejaVu Sans" font-size="12" fill="{INK}">Fictional production blueprint • Units: metres unless labelled • JSON controls geometry</text></svg>');path=PL/(id+'.svg');path.write_text(''.join(s));return path
def mapper(bounds,box=(55,165,780,570)):
 xmin,ymin,xmax,ymax=bounds;bx,by,bw,bh=box;sc=min(bw/(xmax-xmin),bh/(ymax-ymin));ox=bx+(bw-(xmax-xmin)*sc)/2;oy=by+(bh-(ymax-ymin)*sc)/2
 return lambda x,y:(ox+(x-xmin)*sc,oy+(ymax-y)*sc),sc
def rect(s,T,x,y,W,D,fill=BLUE,label=None,fs=11,stroke=INK):
 a,bb=T(x,y+D);u,v=T(x+W,y);s.append(f'<rect x="{a:.2f}" y="{bb:.2f}" width="{u-a:.2f}" height="{v-bb:.2f}" fill="{fill}" stroke="{stroke}" stroke-width="1"/>')
 if label:s.append(f'<text x="{(a+u)/2:.2f}" y="{(bb+v)/2+fs*.35:.2f}" text-anchor="middle" font-family="DejaVu Sans" font-size="{fs}" fill="{INK}">{html.escape(label)}</text>')
def line(s,T,pts,col=INK,sw=2,dash=''):
 q=' '.join(f'{T(x,y)[0]:.2f},{T(x,y)[1]:.2f}' for x,y,*z in pts);s.append(f'<polyline points="{q}" fill="none" stroke="{col}" stroke-width="{sw}" stroke-dasharray="{dash}"/>')
def dim(s,T,a,bb,label):
 line(s,T,[a,bb],ACC,1);x,y=T(*a);xx,yy=T(*bb);s.append(f'<text x="{(x+xx)/2}" y="{(y+yy)/2-6}" text-anchor="middle" font-family="DejaVu Sans" font-size="13" fill="{ACC}">{html.escape(label)}</text>')
def grid(s,T,bounds,step):
 x0,y0,x1,y1=bounds
 for x in range(math.ceil(x0/step)*step,math.floor(x1/step)*step+1,step):line(s,T,[(x,y0),(x,y1)],'#D9DFD8',.6)
 for y in range(math.ceil(y0/step)*step,math.floor(y1/step)*step+1,step):line(s,T,[(x0,y),(x1,y)],'#D9DFD8',.6)
def north(s):s.append(f'<path d="M810 210 L810 165 L803 179 M810 165 L817 179" fill="none" stroke="{INK}" stroke-width="2"/><text x="810" y="156" text-anchor="middle" font-family="DejaVu Sans" font-size="14">N</text>')
def blueprint_floor(m,id,name,rooms=None):
 rooms=rooms or m['rooms'];W=m.get('width_m',24);D=m.get('depth_m',18);s=startsvg(id,name,f'{W} x {D} m footprint / {m.get("levels",1)} level(s) / {m.get("module",m.get("id"))}');T,sc=mapper((-2,-3,W+2,D+3),(55,170,620,390));grid(s,T,(-2,-3,W+2,D+3),2)
 for r in rooms:rect(s,T,r['x'],r['y'],r['w'],r['d'],'#E1E9DD' if any(z in r['name'].lower() for z in ['passage','gallery','aisle']) else '#D6E3E6',r['name'],10)
 floor=m.get('floors',[{}])[0]
 for d in floor.get('internal_doors',[]):
  x,y=d['center_m'];a=d['width_m']/2
  line(s,T,[(x-a,y),(x+a,y)] if d['orientation']=='H' else [(x,y-a),(x,y+a)],PALE,5)
 for door in [m.get('entry',{'side':'S','offset_m':0,'width_m':2.4}),m.get('secondary_exit',{'side':'N','offset_m':0,'width_m':1.8})]:
  side=door['side'];off=door['offset_m'];a=door['width_m']/2
  if side in ('S','N'):
   x=W/2+off;y=0 if side=='S' else D;line(s,T,[(x-a,y),(x+a,y)],PALE,6);line(s,T,[(x,y),(x,y+(-1 if side=='S' else 1))],ACC,2)
  else:x=0 if side=='W' else W;y=D/2+off;line(s,T,[(x,y-a),(x,y+a)],PALE,6)
 dim(s,T,(0,-1.6),(W,-1.6),f'{W} m');dim(s,T,(-1.1,0),(-1.1,D),f'{D} m')
 textlines(s,720,182,'PLAN / south entry; north is up. Openings are marked in walls.',39,14)
 y=textlines(s,720,255,m.get('notes','Module room allocations retained.'),43,14,leading=20)
 y=textlines(s,720,y+20,m.get('special','Nominal wall-center dimensions; 0.25 m partitions. Upper levels repeat unless the floor schedule states a variant.'),43,14,leading=20)
 ev=m.get('front_elevation',{'wall_height_m':3.2,'ridge_height_m':5.5,'window_bays':4,'entry_width_m':2.4});hh=ev['wall_height_m'];rh=ev['ridge_height_m'];Te,se=mapper((-2,-1,W+2,rh+1),(80,590,550,155));rect(s,Te,0,0,W,hh,'#D4D6CD');line(s,Te,[(0,hh),(W/2,rh),(W,hh)],INK,2)
 for i in range(m.get('levels',1)):
  for j in range(ev['window_bays']):rect(s,Te,1+j*(W-2)/ev['window_bays'],i*3.2+1,1.3,1.2,'#A6C8D1')
 ex=W/2+m.get('entry',{}).get('offset_m',0);rect(s,Te,ex-ev['entry_width_m']/2,0,ev['entry_width_m'],2.6,'#6B7E77')
 textlines(s,720,670,f'FRONT ELEVATION / eaves {hh:.1f} m; ridge {rh:.1f} m. Regional cladding may change; footprint does not.',43,14)
 return finishsvg(id,s)

allplans=[]
# Regional map, coordinates and route lengths share the source data.
s=startsvg('MAP-00','The Open Ways','Regional map / kilometres east and north of the Burrow / sea and sky routes are not ground roads');T,sc=mapper((-220,-210,290,300),(55,155,820,610));grid(s,T,(-220,-210,290,300),50)
coords={x['id']:x['position_km'] for x in w['communities']};coords.update({x['id']:[x['x'],x['y']] for x in w['sites']})
for e in w['routes']:line(s,T,[coords[e['a']],coords[e['b']]],'#6C9CA4' if e['mode'] in ['sky','river','boat'] else '#AD916F',2,'6 4' if e['mode']=='sky' else '')
offset={'BRW':(10,15),'EXT-02':(-85,18),'EXT-13':(12,-14),'EXT-10':(-80,-12),'EXT-07':(-90,-12),'EXT-08':(10,20),'EXT-11':(10,0)}
for c in w['communities']:
 x,y=T(*c['position_km']);s.append(f'<circle cx="{x}" cy="{y}" r="5" fill="{INK}"/>');dx,dy=offset.get(c['id'],(10,-8));textlines(s,x+dx,y+dy,c['name'],26,13,leading=16)
for site in w['sites']:
 x,y=T(site['x'],site['y']);s.append(f'<path d="M{x} {y-4} L{x+4} {y+4} L{x-4} {y+4} Z" fill="{ACC}"/>')
y=185
for reg in w['regions']:y=textlines(s,900,y,reg['id']+' '+reg['name'],26,13,leading=18)+12
textlines(s,900,530,'Solid routes: ground or river. Dashed routes: scheduled sky passage. Hollow Sea is 1,600 m below datum; its symbol is a projected position, not a surface city.',27,12,leading=18)
dim(s,T,(-200,-185),(-100,-185),'100 km');allplans.append(finishsvg('MAP-00',s))
for city in g['settlements']:
 s=startsvg(city['id'],city['name']+' / settlement plan',f'Local surveyed grid / population {city["population"]:,} / residential capacity {city["residential_capacity"]:,}');T,sc=mapper(city['bounds_m']);grid(s,T,city['bounds_m'],100);north(s)
 for d in city['districts']:
  x,y,z=d['center_m'];ww,dd=d['size_m'];rect(s,T,x-ww/2,y-dd/2,ww,dd,'#E6E4D9');xx,yy=T(x,y+dd/2-12);s.append(f'<text x="{xx}" y="{yy}" text-anchor="middle" font-family="DejaVu Sans" font-size="10" fill="{INK}">{d["id"]} / z {z}m</text>')
 for route in city['routes']:line(s,T,route['points_m'],'#B09B79',3)
 for inst in [x for x in g['building_instances'] if x['settlement']==city['id']]:
  x,y,z=inst['center_m'];ww=inst['width_m'];dd=inst['depth_m'];lab=inst['id'].replace(city['id']+'-','');rect(s,T,x-ww/2,y-dd/2,ww,dd,'#B8CEBF' if '-H' in inst['id'] else '#A6C8D1',lab,5.4)
 y=183
 for it in city['signature_buildings']:y=textlines(s,875,y,it['id']+' '+it['name']+(' / offsite' if it.get('offsite') else ''),31,14,leading=20)+14
 y=textlines(s,875,y+5,city['environment'],31,13,leading=19)
 textlines(s,875,min(y+15,610),f'Materials: {city["materials"]}. Roofs: {city["roof"]}. Motif: {city["motif"]}.',31,13,leading=19)
 dim(s,T,(-600,-500),(-400,-500),'200 m');allplans.append(finishsvg(city['id'],s))
for m in g['modules']:
 allplans.append(blueprint_floor(m,m['id'],m['name']))
 if m['id'] in ['MOD-03','MOD-06','MOD-10']:
  x={**m,'floors':[m['floors'][1]],'notes':'Upper floor variant. Stair positions remain aligned with the ground floor.','special':'Use this room allocation at level 1, z=3.2 m. Floor plate dimensions remain unchanged.'};allplans.append(blueprint_floor(x,m['id']+'-L1',m['name']+' / upper floor',m['floors'][1]['rooms']))
for item in g['signature_building_plans']:allplans.append(blueprint_floor(item,item['id'],item['name']))
for site in g['encounter_plans']:
 s=startsvg(site['id'],site['name'],site['hazard']);W,D=site['width_m'],site['depth_m'];T,sc=mapper((-W/2-5,-D/2-5,W/2+5,D/2+5));grid(s,T,(-W/2,-D/2,W/2,D/2),10)
 for zone in site['zones']:rect(s,T,*zone['box'],'#DFE5D7')
 # Distinct mapped hazards inside the encounter field.
 sid=site['id'];hazcolors={'SITE-01':'#A6C8D1','SITE-02':'#798E7E','SITE-03':'#D9C9AF','SITE-04':'#A6C8D1','SITE-05':'#C6CED3','SITE-06':'#C7DFE6','SITE-07':'#B5A08D','SITE-08':'#7BA8B7'}
 rect(s,T,-W*.2,-D*.32,W*.4,D*.43,hazcolors[sid],{'SITE-01':'RIVER / ford','SITE-02':'RAVINE / root spans','SITE-03':'BURIED LENS','SITE-04':'TIDAL HALL','SITE-05':'WINCH DECK','SITE-06':'CUT COUPLING','SITE-07':'FREIGHT / heat trench','SITE-08':'DEEP CHANNEL'}[sid],11)
 line(s,T,site['route_points_m'],ACC,3,'6 4' if sid in ['SITE-04','SITE-08'] else '')
 rf=site['refuge'];x,y,z=rf['center_m'];rect(s,T,x-rf['width_m']/2,y-rf['depth_m']/2,rf['width_m'],rf['depth_m'],'#B8CEBF','REFUGE',10)
 textlines(s,870,190,site['notes'],32,14,leading=21);textlines(s,870,380,'Reference path shown in ochre. A path through a hazard is conditional, not a promise of safe access. The scene state must record water, wind, closure or occupancy before action.',32,13,leading=20);dim(s,T,(-W/2,-D/2-3),(W/2,-D/2-3),f'{W} m');allplans.append(finishsvg(site['id'],s))
 # The offshore archive and freight stronghold get actual interior plans as well.
 if sid in ['SITE-04','SITE-07']:
  m=next(v for v in g['modules'] if v['id']==('MOD-10' if sid=='SITE-04' else 'MOD-11'));allplans.append(blueprint_floor(m,sid+'-B01',site['name']+' / interior shell'))

# Exact inherited Burrow overview and underground levels, preserving source footprints.
s=startsvg('BRW-MASTER','The Burrow / inherited surface','Existing v2.1 geometry / 800 surface + 1,600 underground planning residents');T,sc=mapper((-310,-230,310,230));grid(s,T,(-300,-220,300,220),50)
for loc in b['locations']:
 x,y,z=loc['position_m'];ww,dd=loc['footprint_m'];rect(s,T,x-ww/2,y-dd/2,ww,dd,'#CFDBC9',loc['id'],9)
for route in b['routes']:line(s,T,route['points_m'],'#A79068',1.5)
line(s,T,b['water']['utility_race_centerline_m'],BLUE,4)
textlines(s,875,185,'Origin: Sunwell. East public gate, west workshops, north gardens, south homes. The source JSON, original 21-sheet surface atlas and 28-sheet underground atlas retain their detailed authority.',31,14,leading=21);dim(s,T,(-250,-200),(-150,-200),'100 m');allplans.append(finishsvg('BRW-MASTER',s))
for level in [-12,-24,-36]:
 s=startsvg(f'BRW-Z{abs(level)}',f'The Burrow / level {level} m','Inherited occupied/service allocations; no new routes or hidden access');T,sc=mapper((-310,-230,310,230));grid(s,T,(-300,-220,300,220),50)
 for loc in b['underground']['areas']:
  pos=loc['position_m'];x,y,z=pos
  if z==level:
   ww,dd=loc['footprint_m'];rect(s,T,x-ww/2,y-dd/2,ww,dd,'#CDD9D9',loc['id'],11)
 textlines(s,875,185,'This overview preserves the registered footprints. Stair/ramp connections and room subdivisions remain in the inherited detailed blueprint atlas. Occupied levels -12 and -24 m; service level -36 m.',31,14,leading=21);allplans.append(finishsvg(f'BRW-Z{abs(level)}',s))

# Save a single navigable vector gallery without a ZIP.
entries=[{'id':path.stem,'file':path.name} for path in allplans];(P/'Blueprint_Index.json').write_text(json.dumps(entries,indent=2))
htmlparts=['<!doctype html><html><meta charset="utf-8"><title>MADGER Blueprint Gallery</title><style>body{margin:0;background:#eee9db;color:#203b3a;font:16px system-ui}header{padding:20px;position:sticky;top:0;background:#203b3a;color:white}select{padding:10px;margin-left:20px}section{display:none;margin:16px auto;max-width:1200px}section.active{display:block}svg{width:100%;height:auto}</style><header>MADGER / Blueprint Gallery <select id="pick">']
for i,path in enumerate(allplans):htmlparts.append(f'<option value="p{i}">{path.stem}</option>')
htmlparts.append('</select></header>')
for i,path in enumerate(allplans):htmlparts.append(f'<section id="p{i}" class="'+('active' if i==0 else '')+'">'+path.read_text()+'</section>')
htmlparts.append('<script>document.querySelector("#pick").onchange=e=>{document.querySelectorAll("section").forEach(s=>s.classList.toggle("active",s.id===e.target.value))}</script></html>');(P/'MADGER_Blueprint_Gallery.html').write_text(''.join(htmlparts))
# Blueprint PDF is fully vector and preserves exact measured sheets.
bluebook=fitz.open()
for path in allplans:
 source=fitz.open(str(path));part=fitz.open('pdf',source.convert_to_pdf());bluebook.insert_pdf(part)
bluebook.save(str(P/'MADGER_Blueprint_Atlas.pdf'))

# World volume.
flow=title('VOLUME 01 / WORLD ATLAS','A world beyond the Burrow','Eight regions, fourteen principal communities and centuries of history. A shared foundation for animation, games, comics and future adventures.');flow+=[fitimg(A/'ART-01_Regions.png',510,400),Spacer(1,16),p(w['scope']),p('20 October 2026 / Development edition 3.0','SmallA'),PageBreak()]
flow+=title('READING THIS ATLAS','What governs the world',w['authority'])
for k,v in w['coordinates'].items():flow+=field(k.title(),v)
flow+=field('Replication rule',w['production_contract']['images']);flow+=[PageBreak()]
for i in range(0,len(w['everyday_world']),4):
 flow+=title('LIFE BETWEEN ADVENTURES','People, work and belonging' if i==0 else 'Belief, law and continuity','The world continues when the heroes are absent.')
 for x in w['everyday_world'][i:i+4]:flow+=field(x['topic'],x['text'])
 flow+=[PageBreak()]
flow+=title('REGIONAL GEOGRAPHY','Routes create distance','The measured regional map and travel table prevent journeys from becoming convenient teleports.');flow+=[fitimg(A/'ART-02_Towns.png',510,400),p('Stonewake, Latchford, Millmere, Willowmere, Cinder Cuts and Underhall. Art establishes materials and atmosphere; plans establish position.','SmallA'),PageBreak()]
for ri,reg in enumerate(w['regions']):
 flow+=title(reg['id'],reg['name'],reg['environment'])
 panel=Panel(A/'ART-01_Regions.png',ri%4,ri//4,4,2,W=176,H=235)
 side=field('Culture',reg['culture'])+field('Travel rule',reg['travel_rule'])
 t=Table([[panel,side]],colWidths=[190,321]);t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0)]));flow+=[t,Spacer(1,12)]
 for key in ['stories','creatures']:flow+=field(key.replace('_',' ').title(),reg[key])
 towns=[x['name'] for x in w['communities'] if x['region']==reg['id']];flow+=field('Principal communities',', '.join(towns));flow+=[PageBreak()]
city_art=[('ART-02_Towns.png',2,1,3,2),('ART-01_Regions.png',0,0,4,2),('ART-02_Towns.png',0,0,3,2),('ART-02_Towns.png',1,0,3,2),('ART-02_Towns.png',2,0,3,2),('ART-02_Towns.png',0,1,3,2),('ART-02_Towns.png',1,1,3,2),('ART-01_Regions.png',1,0,4,2),('ART-01_Regions.png',2,0,4,2),('ART-01_Regions.png',3,0,4,2),('ART-01_Regions.png',0,1,4,2),('ART-01_Regions.png',1,1,4,2),('ART-01_Regions.png',2,1,4,2),('ART-01_Regions.png',3,1,4,2)]
for ci,city in enumerate(w['communities']):
 flow+=title(city['id']+' / COMMUNITY',city['name'],city['appearance']);flow+=[p(f'Region {city["region"]} | regional position {city["position_km"]} km | datum {city["datum_z_m"]} m | planning residents {city["population"]:,}','SmallA')]
 art=city_art[ci];panel=Panel(A/art[0],*art[1:],W=174,H=184);side=field('History',city['history'])+field('Government',city['government'])
 t=Table([[panel,side]],colWidths=[190,321]);t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0)]));flow+=[t,Spacer(1,8)]
 for key in ['economy','custom','safe','danger','conflict']:flow+=field(key.title(),city[key])
 flow+=[PageBreak()]
flow+=title('MATERIAL HISTORY','The long road to the pilot','Objective history is separated from rumor and the later order in which viewers discover it.')
for ev in w['history']:flow+=field(f'Year {ev["year"]}: {ev["event"]}',ev['truth'])
flow+=[PageBreak()]
flow+=title('THE BURROW / CONSTRUCTION','A town built by many hands','The existing geometry remains fixed. New history explains its development without adding secret passageways.')
for x in w['burrow_construction']:flow+=field(x['phase'],x['work'])
flow+=[PageBreak()]
flow+=title('WAYCRAFT','Wonder with consequences','Local materials, ecology and learned practice create different possibilities in each region.')
for x in w['waycraft']:flow+=field(x['name'],x['rule']+' '+x['cost'])
flow+=[PageBreak()]
flow+=title('FIELD GUIDE','Creatures of the Open Ways','Danger, hunger, territorial behavior and deliberate cruelty are different things.');flow+=[fitimg(A/'ART-03_Bestiary.png',510,500),PageBreak()]
for i in range(0,len(w['creatures']),3):
 flow+=title('BESTIARY',f'Field records {i+1}-{i+3}','Representative adult sizes are staging envelopes; the visual plate is not at a common scale.')
 for cr in w['creatures'][i:i+3]:
  flow+=field(cr['id']+' / '+cr['name'],cr['look']);flow+=[p(cr['ecology']+' '+cr['limit']+' '+cr['encounter']),p('Size: '+str(cr['envelope_m']),'SmallA')]
 flow+=[PageBreak()]
flow+=title('TRAVEL REGISTER','A journey takes time','Listed days are ordinary planning baselines. Weather, injury, investigation and local closures add time.')
for e in w['routes']:flow+=field(e['id']+' / '+e['a']+' to '+e['b'],f'{e["mode"]}; {e["length_km"]} km; {e["days"]} days. '+e['conditions'])
flow+=[PageBreak()]
flow+=title('ARCHITECTURE / MODULE KIT','Buildings with a shared grammar','Twelve reusable architectural families support the measured building modules. These appearance studies guide materials and atmosphere; the vector plans and coordinates control dimensions.')
flow+=[fitimg(A/'ART-04_Architecture.png',510,570),p('Pair each numbered building family with its MOD blueprint. Local roofs, materials and terrain adapt the kit to each community; do not trace incidental image geometry.','SmallA')]
doc(P/'MADGER_World_Atlas.pdf',flow)

# Individual character cards, with actual generated character panels clipped only for document layout.
saved_card_styles={name:{k:getattr(styles[name],k) for k in ['fontSize','leading','spaceBefore','spaceAfter']} for name in ['BodyA','H2A','TitleA','SmallA']}
styles['BodyA'].fontSize=9;styles['BodyA'].leading=12;styles['BodyA'].spaceAfter=5
styles['H2A'].fontSize=10;styles['H2A'].leading=13;styles['H2A'].spaceBefore=5;styles['H2A'].spaceAfter=3
styles['TitleA'].fontSize=24;styles['TitleA'].leading=28;styles['TitleA'].spaceAfter=10
styles['SmallA'].fontSize=7.7;styles['SmallA'].leading=10.5;styles['SmallA'].spaceAfter=4
cardfiles=[]
for n,ch in enumerate(w['characters']):
 ar=ch['art'];panel=Panel(A/ar['file'],ar['column'],ar['row'],*ar['grid'],W=172,H=205)
 head=[p(ch['identity'],'SmallA'),p(f'Age {ch["age"]} | staging height {ch["height_m"]:.2f} m','SmallA'),p('Origin: '+ch['origin'],'SmallA'),p('Affiliation: '+ch['affiliation'],'SmallA'),p('Desire','H2A'),p(ch['desire']),p('Contradiction','H2A'),p(ch['contradiction'])]
 table=Table([[panel,head]],colWidths=[185,326]);table.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),10)]))
 cf=[p(f'CHARACTER {n+1:03d} / {ch["id"]}','Kicker'),p(ch['name'],'TitleA'),table,Spacer(1,8)]
 for label,key in [('History','history'),('Relationships','relationships'),('Character arc','arc'),('Stories this character can carry','story_engine'),('Writer-only truth','writer_truth'),('Performance and voice','voice')]:cf+=field(label,ch[key])
 cf+=[p('Visual continuity: '+ch['design'],'SmallA')]
 path=P/'cards'/f'{n+1:03d}_{ch["id"]}.pdf';doc(path,cf);cardfiles.append(path)
coverflow=title('VOLUME 02 / CHARACTER BIBLE','Forty lives, many loyalties','Every named character has a history, desire, contradiction, relationships, a developing arc and reusable story possibilities.');coverflow+=[fitimg(A/'HEROES-01.png',510,360),p('Hero model-sheet adaptation retains established identities and latest corrections. New supporting designs are authored for this edition. No new voices have been generated.'),PageBreak()]
for i in range(6):coverflow+=[p('CAST PLATE '+str(i+1),'Kicker'),fitimg(A/f'CAST-{i+1:02d}.png',510,660),PageBreak()]
doc(R/'qa/character_front.pdf',coverflow[:-1]);writer=fitz.open()
for path in [R/'qa/character_front.pdf']+cardfiles:
 with fitz.open(path) as card:writer.insert_pdf(card)
writer.save(P/'character_compilation.ready',garbage=4,deflate=True);writer.close()
os.replace(P/'character_compilation.ready',P/'MADGER_Character_Bible.pdf')

# Story and faction volume.
for name,settings in saved_card_styles.items():
 for k,v in settings.items():setattr(styles[name],k,v)
flow=title('VOLUME 04 / STORIES & FACTIONS','The choices that change a world','Four ten-episode season outlines, twelve standalone stories, faction relationships and a ledger of planted revelations. These are developed outlines, not completed animation scripts.');flow+=[fitimg(A/'ART-01_Regions.png',510,340),PageBreak()]
for fac in w['factions']:
 flow+=title(fac['id'],fac['name'],fac['alignment']+' / '+fac['home'])
 for key in ['purpose','leadership','methods','tension','ties']:flow+=field(key.title(),fac[key])
 flow+=field('Named members',', '.join(next(c['name'] for c in w['characters'] if c['id']==id) for id in fac['members']));flow+=[PageBreak()]
for season in w['seasons']:
 flow+=title('SEASON '+str(season['number']),season['title'],season['question'])
 for e in season['episodes']:flow+=field(e['number']+' / '+e['title'],e['setting']+'. '+e['plot']+' Character turn: '+e['character_turn'])
 flow+=field('Season resolution',season['ending']);flow+=[PageBreak()]
flow+=title('STANDALONE STORIES','Life between the crises','Comedy, family, craft, wonder and ordinary disagreement keep the world from becoming one continuous alarm.')
for si,st in enumerate(w['standalone_stories']):
 if si==6:flow+=[PageBreak()];flow+=title('STANDALONE STORIES','More lives beyond the main quest','Each story resolves a local question and leaves a useful relationship change.')
 flow+=field(st['title']+' / '+st['cast'],st['plot'])
flow+=[PageBreak()];flow+=title('WRITER-ONLY LEDGER','Plant, proof and consequence','A revelation must change a choice, not merely add a surprising fact.')
for rev in w['reveal_ledger']:
 flow+=field(rev['truth'],'Plant: '+rev['plant']+' Proof: '+rev['proof']+' Payoff: '+rev['payoff']+' Reveal: '+rev['audience'])
flow+=[PageBreak()]
for scene in w.get('setpieces',[]):
 flow+=title('ACTION SEQUENCE / '+scene['setting'],scene['title'],scene['setup'])
 flow+=field('Action and choice',scene['action']);flow+=field('Lasting result',scene['lasting_result']);flow+=[PageBreak()]
flow+=title('PRODUCTION CONTRACT','Keep the world recognizable','Use these rules when turning an outline into a scene, background, animation shot or game area.')
for key,val in w['production_contract'].items():
 if isinstance(val,str):flow+=field(key.replace('_',' ').title(),val)
doc(P/'MADGER_Stories_and_Factions.pdf',flow)

# Merge repeated embedded art and font streams for practical preview sizes.
for pdf in list(P.glob('*.pdf'))+list((P/'cards').glob('*.pdf')):
 source=fitz.open(pdf);tmp=pdf.with_suffix('.optimized.pdf');source.save(tmp,garbage=4,deflate=True);source.close();tmp.replace(pdf)

# Editable narrative mirrors for GitHub and portable authoring; existing repository conventions use Markdown.
for filename,records in [('CHARACTERS.md',w['characters']),('COMMUNITIES.md',w['communities']),('FACTIONS.md',w['factions'])]:
 parts=['# MADGER '+filename.replace('.md','').title(),'Development edition 3.0.0']
 for item in records:
  parts+=['\n## '+item['id']+' - '+item['name']]
  for k,v in item.items():
   if k not in ['id','name','full_card','performance'] and isinstance(v,(str,int,float)):parts+=['\n**'+k.replace('_',' ').title()+'**: '+str(v)]
 (P/filename).write_text('\n'.join(parts)+'\n')
print(json.dumps({'blueprint_sheets':len(allplans),'character_cards':len(cardfiles),'volumes':{x.name:len(PdfReader(x).pages) for x in P.glob('*.pdf')}},indent=2))
