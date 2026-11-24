// Stud units; height of a standard plate = 0.4 and a brick = 1.2.
// Classroom reconstruction from booklet 6606824. Special molds are simplified.
export const PART_SHAPES={
 '4210997':{kind:'plate',w:8,d:2,h:.4,color:'#62676b'},
 '4600178':{kind:'recess',w:4,d:2,h:.8,color:'#24282b'},
 '6408542':{kind:'axle',w:2,d:4,h:.4,color:'#a4aaaf'},
 '6443446':{kind:'arch',w:4,d:2,h:2,color:'#24282b'},
 '6118832':{kind:'bracket',w:.8,d:4,h:2,color:'#24282b'},
 '4613153':{kind:'bumper',w:.45,d:4,h:.7,color:'#24282b'},
 '241226':{kind:'grille',w:.18,d:2,h:.55,color:'#42474b'},
 '6514189':{kind:'round-light',w:.18,d:.5,h:.5,color:'#e23749'},
 '6514191':{kind:'round-light',w:.18,d:.5,h:.5,color:'#f0f5f1'},
 '366601':{kind:'plate',w:6,d:1,h:.4,color:'#f5f4ec'},
 '6465247':{kind:'plate',w:1,d:1,h:.4,color:'#f8d62c'},
 '6382324':{kind:'plate',w:2,d:1,h:.4,color:'#f8d62c'},
 '4211397':{kind:'plate',w:2,d:2,h:.4,color:'#a4aaaf'},
 '300223':{kind:'brick',w:3,d:2,h:1.2,color:'#176cc3'},
 '301021':{kind:'brick',w:4,d:1,h:1.2,color:'#db2535'},
 '4565323':{kind:'jumper',w:2,d:2,h:.4,color:'#24282b'},
 '6146217':{kind:'seat',w:2,d:1,h:1.2,color:'#db2535'},
 '73081':{kind:'steering',w:1,d:2,h:1.25,color:'#24282b'},
 '302021':{kind:'plate',w:2,d:4,h:.4,color:'#db2535'},
 '6388133':{kind:'brick',w:1,d:1,h:1.2,color:'#62676b'},
 '6347310':{kind:'clip',w:2,d:1,h:.65,color:'#24282b'},
 '302221':{kind:'plate',w:2,d:2,h:.4,color:'#db2535'},
 '407021':{kind:'side-stud',w:1,d:1,h:1.2,color:'#db2535'},
 '6586851':{kind:'curve',w:1,d:.75,h:.8,color:'#176cc3'},
 '243221':{kind:'frame',w:.25,d:2,h:1.2,color:'#db2535'},
 '6514185':{kind:'small-window',w:.22,d:2,h:2.4,color:'#bddfea'},
 '6507908':{kind:'windshield',w:3,d:4,h:2.4,color:'#bddfea'},
 '6588088':{kind:'logo-panel',w:2,d:.25,h:2.4,color:'#db2535'},
 '243121':{kind:'tile',w:1,d:4,h:.4,color:'#db2535'},
 '6579692':{kind:'roof',w:4,d:4,h:.4,color:'#db2535'},
 '6510179':{kind:'beacon',w:1,d:4,h:.45,color:'#62c0e8'},
 '4521681':{kind:'ladder',w:4,d:2,h:.25,color:'#33383d'},
 '6336858':{kind:'tire',w:3.2,d:.8,h:3.2,color:'#24272b'},
 '6070695':{kind:'wheel-cap',w:2,d:.16,h:2,color:'#353a3f'},
 '6585272':{kind:'figure-body',w:1.5,d:.75,h:1.25,color:'#252a2f'},
 '6583786':{kind:'figure-head',w:1,d:1,h:1,color:'#f6ce35'},
};
const pieces=[];
const add=(step,elementId,position,extra={})=>{
 const p={id:`${elementId}-${pieces.filter(p=>p.elementId===elementId).length+1}`,elementId,step,position,rotation:[0,0,0],...extra};pieces.push(p);return p;
};
add(0,'6585272',[0,0,0],{assembly:'figure'});
add(0,'6583786',[0,1.25,0],{assembly:'figure'});
add(1,'4210997',[0,0,0]);for(const x of[-2,2])add(1,'4600178',[x,.4,0]);
for(const x of[-2,2])add(2,'6408542',[x,.8,0]);add(2,'6443446',[-2,1.2,-1]);
for(const[x,z]of[[-2,1],[2,-1],[2,1]])add(3,'6443446',[x,1.2,z]);
function bumper(step,assembly,light){
 add(step,'6118832',[0,0,0],{assembly});add(step,'4613153',[.55,0,0],{assembly});add(step,'241226',[.8,.78,0],{assembly});
 for(const z of[-1.5,1.5])add(step,light,[.84,.8,z],{assembly});
}
bumper(4,'rear','6514189');
for(const z of[-.5,.5])add(6,'366601',[0,3.2,z]);for(const z of[-1.5,1.5])add(6,'6465247',[-3.5,3.2,z]);
for(const z of[-1.5,1.5]){add(7,'6465247',[3.5,3.2,z]);add(7,'6382324',[1,3.2,z]);}
add(8,'4211397',[1.5,3.6,0]);add(8,'300223',[-1.5,3.6,0]);add(8,'301021',[-3.5,3.6,0],{rotation:[0,Math.PI/2,0]});
add(9,'4565323',[1.5,4,0]);for(const z of[-1.5,1.5])add(9,'301021',[-1,3.6,z]);
bumper(10,'front','6514191');
for(const z of[-1.5,1.5])add(12,'6146217',[2,3.6,z],{rotation:[0,z<0?Math.PI:0,0]});
add(13,'73081',[2.6,4,0]);add(13,'301021',[3.5,3.6,0],{rotation:[0,Math.PI/2,0]});
add(14,'302021',[-2.5,4.8,0]);
for(const z of[-.5,.5]){add(15,'6388133',[-2.5,5.2,z]);add(15,'6347310',[-2,6.4,z]);}
add(16,'302221',[-2,6.8,0]);
for(const z of[-1.5,1.5])add(17,'407021',[-1.5,4.8,z],{rotation:[0,z<0?Math.PI:0,0]});
for(const z of[-2.05,2.05])add(18,'6586851',[-1.5,5,z],{rotation:[0,z<0?Math.PI:0,0]});
for(const z of[-1,1])add(19,'243221',[-1.5,6,z]);
add(20,'6514185',[-.94,4.8,0]);
add(22,'6507908',[2.5,4.8,0]);for(const z of[-1.75,1.75])add(22,'6588088',[0,4.8,z]);
add(23,'243121',[-.5,7.2,0]);add(24,'6579692',[2,7.2,0]);
add(25,'6510179',[.5,7.6,0]);add(25,'4521681',[-2.2,7.3,0],{rotation:[0,0,-.12]});
for(let i=0;i<4;i++){add(26,'6336858',[0,0,0],{assembly:`wheel-${i}`});add(26,'6070695',[0,0,-.43],{assembly:`wheel-${i}`});}
export const ASSEMBLY_PIECES=Object.freeze(pieces.map(p=>Object.freeze(p)));
const moves={figure:21,rear:5,front:11,'wheel-0':27,'wheel-1':27,'wheel-2':27,'wheel-3':27};
export function getAssemblyState(requestedStep=27){
 const step=Math.max(0,Math.min(27,Number.isFinite(requestedStep)?Math.trunc(requestedStep):0));
 return ASSEMBLY_PIECES.filter(p=>p.step<=step).map(piece=>{
  let anchor=[0,0,0],yaw=0,visible=true;
  if(piece.assembly==='figure'){anchor=step>=21?[1.2,4.4,0]:[0,0,0];visible=step===0||step>=21;}
  if(piece.assembly==='rear'){anchor=[step>=5?-4:-6.3,1.2,0];yaw=Math.PI;}
  if(piece.assembly==='front')anchor=[step>=11?4:6.3,1.2,0];
  if(piece.assembly?.startsWith('wheel-')){
   const i=Number(piece.assembly.slice(-1));
   if(step>=27){anchor=[i<2?-2:2,1,(i%2===0?-1:1)*2.45];yaw=i%2===0?0:Math.PI;}
   else anchor=[-3+i*2,1.65,-4.8];
  }
  const [x,y,z]=piece.position,co=Math.cos(yaw),si=Math.sin(yaw);
  const position=[anchor[0]+x*co+z*si,anchor[1]+y,anchor[2]-x*si+z*co];
  return {...piece,position,rotation:[piece.rotation[0],piece.rotation[1]+yaw,piece.rotation[2]],visible,active:piece.step===step||moves[piece.assembly]===step,shape:PART_SHAPES[piece.elementId]};
 });
}
