import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three/three.module.js';
import {ASSEMBLY_PIECES,PART_SHAPES,getAssemblyState} from '../dist/assembly-60482.js';
import {SET_60482} from '../dist/set-60482.js';
import {makePartMesh} from '../dist/guide-3d.js';

test('3D model contains exactly the official 36 types and 67 individual parts',()=>{
 assert.equal(ASSEMBLY_PIECES.length,67);assert.equal(new Set(ASSEMBLY_PIECES.map(p=>p.id)).size,67);
 for(const[id,p]of Object.entries(SET_60482.parts).filter(([,p])=>!p.virtual))assert.equal(ASSEMBLY_PIECES.filter(piece=>piece.elementId===id).length,p.qty,id);
});
test('each task highlights the parts actually added or moved in that task',()=>{
 for(let step=0;step<28;step++){
  const state=getAssemblyState(step);assert.ok(state.some(p=>p.active&&p.visible),'step '+step);
  const expected=SET_60482.steps[step].needs;
  for(const need of expected){if(SET_60482.parts[need.part].virtual)continue;assert.equal(state.filter(p=>p.elementId===need.part&&p.active).length,need.qty,`step ${step} / ${need.part}`);}
 }
});
test('subassemblies move into place rather than duplicating pieces',()=>{
 for(const[group,step]of[['rear',5],['front',11],['figure',21],['wheel-0',27]]){
  const before=getAssemblyState(step-1).filter(p=>p.assembly===group),after=getAssemblyState(step).filter(p=>p.assembly===group);
  assert.deepEqual(before.map(p=>p.id),after.map(p=>p.id));assert.notDeepEqual(before.map(p=>p.position),after.map(p=>p.position));assert.ok(after.every(p=>p.active&&p.visible));
 }
 assert.equal(getAssemblyState(27).filter(p=>p.visible).length,67);
});
test('all molded part geometries have finite vertices, normals and bounds',()=>{
 for(const[id,spec]of Object.entries(PART_SHAPES)){
  const group=makePartMesh(spec);group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(group);
  assert.ok(!bounds.isEmpty(),id);assert.ok([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite),id);
  let triangles=0;group.traverse(o=>{if(!o.isMesh)return;for(const attr of['position','normal']){const a=o.geometry.getAttribute(attr);assert.ok(a,id);assert.ok([...a.array].every(Number.isFinite),id+' '+attr);}triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert.equal(o.material.depthTest,true,id);});assert.ok(triangles>0,id);
 }
});
test('final assembly remains intersectable from every horizontal and vertical direction',()=>{
 const root=new THREE.Group();for(const p of getAssemblyState(27)){const m=makePartMesh(p.shape);m.position.set(...p.position);m.rotation.set(...p.rotation);root.add(m);}root.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(root),center=bounds.getCenter(new THREE.Vector3()),r=bounds.getSize(new THREE.Vector3()).length()/2,ray=new THREE.Raycaster();
 for(let n=0;n<16;n++)for(const pitch of[-1.2,-.45,0,.45,1.2]){
  const a=n/16*Math.PI*2,dir=new THREE.Vector3(Math.cos(a)*Math.cos(pitch),Math.sin(pitch),Math.sin(a)*Math.cos(pitch));let hits=0;
  for(const offset of[-1,0,1]){const target=center.clone().add(new THREE.Vector3(0,offset,0));ray.set(target.clone().addScaledVector(dir,r*3),dir.clone().negate());hits+=ray.intersectObject(root,true).length;}
  assert.ok(hits>0,`yaw ${n} / pitch ${pitch}`);
 }
});
