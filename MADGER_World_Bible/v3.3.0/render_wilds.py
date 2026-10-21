from pathlib import Path
import json,io,html,math
import fitz
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak


R=Path(__file__).parent;O=R/'output';D=json.loads((O/'Wilds_Bible.json').read_text());HAB=json.loads((O/'Habitat_Plans.json').read_text())['sites'];ST=json.loads((O/'Companion_Stories.json').read_text())
for n,f in [('Body','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf'),('Serif','DejaVuSerif.ttf')]:pdfmetrics.registerFont(TTFont(n,'/usr/share/fonts/truetype/dejavu/'+f))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='Bold',italic='Body',boldItalic='Bold')
W,H=595.276,841.89;M=43;CW=W-2*M;INK=HexColor('#173e3c');GOLD=HexColor('#967342');PAPER=HexColor('#fbf8ef')
S={k:ParagraphStyle(k,fontName=f,fontSize=z,leading=l,textColor=INK,spaceAfter=a) for k,f,z,l,a in [('body','Body',9.5,13.5,8),('small','Body',8.2,11.5,6),('head','Bold',10.3,14,6),('title','Bold',25,30,12),('quote','Serif',15,21,15),('story','Serif',10.4,15.8,9)]}
def para(c,t,x,y,w,st='body'):
 t=str(t).replace('—',' - ').replace('–','-').replace('‑','-')
 p=Paragraph(html.escape(t).replace('\n','<br/>'),S[st]);_,h=p.wrap(w,1200);p.drawOn(c,x,y-h);return y-h-S[st].spaceAfter

def base(c,num,label):
 c.setFillColor(PAPER);c.rect(0,0,W,H,fill=1,stroke=0);c.setFillColor(INK);c.setFont('Bold',8);c.drawString(M,H-32,'MADGER / WORLD BIBLE 3.3');c.setFont('Body',7);c.drawRightString(W-M,H-32,'21 OCTOBER 2026');c.setStrokeColor(HexColor('#cfbea0'));c.line(M,43,W-M,43);c.drawString(M,29,label);c.drawRightString(W-M,29,str(num))
def img(c,file,box,x,y,w,h):
 im=ImageReader(str(R/'art'/file));iw,ih=im.getSize();l,t,r,b=box;pw,ph=r-l,b-t;sc=min(w/pw,h/ph);dx=x+(w-pw*sc)/2-l*sc;dy=y+(h-ph*sc)/2-(ih-b)*sc
 c.saveState();p=c.beginPath();p.rect(x+(w-pw*sc)/2,y+(h-ph*sc)/2,pw*sc,ph*sc);c.clipPath(p,stroke=0);c.drawImage(im,dx,dy,iw*sc,ih*sc);c.restoreState()
def habimg(c,s,x,y,w,h):img(c,s['art']['file'],[0,0,1536,462] if s['art']['row']==0 else [0,480,1536,1024],x,y,w,h)
page=0;index={};buf=io.BytesIO();c=canvas.Canvas(buf,pagesize=(W,H));c.setTitle('MADGER - The Wilds Between');c.setAuthor('MADGER World Development')
def new(key):
 global page
 page+=1;index[key]=page;base(c,page,'THE WILDS BETWEEN / Writer reference')
def done(y=100):
 assert y>=55,(page,y)
 c.showPage()
