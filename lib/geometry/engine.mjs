/** Deterministic specification-to-geometry boundary; no research or network access. */
export function planGeometry(spec) {
 const keys=spec.strategy==='pull'?['width','depth','height','leg','centers']:['width','depth','height','thickness','leg','inset'];
 if(!['table','stool','pull'].includes(spec.strategy))throw Error('Unsupported geometry. Supply a supported, reviewed specification.');
 const d={};for(const key of keys){const dim=spec.dimensions[key];if(!dim||!Number.isInteger(dim.value)||dim.value<=0||dim.value>20000||!dim.approved)throw Error(`Review and approve ${key} before modeling.`);if(dim.classification!=='Estimated'&&(!dim.source?.trim()||!dim.evidence?.trim()))throw Error(`Missing evidence for ${key}.`);d[key]=dim.value;}
 const parts=[];const box=(name,size,origin)=>parts.push({name,size,origin,material:spec.material});
 if(spec.strategy==='pull'){
  if(d.centers+d.leg>d.width||d.leg>=d.height||d.leg>=d.depth)throw Error('Mounting centers and support width must fit the grip; support width must be smaller than depth and height.');
  // Mounting plane Y=0, front -Y, insertion point between mounting centers.
  box('Grip',[d.width,d.leg,d.height],[-d.width/2,-d.depth,-d.height/2]);
  for(const x of [-d.centers/2,d.centers/2])box('Support',[d.leg,d.depth-d.leg,d.leg],[x-d.leg/2,-d.depth+d.leg,-d.leg/2]);
 }else{
  if(d.thickness>=d.height||2*(d.inset+d.leg)>=Math.min(d.width,d.depth))throw Error('Top thickness or leg spacing exceeds the product envelope.');
  box('Top',[d.width,d.depth,d.thickness],[-d.width/2,-d.depth/2,d.height-d.thickness]);
  for(const x of [-d.width/2+d.inset,d.width/2-d.inset-d.leg])for(const y of [-d.depth/2+d.inset,d.depth/2-d.inset-d.leg])box('Leg',[d.leg,d.leg,d.height-d.thickness],[x,y,0]);
 }
 return {parts,dimensions:d,orientation:'Z up; front -Y',insertion:spec.strategy==='pull'?'Mounting plane, between mounting centers':'Center at finished floor level'};
}
export function gridPositions(specs){let x=0,y=0,rowHeight=1;const result=[];for(const s of specs){const w=s.dimensions.width.value,h=s.dimensions.depth.value;const cw=Math.ceil((w+100)/2000),ch=Math.ceil((h+100)/2000);if(x&&x+cw>4){x=0;y+=rowHeight;rowHeight=1;}result.push([x*2000+cw*1000,-y*2000-ch*1000,0]);x+=cw;rowHeight=Math.max(rowHeight,ch);}return result;}
export function generateRhino(rhino,specs){
 if(!specs.length||specs.length>100)throw Error('Export requires 1–100 approved products.');
 const file=new rhino.File3dm();file.applicationName='Formwork';file.applicationDetails='Reviewed parametric geometry. Z up; front -Y. Millimeters.';file.settings().modelUnitSystem=rhino.UnitSystem.Millimeters;file.settings().modelAbsoluteTolerance=.01;
 const layers=new Map(),definitions=new Map(),reports=[],placements=specs.length===1?[[0,0,0]]:gridPositions(specs);
 const attr=(name,material)=>{if(!layers.has(material)){const l=new rhino.Layer();l.name=`ID_${material.replace(/[<>:\/\\]/g,'_')}`;l.color={r:151,g:139,b:112,a:255};layers.set(material,file.layers().add(l));}const a=new rhino.ObjectAttributes();a.name=name;a.layerIndex=layers.get(material);return a;};
 const expected=[];
 try{
 for(let index=0;index<specs.length;index++){
  const s=specs[index],plan=planGeometry(s);
  const name=[s.manufacturer||'Custom',s.product_name,s.model_number||s.id.slice(0,8)].join('_').replace(/[^\p{L}\p{N}_-]/gu,'_');
  const group=new rhino.Group();group.name=`${name}_${index+1}`;file.groups().add(group);const groupIndex=file.groups().count-1;
  for(const part of plan.parts){
   const key=JSON.stringify([part.size,part.material]);
   if(!definitions.has(key)){
    const b=new rhino.BoundingBox(0,0,0,...part.size).toBrep();if(!b.isValid||!b.isSolid)throw Error('Invalid or open geometry.');
    const defIndex=file.instanceDefinitions().add(`Component_${definitions.size+1}`,part.name,'','',[0,0,0],[b],[attr(part.name,part.material)]);
    definitions.set(key,file.instanceDefinitions().get(defIndex).id);
   }
   const position=part.origin.map((n,j)=>n+placements[index][j]);const ref=new rhino.InstanceReference(definitions.get(key),rhino.Transform.translationXYZ(...position));const a=attr(`${name}_${part.name}`,part.material);a.addToGroup(groupIndex);file.objects().add(ref,a);
   expected.push({size:part.size,origin:part.origin});
  }
  reports.push({product:s.product_name,parts:plan.parts.length,dimensions:plan.dimensions,insertion:plan.insertion,orientation:plan.orientation,position:placements[index],approvedEstimates:Object.entries(s.dimensions).filter(([,d])=>d.approved&&d.classification==='Estimated').map(([k])=>k)});

 }
 const bytes=file.toByteArray();const reopened=rhino.File3dm.fromByteArray(bytes);if(!reopened)throw Error('Rhino file cannot be read back.');
 let solids=0,instances=0,bad=0,meshes=0,defaultObjects=0;const signatures=new Set();let duplicates=0;const actualSizes=[];
 for(let i=0;i<reopened.objects().count;i++){const o=reopened.objects().get(i),g=o.geometry(),a=o.attributes();if(!g.isValid)bad++;if(a.layerIndex<0||!reopened.layers().get(a.layerIndex).name.startsWith('ID_'))defaultObjects++;if(g instanceof rhino.Mesh)meshes++;if(g instanceof rhino.Brep){if(!g.isSolid)bad++;else solids++;const bb=g.getBoundingBox();const size=bb.max.map((v,j)=>v-bb.min[j]);actualSizes.push(size);const sig=JSON.stringify([a.layerIndex,bb.min,bb.max]);if(signatures.has(sig))duplicates++;signatures.add(sig);}if(g instanceof rhino.InstanceReference)instances++;}
 const dimensional=expected.every(p=>actualSizes.some(s=>s.every((v,i)=>Math.abs(v-p.size[i])<.001)));
 // Walk the serialized block hierarchy, not the planner, to inspect world extents.
 const roots=[];for(let i=0;i<reopened.groups().count;i++)roots.push(reopened.groups().groupMembers(i));
 function inspectAssembly(object,transform,min,max,seen,depth=0){if(depth>10)throw Error('Invalid block nesting.');const geometry=object.geometry();if(geometry instanceof rhino.InstanceReference){const definition=reopened.instanceDefinitions().findId(geometry.parentIdefId);if(!definition)throw Error('Broken block reference.');const next=rhino.Transform.multiply(transform,geometry.xform);for(const id of definition.getObjectIds())inspectAssembly(reopened.objects().findId(id),next,min,max,seen,depth+1);}else if(geometry instanceof rhino.Brep){const copy=geometry.duplicate();copy.transform(transform);const bounds=copy.getBoundingBox();for(let j=0;j<3;j++){min[j]=Math.min(min[j],bounds.min[j]);max[j]=Math.max(max[j],bounds.max[j]);}const signature=JSON.stringify([bounds.min,bounds.max]);if(seen.has(signature))throw Error('Duplicate placed component.');seen.add(signature);}else throw Error('Unexpected geometry type.');}
 let envelopes=true,origins=true,reasonable=true;const extents=[];
 for(let i=0;i<roots.length;i++){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],seen=new Set();for(const root of roots[i])inspectAssembly(root,rhino.Transform.identity(),min,max,seen);extents.push({min,max});const d=reports[i].dimensions;envelopes=envelopes&&[d.width,d.depth,d.height].every((n,j)=>Math.abs(max[j]-min[j]-n)<.001);const p=placements[i];origins=origins&&Math.abs((max[0]+min[0])/2-p[0])<.001&&(specs[i].strategy==='pull'?Math.abs(max[1]-p[1])<.001:Math.abs(min[2])<.001&&Math.abs((max[1]+min[1])/2-p[1])<.001);reasonable=reasonable&&[...min,...max].every(n=>Math.abs(n)<1000000);reports[i].measuredBounds={min,max};}
 let overlaps=false;for(let i=0;i<extents.length;i++)for(let j=i+1;j<extents.length;j++)if(extents[i].min[0]<extents[j].max[0]&&extents[i].max[0]>extents[j].min[0]&&extents[i].min[1]<extents[j].max[1]&&extents[i].max[1]>extents[j].min[1])overlaps=true;
 const checks=[{label:'File units',value:'Millimeters',passed:reopened.settings().modelUnitSystem===rhino.UnitSystem.Millimeters},{label:'Component dimensions',value:'Within 0.001 mm',passed:dimensional},{label:'Whole-millimeter design dimensions',value:'Checked',passed:true},{label:'Closed NURBS definitions',value:String(solids),passed:solids>0},{label:'Invalid / open solids',value:String(bad),passed:bad===0},{label:'Meshes',value:String(meshes),passed:meshes===0},{label:'Duplicate geometry definitions',value:String(duplicates),passed:duplicates===0},{label:'Objects on Default',value:String(defaultObjects),passed:defaultObjects===0},{label:'Material layers',value:String(reopened.layers().count),passed:reopened.layers().count===layers.size},{label:'Block instances',value:String(instances),passed:instances>0},{label:'File size',value:`${(bytes.length/1024).toFixed(1)} KB`,passed:bytes.length<10*1024*1024}];
 checks.push({label:'Overall width / depth / height',value:'Within 0.001 mm',passed:envelopes&&roots.length===specs.length},{label:'Insertion points',value:'Checked',passed:origins},{label:'Product overlap',value:overlaps?'Detected':'None',passed:!overlaps},{label:'Distance from origin',value:'Within 1 km',passed:reasonable});
 if(checks.some(c=>!c.passed))throw Error('Geometry QA failed. Download blocked.');return {bytes,report:{passed:true,checks,products:reports,generatedAt:new Date().toISOString(),engine:'rhino3dm 8.17.0',scope:'Serialized component and product bounds inspected. Rectilinear NURBS primitives only; no manufacturing or installation certification.'}};
 }finally{/* The isolated engine lifetime owns native allocations. */}
}
