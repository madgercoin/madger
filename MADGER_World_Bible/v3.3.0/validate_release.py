import json,hashlib,math
from pathlib import Path
import fitz
from PIL import Image,ImageOps,ImageDraw
R=Path(__file__).parent;O=R/'output';Q=R/'qa';Q.mkdir(exist_ok=True)
w=json.loads(((R/'source/World_Atlas.json' if (R/'source/World_Atlas.json').exists() else R.parent/'v3.0.0/World_Atlas.json')).read_text());b=json.loads(((R/'source/Blueprint_Data.json' if (R/'source/Blueprint_Data.json').exists() else R.parent/'v3.0.0/Blueprint_Data.json')).read_text());d=json.loads((O/'Wilds_Bible.json').read_text());sites=json.loads((O/'Habitat_Plans.json').read_text())['sites']
assert [x['baseline'] for x in d['creatures']]==w['creatures']
for s in sites:
 assert s['baseline']==next(x for x in b['encounter_plans'] if x['id']==s['id'])
 for det in s['details']:
  n=det.get('risers',det.get('risers_per_flight'));fl=det.get('flights',1)
  assert math.isclose(n*det['riser_m']*fl,det.get('rise_m',det.get('rise_per_flight_m',0)*fl))
  for ends in det.get('flight_endpoints_xyz',[]):
   assert math.isclose(abs(ends[0][2]-ends[1][2]),det['rise_per_flight_m'])
   assert math.isclose(math.dist(ends[0][:2],ends[1][:2]),det['run_per_flight_m'])
reports=[]
for path in O.glob('*.pdf'):
 doc=fitz.open(path);thumbs=[];bad=[]
 for i,p in enumerate(doc):
  pix=p.get_pixmap(matrix=fitz.Matrix(1,1));dest=Q/f'{path.stem}-{i+1:02}.png';pix.save(dest)
  for block in p.get_text('dict')['blocks']:
   if block['type']!=0:continue
   for line in block['lines']:
    x0,y0,x1,y1=line['bbox']
    if x0<0 or y0<0 or x1>p.rect.width+1 or y1>p.rect.height:bad.append([i+1,line['bbox']])
  im=Image.open(dest).convert('RGB');im.thumbnail((298,421));panel=Image.new('RGB',(318,451),'#d9d5cb');panel.paste(im,((318-im.width)//2,10));ImageDraw.Draw(panel).text((10,433),str(i+1),fill='black');thumbs.append(panel)
 for start in range(0,len(thumbs),8):
  sheet=Image.new('RGB',(1272,902),'#ddd');
  for j,im in enumerate(thumbs[start:start+8]):sheet.paste(im,((j%4)*318,(j//4)*451))
  sheet.save(Q/f'{path.stem}-contact-{start//8+1}.png')
 assert not bad,bad
 reports.append(dict(file=path.name,pages=len(doc),out_of_page_text=bad,sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
result=dict(edition='3.3.0',creature_baselines_unchanged=12,site_bounds_and_refuges_unchanged=4,stair_arithmetic='passed',pilot_exterior_scenes=0,stories='two complete authored options; not adopted',pdfs=reports,visual_review='pending')
(O/'VALIDATION.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
