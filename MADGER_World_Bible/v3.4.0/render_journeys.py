from pathlib import Path
import json,io,html,math
import fitz
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak
R=Path(__file__).parent;O=R/'output';D=json.loads((O/'Journeys_Bible.json').read_text());ST=json.loads((O/'Complete_Story.json').read_text())
for n,f in [('Body','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf'),('Serif','DejaVuSerif.ttf')]:pdfmetrics.registerFont(TTFont(n,'/usr/share/fonts/truetype/dejavu/'+f))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='Bold',italic='Body',boldItalic='Bold')
W,H=595.276,841.89;M=43;CW=W-2*M;INK=HexColor('#173e3c');GOLD=HexColor('#97723d');PAPER=HexColor('#fbf8ef');TEAL=HexColor('#3b7775')
styles={k:ParagraphStyle(k,fontName=f,fontSize=z,leading=l,textColor=INK,spaceAfter=a) for k,f,z,l,a in [('body','Body',9.6,14.4,8),('small','Body',8.5,12,7),('head','Bold',11,15,7),('title','Bold',26,31,13),('quote','Serif',15,21,17),('story','Serif',10.5,15.8,10)]}
def para(c,t,x,y,w,st='body'):
 t=str(t).replace('—',' - ').replace('–','-').replace('‑','-');p=Paragraph(html.escape(t).replace('\n','<br/>'),styles[st]);_,h=p.wrap(w,1200);p.drawOn(c,x,y-h);return y-h-styles[st].spaceAfter

def base(c,n,label='JOURNEYS & WAYCRAFT'):
 c.setFillColor(PAPER);c.rect(0,0,W,H,stroke=0,fill=1);c.setFillColor(INK);c.setFont('Bold',8);c.drawString(M,H-31,'MADGER / WORLD BIBLE 3.4');c.setFont('Body',7);c.drawRightString(W-M,H-31,'21 OCTOBER 2026');c.setStrokeColor(HexColor('#d0c2a4'));c.line(M,44,W-M,44);c.drawString(M,29,label);c.drawRightString(W-M,29,str(n))
b=io.BytesIO();c=canvas.Canvas(b,pagesize=(W,H));c.setTitle('MADGER - Journeys & Waycraft');c.setAuthor('MADGER World Development');n=0;index={};overlays=[]
def new(key):
 global n
 n+=1;index[key]=n;base(c,n)
def done(y=100):
 assert y>57,(n,y)
 c.showPage()
new('Cover');y=para(c,'JOURNEYS\n& WAYCRAFT',M,775,CW,'title');y=para(c,'The distance between a promise and an arrival.',M,y,CW,'quote')
overlays.append((n-1,'WAY-Network.svg',fitz.Rect(M,230,W-M,640)))
y=para(c,'Sixteen routes through eight regions',M,170,CW,'head');y=para(c,'Daily life, travel arithmetic, bounded technologies and a complete road story. An additive production reference for the world beyond the Burrow.',M,y,CW);done(y)
new('Guide');y=para(c,'Make the journey matter',M,775,CW,'title');y=para(c,'A road carries more than its destination: food that will spoil, a sibling expecting a visit, a place kept empty for someone who has not arrived.',M,y,CW,'quote')
for hd,tx in [('The existing world stays put','All sixteen route IDs, endpoints, distances and original records are preserved. Exact community anchors remain unchanged. New notes develop daily life, custody, scene continuity and the cost of delay.'),('Three transparent timing corrections','The old summaries for WAY-09, WAY-10 and WAY-11 undercount movement plus their stated full layovers. This edition preserves those inputs and explicitly sets 15, 6 and 4 whole planning day blocks respectively. It does not rewrite any adopted episode event.'),('How to use this volume','Choose an existing route; read its direction, timing and restrictions; select a domestic intention and a physical continuity detail. Use the travel examples to reserve elapsed time, then add any new booking, repair or recovery delays.'),('What the drawings mean','The regional network map plots exact anchors and straight connection lines. Those lines are not tracks, roads or flight corridors. They cannot establish intermediate junctions, gates, refuge positions or liftstone fields.'),('Story status','A Place Left Empty is a complete authored option with an independent lodging-fraud plot. It neither explains D17 nor assigns a new dated episode. Asha and Pell retain their established histories, and Snow remains a non-speaking dog.')]:
 y=para(c,hd,M,y-7,CW,'head');y=para(c,tx,M,y,CW)
