from pathlib import Path
import io,json,html,math
import fitz
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import ImageReader
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak
R=Path(__file__).resolve().parent;O=R/'output';D=json.loads((O/'Conflict_Bible.json').read_text());ST=json.loads((O/'Companion_Stories.json').read_text())
for n,f in [('Body','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf'),('Serif','DejaVuSerif.ttf')]:pdfmetrics.registerFont(TTFont(n,'/usr/share/fonts/truetype/dejavu/'+f))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='Bold',italic='Body',boldItalic='Bold')
W,H=595.276,841.89;M=43;CW=W-2*M;INK=HexColor('#173e3c');GOLD=HexColor('#967342');PAPER=HexColor('#fbf8ef')
S={'body':ParagraphStyle('body',fontName='Body',fontSize=9.5,leading=13.5,textColor=INK,spaceAfter=8),'small':ParagraphStyle('small',fontName='Body',fontSize=8.5,leading=11.6,textColor=INK,spaceAfter=6),'head':ParagraphStyle('head',fontName='Bold',fontSize=10.4,leading=14,textColor=GOLD,spaceAfter=5),'title':ParagraphStyle('title',fontName='Bold',fontSize=25,leading=30,textColor=INK,spaceAfter=12),'quote':ParagraphStyle('quote',fontName='Serif',fontSize=15,leading=21,textColor=INK,spaceAfter=15),'story':ParagraphStyle('story',fontName='Serif',fontSize=10.2,leading=15.1,textColor=INK,spaceAfter=7)}

def para(c,t,x,y,w,st='body',raw=False):
 p=Paragraph(t if raw else html.escape(t),S[st]);_,h=p.wrap(w,1000);p.drawOn(c,x,y-h);return y-h-S[st].spaceAfter

def base(c,num,label='THE COST OF CONTROL'):
 c.setFillColor(PAPER);c.rect(0,0,W,H,fill=1,stroke=0);c.setFont('Bold',8);c.setFillColor(INK);c.drawString(M,H-32,'MADGER / WORLD BIBLE 3.2');c.setFont('Body',7);c.drawRightString(W-M,H-32,'21 OCTOBER 2026');c.setStrokeColor(HexColor('#cfbea0'));c.line(M,43,W-M,43);c.setFont('Body',7);c.drawString(M,29,label+' / Writer reference');c.drawRightString(W-M,29,str(num))

def image_panel(c,a,x,y,w,h):
 im=ImageReader(str(R/'art'/a['file']));iw,ih=im.getSize();cols,rows=a['grid'];pw=iw/cols;ph=ih/rows
 # Clip layout only. Original art bytes remain unmodified.
 left=a['column']*pw;top=a['row']*ph
 if 'crop_px' in a:
  left,top,right,bottom=a['crop_px'];pw=right-left;ph=bottom-top
 scale=max(w/pw,h/ph);dx=x-(pw*scale-w)/2-left*scale;dy=y+h+(ph*scale-h)/2-(ih-top)*scale
 c.saveState();path=c.beginPath();path.rect(x,y,w,h);c.clipPath(path,stroke=0);c.drawImage(im,dx,dy,iw*scale,ih*scale);c.restoreState()

b=io.BytesIO();c=canvas.Canvas(b,pagesize=(W,H));c.setTitle('MADGER - The Cost of Control / Conflict Bible 3.2');c.setAuthor('MADGER World Development');page=0;section_pages={}
def new(section=None):
 global page
 page+=1;base(c,page)
 if section:section_pages[section]=page

def done(y=100):
 assert y>=55,(page,y)
 c.showPage()
new('Cover');y=para(c,'THE COST\nOF CONTROL',M,776,CW,'title');y=para(c,'Threats, loyalties and the choices that divide them',M,y,CW,'quote');image_panel(c,D['locations'][5]['art'],M,300,CW,330)
y=para(c,'THE OPEN WAYS / CONFLICT COMPANION',M,276,CW,'head');y=para(c,'A depot can save a family and still demand too much. A true grievance can be used to endanger strangers. A forged warning can stand beside a genuine danger. This volume gives the wider world adversaries whose choices have costs, and defenders who must answer more than force with force.',M,y,CW)
y=para(c,'Six sources of pressure. Thirteen character expansions. Seven measured locations. Eight evidence threads. Two complete stories.',M,y,CW,'small');done(y)
new('Guide');y=para(c,'Read the threat behind the promise',M,776,CW,'title')
y=para(c,D['moral'],M,y,CW,'quote');y=para(c,'Each group offers something people really need: dependable supply, recognition, food, water, rescue or protection from catastrophe. Conflict begins when that useful work becomes a demand for control.',M,y,CW)
for h,t in [('3-8 / Organizations under pressure','Gilt Ledger, Glass Thread, Riven Claw, Kavar’s Salt Crown business, Blackwake Sails and the divided Still Bell Archive. Salt Crown is part of the existing commercial network, not a tenth faction.'),('9-15 / Places that carry the conflict','Four occupied buildings and three dangerous sites, with artwork, local purpose and matching measured sheets.'),('16-22 / Character development','Thirteen addenda preserve existing identities, origins, relationships and voice status while adding habits, history, pressure points and consequential choices.'),('23-29 / Connections and revelation','Transactional relationships, good factions under pressure, evidence limits, season-one escalation and a five-minute pilot timing envelope.'),('30 onward / Complete stories','An Hour Without a Price and An Inventory of Names explore choices from inside the antagonists’ workplaces. Their placements remain proposed.'),('Authority','The 3.0 foundation and 3.1 interiors remain current. New operating histories and measured normal-state details are writer canon. Story beats and choices await a dated episode ledger. Artwork controls atmosphere; measured plans control exact placement.')]:
 y=para(c,h,M,y-5,CW,'head');y=para(c,t,M,y,CW)
