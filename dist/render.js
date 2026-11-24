import {PARTS} from './model.js';
const BLUE='#5974ff',SOFT='#aeb9ef',GRAY='#dedee6';
const box=(x,y,z,w,d,h,color=BLUE,extra={})=>({x,y,z,w,d,h,color,...extra});
export function blocksFor(type,step=99){
  if(type==='firetruck-foundation'){
    const pieces=[box(-4,-1,0,8,2,1/3,'#666a6d',{group:0})];
    // 4600178: a recessed plate with raised end strips, not a solid brick.
    for(const x of[-4,0]){
      pieces.push(box(x,-1,1/3,4,2,1/3,'#272b2e',{group:1}));
      for(const offset of[0,3])pieces.push(box(x+offset,-1,2/3,1,2,1/3,'#272b2e',{group:1}));
    }
    return pieces;
  }
  if(type==='practice'){
    const pieces=[box(-2,-1,0,4,2,1,BLUE),box(-2,-1,1,2,2,1,SOFT),box(0,-1,1,2,2,1,BLUE),box(-2,-1,2,4,2,1,GRAY),box(-1,-1,3,2,2,1,BLUE)];
    return pieces.slice(0,step+1).map((b,i)=>({...b,group:i}));
  }
  if(type==='robot'){
    const sets=[[box(-2.3,-1,0,2,2,1),box(.3,-1,0,2,2,1)], [box(-2,-1,1,4,2,1,GRAY)], [box(-1,-1,2,2,2,1),box(-3.2,-.6,1.2,1,1.2,1,SOFT),box(2.2,-.6,1.2,1,1.2,1,SOFT)], [box(-.65,-1.08,2.45,.35,.1,.25,'#42424e'),box(.3,-1.08,2.45,.35,.1,.25,'#42424e')]];
    return sets.slice(0,step+1).flat().map((b,i)=>({...b,group:sets.findIndex(set=>set.includes(b))}));
  }
  if(type==='bench'){
    const sets=[[box(-2.5,-1,0,1.5,2,1),box(1,-1,0,1.5,2,1)],[box(-3,-1.2,1,6,2.4,.45,GRAY)],[box(-3,.8,1.45,6,.65,1.2)]];
    return sets.slice(0,step+1).flat().map(b=>({...b,group:sets.findIndex(s=>s.includes(b))}));
  }
  const sets=[
    [box(-3,-1.7,.55,6,3.4,.35,BLUE)],
    [box(-3,-1.7,.9,2,3.4,.65,GRAY),box(1,-1.7,.9,2,3.4,.65,GRAY)],
    [-2.1,2.1].flatMap(x=>[-1.9,1.9].map(y=>({type:'wheel',x,y,z:.65,r:.78,color:'#40404d',group:2}))),
    [box(-.9,-1.5,.9,2.4,3,1.2,BLUE)],
    [box(-.75,-1.45,2.1,2.1,2.9,.55,SOFT)],
    type==='wingcar'?[box(-.3,-3.8,1.3,2.5,2.2,.3,BLUE),box(-.3,1.6,1.3,2.5,2.2,.3,BLUE)]:[box(1.6,-1.45,1.55,1.1,2.9,.2,SOFT),box(-3.05,-1.2,1.35,.1,.65,.2,'#8e95b1'),box(-3.05,.6,1.35,.1,.65,.2,'#8e95b1')],
  ];
  return sets.slice(0,step+1).flat().map(b=>({...b,group:sets.findIndex(s=>s.includes(b))}));
}
function shade(hex,factor){const a=hex.replace('#','');return '#'+[0,2,4].map(i=>Math.round(Math.min(255,parseInt(a.slice(i,i+2),16)*factor)).toString(16).padStart(2,'0')).join('');}
function path(ctx,pts,fill,stroke){ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
export function paintModel(canvas,{type='car',step=99,angle=-.7,highlight=false,animation=1,part=null,pitch=.48,exploded=0,view='free',zoom=1}={}){
  const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
  const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
  const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);const w=rect.width,h=rect.height;
  if(view==='front'){angle=0;pitch=0;}if(view==='side'){angle=Math.PI/2;pitch=0;}if(view==='top'){angle=0;pitch=Math.PI/2;}
  const co=Math.cos(angle),si=Math.sin(angle);
  const source=part?[{...PARTS[part],x:-PARTS[part].w/2,y:-PARTS[part].d/2,z:0,group:0}]:blocksFor(type,step);
  const currentGroup=Math.min(step,Math.max(...source.map(b=>b.group||0)));
  const blocks=source.map(b=>({...b,z:b.z+(part?0:(b.group||0)*exploded*.85)+(!part&&b.group===currentGroup&&highlight?(1-animation)*1.6:0)}));
  const raw=(x,y,z)=>[(x*co-y*si),(x*si+y*co)*Math.sin(pitch)-z*Math.cos(pitch)];
  const extent=[];for(const b of blocks){if(b.type==='wheel'){extent.push(raw(b.x-b.r,b.y,b.z-b.r),raw(b.x+b.r,b.y,b.z+b.r));}else for(const dx of[0,b.w])for(const dy of[0,b.d])for(const dz of[0,b.h+.18])extent.push(raw(b.x+dx,b.y+dy,b.z+dz));}
  const xmin=Math.min(...extent.map(p=>p[0])),xmax=Math.max(...extent.map(p=>p[0])),ymin=Math.min(...extent.map(p=>p[1])),ymax=Math.max(...extent.map(p=>p[1]));
  const scale=Math.min((w-48)/Math.max(xmax-xmin+1,part?3:6.5),(h-72)/Math.max(ymax-ymin+.8,part?2.5:5.6))*zoom;
  const cx=(xmin+xmax)/2,cy=(ymin+ymax)/2;
  const project=(x,y,z)=>{const p=raw(x,y,z);return[w/2+(p[0]-cx)*scale,h*.47+(p[1]-cy)*scale];};
  const depth=(x,y,z)=>(x*si+y*co)*Math.cos(pitch)+z*Math.sin(pitch);
  if(!part&&view==='free'){ctx.lineWidth=.6;for(let i=-5;i<=5;i++){path(ctx,[project(i,-4,0),project(i,4,0)],null,'#e8eaf0');path(ctx,[project(-5,i,0),project(5,i,0)],null,'#e8eaf0');}}
  const faces=[];
  for(const b of blocks){
    if(b.type==='wheel'){
      const pts=Array.from({length:32},(_,i)=>{const t=i/32*Math.PI*2;return project(b.x+Math.cos(t)*b.r,b.y,b.z+Math.sin(t)*b.r)});
      const inner=Array.from({length:24},(_,i)=>{const t=i/24*Math.PI*2;return project(b.x+Math.cos(t)*b.r*.45,b.y-.015,b.z+Math.sin(t)*b.r*.45)});
      faces.push({depth:depth(b.x,b.y,b.z),draw:()=>{ctx.lineWidth=1;path(ctx,pts,b.color,'#353540');path(ctx,inner,'#bfc1d0','#a1a4b5');}});continue;
    }
    const {x,y,z,w:bw,d,h:bh}=b;const selected=!part&&b.group===currentGroup;
    const vertices=[project(x,y,z),project(x+bw,y,z),project(x+bw,y+d,z),project(x,y+d,z),project(x,y,z+bh),project(x+bw,y,z+bh),project(x+bw,y+d,z+bh),project(x,y+d,z+bh)];
    const face=(indices,color,coords,studs=false)=>faces.push({depth:depth(...coords),draw:()=>{
      ctx.lineWidth=.7;path(ctx,indices.map(i=>vertices[i]),color,shade(b.color,.72));
      if(studs&&bh>.15&&bw>=1&&d>=1){const nx=Math.max(1,Math.floor(bw)),ny=Math.max(1,Math.floor(d));for(let a=0;a<nx;a++)for(let c=0;c<ny;c++){
        const px=x+(a+.5)*bw/nx,py=y+(c+.5)*d/ny;const pts=Array.from({length:20},(_,j)=>{const t=j/20*Math.PI*2;return project(px+Math.cos(t)*.27,py+Math.sin(t)*.27,z+bh+.1);});
        path(ctx,pts.map(p=>[p[0],p[1]+Math.cos(pitch)*scale*.07]),shade(b.color,.83),null);path(ctx,pts,shade(b.color,1.06),shade(b.color,.83));
      }}
      if(selected&&highlight){ctx.lineWidth=2.5;ctx.strokeStyle='#354cdf';ctx.setLineDash([5,3]);path(ctx,indices.map(i=>vertices[i]),null,'#354cdf');ctx.setLineDash([]);}
    }});
    const xVisible=si>=0;const yVisible=co>=0;
    if(Math.abs(Math.sin(angle))>.001)face(xVisible?[1,2,6,5]:[0,3,7,4],shade(b.color,.78),[xVisible?x+bw:x,y+d/2,z+bh/2]);
    if(Math.abs(Math.cos(angle))>.001)face(yVisible?[3,2,6,7]:[0,1,5,4],shade(b.color,.88),[x+bw/2,yVisible?y+d:y,z+bh/2]);
    if(pitch>.001)face([4,5,6,7],b.color,[x+bw/2,y+d/2,z+bh],true);
    if(exploded>.1&&!part&&b.group>0){const offset=b.group*exploded*.85;const a=project(x+bw/2,y+d/2,z-offset),end=project(x+bw/2,y+d/2,z);ctx.setLineDash([3,5]);ctx.strokeStyle='#bcc5dd';ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...end);ctx.stroke();ctx.setLineDash([]);}
  }
  faces.sort((a,b)=>a.depth-b.depth).forEach(f=>f.draw());
  if(!part){ctx.fillStyle='#65708d';ctx.font='12px sans-serif';ctx.textAlign='center';const labels={free:'자유 시점',front:'정면',side:'측면',top:'윗면'};ctx.fillText((labels[view]||labels.free)+(exploded>.05?' · 분해도':''),w/2,h-16);}
}

