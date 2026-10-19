import { multiply, perspective, lookAt, transform, type Mat4, type Vec3 } from './math';
export type Shape='box'|'sphere'|'rock'|'cylinder'|'cone'|'ring'|'leaf'|'shadow'|'headStripe'|'tail'|'halo';
export type Color=[number,number,number,number];
export type GL=WebGLRenderingContext|WebGL2RenderingContext;
type NativeGL=GL & {endFrameEXP?:()=>void};
const VERTEX=`
precision highp float;
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec4 aM0; attribute vec4 aM1; attribute vec4 aM2; attribute vec4 aM3;
attribute vec4 aColor;
uniform mat4 uVP;
varying vec3 vWorld; varying vec3 vNormal; varying vec3 vLocal; varying vec4 vColor;
void main(){
 mat4 model=mat4(aM0,aM1,aM2,aM3);
 vec4 p=model*vec4(aPosition,1.0);vWorld=p.xyz;vLocal=aPosition;
 vNormal=normalize(aM0.xyz*aNormal.x/max(dot(aM0.xyz,aM0.xyz),0.00001)+aM1.xyz*aNormal.y/max(dot(aM1.xyz,aM1.xyz),0.00001)+aM2.xyz*aNormal.z/max(dot(aM2.xyz,aM2.xyz),0.00001));
 vColor=aColor;gl_Position=uVP*p;
}`;
// World-space grain uses long course coordinates, which can overflow mediump on mobile GPUs.
const FRAGMENT=`
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec3 uEye;uniform vec3 uFog;uniform vec2 uFogRange;uniform float uTime;uniform float uTravel;
varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;varying vec4 vColor;
#ifdef GL_FRAGMENT_PRECISION_HIGH
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
#else
float hash(vec2 p){p=mod(p,vec2(32.0));return fract(sin(dot(p,vec2(17.13,41.7)))*437.58545);}
#endif
void main(){
 if(vColor.a < -5.5){float a=max(0.0,1.0-dot(vLocal.xy,vLocal.xy));gl_FragColor=vec4(vColor.rgb*1.8,a*a*.38);return;}
 if(vColor.a < -2.5 && vColor.a > -3.5){float a=max(0.0,1.0-dot(vLocal.xz,vLocal.xz));gl_FragColor=vec4(0.015,0.016,0.018,a*a*.32);return;}
 vec3 n=normalize(vNormal),view=normalize(uEye-vWorld);
 vec3 base=vColor.rgb;float em=max(0.0,vColor.a);
 if(vColor.a < -.5 && vColor.a > -1.5){vec2 surface=vec2(vWorld.x,uTravel-vWorld.z);
 float grain=hash(floor(mod(surface,vec2(32.0))*24.0));
 float mottling=sin(surface.x*2.13+sin(surface.y*.75))*sin(surface.y*1.84);
 float edge=max(smoothstep(.455,.499,abs(vLocal.x)),smoothstep(.468,.499,abs(vLocal.z)));
 base*=.89+grain*.14+mottling*.05;base*=1.0-edge*.24;}
 if(vColor.a < -1.5 && vColor.a > -2.5){
   float wave=sin(vWorld.x*3.0+uTime*1.4)*sin((uTravel-vWorld.z)*1.7-uTime*.8);
   n=normalize(n+vec3(wave*.10,0.0,sin((uTravel-vWorld.z)*4.0+uTime)*.07));
   base=mix(base,vec3(.13,.32,.31),.12+.1*wave);
 }
 if(vColor.a < -3.5){
 float fibre=hash(floor(vLocal.xy*260.0+vLocal.z*73.0));
 base*=.87+fibre*.25;
 if(vColor.a < -4.5){float chevron=sin(vLocal.z*18.0+abs(vLocal.x)*7.5);
 float t=clamp(vLocal.z/1.26,0.0,1.0);float centre=.14*sin(t*3.14159265)+.26*t*t;
 float dorsal=smoothstep(-.03,.10,vLocal.y-centre);
 base=mix(base,vec3(.86,.68,.38),smoothstep(.17,.35,chevron)*.91*dorsal);}
 n=normalize(n+vec3(sin(vLocal.y*175.0+vLocal.x*92.0)*.025,0.0,sin(vLocal.x*130.0)*.026));
 }
 float sun=max(0.0,dot(n,normalize(vec3(-.45,.85,.45))));
 float rim=pow(1.0-max(0.0,dot(n,view)),3.0);
 float spec=pow(max(0.0,dot(n,normalize(view+normalize(vec3(-.45,.85,.45))))),36.0);
 vec3 light=vec3(.16,.20,.22)+vec3(.82,.65,.41)*sun+vec3(.12,.21,.21)*max(0.0,n.y);
 vec3 lamp=vec3(sign(vWorld.x)*4.0-vWorld.x,2.45-vWorld.y,mod(uTravel-vWorld.z+10.0,20.0)-10.0);
 float falloff=1.0/(1.0+dot(lamp,lamp)*.24);
 light+=vec3(.75,.36,.09)*falloff*(.4+.6*max(0.0,dot(n,normalize(lamp))))*(.98+.02*sin(uTime*6.0));
 vec3 lit=base*light+base*em*1.15+vec3(.22,.30,.28)*rim*.24+vec3(1.0,.86,.58)*spec*(vColor.a < -3.5 ? .012 : .10);
 float fog=smoothstep(uFogRange.x,uFogRange.y,length(uEye-vWorld));lit=mix(lit,uFog,fog);
 lit=lit/(lit+vec3(.65));gl_FragColor=vec4(pow(max(lit,vec3(0.0)),vec3(.4545)),1.0);
}`;
function triangle(vertices:number[],a:Vec3,b:Vec3,c:Vec3,normal?:Vec3) {
 let n=normal;if(!n){const u=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],v=[c[0]-a[0],c[1]-a[1],c[2]-a[2]];
 const t:[number,number,number]=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...t)||1;n=[t[0]/l,t[1]/l,t[2]/l];}
 for(const p of [a,b,c])vertices.push(...p,...n);
}
function geometry(shape:Shape) {
 const v:number[]=[];
 if(shape==='box') {
  const faces:{n:Vec3;p:Vec3[]}[]=[
   {n:[0,0,1],p:[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]},
   {n:[0,0,-1],p:[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]},
   {n:[1,0,0],p:[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]]},
   {n:[-1,0,0],p:[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]]},
   {n:[0,1,0],p:[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]]},
   {n:[0,-1,0],p:[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]},
  ];for(const f of faces){triangle(v,f.p[0],f.p[1],f.p[2],f.n);triangle(v,f.p[0],f.p[2],f.p[3],f.n);}
 }else if(shape==='headStripe'){
  const point=(i:number,side:number):Vec3=>{const a=-1.29+i/64*3.65;const zig=[.00,.04,-.018,.05,-.023][i%5];const x=side*(.12+((i%4===0)?.03:0))+zig;const f=Math.sqrt(1-(x/.676)**2);return [x,.616*Math.cos(a)*f,-.03+.546*Math.sin(a)*f];};
  for(let i=0;i<64;i++){triangle(v,point(i,-1),point(i,1),point(i+1,-1));triangle(v,point(i,1),point(i+1,1),point(i+1,-1));}
 }else if(shape==='tail'){return tailGeometry(0,0);
 }else if(shape==='sphere'||shape==='rock'){
  const slices=shape==='rock'?9:16,stacks=shape==='rock'?5:10;
  const point=(i:number,j:number):Vec3=>{const a=i/slices*Math.PI*2,b=j/stacks*Math.PI,r=shape==='rock'?(1+.09*Math.sin(a*3+b*5)+.05*Math.cos(a*7-b*2)):1;return [Math.sin(b)*Math.cos(a)*r,Math.cos(b)*r,Math.sin(b)*Math.sin(a)*r];};
  const push=(p:Vec3)=>{const l=Math.hypot(...p);v.push(...p,p[0]/l,p[1]/l,p[2]/l);};
  for(let j=0;j<stacks;j++)for(let i=0;i<slices;i++){
   const a=point(i,j),b=point(i+1,j),c=point(i+1,j+1),d=point(i,j+1);
   if(shape==='rock'){triangle(v,a,b,d);triangle(v,b,c,d);}else{for(const p of [a,b,d,b,c,d])push(p);}
  }
 }else if(shape==='cylinder'||shape==='cone'){
  const n=12;for(let i=0;i<n;i++){
   const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;
   const p:Vec3=[Math.cos(a),-.5,Math.sin(a)],q:Vec3=[Math.cos(b),-.5,Math.sin(b)];
   if(shape==='cone'){triangle(v,p,[0,.5,0],q);}else {
    const t:Vec3=[p[0],.5,p[2]],u:Vec3=[q[0],.5,q[2]];
    triangle(v,p,t,q,[Math.cos((a+b)/2),0,Math.sin((a+b)/2)]);triangle(v,q,t,u,[Math.cos((a+b)/2),0,Math.sin((a+b)/2)]);triangle(v,t,[0,.5,0],u,[0,1,0]);
   }triangle(v,p,q,[0,-.5,0],[0,-1,0]);
  }
 }else if(shape==='ring'){
  const p=(i:number,j:number):Vec3=>{const a=i/22*Math.PI*2,b=j/6*Math.PI*2;return [(1+.07*Math.cos(b))*Math.cos(a),.07*Math.sin(b),(1+.07*Math.cos(b))*Math.sin(a)];};
  for(let i=0;i<22;i++)for(let j=0;j<6;j++){triangle(v,p(i,j),p(i+1,j),p(i,j+1));triangle(v,p(i+1,j),p(i+1,j+1),p(i,j+1));}
 }else if(shape==='halo'){
 triangle(v,[-1,-1,0],[1,-1,0],[1,1,0],[0,0,1]);triangle(v,[-1,-1,0],[1,1,0],[-1,1,0],[0,0,1]);
 }else if(shape==='leaf'){
  triangle(v,[0,0,0],[-.5,.12,.6],[0,0,1]);triangle(v,[0,0,0],[0,0,1],[.5,.12,.6]);
 }else{triangle(v,[-1,0,-1],[1,0,1],[1,0,-1],[0,1,0]);triangle(v,[-1,0,-1],[-1,0,1],[1,0,1],[0,1,0]);}
 return new Float32Array(v);
}
function tailGeometry(time:number,bank:number){
 const v:number[]=[];const rings=16,sides=14;
 const point=(i:number,j:number):{p:Vec3;n:Vec3}=>{
  const t=i/rings,a=j/sides*Math.PI*2;
  const radius=Math.max(.022,(.22+.17*Math.sin(Math.PI*t))*(1-t*t*.82));
  const cy=.14*Math.sin(t*Math.PI)+.26*t*t;
  const cx=Math.sin(time*3.1-t*2.8)*.13*t*t-bank*t*.15;
  const r=radius*(1+.025*Math.sin(a*7+t*80));
  return {p:[cx+Math.cos(a)*r,cy+Math.sin(a)*r,t*1.26],n:[Math.cos(a),Math.sin(a),(.15+t*.35)]};
 };
 for(let i=0;i<rings;i++)for(let j=0;j<sides;j++)for(const q of [point(i,j),point(i+1,j),point(i,j+1),point(i+1,j),point(i+1,j+1),point(i,j+1)]){const l=Math.hypot(...q.n);v.push(...q.p,q.n[0]/l,q.n[1]/l,q.n[2]/l);}
 return new Float32Array(v);
}
const colorCache=new Map<string,Color>();
export function color(hex:string,material=0):Color {
 const key=hex+':'+material;const cached=colorCache.get(key);if(cached)return cached;
 const n=parseInt(hex.replace('#',''),16);const c:Color=[Math.pow(((n>>16)&255)/255,2.2),Math.pow(((n>>8)&255)/255,2.2),Math.pow((n&255)/255,2.2),material];colorCache.set(key,c);return c;
}
type Batch={vertex:WebGLBuffer;instances:WebGLBuffer;vertices:number;data:Float32Array;count:number;};
export class ExpeditionRenderer {
 private gl:NativeGL;private program:WebGLProgram;private batches=new Map<Shape,Batch>();
 private uniforms:{vp:WebGLUniformLocation;eye:WebGLUniformLocation;fog:WebGLUniformLocation;range:WebGLUniformLocation;time:WebGLUniformLocation;travel:WebGLUniformLocation};
 private divisor:((i:number,v:number)=>void)|null=null;private drawInstanced:((mode:number,first:number,count:number,instances:number)=>void)|null=null;
 private dead=false;public stats={instances:0,drawCalls:0,triangles:0};
 constructor(gl:GL){
  this.gl=gl as NativeGL;
  const compile=(type:number,source:string)=>{const s=gl.createShader(type);if(!s)throw Error('Could not allocate a GPU shader');gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error('3D shader: '+message);}return s;};
  const vert=compile(gl.VERTEX_SHADER,VERTEX),frag=compile(gl.FRAGMENT_SHADER,FRAGMENT),program=gl.createProgram();if(!program)throw Error('Could not allocate GPU program');
  gl.attachShader(program,vert);gl.attachShader(program,frag);['aPosition','aNormal','aM0','aM1','aM2','aM3','aColor'].forEach((name,i)=>gl.bindAttribLocation(program,i,name));gl.linkProgram(program);gl.deleteShader(vert);gl.deleteShader(frag);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){const message=gl.getProgramInfoLog(program);gl.deleteProgram(program);throw Error('3D program: '+message);}this.program=program;
  const uniform=(name:string)=>{const u=gl.getUniformLocation(program,name);if(u===null)throw Error('Missing shader uniform '+name);return u;};
  this.uniforms={vp:uniform('uVP'),eye:uniform('uEye'),fog:uniform('uFog'),range:uniform('uFogRange'),time:uniform('uTime'),travel:uniform('uTravel')};
  const g=gl as WebGL2RenderingContext;
  if(typeof g.drawArraysInstanced==='function'){this.drawInstanced=g.drawArraysInstanced.bind(g);this.divisor=g.vertexAttribDivisor.bind(g);}else{
   const ext=gl.getExtension('ANGLE_instanced_arrays');if(ext){this.drawInstanced=ext.drawArraysInstancedANGLE.bind(ext);this.divisor=ext.vertexAttribDivisorANGLE.bind(ext);}
  }
  for(const shape of ['box','sphere','rock','cylinder','cone','ring','leaf','headStripe','tail','shadow','halo'] as Shape[]){
   const data=geometry(shape),vertex=gl.createBuffer(),instances=gl.createBuffer();if(!vertex||!instances)throw Error('GPU buffer allocation failed');
   gl.bindBuffer(gl.ARRAY_BUFFER,vertex);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
   this.batches.set(shape,{vertex,instances,vertices:data.length/6,data:new Float32Array(20*4096),count:0});
  }
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
 }
 updateTail(time:number,bank:number){const b=this.batches.get('tail')!;const data=tailGeometry(time,bank);this.gl.bindBuffer(this.gl.ARRAY_BUFFER,b.vertex);this.gl.bufferData(this.gl.ARRAY_BUFFER,data,this.gl.DYNAMIC_DRAW);b.vertices=data.length/6;}
 reset(){for(const b of this.batches.values())b.count=0;this.stats={instances:0,drawCalls:0,triangles:0};}
 add(shape:Shape,matrix:Mat4,c:Color){const b=this.batches.get(shape)!;if(b.count>=4096)return;const offset=b.count*20;b.data.set(matrix,offset);b.data.set(c,offset+16);b.count++;}
 shape(shape:Shape,c:Color,x:number,y:number,z:number,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,parent?:Mat4){const t=transform(x,y,z,sx,sy,sz,rx,ry,rz);this.add(shape,parent?multiply(parent,t):t,c);}
 render(eye:Vec3,target:Vec3,time:number,zone:number,travel=0){
  if(this.dead)return;const gl=this.gl,width=gl.drawingBufferWidth,height=gl.drawingBufferHeight;if(width<2||height<2)return;
  const fog:Vec3=zone===0?[.024,.060,.057]:zone===1?[.024,.045,.057]:[.036,.026,.075];
  const sky=fog.map(x=>Math.pow(x/(x+.65),.4545));gl.viewport(0,0,width,height);gl.clearColor(sky[0],sky[1],sky[2],1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(this.program);const vp=multiply(perspective(2*Math.atan(Math.max(Math.tan(33*Math.PI/180),Math.tan(17*Math.PI/180)/(width/height))),width/height,.1,180),lookAt(eye,target));
  gl.uniformMatrix4fv(this.uniforms.vp,false,vp);gl.uniform3f(this.uniforms.eye,eye[0],eye[1],eye[2]);gl.uniform3f(this.uniforms.fog,fog[0],fog[1],fog[2]);gl.uniform2f(this.uniforms.range,30,115);gl.uniform1f(this.uniforms.time,time);gl.uniform1f(this.uniforms.travel,travel);
  for(const [shape,b] of this.batches){if(!b.count)continue;
   if(shape==='shadow'||shape==='halo'){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,shape==='halo'?gl.ONE:gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);}else{gl.disable(gl.BLEND);gl.depthMask(true);}
   gl.bindBuffer(gl.ARRAY_BUFFER,b.vertex);gl.enableVertexAttribArray(0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);
   if(this.divisor&&this.drawInstanced){
    this.divisor(0,0);this.divisor(1,0);gl.bindBuffer(gl.ARRAY_BUFFER,b.instances);gl.bufferData(gl.ARRAY_BUFFER,b.data.subarray(0,b.count*20),gl.DYNAMIC_DRAW);
    for(let i=2;i<=6;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,4,gl.FLOAT,false,80,(i-2)*16);this.divisor(i,1);}
    this.drawInstanced(gl.TRIANGLES,0,b.vertices,b.count);this.stats.drawCalls++;
    for(let i=2;i<=6;i++)this.divisor(i,0);
   }else{
    for(let i=2;i<=6;i++)gl.disableVertexAttribArray(i);
    for(let j=0;j<b.count;j++){for(let i=2;i<=6;i++)gl.vertexAttrib4fv(i,b.data.subarray(j*20+(i-2)*4,j*20+(i-1)*4));gl.drawArrays(gl.TRIANGLES,0,b.vertices);this.stats.drawCalls++;}
   }
   this.stats.instances+=b.count;this.stats.triangles+=b.count*b.vertices/3;
  }
  gl.depthMask(true);gl.disable(gl.BLEND);gl.flush();if(this.gl.endFrameEXP)this.gl.endFrameEXP();
 }
 dispose(){if(this.dead)return;this.dead=true;try{for(const b of this.batches.values()){this.gl.deleteBuffer(b.vertex);this.gl.deleteBuffer(b.instances);}this.gl.deleteProgram(this.program);}catch{/* A lost context has already freed its GPU resources. */}this.batches.clear();}
}