new('Cover');y=para(c,'THE WILDS\nBETWEEN',M,773,CW,'title');y=para(c,'Life beyond the road. Choices beyond the map.',M,y,CW,'quote');img(c,'WILDS-01.png',[0,0,1536,1024],M,330,CW,290)
y=para(c,'THE OPEN WAYS / ECOLOGY & STORY COMPANION',M,305,CW,'head');y=para(c,D['moral'],M,y,CW,'quote');y=para(c,'Twelve creature cards · Eight regional ecologies · Four habitats\nTwo complete stories · Measured production blueprints',M,y,CW);y=para(c,'Additive edition 3.3. Existing history, hero designs and Burrow geometry remain controlling. Stories are authored options awaiting episode-ledger adoption.',M,y-9,CW,'small');done(y)
new('Navigation');y=para(c,'A living world, not a waiting room',M,776,CW,'title');y=para(c,'The creatures here eat, rest, reproduce and react. Communities make room for them imperfectly. An encounter changes a delivery, an income or a relationship even when nobody defeats anything.',M,y,CW,'quote')
for title,text in [('03-14 / Creature field cards','Each illustrated card preserves its original adult envelope and anatomy, then adds daily life, seasonal cues, community costs and usable performance directions.'),('15-18 / Regional ecology','Two regions per spread page: food webs, observation-based seasons, civic work and a source of conflict.'),('19-22 / Habitat encounters','Floodglass Ford, Walking Root Crossing, Buried Lens and Bellwater Narrows. Concept art establishes atmosphere; the companion blueprint volume establishes dimensions and circulation.'),('23-24 / Continuity and condition states','Rules for evidence, closures, anatomy and keeping the five-minute pilot inside the Burrow.'),('25 onward / Complete stories','What the River Carried and Enough of the Map. Neither story assigns a dated event, changes a season arc or licenses a new voice.'),('Authority and reproduction','3.0 atlas baselines remain intact; 3.1 places and 3.2 conflict layers remain active. 3.3 resolves the four habitat approaches inside unchanged boundaries. Bestiary art is not a common-scale anatomical turnaround; partially hidden limbs must be reconstructed from the written counts, never guessed.')]:
 y=para(c,title,M,y-7,CW,'head');y=para(c,text,M,y,CW)
done(y)
for cr in D['creatures']:
 new(cr['id']);y=para(c,cr['name'],M,777,CW,'title');y=para(c,cr['id']+' / '+cr['baseline']['region']+' / Adult representative',M,y,CW,'head')
 a=cr['art'];col,row=a['column'],a['row'];img(c,a['file'],[col*384,[0,330,666][row],(col+1)*384,[328,664,1024][row]],M,470,235,225)
 yy=690;bx=M+255;bw=CW-255;b=cr['baseline'];dims=b['envelope_m']
 yy=para(c,'STAGING ENVELOPE',bx,yy,bw,'head');yy=para(c,f"{dims['length']} m long / {dims['width_or_span']} m wide or span / {dims['height']} m high",bx,yy,bw)
 yy=para(c,b['look'],bx,yy,bw);yy=para(c,b['limit'],bx,yy,bw);yy=para(c,'Individuals vary up to 10%; art not to scale. Written anatomy controls obscured features.',bx,yy,bw,'small');assert yy>460,(cr['id'],yy)
 ww=(CW-22)/2;ys=[]
 for j,fields in enumerate([[('DAILY LIFE','daily'),('CYCLE & SIGNS','cycle'),('READ THE EVIDENCE','signs'),('COMMUNITY COST','community')],[('ESCALATION','escalation'),('STORY OPTION','scene'),('MOVEMENT & SOUND','motion'),('ANATOMY LOCK','rule')]]):
  yy=450
  for label,k in fields:yy=para(c,label,M+j*(ww+22),yy,ww,'head');yy=para(c,cr[k]+(' '+cr['sounds'] if k=='motion' else ''),M+j*(ww+22),yy,ww,'small')
  ys.append(yy)
 done(min(ys))
for i in range(0,8,2):
 new('Regions '+str(i));y=para(c,'Regional rhythms',M,776,CW,'title')
 for reg in D['regional_ecology'][i:i+2]:
  y=para(c,reg['id']+' / '+reg['title'],M,y-10,CW,'head')
  for label,k in [('Food web','food_web'),('Season','season'),('Community','community'),('Story pressure','conflict')]:y=para(c,label+': '+reg[k],M,y,CW)
  y-=20
 done(y)
for s in HAB:
 new(s['id']);y=para(c,s['name'],M,776,CW,'title');y=para(c,s['id']+' / '+s['region'],M,y,CW,'head');habimg(c,s,M,465,CW,230);y=para(c,'Atmosphere reference only. Exact layout: HAB-'+s['id']+' and its geometry register.',M,453,CW,'small')
 y=para(c,s['notes'][0],M,y-6,CW)
 for state,tx in s['conditions'].items():y=para(c,state+' / '+tx,M,y-3,CW,'small')
 y=para(c,'STAGING LOCK',M,y-8,CW,'head');y=para(c,s['notes'][1],M,y,CW,'small');done(y)
