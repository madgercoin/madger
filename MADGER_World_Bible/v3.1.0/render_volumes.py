from pathlib import Path
import io,json,math,html
import fitz
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor,Color
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak,KeepTogether
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
ROOT=Path(__file__).resolve().parent; OUT=ROOT/'output';D=json.loads((OUT/'Living_Places.json').read_text())
F='/usr/share/fonts/truetype/dejavu/'
for n,f in [('Body','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf'),('Serif','DejaVuSerif.ttf')]:pdfmetrics.registerFont(TTFont(n,F+f))
W,H=595.276,841.89;M=43;INK=HexColor('#173e3c');BRONZE=HexColor('#987749');PAPER=HexColor('#fbf8ef')
styles={
 'body':ParagraphStyle('body',fontName='Body',fontSize=9,leading=12.7,textColor=INK,spaceAfter=8),
 'small':ParagraphStyle('small',fontName='Body',fontSize=7.8,leading=11,textColor=INK,spaceAfter=6),
 'head':ParagraphStyle('head',fontName='Bold',fontSize=10.4,leading=14,textColor=BRONZE,spaceAfter=5),
 'story':ParagraphStyle('story',fontName='Serif',fontSize=10.2,leading=15.1,textColor=INK,spaceAfter=7),
 'title':ParagraphStyle('title',fontName='Bold',fontSize=27,leading=32,textColor=INK,spaceAfter=13),
}

def para(c,s,x,y,width,style='body'):
 p=Paragraph(html.escape(s).replace('\n','<br/>'),styles[style]);w,h=p.wrap(width,1000);p.drawOn(c,x,y-h);return y-h-styles[style].spaceAfter

def footer(c,page,title='LIVING PLACES'):
 c.setFillColor(PAPER);c.rect(0,0,W,H,stroke=0,fill=1);c.setFillColor(INK);c.setFont('Bold',8);c.drawString(M,H-32,'MADGER  /  WORLD BIBLE 3.1');c.setFont('Body',7);c.drawRightString(W-M,H-32,'21 OCTOBER 2026')
 c.setStrokeColor(HexColor('#d2c5aa'));c.setLineWidth(.6);c.line(M,43,W-M,43);c.setFillColor(INK);c.setFont('Body',7);c.drawString(M,29,title+'  /  Additive to edition 3.0');c.drawRightString(W-M,29,str(page))

def panel(c,p,x,y,width,height):
 a=p['art'];path=ROOT/'art'/a['file'];im=ImageReader(str(path));iw,ih=im.getSize();cols,rows=a['grid'];pw=iw/cols;ph=ih/rows
 # Clip at layout time; retain original image bytes. Exclude the label strip.
 ph*=.91; scale=max(width/pw,height/ph); dx=x-(pw*scale-width)/2-a['column']*pw*scale
 # Panel top in source coordinates, then translate the full source image.
 top=ih-a['row']*(ih/rows);dy=y+height+(ph*scale-height)/2-top*scale
 c.saveState();clip=c.beginPath();clip.rect(x,y,width,height);c.clipPath(clip,stroke=0);c.drawImage(im,dx,dy,iw*scale,ih*scale);c.restoreState()

def end_page(c):c.showPage()