done(y)
for p in D['pressure_centers']:
 new(p['id']);y=para(c,p['title'],M,776,CW,'title');y=para(c,p['promise'],M,y,CW,'quote');y=para(c,p['faction_id']+' / '+p['place_id']+' / '+', '.join(p['member_names']),M,y,CW,'small')
 width=(CW-24)/2;left=right=y-12
 for hd,key in [('HOW THIS POWER FORMED','history'),('A WORKING DAY','routine'),('WHO DISAGREES INSIDE','internal_conflict')]:left=para(c,hd,M,left,width,'head');left=para(c,p[key],M,left,width)
 for hd,key in [('WHAT THEY CANNOT DO','limits'),('THE DRAMATIC TURN','story_turn'),('WHAT IT ASKS OF THE HEROES','hero_test')]:right=para(c,hd,M+width+24,right,width,'head');right=para(c,p[key],M+width+24,right,width)
 done(min(left,right))
for l in D['locations']:
 new(l['id']);y=para(c,l['name'],M,776,CW,'title');y=para(c,l['id']+' / '+('Occupied building' if l['type']=='building' else 'Dangerous site'),M,y,CW,'small');image_panel(c,l['art'],M,470,CW,230)
 para(c,'ATMOSPHERE REFERENCE / Exact dimensions and access: companion blueprint sheet.',M,459,CW,'small')
 width=(CW-24)/2;left=right=433
 for hd,key in [('HISTORY AND OWNERSHIP','history'),('A NORMAL DAY','daily_life')]:left=para(c,hd,M,left,width,'head');left=para(c,l[key],M,left,width)
 for hd,key in [('WHO HAS AUTHORITY','ownership'),('A SCENE THAT USES THE PLACE','dramatic_use'),('CONTINUITY','detail_authority')]:right=para(c,hd,M+width+24,right,width,'head');right=para(c,l[key],M+width+24,right,width)
 done(min(left,right))
for i in range(0,len(D['character_addenda']),2):
 new('Characters' if i==0 else None);y=para(c,'Character pressure & choice',M,776,CW,'title')
 for a in D['character_addenda'][i:i+2]:
  b0=a['baseline'];y=para(c,a['name']+' / '+a['id'],M,y,CW,'head');y=para(c,b0['identity']+' · '+b0['origin']+' · '+b0['affiliation'],M,y,CW,'small')
  for label,key in [('Private history','private_history'),('Ordinary habit','ordinary_habit'),('Pressure point','pressure_point'),('Consequential choice','irreversible_choice'),('Cost','cost_of_change'),('Scene seed','scene_seed')]:y=para(c,'<b>'+label+':</b> '+html.escape(a[key]),M,y,CW,'body',True)
  y-=10
 done(y)
new('Relationships');y=para(c,'Transactions are not allegiance',M,776,CW,'title')
y=para(c,'Keep these relationships specific. A paid information job, a stolen crate and a shared grievance do not establish a global villain command.',M,y,CW)
for a,b0,kind,detail in D['relationships']:
 y=para(c,a+' → '+b0+' / '+kind,M,y-4,CW,'head');y=para(c,detail,M,y,CW)
done(y)
new('Defenders');y=para(c,'Good factions have difficult choices',M,776,CW,'title')
for d in D['defenders']:
 name=next(f['name'] for f in D['base_factions'] if f['id']==d['faction']);y=para(c,name+' / '+d['faction'],M,y-6,CW,'head')
 for label,k in [('Their work','work'),('The temptation','temptation'),('The correction','correction')]:y=para(c,'<b>'+label+':</b> '+html.escape(d[k]),M,y,CW,'body',True)
