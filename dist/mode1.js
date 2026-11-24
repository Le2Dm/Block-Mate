import {PARTS as PRACTICE_PARTS} from './model.js';
import {SET_60482} from './set-60482.js';
import {paintModel,paintTable} from './render.js';
import {PRACTICE_STEPS,parseGuideCommand,GestureController,clamp,containedVideoRect,screenToVideo} from './mode1-core.js';
import {paintGuideModel,disposeGuideModel} from './guide-3d.js';
import {HandService} from './hand-service.js';
const $=s=>document.querySelector(s);
const requestedSet=new URLSearchParams(location.search).get('set');
const set=requestedSet==='60482'?SET_60482:null;
const STEPS=set?set.steps:PRACTICE_STEPS;
const PARTS=set?set.parts:PRACTICE_PARTS;
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={step:0,mode:'assembly',pose:{angle:-.7,pitch:.48,view:'free',exploded:0,zoom:1},highlight:true,selected:null,source:'',zones:[],pending:null,mirror:true,drawing:false,drag:null,lastHands:[],lastGesture:null,events:[],modelStatus:'idle',mic:false,sound:false,completed:false};
let stream=null,cameraPending=false,recognition=null,restartTimer=null,toastTimer,animationFrame,registrationRect=null,modelDrag=null,lastCommand='',lastCommandAt=0,speechOutput=false,speechGeneration=0,frameGeneration=0,returnFocus=null;
const gestures=new GestureController();
const service=new HandService(onHands,onModelStatus);
const current=()=>STEPS[state.step];
let guideDisplay='model',instructionIndex=0,modelUnavailable=false,referenceCollapsed=false;
const needs=()=>current().needs||[{part:current().part,qty:current().qty}];
const selectedMatches=()=>needs().some(n=>n.part===state.selected);
const partImage=(id,label)=>PARTS[id].image?`<img class="part-photo" src="${PARTS[id].image}" alt="${escape(label||PARTS[id].name)}">`:`<canvas data-part="${id}" aria-label="${escape(PARTS[id].name)}"></canvas>`;
const modelOptions=()=>({type:set?'firetruck':'practice',step:state.step,...state.pose,completed:state.completed,focusPart:state.selected,highlight:state.highlight&&!state.completed});
const log=(action,detail='')=>state.events.push({time:new Date().toISOString(),step:state.step+1,mode:state.mode,action,detail});
function toast(text){$('#toast').textContent=text;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4200);}
function say(text){
 $('#feedback').textContent=text;
 if(state.sound&&'speechSynthesis'in window){
  const generation=++speechGeneration;speechSynthesis.cancel();speechOutput=true;const u=new SpeechSynthesisUtterance(text);u.lang='ko-KR';u.rate=1;
  const done=()=>{if(generation===speechGeneration)speechOutput=false;};u.onend=done;u.onerror=done;speechSynthesis.speak(u);
 }
}
function paint(){if(!modelUnavailable)paintGuideModel($('#model'),modelOptions());}
function update(){
 const step=current();$('#step-count').textContent=`${state.step+1} / ${STEPS.length}`;
 $('#step-label').textContent=`조립 단계 ${state.step+1}`;$('#step-title').textContent=step.title;$('#step-description').textContent=step.text;$('#step-why').textContent=step.why;
 $('#needed-part').textContent=set?`공식 설명서 ${step.pages.join('–')}쪽`:`${PARTS[step.part].name} × ${step.qty}`;
 $('#progress').style.width=`${(state.step+1)/STEPS.length*100}%`;$('#previous').disabled=state.step===0;$('#next').textContent=state.step===STEPS.length-1?'조립 마치기':'연결했어요';
 const control=state.mode==='control';$('.mode-bar').classList.toggle('controlling',control);$('#mode-name').textContent=control?'가이드 조작':'조립하기';$('#mode-description').textContent=control?'한 손 집기로 회전, 두 손 집기로 분해도를 조절해요.':'블록을 집거나 움직여도 모델은 돌아가지 않아요.';
 $('#toggle-mode').textContent=control?'다시 조립하기':'가이드 조작 켜기';$('#toggle-mode').setAttribute('aria-pressed',String(control));
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.pose.view)));
 $('#view-lock').textContent=state.pose.view==='free'?'자유 회전':'시점 고정';$('#explode').value=Math.round(state.pose.exploded*100);$('#explode-value').textContent=`${Math.round(state.pose.exploded*100)}%`;
 $('#selected-part').textContent=state.selected?PARTS[state.selected].name:'아직 선택하지 않았어요';$('#selection-source').textContent=state.selected?state.source:state.pending?'질문을 기억하고 있어요. 부품을 가리키거나 직접 선택해주세요.':'등록한 자리를 검지로 약 0.7초 가리켜주세요.';
 $('#clear-selection').disabled=!state.selected&&!state.pending;$('#zone-count').textContent=`${state.zones.length}개`;
 $('#zone-list').innerHTML=state.zones.map((z,i)=>`<div class="zone-item"><span>자리 ${i+1} · ${PARTS[z.part].name}</span><button data-delete-zone="${z.id}" aria-label="자리 ${i+1} 지우기">지우기</button></div>`).join('');
 $('#video').classList.toggle('mirrored',state.mirror);$('#camera-stage').classList.toggle('drawing',state.drawing);
 $('#camera-toggle').textContent=cameraPending?'카메라 연결 중':stream?'카메라 끄기':'카메라 켜기';$('#camera-toggle').disabled=cameraPending;
 $('#camera-state').textContent=stream?'실제 카메라':'카메라 꺼짐';$('#video').hidden=!stream;$('#example').hidden=!!stream||!!set;$('#set-camera-placeholder').hidden=!!stream||!set;
 $('#register-zone').textContent=state.drawing?'영역 그리기 취소':'영역 그리기';$('#prepare-hands').disabled=state.modelStatus==='loading';$('#prepare-hands').textContent=state.modelStatus==='loading'?'인식 준비 중':service.ready?'손 인식 준비됨':'손 인식 준비';
 $('#mic-toggle').textContent=state.mic?'음성 끄기':'음성 켜기';$('#mic-toggle').setAttribute('aria-pressed',String(state.mic));
 if(state.drawing)$('#camera-caption').textContent='등록할 부품 주위를 드래그해주세요. 부품 종류는 직접 지정해요.';
 else if(stream)$('#camera-caption').textContent=control?'가이드 조작 중 · 엄지와 검지를 붙여 집어주세요.':state.zones.length?'등록한 부품 자리 안을 검지로 가리켜주세요.':'부품을 가리키려면 아래에서 자리를 먼저 등록해주세요.';
 else $('#camera-caption').textContent=set?'카메라 없이도 부품번호와 3D 모델로 조립할 수 있어요.':'예시 화면 · 카메라 없이 버튼과 음성 명령으로 연습할 수 있어요.';
 updateSetGuide();paint();drawCamera();
}
function modal(title,body,actions=''){
 returnFocus=document.activeElement;
 $('#dialog-content').innerHTML=`<div class="dialog-heading"><h2>${title}</h2><button data-close aria-label="닫기">×</button></div><div class="dialog-body">${body}</div>${actions?`<div class="dialog-actions">${actions}</div>`:''}`;
 if(!$('#dialog').open)$('#dialog').showModal();
 $('#dialog').querySelectorAll('canvas[data-part]').forEach(c=>paintModel(c,{part:c.dataset.part}));gestures.reset();
}
function closeModal(){const wasOpen=$('#dialog').open;if(wasOpen)$('#dialog').close();registrationRect=null;gestures.reset();if(wasOpen&&returnFocus?.isConnected)returnFocus.focus({preventScroll:true});}
function setMode(mode){if(modelUnavailable&&mode==='control'){say('3D 화면을 사용할 수 없어요. 공식 설명서로 이어가주세요.');return;}if(set&&mode==='control')guideDisplay='model';state.mode=mode;state.drawing=false;gestures.reset();log('입력 모드',mode);say(mode==='control'?'가이드 조작을 켰어요. 한 손으로 집어 회전하거나, 두 손으로 집고 벌려 분해도를 살펴보세요.':'조립 상태로 돌아왔어요. 블록을 움직여도 모델은 돌아가지 않아요.');update();}
function setView(view){
 if(set)guideDisplay='model';
 if(view==='front'){state.pose.angle=0;state.pose.pitch=0;}if(view==='side'){state.pose.angle=Math.PI/2;state.pose.pitch=0;}if(view==='top'){state.pose.angle=0;state.pose.pitch=Math.PI/2;}if(view==='free'){state.pose.angle=-.7;state.pose.pitch=.48;}
 state.pose.view=view;gestures.reset();log('시점 변경',view);say(`${{front:'정면',side:'측면',top:'윗면',free:'입체 시점'}[view]}으로 보여드릴게요. ${{front:'앞에서 연결된 높이를 비교해보세요.',side:'옆에서 층별 높이와 연결 면을 확인해보세요.',top:'위에서 돌기와 겹치는 위치를 확인해보세요.',free:'여러 방향으로 돌려 연결 구조를 살펴보세요.'}[view]}`);update();
}
function setExploded(value,announce=false){if(set)guideDisplay='model';if(value>0&&state.pose.view==='top'){state.pose.view='free';state.pose.angle=-.7;state.pose.pitch=.48;}state.pose.exploded=clamp(value,0,1);log('분해도',Math.round(value*100));if(announce)say(value===0?'부품을 원래 연결 구조로 모았어요.':!set&&state.step===0?'현재는 부품 하나라 분리할 연결이 없어요. 다음 단계부터 분해도를 확인할 수 있어요.':'부품 사이를 벌려서 연결 구조를 보여드릴게요. 실제 블록을 분해할 필요는 없어요.');update();}
function moveStep(delta){
 cancelAnimationFrame(animationFrame);closeModal();const next=state.step+delta;if(next>=STEPS.length){finish();return;}if(next<0)return;
 state.step=next;instructionIndex=0;guideDisplay='model';state.mode='assembly';state.selected=null;state.pending=null;state.highlight=true;state.pose.exploded=0;state.completed=false;state.drawing=false;gestures.reset();log('단계 이동',state.step+1);say(current().text);update();playConnection();
}
function finish(){
 state.completed=true;state.mode='assembly';state.selected=null;state.highlight=false;state.pose={angle:-.7,pitch:.48,view:'free',exploded:0,zoom:1};gestures.reset();stopMic();log('조립 안내 완료');update();
 modal(set?'소방차 조립 안내를 마쳤어요':'조립 연습을 마쳤어요',set?`<img class="finish-image" src="${modelUnavailable?'./assets/60482/page-60.webp':$('#model').toDataURL('image/png')}" alt="소방차 완성 3D 모델"><p>28개 과업의 3D 조립 구조를 확인했어요. 바퀴 네 개와 소방관을 포함해 실제 완성 모습을 비교해주세요.</p><p>연결 완료는 사용자가 확인한 결과이며 카메라가 조립 성공을 판정한 것은 아니에요.</p>`:`<div class="done-state"><h2>연결 구조를 살펴봤어요.</h2><p>다섯 단계의 조립 가이드를 확인했어요. 완성한 실물을 모델과 비교해주세요.</p></div>`,'<button class="secondary" data-close>완성 모양 보기</button><button class="primary" id="restart-demo">처음부터 다시</button>');
}
function choosePart(id,source){
 if(!PARTS[id])return;state.selected=id;state.source=source;log('부품 선택',`${id} · ${source}`);
 if(state.pending){const pending=state.pending;state.pending=null;update();respond(pending);return;}
 say(`${PARTS[id].name}을 선택했어요. “이거 맞아?” 또는 “어디에 끼워?”라고 질문해보세요.`);update();
}
function compare(){
 const match=selectedMatches(),expected=match?state.selected:current().part,qty=needs().find(n=>n.part===expected)?.qty||1;log('부품 비교',match?'일치':'불일치');
 modal(match?'이번 단계에 필요한 부품이에요':'다른 부품이에요',`<div class="comparison">${[[expected,'이번 단계에 필요한 부품'],[state.selected,'내가 선택한 부품']].map(([id,label])=>`<div><span>${label}</span>${partImage(id)}<strong>${PARTS[id].name}</strong>${PARTS[id].elementId?`<small>부품번호 ${PARTS[id].elementId}</small>`:''}</div>`).join('')}</div><div class="comparison-result">${match?`${PARTS[expected].name} ${qty}개가 필요해요. ${needs().length>1?'이번 단계의 나머지 부품도 함께 준비해주세요.':''}`:`선택한 것은 ${PARTS[state.selected].name}이에요. 이번 단계의 부품 목록과 비교해주세요. ${PARTS[expected].name}: ${PARTS[expected].detail}.`}</div><p>등록한 자리 또는 직접 선택한 종류를 비교한 결과예요. 카메라가 부품 모양을 판별한 결과는 아닙니다.</p>`,match?'<button class="primary" id="dialog-where">연결 위치 보기</button>':'<button class="secondary" data-close>다시 가리키기</button><button class="primary" id="dialog-select">부품 직접 선택</button>');
 say(match?'선택한 부품은 이번 단계에 필요한 부품이에요.':'선택한 부품과 이번 단계의 부품이 달라요. 색상과 모양을 비교해보세요.');
}
function playConnection(){
 cancelAnimationFrame(animationFrame);const start=performance.now(),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const tick=now=>{const t=reduce?1:Math.min(1,(now-start)/950),eased=1-Math.pow(1-t,3);if(!modelUnavailable)paintGuideModel($('#model'),{...modelOptions(),highlight:true,animation:eased});if(t<1)animationFrame=requestAnimationFrame(tick);};animationFrame=requestAnimationFrame(tick);
}
function showLocation(){
 state.highlight=true;guideDisplay='model';
 if(modelUnavailable){if(set){guideDisplay='manual';instructionIndex=current().pages.length-1;update();}say(current().text);return;}
 setView(current().view);
 if(set&&[12,14].includes(current().page)){state.pose.view='free';state.pose.angle=Math.PI-.6;state.pose.pitch=.48;}
 if(set&&current().page===56){state.pose.view='free';state.pose.angle=-Math.PI/2;state.pose.pitch=.5;}
 say(state.selected?`${PARTS[state.selected].name}을 초록색 테두리로 표시한 위치에 연결해주세요. ${current().why}`:current().text+' 초록색으로 표시한 부품과 연결 방향을 확인해주세요.');update();playConnection();log('3D 연결 위치 안내');
}
function respond(intent){
 if(['compare','where'].includes(intent)&&!state.selected){state.pending=intent;say('어떤 부품인지 먼저 확인할게요. 등록한 자리를 가리키거나 부품 종류를 직접 선택해주세요.');log('대상 확인 대기',intent);update();return;}
 if(intent==='compare')compare();
 else if(intent==='where'){if(!selectedMatches())compare();else showLocation();}
}
function command(text,source='직접 입력'){
 text=String(text||'').trim();if(!text)return;
 if(text===lastCommand&&performance.now()-lastCommandAt<900)return;lastCommand=text;lastCommandAt=performance.now();
 $('#heard').textContent=text;log('명령',`${text} · ${source}`);const intent=parseGuideCommand(text);
 if(intent==='mic-off'){stopMic();say('음성 입력을 껐어요.');return;}
 if(intent==='cancel'){state.pending=null;state.drawing=false;closeModal();say('현재 요청을 취소했어요. 조립 단계는 그대로 유지해요.');update();return;}
 if(intent==='restart'){restart();return;}
 if($('#dialog').open)closeModal();
 if(intent==='control')setMode('control');else if(intent==='assembly')setMode('assembly');else if(['front','side','top','free'].includes(intent))setView(intent);
 else if(intent==='explode')setExploded(1,true);else if(intent==='collapse')setExploded(0,true);
 else if(set&&guideDisplay==='manual'&&intent==='zoom-in'){enlargeInstruction();}
 else if(set&&guideDisplay==='manual'&&intent==='zoom-out'){say('설명서를 기본 크기로 보여드려요.');}
 else if(intent==='zoom-in'||intent==='zoom-out'){state.pose.zoom=clamp(state.pose.zoom+(intent==='zoom-in'?.15:-.15),.6,1.55);paint();say('모델 크기를 조절했어요.');}
 else if(intent==='next')moveStep(1);else if(intent==='previous')moveStep(-1);else if(['compare','where'].includes(intent))respond(intent);
 else if(intent==='explain')say(current().text+' '+current().why);
 else say('“이거 맞아?”, “어디에 끼워?”, “분해해서 보여줘”, “옆에서 보여줘”, “가이드 조작할게”, “연결했어”라고 말해보세요.');
}
function manualParts(){
 const order=[...new Set([...needs().map(n=>n.part),...Object.keys(PARTS).filter(id=>!PARTS[id].virtual)])];
 modal('어떤 부품을 선택했나요?',`<p>실물의 색상과 모양을 확인하고 직접 선택해주세요. 이번 단계의 부품부터 보여드려요.</p><div class="part-buttons ${set?'catalog-parts':''}">${order.map(id=>`<button class="secondary" data-select-part="${id}">${set?partImage(id):''}<strong>${escape(PARTS[id].name)}</strong>${PARTS[id].elementId?`<small>부품번호 ${PARTS[id].elementId}</small>`:''}</button>`).join('')}</div>`);
}
function restart(){closeModal();stopMic();cancelAnimationFrame(animationFrame);state.step=0;instructionIndex=0;guideDisplay='model';state.completed=false;state.selected=null;state.pending=null;state.mode='assembly';state.highlight=true;state.pose={angle:-.7,pitch:.48,view:'free',exploded:0,zoom:1};gestures.reset();log('연습 다시 시작');say('첫 단계부터 다시 시작해요. 등록한 부품 자리는 그대로 유지해요.');update();}
function onModelStatus(status,message=''){
 state.modelStatus=status;const labels={loading:'손 인식 모델 준비 중',ready:'손 인식 준비 완료',error:'손 인식을 사용할 수 없어요'};$('#tracking-state').textContent=labels[status]||'손 인식 준비 전';
 if(status==='error'){gestures.reset();state.lastHands=[];$('#gesture-state').textContent='버튼·마우스·음성으로 계속할 수 있어요.';toast(message||'손 인식 준비에 실패했어요. 다시 준비하거나 버튼으로 진행해주세요.');}
 update();
}
async function prepare(){try{await service.prepare();if(stream)await service.start($('#video'));}catch(error){log('손 인식 오류',error.message);}}
async function cameraStart(){
 if(cameraPending)return;cameraPending=true;update();const generation=++frameGeneration;
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('보안 연결에서 카메라를 사용할 수 있어요. HTTPS 주소나 로컬 서버로 열어주세요.');
  const acquired=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false});
  if(generation!==frameGeneration){acquired.getTracks().forEach(t=>t.stop());return;}
  stream=acquired;const video=$('#video');video.srcObject=stream;await video.play();
  stream.getVideoTracks()[0].addEventListener('ended',()=>{if(stream===acquired){cameraStop();toast('카메라 연결이 끝났어요. 다시 켜면 이어서 사용할 수 있어요.');}});
  state.zones=[];if(state.source.startsWith('손가락')){state.selected=null;state.source='';}cameraPending=false;update();log('카메라 시작');await service.start(video);
 }catch(error){log('카메라·인식 오류',error.name+': '+error.message);toast(error.name==='NotAllowedError'?'카메라 권한을 허용해주세요. 권한 없이도 화면 조작은 사용할 수 있어요.':error.name==='NotFoundError'?'연결된 카메라를 찾지 못했어요.':error.message||'카메라를 시작하지 못했어요.');}
 finally{cameraPending=false;update();}
}
function cameraStop(){++frameGeneration;service.stop();stream?.getTracks().forEach(t=>t.stop());stream=null;$('#video').srcObject=null;state.lastHands=[];state.mode='assembly';state.drawing=false;gestures.reset();$('#gesture-state').textContent='카메라를 켜면 다시 인식해요. 조립 단계는 유지돼요.';log('카메라 중지');update();}
function onHands(landmarks,time){
 if(!stream)return;
 state.lastHands=landmarks;
 const result=gestures.update(landmarks,{mode:state.mode,...state.pose,zones:state.zones,mirror:state.mirror,now:time,blocked:state.drawing||$('#dialog').open});state.lastGesture=result;
 const status={paused:'입력을 잠시 멈췄어요.',lost:'손이 보이지 않아요. 다시 보여주면 이어서 인식해요.',assembly:'모델을 움직이지 않고 조립할 수 있어요.','control-ready':'엄지와 검지를 붙여 집어주세요.','pinch-start':'집기 동작을 확인하고 있어요.',rotate:'한 손 집기 · 모델 회전 중',explode:'두 손 집기 · 분해도 조절 중',pointing:'가리킨 부품을 선택하고 있어요.',selected:'등록한 자리의 부품을 선택했어요.','point-outside':'등록한 부품 자리 안을 가리켜주세요.','no-zones':'먼저 실제 부품 자리를 등록해주세요.'};
 $('#gesture-state').textContent=status[result.status]||'';
 $('#tracking-state').textContent=landmarks.length?`${landmarks.length}개 손 감지`:'손 인식 준비 완료';
 if(result.pose){for(const key of['angle','pitch','exploded'])if(result.pose[key]!==undefined)state.pose[key]=state.pose[key]*.6+result.pose[key]*.4;if(result.pose.view)state.pose.view=result.pose.view;$('#explode').value=Math.round(state.pose.exploded*100);$('#explode-value').textContent=`${Math.round(state.pose.exploded*100)}%`;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===state.pose.view)));$('#view-lock').textContent=state.pose.view==='free'?'자유 회전':'시점 고정';paint();}
 if(result.selected)choosePart(result.selected.part,'손가락으로 선택 · 직접 등록한 자리');
 drawCamera();
}
function videoRect(){const c=$('#overlay');return containedVideoRect(c.clientWidth,c.clientHeight,$('#video').videoWidth||1280,$('#video').videoHeight||720);}
function drawCamera(){
 const canvas=$('#overlay'),w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
 const dpr=Math.min(devicePixelRatio||1,2);canvas.width=w*dpr;canvas.height=h*dpr;const c=canvas.getContext('2d');c.scale(dpr,dpr);c.clearRect(0,0,w,h);
 if(!stream){if(!set)paintTable($('#example'));return;}
 const rect=videoRect(),toPixel=p=>({x:rect.x+(state.mirror?1-p.x:p.x)*rect.w,y:rect.y+p.y*rect.h});
 for(let i=0;i<state.zones.length;i++){const z=state.zones[i],p=toPixel({x:state.mirror?z.x+z.w:z.x,y:z.y});c.strokeStyle=state.selected===z.part?'#5974ff':'#92a4cc';c.lineWidth=state.lastGesture?.zone?.id===z.id?3:1.5;c.setLineDash([5,4]);c.strokeRect(p.x,p.y,z.w*rect.w,z.h*rect.h);c.setLineDash([]);c.font='12px sans-serif';c.fillStyle='#ffffffed';const text=`${i+1} · ${PARTS[z.part].name}`;const tw=c.measureText(text).width+12;c.fillRect(p.x,p.y-23,tw,22);c.fillStyle='#354365';c.fillText(text,p.x+6,p.y-7);}
 const connections=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
 for(const hand of state.lastHands){c.strokeStyle='#5974ffb0';c.lineWidth=1.5;for(const[a,b]of connections){const p=toPixel(hand[a]),q=toPixel(hand[b]);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();}for(const index of[4,8]){const p=toPixel(hand[index]);c.beginPath();c.arc(p.x,p.y,4,0,Math.PI*2);c.fillStyle='#5974ff';c.fill();}}
 const point=state.lastGesture?.point;if(point){const p=toPixel(point);c.beginPath();c.arc(p.x,p.y,12,0,Math.PI*2);c.strokeStyle='#ffffff';c.lineWidth=3;c.stroke();c.beginPath();c.arc(p.x,p.y,12,-Math.PI/2,-Math.PI/2+Math.PI*2*(state.lastGesture.progress||0));c.strokeStyle='#5974ff';c.lineWidth=4;c.stroke();}
 if(state.drag){const {start,end}=state.drag;const a=toPixel({x:Math.min(start.x,end.x),y:Math.min(start.y,end.y)}),b=toPixel({x:Math.max(start.x,end.x),y:Math.max(start.y,end.y)});c.fillStyle='#5974ff22';c.strokeStyle='#5974ff';c.lineWidth=2;c.fillRect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(b.x-a.x),Math.abs(b.y-a.y));c.strokeRect(Math.min(a.x,b.x),Math.min(a.y,b.y),Math.abs(b.x-a.x),Math.abs(b.y-a.y));}
}
function beginRegistration(){if(state.drawing){state.drawing=false;state.drag=null;update();return;}if(!stream){toast('부품 자리는 실제 카메라를 켠 뒤 등록해주세요.');return;}if(state.zones.length>=8){toast('시연용 부품 자리는 최대 8개까지 등록할 수 있어요.');return;}state.drawing=true;state.mode='assembly';state.lastGesture=null;gestures.reset();update();}
function registerRect(rect){
 registrationRect=rect;state.drag=null;state.drawing=false;
 modal('이 자리에 둔 부품은 무엇인가요?',`<p>카메라가 종류를 판별한 것이 아니에요. 실제 부품을 확인한 뒤 정확한 종류를 지정해주세요.</p><label for="zone-part">부품 종류</label><select id="zone-part">${Object.entries(PARTS).filter(([id,p])=>!p.virtual||needs().some(n=>n.part===id)).map(([id,p])=>`<option value="${id}">${p.name}</option>`).join('')}</select><p>등록 후에는 부품과 카메라 자리를 유지해주세요.</p>`,'<button class="secondary" data-close>취소</button><button class="primary" id="save-zone">이 자리 등록</button>');update();
}
function startMic(){
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech){toast('이 브라우저는 음성 입력을 지원하지 않아요. 아래 입력창으로 동일한 명령을 사용할 수 있어요.');$('#command').focus();return;}
 state.mic=true;update();const begin=()=>{
  if(!state.mic||document.hidden)return;
  const rec=recognition=new Speech();rec.lang='ko-KR';rec.continuous=true;rec.interimResults=true;
  rec.onstart=()=>$('#speech-status').textContent='듣고 있어요';
  rec.onresult=event=>{for(let i=event.resultIndex;i<event.results.length;i++){const r=event.results[i],text=r[0].transcript;if(speechOutput)continue;if(r.isFinal)command(text,'음성 인식');else $('#heard').textContent=text;}};
  rec.onerror=event=>{if(['not-allowed','service-not-allowed','audio-capture','network'].includes(event.error)){stopMic();toast(event.error==='network'?'음성 인식에 연결하지 못했어요. 인터넷을 확인하거나 입력창으로 진행해주세요.':'마이크 권한이나 연결을 확인해주세요. 입력창으로도 계속할 수 있어요.');}else $('#speech-status').textContent='다시 듣는 중';};
  rec.onend=()=>{if(recognition===rec)recognition=null;if(state.mic&&!document.hidden)restartTimer=setTimeout(begin,600);};
  try{rec.start();}catch(error){stopMic();toast('음성 입력을 시작하지 못했어요. 직접 입력으로 진행해주세요.');}
 };begin();
}
function stopMic(){state.mic=false;clearTimeout(restartTimer);const rec=recognition;recognition=null;if(rec){rec.onend=null;rec.abort();}$('#speech-status').textContent='음성 꺼짐';$('#mic-toggle').textContent='음성 켜기';$('#mic-toggle').setAttribute('aria-pressed','false');}
function help(){modal('조립하면서 가이드를 조작해요',`<ol><li><strong>조립할 부품 준비</strong><br>${set?'60482 소방차의 실제 부품을 준비하세요. 부품번호는 공식 설명서 62–63쪽을 기준으로 표시해요.':'2 × 4 블록 2개, 2 × 2 블록 3개를 준비해주세요.'}</li><li><strong>카메라와 부품 자리 준비</strong><br>부품을 펼치고 카메라를 고정하세요. ‘실제 부품 자리 등록’에서 영역과 종류를 지정하면 검지로 가리켜 선택할 수 있어요.</li><li><strong>궁금한 점 질문</strong><br>음성을 켜고 “이거 맞아?”, “어디에 끼워?”라고 말해주세요. 질문을 먼저 해도 대상을 선택할 때까지 기다려요.</li><li><strong>공간 구조 확인</strong><br>“가이드 조작할게”로 전환한 뒤 한 손 집기로 회전, 두 손 집기로 분해도를 조작해요. “정면”, “옆에서 보여줘”, “위에서 보여줘”로 시점을 고정할 수도 있어요.</li><li><strong>조립으로 돌아가기</strong><br>“다시 조립할게”라고 말한 뒤 실제 블록을 연결하세요. “연결했어”라고 말하면 다음 단계로 이동해요.</li></ol><p>인식이 어려우면 버튼·모델 드래그·직접 입력으로 같은 기능을 사용할 수 있어요.</p>`,'<button class="primary" data-close>시작할게요</button>');}
function scope(){modal('이번 시제품의 작동 범위',`<dl class="capabilities"><dt>실제 작동</dt><dd>카메라 손 관절 인식, 모드에 따른 회전·분해도 제스처, 등록한 자리 가리키기, 고정 시점, 브라우저 음성 명령, 현재 단계에 따른 비교·연결 안내, 60482 전체 28단계의 3D 조립 구조, 연결 동작 재생, 설명서 QR·사진 읽기</dd><dt>직접 확인</dt><dd>부품 종류는 자리 등록 또는 직접 선택으로 입력합니다. 실제 연결 완료는 사용자가 확인합니다.</dd><dt>포함하지 않음</dt><dd>QR에서 3D 모델 자동 추출, 공식 CAD 수준의 세부 형상, 임의의 실물 부품 종류 자동 식별, 실물 회전 자동 동기화, 완성 상태 자동 판정, 생성형 AI 답변</dd><dt>사용 환경</dt><dd>카메라·음성은 보안 연결과 브라우저 지원·권한이 필요해요. 손 인식은 기기에서 처리하며, 음성 인식은 브라우저 제공 서비스를 사용해요.</dd><dt>기록</dt><dd>현재 탭에서만 진행 상태를 유지해요. 카메라 사진·녹음·부품 배치는 서버에 저장하지 않아요.</dd></dl>`,'<button class="primary" data-close>확인했어요</button>');}

