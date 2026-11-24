import * as THREE from './vendor/three/three.module.js';
import {getAssemblyState,PART_SHAPES} from './assembly-60482.js';
import {blocksFor} from './render.js';

const engines=new WeakMap();
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function geometryFactory(){
 const cache=new Map();
 return {get(key,make){if(!cache.has(key))cache.set(key,make());return cache.get(key);},dispose(){for(const g of cache.values())g.dispose();cache.clear();}};
}
export function makePartMesh(spec,geo=geometryFactory()){
 const group=new THREE.Group();
 const base=new THREE.MeshStandardMaterial({color:spec.color,roughness:.34,metalness:.015,depthTest:true,depthWrite:true});
 const ownedMaterials=[base];
 const color=(hex,extra={})=>{const m=new THREE.MeshStandardMaterial({color:hex,roughness:.4,depthTest:true,depthWrite:true,...extra});ownedMaterials.push(m);return m;};
 const dark=color('#24282b'),light=color('#b7bdc3'),yellow=color('#f7d338');
 const glass=color(spec.color,{transparent:true,opacity:.42,depthWrite:false,side:THREE.DoubleSide,roughness:.18});
 const mesh=(g,material=base,position=[0,0,0],rotation=[0,0,0],edges=true)=>{
  const m=new THREE.Mesh(g,material);m.position.set(...position);m.rotation.set(...rotation);m.castShadow=!material.transparent;m.receiveShadow=true;group.add(m);
  if(edges&&!material.transparent){const line=new THREE.LineSegments(geo.get('edges:'+g.uuid,()=>new THREE.EdgesGeometry(g,32)),new THREE.LineBasicMaterial({color:'#253445',transparent:true,opacity:.26,depthTest:true}));m.add(line);}
  return m;
 };
 const box=(w,h,d,x=0,y=h/2,z=0,material=base,edges=true)=>mesh(geo.get(`box:${w}:${h}:${d}`,()=>new THREE.BoxGeometry(Math.max(.01,w-.025),Math.max(.01,h-.006),Math.max(.01,d-.025))),material,[x,y,z],[0,0,0],edges);
 const cylinder=(r,h,x,y,z,material=base,rotation=[0,0,0])=>mesh(geo.get(`cyl:${r}:${h}`,()=>new THREE.CylinderGeometry(r,r,h,24)),material,[x,y,z],rotation,false);
 const sphere=(r,x,y,z,material=base)=>mesh(geo.get('sphere:'+r,()=>new THREE.SphereGeometry(r,20,12)),material,[x,y,z],[0,0,0],false);
 const torus=(r,t,x,y,z,material=base,rotation=[0,0,0],arc=Math.PI*2)=>mesh(geo.get(`torus:${r}:${t}:${arc}`,()=>new THREE.TorusGeometry(r,t,8,32,arc)),material,[x,y,z],rotation,false);
 const studs=(w=spec.w,d=spec.d,y=spec.h,positions=null,material=base)=>{
  const cells=positions||Array.from({length:Math.round(w)},(_,x)=>Array.from({length:Math.round(d)},(_,z)=>[x+.5-w/2,z+.5-d/2])).flat();
  for(const[x,z]of cells)cylinder(.29,.18,x,y+.087,z,material);
 };
 const {w,d,h,kind}=spec;
 if(['brick','plate','tile','jumper','roof','beacon'].includes(kind)){
  box(w,h,d);if(kind==='jumper')studs(w,d,h,[[0,0]]);else if(kind==='roof')studs(w,d,h,[-1.5,-.5,.5,1.5].map(z=>[-1.5,z]));else if(!['tile','beacon'].includes(kind))studs();
  if(kind==='beacon'){box(w,.08,d,0,.04,0,light);box(w*.75,h-.08,d-.1,0,(h+.08)/2,0,glass);}
 }
 else if(kind==='recess'){
  box(4,.4,2);for(const x of[-1.5,1.5])box(1,.4,2,x,.6,0);studs(2,2,.4,[[-.5,-.5],[-.5,.5],[.5,-.5],[.5,.5]]);for(const x of[-1.5,1.5])studs(1,2,.8,[[x,-.5],[x,.5]]);
 }
 else if(kind==='axle'){
  box(w,h,d);studs();cylinder(.18,d+.8,0,.18,0,light,[Math.PI/2,0,0]);for(const z of[-d/2-.28,d/2+.28])cylinder(.24,.19,0,.18,z,dark,[Math.PI/2,0,0]);
 }
 else if(kind==='arch'){
  const g=geo.get('arch-body',()=>{const s=new THREE.Shape();s.moveTo(-2,0);s.lineTo(-2,h);s.lineTo(2,h);s.lineTo(2,0);s.lineTo(1.65,0);for(let i=1;i<=24;i++){const t=i/24*Math.PI;s.lineTo(Math.cos(t)*1.65,Math.sin(t)*1.65);}s.lineTo(-2,0);const g=new THREE.ExtrudeGeometry(s,{depth:d-.025,bevelEnabled:false,curveSegments:24});g.translate(0,0,-(d-.025)/2);return g;});mesh(g);studs();
 }
 else if(kind==='bracket'){
  box(.22,1.6,4,.25,.8,0);box(.8,.4,4,0,1.8,0);studs(1,4,2,[-1.5,-.5,.5,1.5].map(z=>[0,z]));for(const y of[.45,1.25])for(const z of[-1.5,-.5,.5,1.5])cylinder(.27,.16,.43,y,z,base,[0,0,Math.PI/2]);
 }
 else if(kind==='bumper'){
  const g=geo.get('curved-bumper',()=>{const s=new THREE.Shape();s.moveTo(-2,-.18);s.lineTo(2,-.18);s.quadraticCurveTo(2,.3,1.5,.35);s.quadraticCurveTo(0,.5,-1.5,.35);s.quadraticCurveTo(-2,.3,-2,-.18);const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:20}),a=g.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i);a.setXYZ(i,y,z,x);}g.computeVertexNormals();return g;});mesh(g);
 }
 else if(kind==='grille'){box(.14,h,d);for(let i=0;i<5;i++)box(.08,.045,d-.15,.095,.08+i*.1,0,light,false);}
 else if(kind==='round-light'){cylinder(.26,.16,0,.26,0,base,[0,0,Math.PI/2]);torus(.24,.025,.09,.26,0,light,[0,Math.PI/2,0]);}
 else if(kind==='seat'){box(2,.4,1);box(2,.8,.2,0,.8,.4);}
 else if(kind==='steering'){
  box(1,.4,2);cylinder(.12,.6,.1,.65,0,dark,[0,0,-.3]);torus(.43,.065,.28,.95,0,dark,[0,Math.PI/2,0]);box(.08,.72,.06,.28,.95,0,light,false);box(.08,.06,.72,.28,.95,0,light,false);
 }
 else if(kind==='clip'){
  box(2,.4,1);studs(1,1,.4,[[.5,0]]);torus(.19,.07,-.5,.62,0,base,[0,Math.PI/2,0],Math.PI*1.55);
 }
 else if(kind==='side-stud'){box(w,h,d);studs();cylinder(.29,.16,0,.6,.58,base,[Math.PI/2,0,0]);}
 else if(kind==='curve'){
  const g=geo.get('small-curve',()=>{const s=new THREE.Shape();s.moveTo(-.5,0);s.lineTo(.5,0);s.lineTo(.5,.35);s.quadraticCurveTo(.4,.8,-.1,.8);s.quadraticCurveTo(-.5,.8,-.5,.4);s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:16});g.translate(0,0,-d/2);return g;});mesh(g);
 }
 else if(kind==='frame'){
  box(w,.18,d,0,.09,0);box(w,.18,d,0,h-.09,0);for(const z of[-d/2+.09,d/2-.09])box(w,h,.18,0,h/2,z);
 }
 else if(kind==='small-window'){
  box(w,h,d,0,h/2,0,glass,false);for(const z of[-.92,.92])box(.25,h,.1,0,h/2,z,light,false);box(.25,.16,d,0,.08,0,light,false);box(.25,.16,d,0,h-.08,0,light,false);studs(1,2,h,[[0,-.5],[0,.5]],dark);
 }
 else if(kind==='windshield'){
  box(.07,h,d,w/2-.035,h/2,0,glass,false);for(const z of[-d/2+.035,d/2-.035])box(w,h,.07,0,h/2,z,glass,false);
  for(const z of[-d/2+.04,d/2-.04]){box(w,.09,.09,0,.045,z,light,false);box(w,.09,.09,0,h-.045,z,light,false);}box(.09,.09,d,w/2-.04,h-.045,0,light,false);for(const z of[-1.5,-.5,.5,1.5])studs(1,1,h,[[w/2-.5,z]],dark);
 }
 else if(kind==='logo-panel'){box(w,h,d);studs(2,1,h,[[-.5,0],[.5,0]]);}
 else if(kind==='ladder'){
  for(const z of[-.85,.85])box(w,.2,.18,0,.1,z);for(const x of[-1.5,-.5,.5,1.5])box(.18,.2,1.8,x,.1,0);
 }
 else if(kind==='tire'){
  const g=geo.get('tire-body',()=>new THREE.LatheGeometry([[1,-.37],[1.38,-.37],[1.55,-.25],[1.6,0],[1.55,.25],[1.38,.37],[1,.37],[1,-.37]].map(([r,y])=>new THREE.Vector2(r,y)),40));
  mesh(g,base,[0,0,0],[Math.PI/2,0,0],false);for(let i=0;i<32;i++){const a=i/32*Math.PI*2;const m=box(.21,.1,.68,Math.sin(a)*1.58,Math.cos(a)*1.58,0,base,false);m.rotation.z=-a;}
 }
 else if(kind==='wheel-cap'){cylinder(.98,.14,0,0,0,base,[Math.PI/2,0,0]);torus(.91,.04,0,0,-.08,light);}
 else if(kind==='figure-body'){
  for(const z of[-.23,.23])box(.65,.38,.38,0,.19,z);box(.7,.86,.9,0,.81,0);for(const z of[-.63,.63]){cylinder(.13,.6,0,.78,z);sphere(.15,.03,.43,z,yellow);}for(const y of[.7,1.03])box(.022,.055,.86,.365,y,0,yellow,false);
 }
 else if(kind==='figure-head'){
  cylinder(.43,.67,0,.335,0);mesh(geo.get('helmet',()=>new THREE.SphereGeometry(.49,24,16,0,Math.PI*2,0,Math.PI/2)),base,[0,.65,0],[0,0,0],false);for(const z of[-.15,.15])sphere(.044,.412,.39,z,dark);box(.02,.025,.22,.432,.23,0,dark,false);
 }
 else {box(w,h,d);studs();}
 group.userData.materials=ownedMaterials;return group;
}
function logoTexture(){
 const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d');ctx.clearRect(0,0,128,128);ctx.beginPath();ctx.moveTo(64,8);ctx.lineTo(111,31);ctx.lineTo(103,83);ctx.quadraticCurveTo(90,109,64,120);ctx.quadraticCurveTo(34,108,25,83);ctx.lineTo(17,31);ctx.closePath();ctx.fillStyle='#d7dce0';ctx.fill();ctx.strokeStyle='#39424b';ctx.lineWidth=6;ctx.stroke();ctx.beginPath();ctx.moveTo(42,93);ctx.bezierCurveTo(16,72,58,65,54,34);ctx.bezierCurveTo(90,49,68,67,88,59);ctx.bezierCurveTo(108,88,78,107,67,98);ctx.lineTo(76,76);ctx.lineTo(54,90);ctx.closePath();ctx.fillStyle='#d92737';ctx.fill();const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
class GuideRenderer{
 constructor(canvas){
  this.canvas=canvas;this.geo=geometryFactory();this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(-8,8,8,-8,.1,500);this.root=new THREE.Group();this.scene.add(this.root);this.parts=new Map();this.type=null;
  this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));this.renderer.setClearColor('#f7f9fc',1);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.24;
  this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFShadowMap;
  this.scene.add(new THREE.HemisphereLight('#ffffff','#a6b2c6',2.4));const key=new THREE.DirectionalLight('#fff7ed',3.1);key.position.set(8,15,11);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-15;key.shadow.camera.right=15;key.shadow.camera.top=15;key.shadow.camera.bottom=-15;key.shadow.bias=-.00025;this.scene.add(key);const fill=new THREE.DirectionalLight('#d2e7ff',1.8);fill.position.set(-10,7,-8);this.scene.add(fill);
  this.floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.ShadowMaterial({opacity:.10}));this.floor.rotation.x=-Math.PI/2;this.floor.receiveShadow=true;this.scene.add(this.floor);this.grid=new THREE.GridHelper(20,20,'#e1e6ef','#e9edf4');this.scene.add(this.grid);
  this.logo=logoTexture();this.contextLost=false;
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.contextLost=true;canvas.dispatchEvent(new CustomEvent('guide-render-error',{detail:'3D 화면 연결이 끊겼어요. 페이지를 새로고침하거나 공식 설명서로 이어갈 수 있어요.'}));});
  canvas.addEventListener('webglcontextrestored',()=>{this.contextLost=false;if(this.lastOptions)this.render(this.lastOptions);canvas.dispatchEvent(new CustomEvent('guide-render-ready'));});
 }
 prepare(type){
  if(this.type===type)return;this.type=type;
  for(const p of this.parts.values()){this.root.remove(p.mesh);this.scene.remove(p.outline);p.outline.geometry.dispose();p.outline.material.dispose();}this.parts.clear();
  const definitions=type==='firetruck'?getAssemblyState(27):blocksFor('practice',99).map((b,i)=>({id:'practice-'+i,elementId:'practice-'+i,step:i,position:[b.x+b.w/2,b.z*1.2,b.y+b.d/2],rotation:[0,0,0],shape:{kind:'brick',w:b.w,d:b.d,h:b.h*1.2,color:b.color}}));
  for(const p of definitions){const mesh=makePartMesh(p.shape,this.geo);mesh.userData.id=p.id;
   if(['logo-panel','roof'].includes(p.shape.kind)){
    const m=new THREE.MeshBasicMaterial({map:this.logo,transparent:true,alphaTest:.05,depthWrite:false,side:THREE.DoubleSide});
    if(p.shape.kind==='roof'){const mark=new THREE.Mesh(new THREE.PlaneGeometry(1.45,1.45),m);mark.rotation.x=-Math.PI/2;mark.position.set(.3,p.shape.h+.012,0);mesh.add(mark);}else for(const z of[-p.shape.d/2-.009,p.shape.d/2+.009]){const mark=new THREE.Mesh(new THREE.PlaneGeometry(1.05,1.4),m);mark.position.set(0,1.15,z);mesh.add(mark);}
   }
   this.root.add(mesh);const outline=new THREE.BoxHelper(mesh,'#008e79');outline.material.depthTest=true;outline.material.transparent=true;outline.material.opacity=.82;outline.visible=false;this.scene.add(outline);this.parts.set(p.id,{mesh,outline,definition:p});
  }
 }
 render(options={}){
  this.lastOptions=options;if(this.contextLost)return;
  const {type='firetruck',step=0,angle=-.7,pitch=.48,view='free',exploded=0,zoom=1,highlight=true,focusPart=null,animation=1}=options;
  this.prepare(type);const rect=this.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const definitions=type==='firetruck'?getAssemblyState(step):[...this.parts.values()].map(p=>({...p.definition,visible:p.definition.step<=step,active:p.definition.step===step}));
  const byId=new Map(definitions.map(p=>[p.id,p]));const bounds=new THREE.Box3();let shown=0,activeCount=0;
  for(const[id,entry]of this.parts){const p=byId.get(id);entry.mesh.visible=!!p&&p.visible!==false;entry.outline.visible=false;if(!entry.mesh.visible)continue;shown++;
   const selected=!!p.active&&(!focusPart||focusPart===p.elementId||p.assembly===({firefighter:'figure','rear-bumper':'rear','front-bumper':'front'}[focusPart])||(focusPart==='wheels'&&p.assembly?.startsWith('wheel-')));
   if(selected)activeCount++;
   const separation=Math.max(0,Math.round(p.position[1]/1.2))*clamp(exploded,0,1)*.58;
   entry.mesh.position.set(p.position[0],p.position[1]+separation,p.position[2]);entry.mesh.rotation.set(...p.rotation);entry.mesh.updateMatrixWorld(true);
   const b=new THREE.Box3().setFromObject(entry.mesh);bounds.union(b);if(selected&&!options.completed){const lift=type==='firetruck'?1.8:1.2;const incoming=b.clone();incoming.min.y+=lift;incoming.max.y+=lift;bounds.union(incoming);entry.mesh.position.y+=(1-clamp(animation,0,1))*lift;}
   entry.outline.visible=highlight&&selected;entry.mesh.updateMatrixWorld(true);if(entry.outline.visible)entry.outline.update();
   entry.mesh.traverse(o=>{
    if(o.isMesh&&o.material.emissive){o.material.emissive.set(highlight&&selected?'#008b73':'#000000');o.material.emissiveIntensity=highlight&&selected?.16:0;}
    if(o.isLineSegments){o.material.color.set(highlight&&selected?'#008e79':'#263646');o.material.opacity=highlight&&selected?.9:.24;}
   });
  }
  if(bounds.isEmpty())return;
  const center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());let yaw=angle,elevation=pitch;
  if(view==='front'){yaw=0;elevation=0;}if(view==='side'){yaw=Math.PI/2;elevation=0;}if(view==='top'){yaw=0;elevation=Math.PI/2;}
  const radius=Math.max(1.2,size.length()/2),aspect=rect.width/rect.height,half=radius*Math.max(1,1/aspect)*1.04/clamp(zoom,.6,1.55);
  this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;this.camera.near=.1;this.camera.far=radius*12+100;
  const distance=radius*4+10;this.camera.position.set(center.x+Math.cos(yaw)*Math.cos(elevation)*distance,center.y+Math.sin(elevation)*distance,center.z+Math.sin(yaw)*Math.cos(elevation)*distance);this.camera.up.set(0,1,0);if(view==='top')this.camera.up.set(-1,0,0);this.camera.lookAt(center);this.camera.updateProjectionMatrix();
  this.floor.position.y=bounds.min.y-.05;this.grid.position.y=bounds.min.y-.04;this.grid.visible=elevation>.06;this.floor.visible=elevation>.06;
  this.renderer.setSize(rect.width,rect.height,false);this.renderer.render(this.scene,this.camera);
  this.canvas.dataset.renderer='webgl';this.canvas.dataset.pieces=String(shown);this.canvas.dataset.activePieces=String(activeCount);this.canvas.dataset.step=String(step);this.canvas.setAttribute('aria-label',`조립 단계 ${step+1}의 3D 모델. 부품 ${shown}개 표시. 드래그 또는 방향키로 회전할 수 있어요.`);
 }
 dispose(){for(const p of this.parts.values()){p.outline.geometry.dispose();p.outline.material.dispose();p.mesh.traverse(o=>{if(o.material?.dispose)o.material.dispose();});}this.logo.dispose();this.geo.dispose();this.renderer.dispose();}
}
export function paintGuideModel(canvas,options){
 let engine=engines.get(canvas);if(engine instanceof Error)return false;
 try{if(!engine){engine=new GuideRenderer(canvas);engines.set(canvas,engine);}engine.render(options);return true;}
 catch(error){engines.set(canvas,error);canvas.dataset.renderError=error.message;canvas.dispatchEvent(new CustomEvent('guide-render-error',{detail:'3D 화면을 준비하지 못했어요. 브라우저를 새로고침하거나 공식 설명서로 이어가세요.'}));return false;}
}
export function disposeGuideModel(canvas){const engine=engines.get(canvas);if(engine&&!(engine instanceof Error))engine.dispose();engines.delete(canvas);}
