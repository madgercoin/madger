/* One graphics request instead of a burst of model/texture requests on reload. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../public/blackroot'),assets=path.join(root,'assets'),files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.name==='audio')continue;const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(/\.(jpg|png|gltf|glb|bin|hdr)$/.test(entry.name))files.push(file);}}
walk(assets);files.sort();let offset=0;
const entries=files.map(file=>{const bytes=fs.readFileSync(file),entry={path:path.relative(assets,file).replaceAll('\\','/'),offset,length:bytes.length};offset+=bytes.length;return {...entry,bytes};});
const metadata=Buffer.from(JSON.stringify(entries.map(({bytes,...entry})=>entry))),size=Buffer.alloc(4);size.writeUInt32LE(metadata.length);
const pack=Buffer.concat([size,metadata,...entries.map(e=>e.bytes)]);fs.writeFileSync(path.join(root,'forest.pack'),pack);
console.log('FOREST_PACK_READY',JSON.stringify({files:entries.length,bytes:pack.length,sha256:crypto.createHash('sha256').update(pack).digest('hex')}));
