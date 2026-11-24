export const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const PRACTICE_STEPS=[
 {title:'긴 블록을 바닥에 놓아요',part:'brick4',qty:1,text:'2 × 4 블록의 돌기가 위를 향하도록 가로로 놓아주세요.',view:'top',why:'바닥에 있는 돌기 여덟 개가 다음 부품을 연결할 기준이에요.'},
 {title:'왼쪽에 짧은 블록을 연결해요',part:'brick2',qty:1,text:'바닥 블록의 왼쪽 돌기 네 개에 2 × 2 블록을 연결해주세요.',view:'top',why:'윗면에서 보면 왼쪽 절반을 채우는 위치를 확인하기 쉬워요.'},
 {title:'오른쪽도 같은 높이로 맞춰요',part:'brick2',qty:1,text:'남아 있는 오른쪽 돌기 네 개에 2 × 2 블록을 연결해주세요.',view:'front',why:'정면에서 두 블록의 높이가 같은지 비교해보세요.'},
 {title:'긴 블록으로 두 부품을 연결해요',part:'brick4',qty:1,text:'두 짧은 블록 위에 2 × 4 블록을 올려 한 번에 연결해주세요.',view:'side',why:'분해도를 벌리면 긴 블록이 아래 두 부품을 함께 연결하는 구조가 보여요.'},
 {title:'맨 위 중앙에 짧은 블록을 올려요',part:'brick2',qty:1,text:'맨 위 긴 블록의 가운데 돌기 네 개에 2 × 2 블록을 연결해주세요.',view:'top',why:'양쪽 끝의 돌기 두 개씩을 남기고 가운데에 올려주세요.'},
];
export function parseGuideCommand(value){
 const s=String(value||'').replace(/\s+/g,'');
 if(/음성꺼|음성끄|마이크꺼|듣기종료/.test(s))return 'mic-off';
 if(/닫|취소/.test(s))return 'cancel';
 if(/처음부터|다시시작|초기화/.test(s))return 'restart';
 if(/이전|앞단계|뒤로/.test(s))return 'previous';
 if(/다음|연결했|끼웠|조립했|완료/.test(s))return 'next';
 if(/다시조립|조립모드|조립할게|조작끝|조작종료|조작멈춰|그만/.test(s))return 'assembly';
 if(/가이드조작|조작모드|조작시작|가이드보기/.test(s))return 'control';
 if(/합쳐|모아|원래구조|분해하지마/.test(s))return 'collapse';
 if(/분해|벌려|펼쳐|안쪽|내부/.test(s))return 'explode';
 if(/윗면|위에서|위쪽에서/.test(s))return 'top';
 if(/정면|앞에서|앞쪽에서/.test(s))return 'front';
 if(/측면|옆면|옆에서/.test(s))return 'side';
 if(/자유회전|입체|기본시점|전체모양/.test(s))return 'free';
 if(/크게|확대/.test(s))return 'zoom-in';
 if(/작게|축소/.test(s))return 'zoom-out';
 if(/어디|위치|방향|끼워|연결/.test(s))return 'where';
 if(/맞|차이|비교|부품/.test(s))return 'compare';
 if(/다시읽|읽어|설명해/.test(s))return 'explain';
 return 'unknown';
}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z===undefined||b.z===undefined?0:(a.z-b.z)*.3);
function jointAngle(a,b,c){const u=[a.x-b.x,a.y-b.y],v=[c.x-b.x,c.y-b.y];return Math.acos(clamp((u[0]*v[0]+u[1]*v[1])/(Math.hypot(...u)*Math.hypot(...v)||1),-1,1))*180/Math.PI;}
export function handFeatures(points,wasPinching=false){
 if(!points||points.length!==21||points.some(p=>![p.x,p.y].every(Number.isFinite)))return null;
 const palm=Math.max(.025,dist(points[0],points[9]));
 const pinchRatio=dist(points[4],points[8])/palm;
 const pinching=pinchRatio<(wasPinching?.42:.28);
 const indexExtended=jointAngle(points[5],points[6],points[8])>150&&dist(points[8],points[0])>dist(points[6],points[0])*1.10;
 const othersFolded=[12,16,20].filter(t=>dist(points[t],points[0])<dist(points[t-2],points[0])*1.15).length>=2;
 return {pinching,pointing:indexExtended&&othersFolded&&!pinching,center:{x:(points[4].x+points[8].x)/2,y:(points[4].y+points[8].y)/2},tip:points[8],palm};
}
export function zoneAtPoint(point,zones){
 const hits=zones.filter(z=>point.x>=z.x&&point.x<=z.x+z.w&&point.y>=z.y&&point.y<=z.y+z.h);
 return hits.length===1?hits[0]:null;
}
export function containedVideoRect(width,height,videoWidth,videoHeight){
 const scale=Math.min(width/videoWidth,height/videoHeight);
 return {x:(width-videoWidth*scale)/2,y:(height-videoHeight*scale)/2,w:videoWidth*scale,h:videoHeight*scale};
}
export function screenToVideo(x,y,r,mirror){
 if(x<r.x||y<r.y||x>r.x+r.w||y>r.y+r.h)return null;
 const u=(x-r.x)/r.w;return {x:mirror?1-u:u,y:(y-r.y)/r.h};
}
export class GestureController{
 constructor(){this.previous=[];this.baseline=null;this.hoverId=null;this.hoverSince=0;this.latchedZone=null;this.lastPointTime=0;this.pinchFrames=0;}
 reset(){this.previous=[];this.baseline=null;this.pinchFrames=0;this.hoverId=null;this.hoverSince=0;this.latchedZone=null;}
 update(landmarks,{mode='assembly',angle=-.7,pitch=.48,exploded=0,zones=[],mirror=true,now=0,blocked=false}={}){
  const sorted=[...landmarks].sort((a,b)=>a[0].x-b[0].x);
  const hands=sorted.map((p,i)=>handFeatures(p,this.previous[i]?.pinching)).filter(Boolean);this.previous=hands;
  if(blocked){this.baseline=null;this.hoverId=null;return {hands,status:'paused'};}
  if(!hands.length){this.baseline=null;this.pinchFrames=0;this.hoverId=null;this.latchedZone=null;return {hands,status:'lost'};}
  if(mode==='control'){
   this.hoverId=null;const pinches=hands.filter(h=>h.pinching);this.pinchFrames=pinches.length?this.pinchFrames+1:0;
   const kind=pinches.length>=2?'explode':pinches.length===1?'rotate':'idle';
   if(kind==='idle'||this.pinchFrames<3){this.baseline=null;return {hands,status:kind==='idle'?'control-ready':'pinch-start'};}
   if(kind==='rotate'){
    const p={x:mirror?1-pinches[0].center.x:pinches[0].center.x,y:pinches[0].center.y};
    if(this.baseline?.kind!=='rotate'){this.baseline={kind,p,angle,pitch};return {hands,status:'rotate'};}
    const dx=p.x-this.baseline.p.x,dy=p.y-this.baseline.p.y;
    return {hands,status:'rotate',pose:{angle:this.baseline.angle+(Math.abs(dx)>.004?dx*5:0),pitch:clamp(this.baseline.pitch+(Math.abs(dy)>.004?dy*2.1:0),-1.45,1.48),view:'free'}};
   }
   const d=dist(pinches[0].center,pinches[1].center);
   if(this.baseline?.kind!=='explode'){this.baseline={kind,d,exploded};return {hands,status:'explode'};}
   return {hands,status:'explode',pose:{exploded:clamp(this.baseline.exploded+(d-this.baseline.d)*3.2,0,1)}};
  }
  this.baseline=null;this.pinchFrames=0;
  const pointers=hands.filter(h=>h.pointing);
  // Two competing pointers are intentionally not resolved by guessing.
  if(pointers.length!==1){this.hoverId=null;this.latchedZone=null;return {hands,status:'assembly'};}
  const point=pointers[0].tip,zone=zoneAtPoint(point,zones);
  if(!zone){this.hoverId=null;this.latchedZone=null;return {hands,point,status:zones.length?'point-outside':'no-zones'};}
  if(this.hoverId!==zone.id){this.hoverId=zone.id;this.hoverSince=now;}
  const progress=clamp((now-this.hoverSince)/700,0,1);
  if(progress>=1&&this.latchedZone!==zone.id){this.latchedZone=zone.id;return {hands,point,zone,progress,selected:zone,status:'selected'};}
  return {hands,point,zone,progress,status:'pointing'};
 }
}
