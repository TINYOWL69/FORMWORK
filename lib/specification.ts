import { z } from 'zod';
export const dimensionSchema = z.object({value:z.number().int().positive().max(20000).nullable(),classification:z.enum(['Verified','Derived','Estimated']),source:z.string().max(2000),evidence:z.string().max(2000),approved:z.boolean()});
export const specificationSchema = z.object({
 id:z.string().uuid(), manufacturer:z.string().max(150), product_name:z.string().min(1).max(200), model_number:z.string().max(100),variant:z.string().max(100),category:z.enum(['Furniture','Lighting','Plumbing','Hardware','Equipment','Accessories']),
 strategy:z.enum(['table','stool','pull','unsupported']),project:z.string().max(150),material:z.string().min(1).max(100),finish:z.string().max(150),notes:z.string().max(5000),
 dimensions:z.record(dimensionSchema),source_urls:z.array(z.string().url()).max(20),source_documents:z.array(z.object({key:z.string(),name:z.string(),type:z.string()})).max(20),
 research_notes:z.array(z.string()).max(100),cad_assets:z.array(z.object({url:z.string().url(),label:z.string()})).max(20),created_at:z.number(),image:z.string().max(2000).optional(),
});
export type Specification=z.infer<typeof specificationSchema>;
export const dimensionLabels:Record<string,string>={width:'Overall width',depth:'Overall depth',height:'Overall height',thickness:'Top / grip thickness',leg:'Leg / support width',inset:'Leg inset',centers:'Mounting centers'};
export const requiredDimensions=(strategy:string)=>strategy==='pull'?['width','depth','height','leg','centers']:['width','depth','height','thickness','leg','inset'];
export function newSpecification():Specification{return {id:crypto.randomUUID(),manufacturer:'',product_name:'Untitled product',model_number:'',variant:'',category:'Furniture',strategy:'table',project:'Studio library',material:'Oak',finish:'',notes:'',dimensions:Object.fromEntries(Object.keys(dimensionLabels).map(k=>[k,{value:null,classification:'Estimated' as const,source:'',evidence:'',approved:false}])),source_urls:[],source_documents:[],research_notes:[],cad_assets:[],created_at:Date.now()};}
export function verificationIssues(s:Specification){const issues:string[]=[];if(s.strategy==='unsupported')issues.push('This shape requires a custom geometry strategy.');for(const k of requiredDimensions(s.strategy)){const d=s.dimensions[k];if(!d?.value)issues.push(`${dimensionLabels[k]} is missing.`);else if(!d.approved)issues.push(`${dimensionLabels[k]} needs approval.`);else if(d.classification!=='Estimated'&&(!d.source.trim()||!d.evidence.trim()))issues.push(`${dimensionLabels[k]} needs a source and evidence.`);}return issues;}
