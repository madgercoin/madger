import { multiply, perspective, lookAt, transform, type Mat4, type Vec3 } from './math';
export type Shape='box'|'sphere'|'rock'|'cylinder'|'cone'|'ring'|'leaf'|'shadow'|'headStripe'|'tail'|'halo'|'ridge'|'face';
export type Color=[number,number,number,number];
export type GL=WebGLRenderingContext|WebGL2RenderingContext;
type NativeGL=GL & {endFrameEXP?:()=>void;flushEXP?:()=>void};
export type SceneryBudget=0|1|2;
export type SceneryBudgetState={level:SceneryBudget;fastFrames:number;slowFrames:number};
/** Bound native fragment work independently of the phone's high-density UI.
 * A 1440p screen otherwise shades millions of pixels for every overlapping
 * tree/particle, even after distant geometry has been culled. */
export function nativeSceneSize(width:number,height:number,budget:SceneryBudget){
 const scale=Math.min([.55,.75,1][budget],Math.sqrt(800000/Math.max(1,width*height)));
 return {width:Math.max(1,Math.floor(width*scale)),height:Math.max(1,Math.floor(height*scale))};
}
/** Offscreen scene only; React Native text and controls stay at device resolution.
 * Expo maps bindFramebuffer(null) to its presentation buffer. Its native
 * getParameter does not implement FRAMEBUFFER_BINDING, unlike browser WebGL. */
export class NativeSceneTarget {
 private framebuffer:WebGLFramebuffer;private texture:WebGLTexture;private depth:WebGLRenderbuffer;
 private program:WebGLProgram;private quad:WebGLBuffer;private sampler:WebGLUniformLocation;
 private width=0;private height=0;private output:WebGLFramebuffer|null=null;
 constructor(private gl:GL){
  const framebuffer=gl.createFramebuffer(),texture=gl.createTexture(),depth=gl.createRenderbuffer(),quad=gl.createBuffer();
  if(!framebuffer||!texture||!depth||!quad)throw Error('Native scene target allocation failed');
  this.framebuffer=framebuffer;this.texture=texture;this.depth=depth;this.quad=quad;
  const shaders=[
   [gl.VERTEX_SHADER,'attribute vec2 aPosition;varying vec2 vUV;void main(){vUV=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}'],
   [gl.FRAGMENT_SHADER,'precision mediump float;uniform sampler2D uScene;varying vec2 vUV;void main(){gl_FragColor=texture2D(uScene,vUV);}'],
  ] as const;
  const program=gl.createProgram();if(!program)throw Error('Native scene composite allocation failed');
  this.program=program;
  for(const [type,source]of shaders){const shader=gl.createShader(type);if(!shader)throw Error('Native composite shader allocation failed');gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Native composite shader: '+gl.getShaderInfoLog(shader));gl.attachShader(program,shader);gl.deleteShader(shader);}
  gl.bindAttribLocation(program,0,'aPosition');gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Native composite: '+gl.getProgramInfoLog(program));
  const sampler=gl.getUniformLocation(program,'uScene');if(sampler===null)throw Error('Native composite sampler unavailable');this.sampler=sampler;
  gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.bindTexture(gl.TEXTURE_2D,null);
 }
 begin(width:number,height:number,budget:SceneryBudget){
  const gl=this.gl,size=nativeSceneSize(width,height,budget);
  this.output=typeof (gl as NativeGL).flushEXP==='function'?null:gl.getParameter(gl.FRAMEBUFFER_BINDING);
  gl.bindFramebuffer(gl.FRAMEBUFFER,this.framebuffer);
  if(size.width!==this.width||size.height!==this.height){
   gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,size.width,size.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
   gl.bindRenderbuffer(gl.RENDERBUFFER,this.depth);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,size.width,size.height);
   gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.texture,0);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,this.depth);
   if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){gl.bindFramebuffer(gl.FRAMEBUFFER,this.output);throw Error('Native scene framebuffer is incomplete');}
   this.width=size.width;this.height=size.height;gl.bindTexture(gl.TEXTURE_2D,null);gl.bindRenderbuffer(gl.RENDERBUFFER,null);
  }
  gl.viewport(0,0,this.width,this.height);return size;
 }
 present(width:number,height:number){
  const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,this.output);gl.viewport(0,0,width,height);
  gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.depthMask(false);gl.useProgram(this.program);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform1i(this.sampler,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
  for(let i=1;i<=6;i++)gl.disableVertexAttribArray(i);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);gl.bindTexture(gl.TEXTURE_2D,null);gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
 }
 dispose(){const gl=this.gl;gl.deleteFramebuffer(this.framebuffer);gl.deleteRenderbuffer(this.depth);gl.deleteTexture(this.texture);gl.deleteBuffer(this.quad);gl.deleteProgram(this.program);}
}
/** Only noninteractive distant dressing scales down: controls, lanes, traps,
 * branch gates, rewards and persisted state are never changed by this budget.
 * The native command queue can drain slowly on software and older mobile GPUs. */
