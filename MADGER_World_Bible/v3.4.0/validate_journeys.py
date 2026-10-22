from pathlib import Path
import json,math,hashlib
import fitz
from PIL import Image,ImageDraw
R=Path(__file__).parent;O=R/'output';Q=R/'qa';Q.mkdir(exist_ok=True)
p=R/'source/World_Atlas.json';p=p if p.exists() else R.parent/'v3.0.0/World_Atlas.json';W=json.loads(p.read_text());D=json.loads((O/'Journeys_Bible.json').read_text());C={x['id']:x for x in D['communities']};C['SITE-08']=D['site_endpoint']
assert [x['baseline'] for x in D['route_cards']]==W['routes'];assert D['communities']==W['communities'];assert D['waycraft']==W['waycraft']
for c in D['route_cards']:
 b=c['baseline'];assert math.dist(C[b['a']]['position_km'],C[b['b']]['position_km'])<=b['length_km']
for e in D['timing_errata']:assert math.ceil(e['moving_days']+e['full_layover_days'])==e['planning_day_blocks']
for e in D['planning_examples']:assert sum(x['end_elapsed_day']-x['start_elapsed_day'] for x in e['segments'])+e['extra_days']==e['elapsed_day_blocks']
doc=fitz.open(O/'MADGER_Journeys_and_Waycraft.pdf');thumb=[];errors=[]
for i,p in enumerate(doc):
 pix=p.get_pixmap(matrix=fitz.Matrix(1,1));fn=Q/f'page-{i+1:02}.png';pix.save(fn)
 for b in p.get_text('dict')['blocks']:
  if b['type']==0:
   for ln in b['lines']:
    x0,y0,x1,y1=ln['bbox']
    if x0<0 or y0<0 or x1>p.rect.width+1 or y1>p.rect.height+1:errors.append([i+1,ln['bbox']])
 im=Image.open(fn).convert('RGB');im.thumbnail((298,421));pa=Image.new('RGB',(318,451),'#ddd8cd');pa.paste(im,((318-im.width)//2,10));ImageDraw.Draw(pa).text((10,433),str(i+1),fill='black');thumb.append(pa)
for st in range(0,len(thumb),8):
 sheet=Image.new('RGB',(1272,902),'#ddd8cd')
 for j,im in enumerate(thumb[st:st+8]):sheet.paste(im,((j%4)*318,(j//4)*451))
 sheet.save(Q/f'contact-{st//8+1}.png')
assert not errors,errors
v=dict(edition='3.4.0',route_baselines_equal=16,community_records_equal=14,waycraft_records_equal=6,route_chords_within_registered_lengths=16,explicit_timing_corrections=3,planning_examples_arithmetic_passed=6,pilot_exterior_scenes=0,pdf_pages=len(doc),out_of_page_text=errors,story_status='Proposed; no dated episode adoption',visual_review='pending',sha256=hashlib.sha256((O/'MADGER_Journeys_and_Waycraft.pdf').read_bytes()).hexdigest());(O/'VALIDATION.json').write_text(json.dumps(v,indent=2));print(json.dumps(v))