export function paintTable(canvas,selected=null){
  const r=canvas.getBoundingClientRect();if(!r.width)return[];const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=r.width*dpr;canvas.height=r.height*dpr;const c=canvas.getContext('2d');c.scale(dpr,dpr);c.fillStyle='#f3f3f6';c.fillRect(0,0,r.width,r.height);
  const arrangement=[['brick4',.20,.31,-.12],['brick2',.62,.28,.12],['plate',.43,.67,-.1],['brick2',.80,.65,.2],['slope',.17,.77,.18],['brick4',.78,.43,-.16]];const hits=[];
  const unit=Math.min(r.width/14,27);
  for(const [id,px,py,rot]of arrangement){const part=PARTS[id],bw=part.w*unit,bh=part.d*unit,xx=r.width*px,yy=r.height*py;c.save();c.translate(xx,yy);c.rotate(rot);c.fillStyle='#d7d8e1';c.fillRect(-bw/2+2,-bh/2+5,bw,bh);c.fillStyle=id==='slope'?'#b8c2f5':id==='plate'?'#d4d6e0':BLUE;c.fillRect(-bw/2,-bh/2,bw,bh);for(let x=0;x<part.w;x++)for(let y=0;y<part.d;y++){c.beginPath();c.ellipse(-bw/2+(x+.5)*unit,-bh/2+(y+.5)*unit,unit*.29,unit*.27,0,0,Math.PI*2);c.fillStyle=id==='plate'?'#e2e3eb':id==='slope'?'#c5cdf6':'#7188ff';c.fill();c.strokeStyle=id==='plate'?'#c8cbd8':'#526ce9';c.lineWidth=.6;c.stroke();}c.restore();hits.push({id,x:xx,y:yy,w:bw+18,h:bh+18});}
  return hits;
}
