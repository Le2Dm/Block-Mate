export const PARTS = {
  plate: { name: '바닥판 2 × 6', detail: '넓고 납작한 바닥 부품', w: 6, d: 2, h: .35, color: '#5974ff' },
  brick4: { name: '기본 블록 2 × 4', detail: '돌기 8개 · 긴 블록', w: 4, d: 2, h: 1, color: '#5974ff' },
  brick2: { name: '기본 블록 2 × 2', detail: '돌기 4개 · 짧은 블록', w: 2, d: 2, h: 1, color: '#5974ff' },
  slope: { name: '경사 블록', detail: '앞부분이 낮아지는 부품', w: 2, d: 2, h: .8, color: '#aeb9ef' },
  wheel: { name: '바퀴', detail: '축과 함께 사용하는 둥근 부품', w: 1.4, d: .5, h: 1.4, color: '#4e4e5b' },
  axle: { name: '바퀴 축', detail: '두 바퀴를 연결하는 부품', w: 4, d: .4, h: .4, color: '#b0b1be' },
};
export const INITIAL_INVENTORY = { plate: 1, brick4: 4, brick2: 6, slope: 2, wheel: 4, axle: 2 };
export const PROJECTS = {
  car: { title: '작은 시티 자동차', description: '작은 차체와 네 개의 바퀴를 조합하는 예시예요.', minutes: 8, type: 'car', requires: {plate:1,brick4:2,brick2:3,slope:1,wheel:4,axle:2}, steps: [
    { title:'바닥판을 놓아주세요', text:'돌기가 위를 향하도록 바닥판을 가로로 놓아주세요.', part:'plate', qty:1 },
    { title:'양쪽에 긴 블록을 연결해요', text:'표시된 양쪽 위치에 2 × 4 블록을 하나씩 연결해주세요.', part:'brick4', qty:2 },
    { title:'바퀴와 축을 연결해요', text:'예시 모델의 양쪽 축에 바퀴를 연결해주세요.', part:'wheel', qty:4 },
    { title:'차체 가운데를 쌓아주세요', text:'가운데 표시된 위치에 짧은 블록을 연결해주세요.', part:'brick2', qty:2 },
    { title:'윗부분을 연결해요', text:'차체 위의 표시된 부분을 확인하고 블록을 올려주세요.', part:'brick2', qty:1 },
    { title:'앞부분을 마무리해요', text:'경사 블록을 앞부분에 연결하고 모델을 돌려 모양을 확인해주세요.', part:'slope', qty:1 },
  ]},
  wingcar: { title:'날개 달린 탐험 자동차', description:'자동차에 날개 모양을 더한 시연용 변형안이에요.',minutes:12,type:'wingcar',requires:{plate:1,brick4:4,brick2:4,slope:2,wheel:4,axle:2},steps:[] },
  robot: { title:'책상 위 작은 로봇',description:'바퀴 없이 기본 블록으로 시작하는 예시예요.',minutes:6,type:'robot',requires:{brick4:2,brick2:4},steps:[
    {title:'두 발을 놓아주세요',text:'짧은 블록 두 개를 나란히 놓아주세요.',part:'brick2',qty:2},
    {title:'몸통을 연결해요',text:'두 발을 연결하도록 긴 블록을 올려주세요.',part:'brick4',qty:1},
    {title:'머리와 팔을 만들어요',text:'표시된 위치에 남은 블록을 하나씩 올려주세요.',part:'brick2',qty:2},
    {title:'로봇 모양을 확인해요',text:'원하는 모양이 되었는지 모델을 돌려보세요.',part:'brick4',qty:1},
  ]},
  bench: {title:'작은 블록 벤치',description:'긴 블록을 이용해 간단한 의자를 만드는 예시예요.',minutes:5,type:'bench',requires:{brick4:3,brick2:2},steps:[
    {title:'양쪽 다리를 놓아주세요',text:'짧은 블록 두 개를 떨어뜨려 놓아주세요.',part:'brick2',qty:2},
    {title:'앉는 부분을 연결해요',text:'두 다리 위를 긴 블록으로 연결해주세요.',part:'brick4',qty:2},
    {title:'등받이를 연결해요',text:'뒤쪽에 남은 긴 블록을 연결해주세요.',part:'brick4',qty:1},
  ]},
};
PROJECTS.wingcar.steps = [...PROJECTS.car.steps.slice(0,5),{title:'날개 모양을 더해요',text:'기존 차체를 유지하고 양옆에 경사 블록을 연결해주세요.',part:'slope',qty:2}];
export function missingParts(projectId, inventory) {
  return Object.entries(PROJECTS[projectId].requires).filter(([id,count]) => (inventory[id] || 0)<count).map(([id,count])=>({id,count:count-(inventory[id]||0)}));
}
export function adjustInventory(inventory,id,delta) { return {...inventory,[id]:Math.max(0,Math.min(99,(inventory[id]||0)+delta))}; }
export function recommendations(request,inventory) {
  const order=/로봇/.test(request)?['robot','car','bench']:/벤치|의자/.test(request)?['bench','car','robot']:['car','wingcar','robot'];
  return order.map(id=>({id,missing:missingParts(id,inventory)}));
}
export function classifyQuestion(value){
  if(/연결했/.test(value))return 'next';
  if(/어디|위치|방향|끼워|연결/.test(value))return 'where';
  if(/맞|비교|차이|부품/.test(value))return 'compare';
  if(/다음|완료|고쳤|끝났|연결했/.test(value))return 'next';
  return 'unknown';
}
export function nextStep(index,projectId){return Math.min(index+1,PROJECTS[projectId].steps.length);}