for i in [0,4]:
 new('Continuity '+str(i));y=para(c,'Continuity before spectacle',M,776,CW,'title')
 for rule in D['rules'][i:i+4]:y=para(c,rule['title'],M,y-14,CW,'head');y=para(c,rule['text'],M,y,CW)
 if i==4:y=para(c,'Voices: Hollis and Namu have no assigned voice. Do not borrow an approved hero voice. Snow White remains canine sounds only. No paid synthesis is part of this release.',M,y-15,CW,'small')
 done(y)
c.save();main=fitz.open(stream=buf.getvalue(),filetype='pdf');assert len(main)==24,len(main)
sb=io.BytesIO();doc=SimpleDocTemplate(sb,pagesize=(W,H),leftMargin=M+8,rightMargin=M+8,topMargin=65,bottomMargin=65,allowSplitting=0);flow=[]
for i,s in enumerate(ST):
 if i:flow.append(PageBreak())
 flow.extend([Paragraph(html.escape(s['title']),S['title']),Paragraph(html.escape(s['location']),S['head']),Paragraph(html.escape(s['placement']),S['small']),Spacer(1,12)])
 flow.extend(Paragraph(html.escape(p),S['story']) for p in s['text'].split('\n\n'))
doc.build(flow,onFirstPage=lambda cc,dd:base(cc,24+dd.page,'COMPLETE STORY / Proposed'),onLaterPages=lambda cc,dd:base(cc,24+dd.page,'COMPLETE STORY / Proposed'));main.insert_pdf(fitz.open(stream=sb.getvalue(),filetype='pdf'))
# Searchable final index with actual story page starts.
for s in ST:
 for n,p in enumerate(main):
  if s['title'] in p.get_text() and n>=24:index[s['title']]=n+1;break
ib=io.BytesIO();cc=canvas.Canvas(ib,pagesize=(W,H));base(cc,len(main)+1,'NAVIGATION / Source precedence');y=para(cc,'Find it again',M,776,CW,'title')
for k,v in index.items():
 if k.startswith('CR-') or k.startswith('SITE-') or k in [s['title'] for s in ST]:
  title=next((x['name'] for x in D['creatures']+HAB if x['id']==k),k);y=para(cc,f'{v:02d} / {k}'+(' / '+title if title!=k else ''),M,y,CW,'small')
y=para(cc,'SOURCE PRECEDENCE',M,y-15,CW,'head');y=para(cc,'Atlas 3.0 anatomy and regional anchors; Burrow 2.1 geometry and population; Living Places 3.1; Cost of Control 3.2; additive Wilds 3.3 ecology and access details. JSON and measured SVG/PDF geometry outrank concept perspective. No new event is dated by publication.',M,y,CW,'small');assert y>55;cc.showPage();cc.save();main.insert_pdf(fitz.open(stream=ib.getvalue(),filetype='pdf'))
main.set_toc([[1,k,v] for k,v in index.items()]);main.save(O/'MADGER_The_Wilds_Between.pdf')
# Blueprint volume: site plan, then complete keyed register, with dedicated descent sections.
bp=io.BytesIO();c=canvas.Canvas(bp,pagesize=(W,H));pno=0

def bpnew(label):
 global pno
 pno+=1;base(c,pno,'HABITAT BLUEPRINTS / '+label)