b=io.BytesIO();c=canvas.Canvas(b,pagesize=(W,H));c.setTitle('MADGER — Living Places / World Bible 3.1');c.setAuthor('MADGER World Development')
footer(c,1)
c.setFillColor(INK);c.setFont('Bold',41);c.drawString(M,748,'LIVING');c.drawString(M,704,'PLACES')
c.setFont('Serif',15);c.drawString(M,673,'Thirteen rooms. Thirteen ways to belong.')
panel(c,D['landmarks'][2],M,340,W-2*M,298)
y=312
y=para(c,'An interior companion to The Open Ways',M,y,W-2*M,'head')
y=para(c,'The wider world becomes convincing when people have reasons to return to a room. These landmarks now have remembered disasters, recurring meals, unfinished work, arguments and ordinary pleasures. Their stories grow from daily use, with room for both tenderness and competing interests.',M,y,W-2*M)
y=para(c,'Includes thirteen illustrated landmark dossiers, thirteen matching furnished plans, 221 registered furnishings and two complete companion short stories.',M,y,W-2*M)
y=para(c,'Edition 3.1.0 · Local histories and normal-day dressing extend the saved 3.0 world. The Burrow remains the pilot’s only setting.',M,y,W-2*M,'small');end_page(c)
footer(c,2);y=775;y=para(c,'A world that remembers',M,y,W-2*M,'title')
y=para(c,'Read each place as a setting with obligations, not a backdrop that changes between shots. Fixed plans establish where everyone can stand; small objects establish what matters to them.',M,y,W-2*M)
y=para(c,'LANDMARK INDEX',M,y-5,W-2*M,'head')
for j,p in enumerate(D['landmarks'],3):
 c.setFillColor(INK);c.setFont('Bold',9);c.drawString(M,y,p['name']);c.setFont('Body',8);c.drawString(279,y,p['community']);c.drawRightString(W-M,y,str(j));y-=22
for hd,txt in [
 ('Two companion stories','The Unfinished Note begins on page 16. The Empty Chair follows it. Their proposed placements are recorded beside each title; neither has yet been assigned an episode number.'),
 ('What is fixed','Inherited footprints, rooms, doors, levels, population, geography and approved hero references remain unchanged. New interior dressing is reproducible from the companion plans and prop register.'),
 ('What the paintings mean','Art establishes mood, materials and light. It does not authorize new windows, cathedral-height rooms or moved doors. The measured plans control geometry; the written scene state controls deliberate prop moves.'),
 ('Canon and possibility','Local histories are additive writer canon. Scene seeds and finished short stories are authored opportunities awaiting placement in the episode ledger. A story possibility is not a fact already known to the pilot’s characters.')]:
 y=para(c,hd,M,y-7,W-2*M,'head');y=para(c,txt,M,y,W-2*M)
assert y>52,y;end_page(c)
for number,p in enumerate(D['landmarks'],3):
 footer(c,number);c.setFillColor(INK);c.setFont('Bold',24);c.drawString(M,767,p['name']);c.setFont('Body',9);c.drawString(M,747,p['community']+'  /  '+p['building_id']);c.setFont('Serif',12);c.drawString(M,725,p['chapter_title'])
 panel(c,p,M,492,W-2*M,215)
 para(c,'INTERIOR ATMOSPHERE STUDY · Measured geometry controls scale and openings.',M,482,W-2*M,'small')
 width=(W-2*M-23)/2;y1=y2=457
 for hd,key in [('HOW IT BECAME THIS PLACE','history'),('A NORMAL DAY','daily_life')]:
  y1=para(c,hd,M,y1,width,'head');y1=para(c,p[key],M,y1,width)
 y1=para(c,'PEOPLE',M,y1,width,'head');y1=para(c,', '.join(p['cast_names']),M,y1,width,'small')
 x=M+width+23
 for hd,key in [('A CONFLICT THAT BELONGS HERE','conflict'),('SCENE SEED','scene_seed')]:
  y2=para(c,hd,x,y2,width,'head');y2=para(c,p[key],x,y2,width)
 y2=para(c,'SIGNATURE OBJECTS',x,y2,width,'head');y2=para(c,'; '.join(p['signature_props'])+'.',x,y2,width,'small')
 y2=para(c,'MATERIALS & LIGHT',x,y2,width,'head');y2=para(c,p['material_direction'],x,y2,width,'small')
 assert min(y1,y2)>56,(p['name'],y1,y2)
 end_page(c)
c.save()
first=fitz.open(stream=b.getvalue(),filetype='pdf')

