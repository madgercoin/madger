export type Mat4=Float32Array;
export type Vec3=[number,number,number];
export const identity=():Mat4=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
export function multiply(a:Mat4,b:Mat4):Mat4 {
 const r=new Float32Array(16);for(let c=0;c<4;c++)for(let row=0;row<4;row++)r[c*4+row]=a[row]*b[c*4]+a[4+row]*b[c*4+1]+a[8+row]*b[c*4+2]+a[12+row]*b[c*4+3];return r;
}
export function transform(x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0):Mat4 {
 const a=Math.cos(rx),b=Math.sin(rx),c=Math.cos(ry),d=Math.sin(ry),e=Math.cos(rz),f=Math.sin(rz);
 return new Float32Array([(c*e+d*b*f)*sx,a*f*sx,(-d*e+c*b*f)*sx,0,(-c*f+d*b*e)*sy,a*e*sy,(d*f+c*b*e)*sy,0,d*a*sz,-b*sz,c*a*sz,0,x,y,z,1]);
}
export function perspective(fov:number,aspect:number,near=.1,far=150):Mat4 {
 const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);
}
function norm(v:Vec3):Vec3 {const l=Math.hypot(...v)||1;return [v[0]/l,v[1]/l,v[2]/l];}
function cross(a:Vec3,b:Vec3):Vec3 {return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function dot(a:Vec3,b:Vec3){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
export function lookAt(eye:Vec3,target:Vec3):Mat4 {
 const z=norm([eye[0]-target[0],eye[1]-target[1],eye[2]-target[2]]),x=norm(cross([0,1,0],z)),y=cross(z,x);
 return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
}
export function segment(a:Vec3,b:Vec3,radius:number):Mat4 {
 const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.max(.0001,Math.hypot(dx,dy,dz));
 const y=norm([dx,dy,dz]),ref:Vec3=Math.abs(y[1])>.99?[1,0,0]:[0,1,0],x=norm(cross(ref,y)),z=cross(x,y);
 return new Float32Array([x[0]*radius,x[1]*radius,x[2]*radius,0,y[0]*len,y[1]*len,y[2]*len,0,z[0]*radius,z[1]*radius,z[2]*radius,0,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,1]);
}