done(y)
new('Network');y=para(c,'The connected world',M,775,CW,'title');y=para(c,'Exact anchor positions / schematic connections / editable SVG included',M,y,CW,'small');overlays.append((n-1,'WAY-Network.svg',fitz.Rect(20,145,W-20,700)));y=para(c,'Regional coordinates use kilometres from the Burrow Sunwell. North is up. A line crossing is not a junction. Registered route lengths exceed the straight-line distances between their endpoints.',M,110,CW,'small');done(y)
for route in D['route_cards']:
 new(route['id']);bb=route['baseline'];y=para(c,route['origin_name']+'\nto '+route['destination_name'],M,775,CW,'title');y=para(c,route['id']+' / '+bb['mode'].upper()+' / '+str(bb['length_km'])+' KM / '+str(route['schedule_days'])+' PLANNING DAYS',M,y,CW,'head');y=para(c,route['title'],M,y-7,CW,'quote')
 for hd,key in [('LIFE ON THE WAY','daily_life'),('TIMING & TERRAIN','timing'),('AT THE HANDOFF','handoff'),('A STORY POSSIBILITY','story_option'),('CONTINUITY IN THE SHOT','production')]:
  y=para(c,hd,M,y-8,CW,'head');y=para(c,route[key],M,y,CW)
 y=para(c,route['direction'],M,y-9,CW,'small');done(y)
new('Timing errata');y=para(c,'Days that must exist',M,775,CW,'title');y=para(c,'Keep the original record. Make the correction visible.',M,y,CW,'quote')
for e in D['timing_errata']:
 r=next(x for x in D['route_cards'] if x['id']==e['route_id']);y=para(c,e['route_id']+' / '+r['origin_name']+' to '+r['destination_name'],M,y-12,CW,'head')
 y=para(c,f"Movement {e['moving_days']:.2f} days + {e['full_layover_days']} stated layover days = {e['exact_elapsed_days']:.2f} days. Round upward: {e['planning_day_blocks']} whole planning blocks. Earlier summary: {e['old_days']} days.",M,y,CW)
 y=para(c,e['reason'],M,y,CW,'small')
y=para(c,'A planning floor is not an appointment',M,y-15,CW,'head');y=para(c,'These figures assume the specified movement rate, full separate layovers and an available service. They do not account for a newly missed departure, injury, repair or extended closure. Faster travel or overlapping work must be stated in a particular itinerary; it cannot be silently assumed to save a scene.',M,y,CW);done(y)
for start in [0,3]:
 new('Examples '+str(start));y=para(c,'Time carried across cuts',M,775,CW,'title')
 for ex in D['planning_examples'][start:start+3]:
  y=para(c,ex['id']+' / '+ex['name'],M,y-10,CW,'head');y=para(c,ex['reason'],M,y,CW)
  st=' → '.join(ex['route_ids']);y=para(c,st,M,y,CW,'small');y=para(c,f"Leg sum {ex['base_leg_sum_days']} days + scenario allowance {ex['extra_days']} = {ex['elapsed_day_blocks']} elapsed day blocks.",M,y,CW)
  y=para(c,ex['condition'],M,y,CW,'small');y-=7
 y=para(c,'Illustrative departures only. Additional inter-leg booking waits are not included; no episode date or return timetable is adopted.',M,y-8,CW,'small');done(y)
new('Descent');y=para(c,'Below does not mean beneath us',M,775,CW,'title');y=para(c,'Stonewake is the surface connection. Lumen Tide is already home.',M,y,CW,'quote');overlays.append((n-1,'WAY-15-Datums.svg',fitz.Rect(M,230,W-M,600)))
y=para(c,'1,920 m of elevation change across a registered 16 km route is not evidence of a single shaft, an even gradient or a shortcut from the Burrow. A local set must use its existing measured plans. Any new detailed descent segment needs its own additive geometry sheet.',M,200,CW);done(y)
for start in [0,3]:
 new('Waycraft '+str(start));y=para(c,'Power with a boundary',M,775,CW,'title')
 for tech in D['waycraft'][start:start+3]:
  y=para(c,tech['name'],M,y-15,CW,'head');y=para(c,tech['rule'],M,y,CW);y=para(c,'Cost: '+tech['cost'],M,y,CW)
 y=para(c,'The selected scene must name the device, its operator, what it can observe or carry, and what happens when it cannot continue. A regional service label alone is not a finished vehicle design.',M,y-18,CW,'small');done(y)
