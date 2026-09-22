import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import rhino3dm from 'rhino3dm';
import {generateRhino,planGeometry,gridPositions} from '../lib/geometry/engine.mjs';
const rhino=await rhino3dm();
const make=(strategy,dimensions)=>({id:crypto.randomUUID(),manufacturer:'Formwork sample',product_name:strategy,material:'Oak',strategy,dimensions:Object.fromEntries(Object.entries(dimensions).map(([k,value])=>[k,{value,classification:'Estimated',approved:true}]))});
const table=make('table',{width:1200,depth:600,height:750,thickness:30,leg:40,inset:50});
const stool=make('stool',{width:400,depth:400,height:450,thickness:30,leg:35,inset:20});
const pull=make('pull',{width:180,depth:35,height:16,leg:10,centers:128});
for(const spec of [table,stool,pull]){console.log('Testing',spec.strategy);const output=generateRhino(await rhino3dm(),[spec]);assert(output.report.passed);assert(output.report.checks.every(c=>c.passed));const reopened=rhino.File3dm.fromByteArray(output.bytes);assert(reopened);assert.equal(reopened.settings().modelUnitSystem,rhino.UnitSystem.Millimeters);assert.equal(reopened.layers().get(0).name,'ID_Oak');}
const unapproved=structuredClone(table);unapproved.dimensions.width.approved=false;assert.throws(()=>generateRhino(rhino,[unapproved]),/approve width/);
const decimal=structuredClone(table);decimal.dimensions.width.value=1200.5;assert.throws(()=>planGeometry(decimal),/width/);
const invalid=structuredClone(table);invalid.dimensions.thickness.value=800;assert.throws(()=>planGeometry(invalid),/thickness/);
const unsupported={...table,strategy:'basin'};assert.throws(()=>planGeometry(unsupported),/Unsupported/);
const wide=make('table',{width:4400,depth:2300,height:750,thickness:30,leg:80,inset:100});
const batch=generateRhino(await rhino3dm(),[wide,stool,table,pull]);assert(batch.report.checks.every(c=>c.passed));assert.equal(gridPositions([wide,stool])[0][0],3000);
const first=generateRhino(await rhino3dm(),[table]),second=generateRhino(await rhino3dm(),[table]);assert.deepEqual(first.report.products,second.report.products);
writeFileSync('sample-table.3dm',first.bytes);writeFileSync('sample-table-qa.json',JSON.stringify(first.report,null,2));writeFileSync('sample-schedule.3dm',batch.bytes);
console.log('PASS: table, stool, pull, rejected unknown/unapproved/decimal/impossible geometry, component block read-back, bounds, batch grid, deterministic geometric output.');