bpnew('Guide');y=para(c,'HABITAT\nBLUEPRINTS',M,776,CW,'title');y=para(c,'Four places. Continuous routes. Explicit elevations.',M,y,CW,'quote')
for hd,tx in [('Authority','These fictional production sets refine the generic 3.0 approach lines within unchanged site boundaries and refuge footprints. They are not certified construction plans.'),('Coordinate system','Local metres, x east, y north. Each refuge floor is z=0; this is not sea level. Feature boxes are [west x, south y, width, depth]. Route lines are centrelines, not edges or unrestricted access.'),('Navigation','02-03 Floodglass Ford; 04-05 Walking Root Crossing; 06-09 Buried Lens; 10-13 Bellwater Narrows. Detail plates show the completed stair profiles and connection points.'),('Conditions','NORMAL requires current inspection. RESTRICTED limits use. CLOSED forbids the listed passage. EMERGENCY does not override a closure: crew, load, water and access must be reassessed.'),('Continuity','SITE-03 resolves the former ramp reservation as foot service stairs. SITE-08 connects its dock to the high arch; boats pass beneath at a different elevation. The lower shelf at SITE-02 requires assisted descent and is not a walking shortcut.'),('Visual authority','Concept art is atmospheric. Exact dimensions, topology, anatomy and the condition register govern reconstruction. All materials, handrails and support details are fictional production choices, not real engineering specifications.')]:y=para(c,hd,M,y-9,CW,'head');y=para(c,tx,M,y,CW)
assert y>55;c.showPage()
for site in HAB:
 bpnew(site['id']);sd=fitz.open(stream=(R/'plans'/f"HAB-{site['id']}.svg").read_bytes(),filetype='svg');pd=fitz.open(stream=sd.convert_to_pdf(),filetype='pdf');pix=pd[0].get_pixmap(matrix=fitz.Matrix(2,2));c.drawImage(ImageReader(io.BytesIO(pix.tobytes('png'))),M,65,CW,710,preserveAspectRatio=True,anchor='c');c.showPage()
 bpnew(site['id']+' / Register');y=para(c,site['name'],M,776,CW,'title');y=para(c,'GEOMETRY & ACCESS REGISTER',M,y,CW,'head')
 for f in site['features']:y=para(c,f"{f['id']} / {f['name']} | box {f['box_m']} | z={f['z_m']}",M,y,CW,'small')
 for r in site['routes']:y=para(c,f"{r['id']} / {r['name']} | {r['width_m']} m clear | {r['points_m']} | z={r['z_m']}",M,y,CW,'small')
 for tx in site['notes']:y=para(c,tx,M,y-4,CW,'small')
 assert y>55,(site['id'],y);c.showPage()
 for d in site['details']:
  bpnew(d['id']);y=para(c,d['name'],M,776,CW,'title');y=para(c,d['id']+' / Measured production detail',M,y,CW,'head')
  for key,val in d.items():
   if key in ['id','name','note','flight_endpoints_xyz','bottom_route_xyz']:continue
   y=para(c,key.replace('_',' ')+': '+(f'{val:.6g}' if isinstance(val,float) else str(val)),M,y,CW,'body')
  if 'flight_endpoints_xyz' in d:
   y=para(c,'FLIGHT ENDPOINTS / x, y, z metres',M,y-8,CW,'head')
   for j,ends in enumerate(d['flight_endpoints_xyz']):y=para(c,f'{j+1}: {ends[0]} to {ends[1]}',M,y,CW,'body')
  if 'bottom_route_xyz' in d:y=para(c,'Bottom corridor: '+str(d['bottom_route_xyz']),M,y,CW,'small')
  y=para(c,d['note'],M,y-8,CW,'body')
  # schematic true-scale rise/run profile, all flight cumulative steps and landings.
  risers=d.get('risers',d.get('risers_per_flight',0));flights=d.get('flights',1);riser=d['riser_m'];tread=d['tread_m'];treads=d.get('treads',d.get('treads_per_flight',0));land=d.get('landing_length_m',2 if flights>1 else 0)
  totalrun=flights*treads*tread+(flights-1)*land;totalrise=risers*riser*flights;sc=min(CW/(totalrun+1),100/max(totalrise,1));x=M+5;yy=max(90,y-145);c.setStrokeColor(INK);c.setLineWidth(1.2);path=c.beginPath();path.moveTo(x,yy+totalrise*sc)
  for flight in range(flights):
   for step in range(risers):
    totalrise-=riser;path.lineTo(x,yy+totalrise*sc)
    if step<treads:x+=tread*sc;path.lineTo(x,yy+totalrise*sc)
   if flight<flights-1:x+=land*sc;path.lineTo(x,yy+totalrise*sc)
  c.drawPath(path);para(c,'Unfolded section, high to low / equal horizontal and vertical scale. Plan turns are defined by endpoint coordinates above.',M,yy-12,CW,'small');assert y>240,(d['id'],y);c.showPage()
c.save();blue=fitz.open(stream=bp.getvalue(),filetype='pdf');blue.save(O/'MADGER_Habitat_Blueprints.pdf')
(O/'Navigation_Index.json').write_text(json.dumps(index,indent=2));print('PDF pages',len(main),len(blue))