done(y)
for start in [0,4]:
 new('Evidence' if start==0 else None);y=para(c,'What the evidence can prove',M,776,CW,'title');width=(CW-24)/2
 for j,e in enumerate(D['evidence_ledger'][start:start+4]):
  x=M+(j%2)*(width+24);yy=y-(j//2)*320
  yy=para(c,e['id']+' / '+e['claim'],x,yy,width,'head');yy=para(c,e['first_audience'],x,yy,width,'small')
  for label,k in [('Seen','observable'),('Still possible','innocent_possibility'),('Proof','proof'),('Limit','proves_not'),('Payoff','reveal')]:yy=para(c,'<b>'+label+':</b> '+html.escape(e[k]),x,yy,width,'small',True)
  assert yy>55,(e['id'],yy)
 done()
for start in [0,5]:
 new('Season one' if start==0 else None);y=para(c,'Season one / '+('the question opens' if start==0 else 'the consequences arrive'),M,776,CW,'title')
 for e in D['season_one_ledger'][start:start+5]:
  y=para(c,e['episode']+' / '+e['title'],M,y-5,CW,'head')
  y=para(c,e['baseline_plot'],M,y,CW)
  y=para(c,'<b>Character turn:</b> '+html.escape(e['character_turn']),M,y,CW,'small',True)
  y=para(c,'<b>Audience boundary:</b> '+html.escape(e['allowed_audience_knowledge']),M,y,CW,'small',True)
 done(y)
new('Pilot');y=para(c,'The pilot earns its warmth',M,776,CW,'title')
y=para(c,'Five-minute timing envelope / Burrow interiors only',M,y,CW,'head');y=para(c,'This is a planning envelope for the future screenplay and edit. It preserves the existing episode-one premise; it is not a finished video or a replacement script.',M,y,CW)
for e in D['pilot_reveal_lock']['beats']:
 a,b0=e['start'],e['end'];y=para(c,f'{a//60}:{a%60:02d}-{b0//60}:{b0%60:02d} / '+e['purpose'],M,y-8,CW,'head');y=para(c,e['content'],M,y,CW)
y=para(c,'Audience trust',M,y-12,CW,'head');y=para(c,'D17 and the resin are not two halves of a hidden identification puzzle. One is a record discrepancy; the other has an innocent physical explanation. The town’s ordinary competence is real. The viewer should want to stay in the Burrow before fearing for it.',M,y,CW)
done(y);c.save();main=fitz.open(stream=b.getvalue(),filetype='pdf');assert len(main)==29,len(main)
# Complete stories retain breathing room and actual prose flow.
sb=io.BytesIO();doc=SimpleDocTemplate(sb,pagesize=(W,H),leftMargin=M+8,rightMargin=M+8,topMargin=65,bottomMargin=65);flow=[]
for i,s in enumerate(ST):
 if i:flow.append(PageBreak())
 flow.extend([Paragraph(html.escape(s['title']),S['title']),Paragraph(html.escape(s['location']+' / '+str(s['word_count'])+' words'),S['head']),Paragraph(html.escape(s['placement']),S['small']),Spacer(1,12)])
 flow.extend(Paragraph(html.escape(p),S['story']) for p in s['text'].split('\n\n'))
doc.build(flow,onFirstPage=lambda cc,dd:base(cc,29+dd.page,'COMPLETE STORIES'),onLaterPages=lambda cc,dd:base(cc,29+dd.page,'COMPLETE STORIES'));stories_pdf=fitz.open(stream=sb.getvalue(),filetype='pdf');main.insert_pdf(stories_pdf)
bb=io.BytesIO();c=canvas.Canvas(bb,pagesize=(W,H));base(c,len(main)+1,'CONTINUITY HANDOFF');y=para(c,'Decisions that stay fixed',M,776,CW,'title')
for q in D['canon_clarifications']:
 y=para(c,q['topic'],M,y-4,CW,'head');y=para(c,q['rule'],M,y,CW)
y=para(c,'Production use',M,y-7,CW,'head');y=para(c,'Open a location ID, then its measured sheet, before staging action. Record a story date and what each character knows. Use the existing cards for likenesses and approved voices; no new voice is assigned here. The complete stories and future choices remain authored options until the episode ledger adopts them.',M,y,CW)
assert y>55,y;c.showPage();c.save();main.insert_pdf(fitz.open(stream=bb.getvalue(),filetype='pdf'));main.save(O/'MADGER_Conflict_Bible.pdf',garbage=4,deflate=True)
plans=fitz.open()
for l in D['locations']:
 s=(R/'plans'/('TH-'+l['id']+'.svg')).read_bytes();doc=fitz.open(stream=s,filetype='svg');plans.insert_pdf(fitz.open(stream=doc.convert_to_pdf(),filetype='pdf'))
plans.set_metadata({'title':'MADGER - Threat Location Blueprints / 3.2','author':'MADGER World Development'});plans.save(O/'MADGER_Threat_Location_Blueprints.pdf',garbage=4,deflate=True)
(R/'output/Volume_Index.json').write_text(json.dumps({'edition':'3.2.0','conflict_pages':len(main),'blueprint_pages':len(plans),'sections':section_pages,'story_start_page':30},indent=2));print({'conflict_pages':len(main),'blueprint_pages':len(plans)})