$('#toggle-mode').onclick=()=>setMode(state.mode==='assembly'?'control':'assembly');$('#camera-toggle').onclick=()=>stream?cameraStop():cameraStart();$('#prepare-hands').onclick=prepare;$('#mic-toggle').onclick=()=>state.mic?stopMic():startMic();$('#sound').onchange=e=>{state.sound=e.target.checked;if(!state.sound){++speechGeneration;window.speechSynthesis?.cancel();speechOutput=false;}};
$('#mirror').onchange=e=>{state.mirror=e.target.checked;gestures.reset();update();};$('#register-zone').onclick=beginRegistration;$('#manual-part').onclick=manualParts;
$('#clear-zones').onclick=()=>{state.zones=[];state.selected=null;state.pending=null;gestures.reset();log('부품 자리 초기화');update();};$('#clear-selection').onclick=()=>{state.selected=null;state.pending=null;gestures.reset();say('선택과 질문을 비웠어요. 다음 부품을 가리켜주세요.');update();};
$('#zone-list').onclick=e=>{const b=e.target.closest('[data-delete-zone]');if(b){state.zones=state.zones.filter(z=>z.id!==b.dataset.deleteZone);gestures.reset();update();}};
$('#previous').onclick=()=>moveStep(-1);$('#next').onclick=()=>state.completed?restart():moveStep(1);$('#where').onclick=()=>{if(state.selected&&!selectedMatches()){respond('where');return;}showLocation();};
$('#reset-view').onclick=()=>{state.pose={angle:-.7,pitch:.48,view:'free',exploded:0,zoom:1};gestures.reset();update();};$('#explode').oninput=e=>{state.pose.exploded=Number(e.target.value)/100;if(state.pose.exploded>0&&state.pose.view==='top'){state.pose.view='free';state.pose.angle=-.7;state.pose.pitch=.48;}update();};$('#explode').onchange=()=>log('분해도 직접 조작',state.pose.exploded);$('#collapse').onclick=()=>setExploded(0,true);
$('#zoom-in').onclick=()=>{state.pose.zoom=clamp(state.pose.zoom+.15,.6,1.55);paint();};$('#zoom-out').onclick=()=>{state.pose.zoom=clamp(state.pose.zoom-.15,.6,1.55);paint();};
for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>setView(b.dataset.view);
$('#command-form').onsubmit=e=>{e.preventDefault();command($('#command').value);$('#command').value='';};$('#help').onclick=help;$('#scope').onclick=scope;
$('#dialog').addEventListener('close',()=>{registrationRect=null;gestures.reset();});$('#dialog').addEventListener('cancel',()=>{registrationRect=null;gestures.reset();});
$('#dialog').addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button)return;
 if(button.hasAttribute('data-close'))closeModal();
 if(button.dataset.selectPart){const id=button.dataset.selectPart;closeModal();choosePart(id,'직접 선택한 종류');}
 if(button.id==='dialog-where'){closeModal();showLocation();}
 if(button.id==='dialog-select'){closeModal();manualParts();}
 if(button.id==='restart-demo')restart();
 if(button.id==='save-zone'&&registrationRect){const zone={...registrationRect,id:crypto.randomUUID(),part:$('#zone-part').value};state.zones.push(zone);closeModal();gestures.reset();log('부품 자리 등록',zone.part);toast('등록했어요. 이 자리를 검지로 가리켜보세요.');update();}
});
const overlay=$('#overlay');
function pointFromEvent(event){const rect=overlay.getBoundingClientRect();return screenToVideo(event.clientX-rect.left,event.clientY-rect.top,videoRect(),state.mirror);}
overlay.onpointerdown=e=>{if(!state.drawing||!stream)return;const p=pointFromEvent(e);if(!p)return;state.drag={start:p,end:p};overlay.setPointerCapture(e.pointerId);drawCamera();};
overlay.onpointermove=e=>{if(!state.drag)return;const p=pointFromEvent(e);if(p){state.drag.end=p;drawCamera();}};
overlay.onpointerup=()=>{if(!state.drag)return;const{start,end}=state.drag;state.drag=null;const rect={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),w:Math.abs(end.x-start.x),h:Math.abs(end.y-start.y)};if(rect.w<.035||rect.h<.035){toast('부품을 둘러싸도록 조금 더 넓게 그려주세요.');drawCamera();return;}if(state.zones.some(z=>Math.max(0,Math.min(rect.x+rect.w,z.x+z.w)-Math.max(rect.x,z.x))*Math.max(0,Math.min(rect.y+rect.h,z.y+z.h)-Math.max(rect.y,z.y))>.002)){toast('다른 자리와 겹치지 않도록 다시 그려주세요.');drawCamera();return;}registerRect(rect);};
overlay.onpointercancel=()=>{state.drag=null;drawCamera();};
$('#model').onpointerdown=e=>{if(set&&(!current().model||guideDisplay!=='model'))return;modelDrag={x:e.clientX,y:e.clientY,angle:state.pose.angle,pitch:state.pose.pitch};$('#model').setPointerCapture(e.pointerId);};
$('#model').onpointermove=e=>{if(!modelDrag)return;state.pose.view='free';state.pose.angle=modelDrag.angle+(e.clientX-modelDrag.x)*.012;state.pose.pitch=clamp(modelDrag.pitch+(e.clientY-modelDrag.y)*.006,-1.45,1.48);paint();};
$('#model').onpointerup=()=>{if(modelDrag){log('마우스·터치 모델 회전');modelDrag=null;update();}};$('#model').onpointercancel=()=>modelDrag=null;
$('#model').onkeydown=e=>{const amount={ArrowLeft:[-.15,0],ArrowRight:[.15,0],ArrowUp:[0,.1],ArrowDown:[0,-.1]}[e.key];if(!amount)return;e.preventDefault();state.pose.view='free';state.pose.angle+=amount[0];state.pose.pitch=clamp(state.pose.pitch+amount[1],-1.45,1.48);update();};
const observer=new ResizeObserver(()=>{paint();drawCamera();});observer.observe($('#model'));observer.observe($('#camera-stage'));
document.addEventListener('visibilitychange',()=>{if(document.hidden){gestures.reset();if(recognition){recognition.onend=null;recognition.abort();recognition=null;}}else if(state.mic){state.mic=false;startMic();}});
window.addEventListener('pagehide',()=>{service.dispose();stream?.getTracks().forEach(t=>t.stop());stopMic();window.speechSynthesis?.cancel();observer.disconnect();disposeGuideModel($('#model'));});
if(set){
 document.body.classList.add('set-guide');$('#registered-set').hidden=false;$('.page-title h1').textContent='내 소방차, 한 단계씩 연결해요.';$('.page-title p').textContent='60482 · 3D로 돌려보고, 연결할 위치를 확인해요.';$('#guide-display-tabs').hidden=false;$('#required-parts').hidden=false;$('#official-pdf').href=set.pdfUrl;
 $('#step-picker').innerHTML=STEPS.map((step,index)=>`<option value="${index}">${index+1}. ${escape(step.title)}</option>`).join('');$('#step-picker').onchange=e=>moveStep(Number(e.target.value)-state.step);
 $('#feedback').textContent='60482 설명서를 불러왔어요. 이번 단계의 부품을 선택하고 “이거 맞아?”, “어디에 끼워?”라고 질문해보세요.';
 $('#instruction-pages').onclick=e=>{const b=e.target.closest('[data-instruction-index]');if(b){instructionIndex=Number(b.dataset.instructionIndex);updateSetGuide();}};
 $('#instruction-image-button').onclick=enlargeInstruction;$('#enlarge-instruction').onclick=enlargeInstruction;
 $('#reference-open').onclick=()=>showInstructionPage(referencePage());
 $('#reference-toggle').onclick=()=>{referenceCollapsed=!referenceCollapsed;updateReference();};
 for(const b of document.querySelectorAll('[data-guide-display]'))b.onclick=()=>{guideDisplay=b.dataset.guideDisplay;if(guideDisplay==='manual'){state.mode='assembly';gestures.reset();}update();};
 $('#required-part-list').onclick=e=>{const b=e.target.closest('[data-choose-needed]');if(b)choosePart(b.dataset.chooseNeeded,'이번 단계 목록에서 직접 선택');};
 $('#set-inventory').onclick=()=>modal('전체 부품 · 36종 / 67개',`<p>공식 설명서 62–63쪽의 부품번호와 수량이에요. 남은 수량이나 실물 인식 결과가 아닙니다.</p><div class="inventory-grid">${Object.entries(PARTS).filter(([,p])=>!p.virtual).map(([id,p])=>`<div>${partImage(id)}<strong>${escape(p.name)}</strong><span>${id} · 전체 ${p.qty}개</span></div>`).join('')}</div>`);
}else if(requestedSet){toast('아직 지원하지 않는 세트예요. 기본 블록 연습을 표시해요.');}
function referencePage(){return state.completed?60:current().pages.at(-1);}
function showInstructionPage(page){modal(`공식 설명서 ${page}쪽`,`<img class="large-instruction" src="./assets/60482/page-${String(page).padStart(2,'0')}.webp" alt="60482 공식 설명서 ${page}쪽"><p>${escape(state.completed?'완성한 실물과 비교해주세요.':current().text)}</p>`);}
function enlargeInstruction(){showInstructionPage(state.completed?60:current().pages[instructionIndex]||current().page);}
function updateReference(){
 if(!set)return;
 const page=referencePage();$('#reference-card').hidden=false;$('#reference-page').textContent=`${page}쪽 · ${state.completed?'완성 모습':'연결 모습'}`;
 $('#reference-image').src=`./assets/60482/page-${String(page).padStart(2,'0')}.webp`;$('#reference-image').alt=`60482 소방차 공식 설명서 ${page}쪽 ${state.completed?'완성 모습':'연결 모습'}`;
 $('#reference-open').setAttribute('aria-label',`공식 설명서 ${page}쪽 확대`);$('#reference-content').hidden=referenceCollapsed;
 $('#reference-toggle').textContent=referenceCollapsed?'펼치기':'접기';$('#reference-toggle').setAttribute('aria-expanded',String(!referenceCollapsed));$('.model-stage').classList.toggle('reference-collapsed',referenceCollapsed);
}
function updateSetGuide(){
 if(!set)return;
 updateReference();
 const step=current(),model=guideDisplay==='model'&&!modelUnavailable;$('.model-legend').hidden=state.completed;$('#step-picker').value=String(state.step);
 if(modelUnavailable)guideDisplay='manual';
 $('#instruction-pane').hidden=!!model;$('.model-stage').hidden=!model;$('.view-tabs').hidden=!model;$('.explode-control').hidden=!model;
 $('#toggle-mode').disabled=modelUnavailable;$('#reset-view').disabled=!model;
 const buttons=document.querySelectorAll('[data-guide-display]');for(const b of buttons){b.disabled=b.dataset.guideDisplay==='model'&&modelUnavailable;b.setAttribute('aria-pressed',String(b.dataset.guideDisplay===guideDisplay));}
 $('#instruction-pages').innerHTML=state.completed?'<button aria-pressed="true">60쪽 · 완성 모습</button>':step.pages.map((page,i)=>`<button data-instruction-index="${i}" aria-pressed="${i===instructionIndex}">${page}쪽 · ${i===0&&step.pages.length>1?'부품 준비':'연결 모습'}</button>`).join('');
 const page=state.completed?60:step.pages[instructionIndex]||step.page;$('#instruction-image').src=`./assets/60482/page-${String(page).padStart(2,'0')}.webp`;$('#instruction-image').alt=`60482 소방차 공식 설명서 ${page}쪽`;
 $('#required-parts').hidden=state.completed;$('#where').hidden=state.completed;
 if(state.completed){$('#step-count').textContent='완료';$('#step-label').textContent='조립 안내 완료';$('#step-title').textContent='소방차를 완성했어요.';$('#step-description').textContent='실물의 바퀴 네 개와 연결 상태를 공식 완성 그림과 비교해주세요.';$('#step-why').textContent='진행한 모든 과업은 상단 단계 선택에서 다시 확인할 수 있어요.';$('#needed-part').textContent='공식 설명서 60쪽';$('#next').textContent='처음부터 다시';}
 $('#instruction-note').textContent=state.completed?'공식 완성 모습이에요. 바퀴가 돌아가는지, 빠진 부품은 없는지 직접 확인해주세요.':'공식 설명서는 부품의 세부 모양을 비교하는 보조 자료예요. 조립 안내는 3D 연결 구조에서 확인해주세요.';
 $('#required-part-list').innerHTML=needs().map(n=>`<button class="needed-part ${n.part===state.selected?'chosen':''}" data-choose-needed="${n.part}">${partImage(n.part)}<span><strong>${escape(PARTS[n.part].name)}</strong><small>${PARTS[n.part].elementId?'부품번호 '+PARTS[n.part].elementId:'앞 단계에서 만든 묶음'} · ${n.qty}개</small></span></button>`).join('');
}
$('#model').addEventListener('guide-render-error',e=>{modelUnavailable=true;$('#model-error').hidden=false;$('#model-error').textContent=e.detail;if(set){guideDisplay='manual';updateSetGuide();}});
$('#model').addEventListener('guide-render-ready',()=>{modelUnavailable=false;$('#model-error').hidden=true;guideDisplay='model';update();});
log('모드 1 시작',set?'60482':'기본 연습');update();playConnection();
