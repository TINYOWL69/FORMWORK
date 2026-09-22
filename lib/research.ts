import type { Specification } from './specification';
export interface ResearchProvider { research(spec:Specification):Promise<Partial<Specification>> }
export function safePublicUrl(raw:string){const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(u.hostname)||u.hostname.includes(':')||/\.(local|internal|localhost)$/.test(u.hostname)||/^\d+(\.\d+){3}$/.test(u.hostname))throw Error('Use a public HTTPS product URL.');return u;}
export class PageResearchProvider implements ResearchProvider {
 async research(spec:Specification){
  const notes:string[]=[];const dimensions={...spec.dimensions};const cad_assets:Specification['cad_assets']=[];let product_name=spec.product_name,manufacturer=spec.manufacturer,model_number=spec.model_number;
  for(const source of spec.source_urls){
   try{const url=safePublicUrl(source);const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(12000),headers:{'Accept':'text/html'}});if(!response.ok)throw Error(`Source returned HTTP ${response.status}; open the source and enter its specifications.`);if(!response.headers.get('content-type')?.includes('text/html'))throw Error('Upload technical documents as references.');
    const reader=response.body!.getReader();let html='',bytes=0;const decoder=new TextDecoder();while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2_000_000){await reader.cancel();throw Error('Source is too large for automatic inspection.');}html+=decoder.decode(value,{stream:true});}
    const flatten=(x:any):any[]=>Array.isArray(x)?x.flatMap(flatten):x&&typeof x==='object'?[x,...flatten(x['@graph']||[])]:[];
    const nodes=[...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap(m=>{try{return flatten(JSON.parse(m[1]));}catch{return [];}});
    const product=nodes.find(x=>[x['@type']].flat().includes('Product'));
    if(product){if(product_name==='Untitled product'&&typeof product.name==='string')product_name=product.name.slice(0,200);if(!manufacturer)manufacturer=String(product.brand?.name||product.manufacturer?.name||'').slice(0,150);if(!model_number)model_number=String(product.sku||product.mpn||'').slice(0,100);
     for(const key of ['width','depth','height']){const value=product[key];const raw=Number(value?.value);const unit=String(value?.unitCode||value?.unitText||'').toLowerCase();const scale=({mm:1,mmt:1,cm:10,cmt:10,m:1000,mtr:1000} as Record<string,number>)[unit];if(raw>0&&scale&&Number.isInteger(raw*scale)){const mm=raw*scale;if(dimensions[key]?.value&&dimensions[key].value!==mm){notes.push(`Conflict: ${key} is ${mm} mm on ${source}; retained ${dimensions[key].value} mm. Resolve before approval.`);dimensions[key]={...dimensions[key],approved:false};}else dimensions[key]={value:mm,classification:'Verified',source,evidence:`Product structured data: ${raw} ${unit}. Source authority and variant require human review.`,approved:false};}}
    }else notes.push(`No structured product specification found at ${source}. Enter dimensions from its technical documentation.`);
    for(const m of html.matchAll(/href=["']([^"']+\.(?:3dm|step|stp|iges|igs|dwg|dxf|skp|rvt)(?:\?[^"']*)?)["']/gi)){try{const u=safePublicUrl(new URL(m[1],url).href).href;cad_assets.push({url:u,label:u.split('/').pop()!.slice(0,100)});}catch{}}
   }catch(error){notes.push(error instanceof Error?error.message:'Source could not be inspected.');}
  }
  if(spec.source_documents.length)notes.push('Uploaded manufacturer documents take priority. Automatic PDF and image interpretation requires a research provider; transcribe and cite their dimensions here.');
  notes.push('Confirm product identity, variant, source authority, and visible form. This review does not certify a manufacturer model.');
  return {product_name,manufacturer,model_number,dimensions,cad_assets:cad_assets.slice(0,20),research_notes:notes};
 }
}
