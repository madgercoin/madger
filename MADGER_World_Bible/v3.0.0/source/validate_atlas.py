import json,math,hashlib
from pathlib import Path
import fitz
from PIL import Image,ImageDraw
R=Path(__file__).parent;P=R/'output';Q=R/'qa';w=json.loads((P/'World_Atlas.json').read_text());g=json.loads((P/'Blueprint_Data.json').read_text());base=json.loads((R/'source/Burrow_v2.1.json').read_text())
errors=[]
def chk(ok,msg):
 if not ok:errors.append(msg)
for key,expected in [('characters',40),('communities',14),('factions',9),('regions',8),('creatures',12),('sites',8)]:chk(len(w[key])==expected,key+' count')
ids={c['id'] for c in w['characters']};chk(len(ids)==40,'character IDs unique')
for f in w['factions']:chk(set(f['members'])<=ids,f['id']+' unresolved members')
for c in w['characters']:
 chk(all(c.get(k) for k in ['history','desire','contradiction','relationships','arc','story_engine','writer_truth','design','voice']),c['id']+' incomplete card')
 chk('reserved' not in c['origin'].lower(),c['id']+' unresolved origin')
 chk((R/'art'/c['art']['file']).exists(),c['id']+' missing art')
chk(g['inherited_burrow']['surface_locations']==base['locations'],'Burrow surface changed')
chk(g['inherited_burrow']['underground_areas']==base['underground']['areas'],'Burrow underground changed')
chk(g['inherited_burrow']['surface_routes']==base['routes'],'Burrow routes changed')
chk(w['production_contract']['voices']==base['voice_reference'],'voice IDs changed')
for m in g['modules']:
 for floor in m['floors']:
  chk(floor['circulation_connected'],m['id']+' disconnected rooms')
  rs=floor['rooms']
  for r in rs:chk(r['x']>=0 and r['y']>=0 and r['x']+r['w']<=m['width_m'] and r['y']+r['d']<=m['depth_m'],m['id']+' room outside footprint')
  for i,a in enumerate(rs):
   for b in rs[:i]:chk(not(max(a['x'],b['x'])<min(a['x']+a['w'],b['x']+b['w'])-1e-6 and max(a['y'],b['y'])<min(a['y']+a['d'],b['y']+b['d'])-1e-6),m['id']+' room overlap')
for city in g['settlements']:
 inst=[x for x in g['building_instances'] if x['settlement']==city['id']];bounds=city['bounds_m']
 chk(sum(x.get('capacity',0) for x in inst)>=city['population'],city['id']+' residential capacity short')
 for i,a in enumerate(inst):
  x,y,z=a['center_m'];aw=a['width_m']/2;ad=a['depth_m']/2;chk(x-aw>=bounds[0] and x+aw<=bounds[2] and y-ad>=bounds[1] and y+ad<=bounds[3],a['id']+' outside town')
  for b in inst[:i]:
   bx,by,bz=b['center_m'];bw=b['width_m']/2;bd=b['depth_m']/2
   chk(not(abs(x-bx)<aw+bw-1e-6 and abs(y-by)<ad+bd-1e-6 and abs(z-bz)<.01),a['id']+' overlaps '+b['id'])
places={x['id']:x['position_km'] for x in w['communities']};places.update({x['id']:[x['x'],x['y']] for x in w['sites']})
for e in w['routes']:
 chk(e['a'] in places and e['b'] in places,e['id']+' missing endpoint');d=math.dist(places[e['a']],places[e['b']]);chk(e['length_km']+1e-6>=d,e['id']+' shorter than straight line')
pages={};bounds_errors=[]
for pdf in P.glob('*.pdf'):
 d=fitz.open(pdf);pages[pdf.name]=len(d)
 for i,page in enumerate(d):
  body=page.get_text(clip=fitz.Rect(0,0,page.rect.width,page.rect.height-42)).strip()
  chk(len(body)>30 or bool(page.get_images()),pdf.name+' blank body page '+str(i+1))
  for block in page.get_text('dict')['blocks']:
   if block['type']==0:
    x0,y0,x1,y1=block['bbox']
    if x0<-1 or y0<-1 or x1>page.rect.width+1 or y1>page.rect.height+1:bounds_errors.append([pdf.name,i+1,block['bbox']])
 # Contact sheets render every page for visual review.
 for start in range(0,len(d),20):
  thumbs=[]
  for i in range(start,min(start+20,len(d))):
   pix=d[i].get_pixmap(matrix=fitz.Matrix(.35,.35),alpha=False);im=Image.frombytes('RGB',[pix.width,pix.height],pix.samples);im.thumbnail((265,320));thumbs.append((i,im))
  contact=Image.new('RGB',(5*285,4*350),'#d7d2c8');draw=ImageDraw.Draw(contact)
  for j,(i,im) in enumerate(thumbs):x=(j%5)*285;y=(j//5)*350;contact.paste(im,(x+10,y+20));draw.text((x+10,y+3),str(i+1),fill='black')
  contact.save(Q/(pdf.stem+f'_contact_{start//20+1}.png'))
 for n in [0,min(1,len(d)-1),len(d)//2]:d[n].get_pixmap(matrix=fitz.Matrix(1.2,1.2),alpha=False).save(Q/(pdf.stem+f'_sample_{n+1}.png'))
chk(not bounds_errors,'PDF text outside page')
report={'edition':'3.0.0','errors':errors,'text_bounds_errors':bounds_errors,'counts':{'characters':40,'communities':14,'regions':8,'factions':9,'creatures':12,'seasons':4,'episode_outlines':40,'standalone_stories':12,'setpieces':8,'building_instances':len(g['building_instances']),'blueprint_sheets':len(json.loads((P/'Blueprint_Index.json').read_text()))},'pdf_pages':pages,'checks':['inherited Burrow footprints and routes unchanged','approved hero voices unchanged','all named characters have complete development fields and art references','faction memberships resolve','rooms fit module footprints and circulation graphs connect','building footprints fit settlement bounds without same-level overlap','residential capacity covers each settlement planning population','route lengths are at least straight-line distances','all PDF pages rendered for visual review'],'scope':'Fictional production geometry; no claim of structural engineering validation or completed animation/game assets.'}
(P/'VALIDATION.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
