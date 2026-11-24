import {PARTS,PROJECTS} from './model.js';
const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const opButton=(action,label,id='')=>`<button class="secondary small" data-command="${action}" ${id?`data-id="${id}"`:''} disabled>${label}</button>`;
const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('block-mate-bodystorm-v2'):null;
const sessions=new Map();let selectedSession='';
const controls=document.querySelector('#controls');
controls.innerHTML=`<section class="control-group"><h3>1. 실제 가리킨 부품</h3><div class="operator-parts">${Object.entries(PARTS).map(([id,p])=>opButton('op-target',p.name,id)).join('')}</div><p>참여자가 틀린 부품을 가리켜도 그대로 선택해주세요.</p></section><section class="control-group"><h3>2. 말한 질문</h3><div class="control-buttons">${opButton('op-question-compare','“이거 맞아?”')}${opButton('op-question-where','“어디에 끼워?”')}${opButton('op-question-next','“연결했어”')}</div><p>가리키기와 말하기는 어느 순서든 가능해요. 질문만 들어오면 대상 확인을 기다립니다.</p></section><section class="control-group"><h3>3. 실물의 방향 변화</h3><div class="control-buttons">${opButton('op-turn-left','왼쪽으로 돌림')}${opButton('op-turn-right','오른쪽으로 돌림')}${opButton('op-turn-reset','정면으로 돌림')}</div><p>실제 블록이나 조립 중인 물체를 보고 수동으로 모델 방향을 맞춰주세요.</p></section><section class="control-group"><h3>인식 실패·복구</h3><div class="control-buttons">${opButton('op-unknown','판단 불가')}${opButton('op-occluded','손에 가려짐')}${opButton('retry','다시 보여줌')}${opButton('cancel-pending','질문·대상 초기화')}${opButton('close','안내 창 닫기')}</div></section><details class="control-group"><summary>조립·자유 창작 장면 이동</summary><div class="control-buttons" style="margin-top:12px">${opButton('op-guide','조립 시작')}${opButton('op-scan','블록 펼치기')}${opButton('op-capture','블록 펼침 확인')}${opButton('op-request','“자동차 만들고 싶어”')}${opButton('op-ideas','작품 제안')}${opButton('op-shortage','바퀴가 없는 상황')}${opButton('op-inventory-reset','예시 부품 복원')}</div></details>`;
function renderStatus(){
 const s=sessions.get(selectedSession),connected=s&&Date.now()-s.receivedAt<12000;
 document.querySelector('#connection').textContent=connected?'사용자 화면 연결됨':'사용자 화면을 기다리고 있어요';
 controls.querySelectorAll('button').forEach(b=>b.disabled=!connected);
 const scene=document.querySelector('#scene');
 if(!s){scene.textContent=channel?'같은 브라우저에서 사용자 화면을 열어주세요. 연결이 안 되면 사용자 화면의 시연 패널을 이용할 수 있어요.':'이 브라우저에서는 창 연결을 지원하지 않아요. 사용자 화면의 시연 패널을 이용해주세요.';return;}
 scene.innerHTML=`<strong>${escapeText(PROJECTS[s.project]?.title||'BLOCK MATE')} · ${s.screen==='guide'?`${s.step+1}단계`:{home:'시작 화면',scan:'블록 확인',ideas:'작품 선택',complete:'조립 완료'}[s.screen]||s.screen}</strong><dl><div><dt>가리킨 대상</dt><dd>${s.selectedPart?escapeText(PARTS[s.selectedPart]?.name):'아직 없음'}</dd></div><div><dt>말한 질문</dt><dd>${escapeText(s.lastQuestion||'아직 없음')}</dd></div><div><dt>응답 상태</dt><dd>${escapeText(s.pendingQuestion?'대상 지정 대기':s.feedback)}</dd></div></dl>`;
}
function updateSessions(){const select=document.querySelector('#session-select');select.innerHTML=[...sessions].map(([id,s],i)=>`<option value="${escapeText(id)}">사용자 화면 ${i+1} · ${escapeText(PROJECTS[s.project]?.title||'작업 공간')}</option>`).join('');select.value=selectedSession;}
channel?.addEventListener('message',event=>{const m=event.data;if(m?.type==='bye'){sessions.delete(m.session);if(selectedSession===m.session)selectedSession=sessions.keys().next().value||'';updateSessions();renderStatus();return;}if(m?.type!=='state'||typeof m.session!=='string')return;const isNew=!sessions.has(m.session);sessions.set(m.session,{...m,receivedAt:Date.now()});if(!selectedSession)selectedSession=m.session;if(isNew)updateSessions();renderStatus();});
document.querySelector('#session-select').addEventListener('change',e=>{selectedSession=e.target.value;renderStatus();});
controls.addEventListener('click',e=>{const button=e.target.closest('[data-command]');if(!button||button.disabled||!selectedSession)return;channel?.postMessage({type:'action',session:selectedSession,action:button.dataset.command,data:button.dataset.id?{id:button.dataset.id}:{}});});
setInterval(()=>{channel?.postMessage({type:'hello'});renderStatus();},3000);
channel?.postMessage({type:'hello'});renderStatus();