# Long prose uses flowing typeset pages; no clipped fixed boxes.
sb=io.BytesIO();doc=SimpleDocTemplate(sb,pagesize=(W,H),leftMargin=M+8,rightMargin=M+8,topMargin=65,bottomMargin=65)
flow=[]
for i,s in enumerate(D['companion_stories']):
 if i:flow.append(PageBreak())
 flow += [Paragraph(html.escape(s['title']),styles['title']),Paragraph(html.escape(s['place']),styles['head']),Paragraph(html.escape(s['placement']),styles['small']),Spacer(1,13)]
 for par in s['text'].split('\n\n'):flow.append(Paragraph(html.escape(par),styles['story']))
def story_page(can,doc):footer(can,15+doc.page,'COMPANION STORIES')
doc.build(flow,onFirstPage=story_page,onLaterPages=story_page)
sp=fitz.open(stream=sb.getvalue(),filetype='pdf');first.insert_pdf(sp)
# Compact production handoff page.
b=io.BytesIO();c=canvas.Canvas(b,pagesize=(W,H));footer(c,len(first)+1);y=775;y=para(c,'Use a place again',M,y,W-2*M,'title')
y=para(c,'1. Establish the date and knowledge',M,y,W-2*M,'head');y=para(c,'Choose a story date after the pilot for these exterior scenes. Check which secrets have actually been revealed. The funding secret, maker boundaries and companion histories retain the timing of the existing character arcs.',M,y,W-2*M)
y=para(c,'2. Open the measured plan',M,y-7,W-2*M,'head');y=para(c,'Match the location ID to MADGER_Furnished_Interiors.pdf and its individual SVG. Living_Places.json retains the inherited geometry and adds every prop’s local position, footprint, height and settlement-local world center. Interior_Props.csv gives an editable placement register.',M,y,W-2*M)
y=para(c,'3. Record the scene state',M,y-7,W-2*M,'head');y=para(c,'Normal day is the reset state. A bench brought out for a hearing, Snow’s temporary mat or a borrowed measuring cord must be logged as an intentional move. Preserve open circulation. Match previous shots before generating a new image.',M,y,W-2*M)
y=para(c,'4. Keep character performance stable',M,y-7,W-2*M,'head');y=para(c,'Use existing character cards and approved voices. Hold the body for dialogue where appropriate; use separate mouth drawings, blinks and purposeful expression changes. Snow communicates through canine movement and sounds. These pages do not assign voices to new speakers.',M,y,W-2*M)
y=para(c,'Small continuity choices that matter',M,y-9,W-2*M,'head')
for t in ['Six Roads is a supper-table tradition. Latchford still has three established roads. The plan includes all six destination tables.','The Common Kiln Hall is a cool workroom. Heat-producing kilns remain in the separate annex.','The Tide Speakers Hall is dry space in an underground settlement. It has a public chart, not an invented hidden master map.','The workshop’s portable cord is borrowed from its registered stand in The Unfinished Note. Snow’s visiting mat and the music kit are scene dressing, not permanent architecture.','The Empty Chair precedes the public rescue-funding reveal. The Unfinished Note is a later Stonewake interlude; the earlier story makes no reference to that later visit.']:
 y=para(c,t,M,y,W-2*M,'small')
assert y>60,y;c.showPage();c.save();first.insert_pdf(fitz.open(stream=b.getvalue(),filetype='pdf'))
first.save(OUT/'MADGER_Living_Places.pdf',garbage=4,deflate=True)
# Thirteen SVG sheets retained as vector PDF pages.
bp=fitz.open()
for p in D['landmarks']:
 svg=(ROOT/'plans'/f"{p['id']}.svg").read_bytes();temp=fitz.open(stream=svg,filetype='svg');pdf=fitz.open(stream=temp.convert_to_pdf(),filetype='pdf');bp.insert_pdf(pdf)
bp.set_metadata({'title':'MADGER — Furnished Interiors / 13 measured sheets','author':'MADGER World Development'});bp.save(OUT/'MADGER_Furnished_Interiors.pdf',garbage=4,deflate=True)
print(json.dumps({'living_pages':len(first),'interior_pages':len(bp)},indent=2))