for start in [0,4]:
 new('Continuity '+str(start));y=para(c,'What survives the cut',M,775,CW,'title')
 for r in D['rules'][start:start+4]:y=para(c,r['title'],M,y-12,CW,'head');y=para(c,r['text'],M,y,CW)
 done(y)
new('Scene handoff');y=para(c,'A compact scene record',M,775,CW,'title');y=para(c,'Copy these fields into the production ledger when a journey is adopted.',M,y,CW,'quote')
fields=[('Scene identity','Proposed or adopted; episode ID; world date or elapsed-day block; route ID and direction.'),('Bodies and belongings','Named travelers; animal handler and rest needs; clothing condition; luggage and cargo IDs; who has each object.'),('What changed','Departure and arrival observations; condition state; delay cause; injury, repair, used stores and altered commitments.'),('What is known','Who saw the event; who received only a message; sender and observation time; public information versus protected chart content.'),('Where the shot stands','Community or site ID; inherited local plan; camera position and eyeline; daylight or cave lighting; environmental sound.'),('Before the next scene','Next confirmed destination; available shelter; transfer status; unresolved limits; which characters stay behind.')]
for hd,tx in fields:y=para(c,hd,M,y-9,CW,'head');y=para(c,tx,M,y,CW)
done(y)
c.save();main=fitz.open(stream=b.getvalue(),filetype='pdf')
for pn,file,rect in overlays:
 svg=fitz.open(stream=(R/'plans'/file).read_bytes(),filetype='svg');pd=fitz.open(stream=svg.convert_to_pdf(),filetype='pdf');main[pn].show_pdf_page(rect,pd,0)
basepages=len(main);index[ST['title']]=basepages+1
sb=io.BytesIO();doc=SimpleDocTemplate(sb,pagesize=(W,H),leftMargin=M+8,rightMargin=M+8,topMargin=65,bottomMargin=65,allowSplitting=0)
flow=[Paragraph(html.escape(ST['title']),styles['title']),Paragraph(html.escape(ST['location']),styles['head']),Paragraph(html.escape(ST['placement']),styles['small']),Spacer(1,12)]
flow.extend(Paragraph(html.escape(p),styles['story']) for p in ST['text'].split('\n\n'))
flow.extend([Spacer(1,16),Paragraph('Production continuity',styles['head'])]);flow.extend(Paragraph(html.escape(x),styles['small']) for x in ST['production_notes'])
doc.build(flow,onFirstPage=lambda cc,dd:base(cc,basepages+dd.page,'COMPLETE STORY / Proposed'),onLaterPages=lambda cc,dd:base(cc,basepages+dd.page,'COMPLETE STORY / Proposed'));main.insert_pdf(fitz.open(stream=sb.getvalue(),filetype='pdf'))
ib=io.BytesIO();cc=canvas.Canvas(ib,pagesize=(W,H));base(cc,len(main)+1,'NAVIGATION / Source precedence');y=para(cc,'Return to the right page',M,775,CW,'title')
for key,pno in index.items():
 if key in ['Cover','Guide'] or key.startswith('Continuity') or key.startswith('Waycraft'):continue
 title=next((r['origin_name']+' to '+r['destination_name'] for r in D['route_cards'] if r['id']==key),key)
 y=para(cc,f'{pno:02d} / {key}'+(' / '+title if title!=key else ''),M,y,CW,'small')
y=para(cc,'Authority',M,y-12,CW,'head');y=para(cc,'3.0 remains the foundation for routes, anchors, history, technologies and the civic calendar. 2.1 controls Burrow geometry; 3.1, 3.2 and 3.3 remain active. Only the three explicit planning-day corrections supersede older route summaries. New stories and examples are not dated episodes.',M,y,CW,'small');assert y>57;cc.showPage();cc.save();main.insert_pdf(fitz.open(stream=ib.getvalue(),filetype='pdf'))
main.set_toc([[1,key,p] for key,p in index.items()]);main.save(O/'MADGER_Journeys_and_Waycraft.pdf');(O/'Navigation_Index.json').write_text(json.dumps(index,indent=2));print('Pages',len(main))
