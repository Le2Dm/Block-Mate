import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {parseSetInput} from '../dist/set-import-core.js';
import {SET_60482 as set} from '../dist/set-60482.js';
import {blocksFor} from '../dist/render.js';

test('LEGO Builder QR extracts set and manual, discarding booklet token',()=>{
 const result=parseSetInput('HTTPS://LEGO.COM/GO/38/0060482/6606824/EXAMPLEBOOKLET');
 assert.deepEqual(result,{ok:true,setNumber:'60482',manualId:'6606824',source:'qr'});
 assert.equal(JSON.stringify(result).includes('EXAMPLEBOOKLET'),false);
});
test('survey QR is distinguished from an instruction QR',()=>assert.deepEqual(parseSetInput('https://LEGO.com/productfeedback-qr'),{ok:false,reason:'survey'}));
test('manual number and official instruction links work',()=>{
 for(const input of ['60482','https://www.lego.com/en-us/service/building-instructions/60482','https://www.lego.com/service/buildinginstructions/60482'])assert.equal(parseSetInput(input).setNumber,'60482');
});
test('unrelated domains, schemes, credentials and broken QR paths are rejected',()=>{
 for(const input of ['https://lego.com.evil.test/GO/38/0060482/6606824/T','javascript:alert(1)','https://user@lego.com/GO/38/0060482/6606824/T','https://lego.com:999/GO/38/0060482/6606824/T','https://lego.com/GO/38/0060482/no/T','60482<script>'])assert.equal(parseSetInput(input).ok,false,input);
});
test('28 tasks cover official instruction pages 5–59 without omissions',()=>{
 assert.equal(set.steps.length,28);assert.deepEqual(set.steps.flatMap(s=>s.pages),Array.from({length:55},(_,i)=>i+5));
 for(const step of set.steps){assert.ok(step.needs.length);for(const n of step.needs){assert.ok(set.parts[n.part]);assert.ok(n.qty>0);}}
});
test('step consumption matches all 36 inventory entries and all 67 pieces',()=>{
 const inventory=Object.entries(set.parts).filter(([,p])=>!p.virtual),used={};
 for(const step of set.steps)for(const need of step.needs)if(!set.parts[need.part].virtual)used[need.part]=(used[need.part]||0)+need.qty;
 assert.equal(inventory.length,36);assert.equal(inventory.reduce((n,[,p])=>n+p.qty,0),67);
 for(const[id,p]of inventory)assert.equal(used[id],p.qty,id);
});
test('all instruction and part pictures are packaged locally',()=>{
 for(const n of [1,...Array.from({length:56},(_,i)=>i+5),62,63])assert.ok(existsSync(new URL(`../dist/assets/60482/page-${String(n).padStart(2,'0')}.webp`,import.meta.url)));
 for(const p of Object.values(set.parts))assert.ok(existsSync(new URL('../dist/'+p.image.replace(/^\.\//,''),import.meta.url)),p.image);
});
test('3D coverage is explicitly limited to the foundation task',()=>{
 assert.deepEqual(set.steps.filter(s=>s.model).map(s=>s.page),[6]);
 const model=blocksFor('firetruck-foundation');assert.equal(model[0].w,8);assert.equal(model[0].d,2);assert.equal(model[0].h,1/3);assert.ok(model.some(b=>b.group===1&&b.w===1));
});