export function adaptNativeSceneryBudget(state:SceneryBudgetState,drainMs:number):SceneryBudgetState {
 if(!Number.isFinite(drainMs)||drainMs<0)return state;
 if(drainMs>=90)return {level:Math.max(0,state.level-1) as SceneryBudget,fastFrames:0,slowFrames:0};
 if(drainMs>=45){
  const slowFrames=state.slowFrames+1;
  return slowFrames>=2?{level:Math.max(0,state.level-1) as SceneryBudget,fastFrames:0,slowFrames:0}
    :{...state,fastFrames:0,slowFrames};
 }
 if(drainMs<=20){
  const fastFrames=state.fastFrames+1;
  return fastFrames>=150?{level:Math.min(2,state.level+1) as SceneryBudget,fastFrames:0,slowFrames:0}
    :{...state,fastFrames,slowFrames:0};
 }
 return {...state,fastFrames:0,slowFrames:0};
}
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
uniform sampler2D uPortrait;
uniform vec3 uEye;uniform vec3 uFog;uniform vec2 uFogRange;uniform float uTime;uniform float uTravel;
varying vec3 vWorld;varying vec3 vNormal;varying vec3 vLocal;varying vec4 vColor;
#ifdef GL_FRAGMENT_PRECISION_HIGH
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
#else
float hash(vec2 p){p=mod(p,vec2(32.0));return fract(sin(dot(p,vec2(17.13,41.7)))*437.58545);}
#endif
void main(){
 if(vColor.a < -9.5 && vColor.a > -10.5){
  vec2 uv=vec2(vLocal.x/1.18+.5,vLocal.y/1.07+.5);
  float radius=length((uv-vec2(.5))/vec2(.52,.53));
  float mask=1.0-smoothstep(.83,1.02,radius);if(mask<.02)discard;
  vec3 portrait=texture2D(uPortrait,vec2(.285,.595)+uv*vec2(.43,.30)).rgb;
  float light=.84+.16*max(0.0,dot(normalize(vNormal),normalize(vec3(-.4,.8,-.8))));
  gl_FragColor=vec4(portrait*light,mask);return;
 }
 if(vColor.a < -10.5 && vColor.a > -11.5 && vLocal.z < .08)discard;
 // Outdoor sky is an eye-centred instanced sphere in the existing sphere
 // batch. World-space angular bands add animated clouds and a real horizon
 // without a postprocess pass, extra GL program, or additional draw call.
 if(vColor.a < -8.5 && vColor.a > -9.5){
  vec3 direction=normalize(vLocal);
  float height=smoothstep(-.16,.70,direction.y);
  vec3 horizon=vColor.rgb;
  vec3 zenith=vec3(.095,.19,.29);
  vec3 atmosphere=mix(horizon,zenith,height);
  float azimuth=atan(direction.x,direction.z);
  float drift=uTime*.023;
  float cloudWave=sin(azimuth*9.0+direction.y*17.0+drift)
   *sin(azimuth*17.0-direction.y*12.0-drift*.63);
  float cloudBand=smoothstep(.08,.26,direction.y)
   *(1.0-smoothstep(.43,.75,direction.y));
  float cirrus=smoothstep(.37,.76,cloudWave)*cloudBand*.27;
  atmosphere=mix(atmosphere,vec3(.84,.88,.85),cirrus);
  gl_FragColor=vec4(pow(max(atmosphere,vec3(0.0)),vec3(.4545)),1.0);
  return;
 }
 if(vColor.a < -5.5 && vColor.a > -6.5){float a=max(0.0,1.0-dot(vLocal.xy,vLocal.xy));gl_FragColor=vec4(vColor.rgb*1.8,a*a*.38);return;}
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
 if(vColor.a < -3.5 && vColor.a > -5.5){
 float fibre=hash(floor(vLocal.xy*260.0+vLocal.z*73.0));
 base*=.87+fibre*.25;
 if(vColor.a < -4.5){float chevron=sin(vLocal.z*18.0+abs(vLocal.x)*7.5);
 float t=clamp(vLocal.z/1.26,0.0,1.0);float centre=.14*sin(t*3.14159265)+.26*t*t;
 float dorsal=smoothstep(-.03,.10,vLocal.y-centre);
 base=mix(base,vec3(.86,.68,.38),smoothstep(.17,.35,chevron)*.91*dorsal);}
 n=normalize(n+vec3(sin(vLocal.y*175.0+vLocal.x*92.0)*.025,0.0,sin(vLocal.x*130.0)*.026));
 }
 // Authored Overgrown Burrow materials: wood grain follows trunk height, and
 // irregular rock patches are calculated at world scale to avoid tiled cubes.
 if(vColor.a < -6.5 && vColor.a > -7.5){
  float grain=sin(vWorld.y*5.2+sin(vWorld.x*4.7+vWorld.z*3.6)*1.4);
  float grooves=pow(abs(sin(vWorld.y*17.0+vWorld.z*8.0)),10.0);
  float knots=hash(floor(vWorld.xz*7.0+vWorld.y));
  base*=.73+.12*grain+.18*knots-.14*grooves;
  n=normalize(n+vec3(.13*grain,.015,.065*sin(vWorld.y*20.0)));
 }
 if(vColor.a < -7.5 && vColor.a > -8.5){
  vec3 cells=floor(vWorld*5.0);
  float lichen=hash(cells.xz+vec2(cells.y*3.0,cells.y*5.0));
  float mottling=sin(vWorld.x*2.4+vWorld.z*4.1)*sin(vWorld.y*3.3);
  float seams=pow(abs(sin(vWorld.x*7.0+vWorld.z*8.2)),26.0);
  base=mix(base,base*vec3(.65,.92,.73),smoothstep(.53,.85,lichen)*.42);
  base*=.76+.17*mottling+.20*lichen-.10*seams;
  n=normalize(n+vec3(.048*mottling,.036*sin(vWorld.x*11.0),.048*sin(vWorld.z*9.0)));
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
 }else if(shape==='face'){
  // Same curved portrait surface and UV crop as the browser's approved rig.
  const point=(i:number,j:number):Vec3=>{
   const x=(i/24-.5)*1.18,y=(j/22-.5)*1.07;
   return [x,y,-.515*Math.sqrt(Math.max(.015,1-(x/.67)**2-(y/.58)**2))-.065];
  };
  for(let j=0;j<22;j++)for(let i=0;i<24;i++){
   const a=point(i,j),b=point(i+1,j),c=point(i,j+1),d=point(i+1,j+1);
   triangle(v,a,c,b);triangle(v,b,c,d);
  }
 }else if(shape==='ridge'){
  // Coherent sculpted bank: 192 shaded triangles instead of large faceted
  // primitive rocks. Instanced as a single low-cost native GL material batch.
  const nx=12,nz=8;
  const point=(i:number,j:number):Vec3=>{
   const x=-1+i*2/nx,z=-1+j*2/nz;
   const shoulder=Math.pow(Math.max(0,1-Math.abs(x)),.62);
   const crown=.46+.20*Math.sin(x*7.7+z*1.2)+.11*Math.sin(x*16.9-z*2.1)
      +.075*Math.cos(x*25.1+z*6.1);
   const grain=.03*Math.sin(x*15.4+z*12.2)*Math.cos(z*9.1-x*7.7);
   return [x,Math.max(0,shoulder*(crown+grain)),z];
  };
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){
   const a=point(i,j),b=point(i+1,j),c=point(i,j+1),d=point(i+1,j+1);
   triangle(v,a,c,b);triangle(v,b,c,d);
  }
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
const TAIL_RINGS=16,TAIL_SIDES=14;
const TAIL_INDICES=(()=>{
 const indices=new Uint16Array(TAIL_RINGS*TAIL_SIDES*6);let offset=0;
 for(let i=0;i<TAIL_RINGS;i++)for(let j=0;j<TAIL_SIDES;j++){
  const a=i*(TAIL_SIDES+1)+j,b=(i+1)*(TAIL_SIDES+1)+j;
  indices.set([a,b,a+1,b,b+1,a+1],offset);offset+=6;
 }
 return indices;
})();
function tailGeometry(time:number,bank:number,vertices=new Float32Array(TAIL_INDICES.length*6),grid=new Float64Array((TAIL_RINGS+1)*(TAIL_SIDES+1)*6)){
 // Keep shared points in Float64 until expansion so the final Float32 vertices
 // retain the exact original geometry and triangle order without per-frame objects.
 for(let i=0;i<=TAIL_RINGS;i++){
  const t=i/TAIL_RINGS,radius=Math.max(.022,(.22+.17*Math.sin(Math.PI*t))*(1-t*t*.82));
  const cy=.14*Math.sin(t*Math.PI)+.26*t*t,cx=Math.sin(time*3.1-t*2.8)*.13*t*t-bank*t*.15,nz=.15+t*.35;
  for(let j=0;j<=TAIL_SIDES;j++){
   const a=j/TAIL_SIDES*Math.PI*2,cos=Math.cos(a),sin=Math.sin(a),r=radius*(1+.025*Math.sin(a*7+t*80)),length=Math.hypot(cos,sin,nz),offset=(i*(TAIL_SIDES+1)+j)*6;
   grid[offset]=cx+cos*r;grid[offset+1]=cy+sin*r;grid[offset+2]=t*1.26;
   grid[offset+3]=cos/length;grid[offset+4]=sin/length;grid[offset+5]=nz/length;
  }
 }
 for(let i=0;i<TAIL_INDICES.length;i++){
  const source=TAIL_INDICES[i]*6,target=i*6;
  for(let component=0;component<6;component++)vertices[target+component]=grid[source+component];
 }
 return vertices;
}
const COLOR_CACHE_LIMIT=512,colorCache=new Map<string,Color>();
export function color(hex:string,material=0):Color {
 const key=hex+':'+material;const cached=colorCache.get(key);if(cached)return cached;
 const n=parseInt(hex.replace('#',''),16);const c:Color=[Math.pow(((n>>16)&255)/255,2.2),Math.pow(((n>>8)&255)/255,2.2),Math.pow((n&255)/255,2.2),material];
 // Animated emission values are continuous; never retain one cache entry per frame.
 if(colorCache.size>=COLOR_CACHE_LIMIT){const oldest=colorCache.keys().next().value;if(oldest!==undefined)colorCache.delete(oldest);}
 colorCache.set(key,c);return c;
}
type Bounds={center:Vec3;half:Vec3};
function geometryBounds(vertices:Float32Array,bounds:Bounds={center:[0,0,0],half:[0,0,0]}):Bounds {
 const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<vertices.length;i+=6)for(let axis=0;axis<3;axis++){low[axis]=Math.min(low[axis],vertices[i+axis]);high[axis]=Math.max(high[axis],vertices[i+axis]);}
 for(let axis=0;axis<3;axis++){bounds.center[axis]=(low[axis]+high[axis])/2;bounds.half[axis]=(high[axis]-low[axis])/2;}return bounds;
}
function elementIndices(shape:Shape,vertices:Float32Array){
 const count=vertices.length/6,indices=new Uint16Array(count),first=new Map<string|number,number>();
 const bits=new Uint32Array(vertices.buffer,vertices.byteOffset,vertices.length);
 for(let i=0;i<count;i++){
  // Static meshes share only bit-identical positions AND normals. The tail
  // shares stable grid identities, never incidental equality at one pose.
  const o=i*6,key=shape==='tail'?TAIL_INDICES[i]:`${bits[o]},${bits[o+1]},${bits[o+2]},${bits[o+3]},${bits[o+4]},${bits[o+5]}`;
  const previous=first.get(key);if(previous===undefined){first.set(key,i);indices[i]=i;}else indices[i]=previous;
 }
 return indices;
}
type Batch={vertex:WebGLBuffer;instances:WebGLBuffer;elements:WebGLBuffer|null;vertices:number;data:Float32Array;visible:Float32Array;bounds:Bounds;count:number;};
function updateClipPlanes(vp:Mat4,planes:Float64Array){
 // Matrices are column-major; clip inequalities are row 4 +/- rows 1, 2, 3.
 for(let axis=0;axis<3;axis++)for(let side=0;side<2;side++){
  const offset=(axis*2+side)*4,sign=side===0?1:-1;
  for(let component=0;component<4;component++)planes[offset+component]=vp[component*4+3]+sign*vp[component*4+axis];
  const length=Math.hypot(planes[offset],planes[offset+1],planes[offset+2]);
  if(length>0)for(let component=0;component<4;component++)planes[offset+component]/=length;
 }
}
function cullBatch(batch:Batch,planes:Float64Array){
 // Keep submitted data intact: a second render may use a different camera.
 // The reusable upload buffer grows only to this batch's observed workload.
 if(batch.visible.length<batch.count*20)batch.visible=new Float32Array(20*2**Math.ceil(Math.log2(batch.count)));
 const data=batch.data,{center,half}=batch.bounds;let count=0;
 for(let i=0;i<batch.count;i++){
  const o=i*20,x=data[o]*center[0]+data[o+4]*center[1]+data[o+8]*center[2]+data[o+12],y=data[o+1]*center[0]+data[o+5]*center[1]+data[o+9]*center[2]+data[o+13],z=data[o+2]*center[0]+data[o+6]*center[1]+data[o+10]*center[2]+data[o+14];
  let outside=false;
  // The scene uses affine models. An unfamiliar projective model stays visible.
  if(data[o+3]===0&&data[o+7]===0&&data[o+11]===0&&data[o+15]===1)for(let p=0;p<24;p+=4){
   const a=planes[p],b=planes[p+1],c=planes[p+2],d=a*x+b*y+c*z+planes[p+3];
   // Support radius of the transformed local box. This includes rotations,
   // nonuniform/negative scales and shear, without shrinking any mesh bounds.
   const radius=Math.abs(a*data[o]+b*data[o+1]+c*data[o+2])*half[0]+Math.abs(a*data[o+4]+b*data[o+5]+c*data[o+6])*half[1]+Math.abs(a*data[o+8]+b*data[o+9]+c*data[o+10])*half[2];
   const tolerance=1e-5*(1+Math.abs(a*x)+Math.abs(b*y)+Math.abs(c*z)+Math.abs(planes[p+3])+radius);
   if(d+radius < -tolerance){outside=true;break;}
  }
  if(!outside){for(let j=0;j<20;j++)batch.visible[count*20+j]=data[o+j];count++;}
 }
 return count;
}
export class ExpeditionRenderer {
 private gl:NativeGL;private program:WebGLProgram;private batches=new Map<Shape,Batch>();
 private uniforms:{portrait:WebGLUniformLocation;vp:WebGLUniformLocation;eye:WebGLUniformLocation;fog:WebGLUniformLocation;range:WebGLUniformLocation;time:WebGLUniformLocation;travel:WebGLUniformLocation};
 private divisor:((i:number,v:number)=>void)|null=null;private drawInstanced:((mode:number,first:number,count:number,instances:number)=>void)|null=null;
 private drawIndexedInstanced:((mode:number,count:number,type:number,offset:number,instances:number)=>void)|null=null;
 private tailVertices=new Float32Array(TAIL_INDICES.length*6);private tailGrid=new Float64Array((TAIL_RINGS+1)*(TAIL_SIDES+1)*6);
 private clipPlanes=new Float64Array(24);
 private portrait:WebGLTexture|null=null;public portraitReady=false;
 private dead=false;private nativeFrames=0;private sceneryState:SceneryBudgetState={level:2,fastFrames:0,slowFrames:0};
 private sceneTarget:NativeSceneTarget|null=null;
 public sceneryBudget:SceneryBudget=2;
 public stats={instances:0,culledInstances:0,drawCalls:0,indexedDrawCalls:0,triangles:0,nativeDrainMs:0,sceneWidth:0,sceneHeight:0};
 constructor(gl:GL){
  this.gl=gl as NativeGL;
  if(typeof this.gl.flushEXP==='function'){this.sceneryState.level=1;this.sceneryBudget=1;}
  const compile=(type:number,source:string)=>{const s=gl.createShader(type);if(!s)throw Error('Could not allocate a GPU shader');gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error('3D shader: '+message);}return s;};
  const vert=compile(gl.VERTEX_SHADER,VERTEX),frag=compile(gl.FRAGMENT_SHADER,FRAGMENT),program=gl.createProgram();if(!program)throw Error('Could not allocate GPU program');
  gl.attachShader(program,vert);gl.attachShader(program,frag);['aPosition','aNormal','aM0','aM1','aM2','aM3','aColor'].forEach((name,i)=>gl.bindAttribLocation(program,i,name));gl.linkProgram(program);gl.deleteShader(vert);gl.deleteShader(frag);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){const message=gl.getProgramInfoLog(program);gl.deleteProgram(program);throw Error('3D program: '+message);}this.program=program;
  const uniform=(name:string)=>{const u=gl.getUniformLocation(program,name);if(u===null)throw Error('Missing shader uniform '+name);return u;};
  this.uniforms={portrait:uniform('uPortrait'),vp:uniform('uVP'),eye:uniform('uEye'),fog:uniform('uFog'),range:uniform('uFogRange'),time:uniform('uTime'),travel:uniform('uTravel')};
  const g=gl as WebGL2RenderingContext;
  if(typeof g.drawArraysInstanced==='function'){
   this.drawInstanced=g.drawArraysInstanced.bind(g);this.divisor=g.vertexAttribDivisor.bind(g);
   if('drawElementsInstanced' in g&&typeof g.drawElementsInstanced==='function')this.drawIndexedInstanced=g.drawElementsInstanced.bind(g);
  }else{
   const ext=gl.getExtension('ANGLE_instanced_arrays');if(ext){this.drawInstanced=ext.drawArraysInstancedANGLE.bind(ext);this.divisor=ext.vertexAttribDivisorANGLE.bind(ext);if('drawElementsInstancedANGLE' in ext&&typeof ext.drawElementsInstancedANGLE==='function')this.drawIndexedInstanced=ext.drawElementsInstancedANGLE.bind(ext);}
  }
  for(const shape of ['box','sphere','rock','ridge','cylinder','cone','ring','leaf','headStripe','tail','shadow','halo','face'] as Shape[]){
   const data=shape==='tail'?tailGeometry(0,0,this.tailVertices,this.tailGrid):geometry(shape),vertex=gl.createBuffer(),instances=gl.createBuffer();if(!vertex||!instances)throw Error('GPU buffer allocation failed');
   gl.bindBuffer(gl.ARRAY_BUFFER,vertex);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
   let elements:WebGLBuffer|null=null;
   if(this.drawIndexedInstanced&&data.length/6<=65535){elements=gl.createBuffer();if(!elements)throw Error('GPU index buffer allocation failed');gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,elements);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,elementIndices(shape,data),gl.STATIC_DRAW);}
   this.batches.set(shape,{vertex,instances,elements,vertices:data.length/6,data:new Float32Array(20*4096),visible:new Float32Array(0),bounds:geometryBounds(data),count:0});
  }
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);
  if(typeof this.gl.flushEXP==='function'&&gl.getParameter(gl.MAX_TEXTURE_SIZE)>0)this.sceneTarget=new NativeSceneTarget(gl);
 }
 setMadgerPortrait(source:TexImageSource|{localUri:string}){
  const gl=this.gl,texture=gl.createTexture();if(!texture)throw Error('Approved portrait texture allocation failed');
  try{gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source as TexImageSource);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  if(this.portrait)gl.deleteTexture(this.portrait);this.portrait=texture;this.portraitReady=true;
  }catch(error){gl.deleteTexture(texture);throw error;}finally{gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.activeTexture(gl.TEXTURE0);}
 }
 updateTail(time:number,bank:number){const b=this.batches.get('tail')!;const data=tailGeometry(time,bank,this.tailVertices,this.tailGrid);geometryBounds(data,b.bounds);this.gl.bindBuffer(this.gl.ARRAY_BUFFER,b.vertex);this.gl.bufferData(this.gl.ARRAY_BUFFER,data,this.gl.DYNAMIC_DRAW);b.vertices=data.length/6;}
 reset(){for(const b of this.batches.values())b.count=0;this.stats={instances:0,culledInstances:0,drawCalls:0,indexedDrawCalls:0,triangles:0,nativeDrainMs:0,sceneWidth:0,sceneHeight:0};}
 add(shape:Shape,matrix:Mat4,c:Color){const b=this.batches.get(shape)!;if(b.count>=4096)return;const offset=b.count*20;b.data.set(matrix,offset);b.data.set(c,offset+16);b.count++;}
 shape(shape:Shape,c:Color,x:number,y:number,z:number,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0,parent?:Mat4){const t=transform(x,y,z,sx,sy,sz,rx,ry,rz);this.add(shape,parent?multiply(parent,t):t,c);}
 render(eye:Vec3,target:Vec3,time:number,zone:number,travel=0){
  if(this.dead)return;const gl=this.gl,width=gl.drawingBufferWidth,height=gl.drawingBufferHeight;if(width<2||height<2)return;
  const fog:Vec3=zone===0?[.024,.060,.057]:zone===1?[.024,.045,.057]:[.036,.026,.075];
  const sky=fog.map(x=>Math.pow(x/(x+.65),.4545));
  const size=this.sceneTarget?.begin(width,height,this.sceneryBudget)??{width,height};
  this.stats.sceneWidth=size.width;this.stats.sceneHeight=size.height;
  gl.viewport(0,0,size.width,size.height);gl.clearColor(sky[0],sky[1],sky[2],1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(this.program);const vp=multiply(perspective(2*Math.atan(Math.max(Math.tan(33*Math.PI/180),Math.tan(17*Math.PI/180)/(width/height))),width/height,.1,180),lookAt(eye,target));
  updateClipPlanes(vp,this.clipPlanes);
  if(this.portrait){gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.portrait);gl.uniform1i(this.uniforms.portrait,1);gl.activeTexture(gl.TEXTURE0);}
  gl.uniformMatrix4fv(this.uniforms.vp,false,vp);gl.uniform3f(this.uniforms.eye,eye[0],eye[1],eye[2]);gl.uniform3f(this.uniforms.fog,fog[0],fog[1],fog[2]);gl.uniform2f(this.uniforms.range,30,115);gl.uniform1f(this.uniforms.time,time);gl.uniform1f(this.uniforms.travel,travel);
  for(const [shape,b] of this.batches){if(!b.count)continue;
   const count=cullBatch(b,this.clipPlanes);this.stats.culledInstances+=b.count-count;if(!count)continue;
   if(shape==='shadow'||shape==='halo'||shape==='face'){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,shape==='halo'?gl.ONE:gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(shape==='face');}else{gl.disable(gl.BLEND);gl.depthMask(true);}
   gl.bindBuffer(gl.ARRAY_BUFFER,b.vertex);gl.enableVertexAttribArray(0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);
   if(this.divisor&&this.drawInstanced){
    this.divisor(0,0);this.divisor(1,0);gl.bindBuffer(gl.ARRAY_BUFFER,b.instances);gl.bufferData(gl.ARRAY_BUFFER,b.visible.subarray(0,count*20),gl.DYNAMIC_DRAW);
    for(let i=2;i<=6;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,4,gl.FLOAT,false,80,(i-2)*16);this.divisor(i,1);}
    if(b.elements&&this.drawIndexedInstanced){gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b.elements);this.drawIndexedInstanced(gl.TRIANGLES,b.vertices,gl.UNSIGNED_SHORT,0,count);this.stats.indexedDrawCalls++;}else this.drawInstanced(gl.TRIANGLES,0,b.vertices,count);
    this.stats.drawCalls++;
    for(let i=2;i<=6;i++)this.divisor(i,0);
   }else{
    for(let i=2;i<=6;i++)gl.disableVertexAttribArray(i);
    for(let j=0;j<count;j++){for(let i=2;i<=6;i++)gl.vertexAttrib4fv(i,b.visible.subarray(j*20+(i-2)*4,j*20+(i-1)*4));gl.drawArrays(gl.TRIANGLES,0,b.vertices);this.stats.drawCalls++;}
   }
   this.stats.instances+=count;this.stats.triangles+=count*b.vertices/3;
  }
  gl.depthMask(true);gl.disable(gl.BLEND);if(this.sceneTarget){this.sceneTarget.present(width,height);this.stats.drawCalls++;}gl.flush();if(this.gl.endFrameEXP)this.gl.endFrameEXP();
  // Expo presents after draining its native command backlog. Synchronize this
  // frame before a fast JS loop can queue another; otherwise a slow GPU can
  // display seconds-old geometry while the simulation and HUD continue ahead.
  // The web context has no flushEXP and retains its normal browser scheduling.
  if(typeof this.gl.flushEXP==='function'){
   const started=performance.now();this.gl.flushEXP();this.stats.nativeDrainMs=performance.now()-started;
   const previous=this.sceneryBudget;
   this.sceneryState=adaptNativeSceneryBudget(this.sceneryState,this.stats.nativeDrainMs);
   this.sceneryBudget=this.sceneryState.level;
   if(previous!==this.sceneryBudget)console.info('MADGER_NATIVE_SCENERY_BUDGET',JSON.stringify({level:this.sceneryBudget,drainMs:Math.round(this.stats.nativeDrainMs)}));
   if(++this.nativeFrames===1||this.nativeFrames===30)console.info('MADGER_EXPEDITION_RENDER '+JSON.stringify({frame:this.nativeFrames,instanced:!!this.drawInstanced,...this.stats,sceneryBudget:this.sceneryBudget}));
  }
 }
 dispose(){if(this.dead)return;this.dead=true;try{this.sceneTarget?.dispose();if(this.portrait)this.gl.deleteTexture(this.portrait);for(const b of this.batches.values()){this.gl.deleteBuffer(b.vertex);this.gl.deleteBuffer(b.instances);if(b.elements)this.gl.deleteBuffer(b.elements);}this.gl.deleteProgram(this.program);}catch{/* A lost context has already freed its GPU resources. */}this.batches.clear();}
}
