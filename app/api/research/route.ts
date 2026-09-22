import { env } from 'cloudflare:workers';
import { specificationSchema } from '@/lib/specification';
import { PageResearchProvider } from '@/lib/research';
export async function POST(request:Request){try{const spec=specificationSchema.parse(await request.json());const endpoint=(env as any).RESEARCH_PROVIDER_URL;let result;
 if(endpoint){const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${(env as any).RESEARCH_PROVIDER_KEY||''}`},body:JSON.stringify(spec),signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Research provider unavailable.');const partial=await response.json() as any;result=specificationSchema.parse({...spec,...partial,id:spec.id});for(const d of Object.values(result.dimensions))d.approved=false;}
 else result={...spec,...await new PageResearchProvider().research(spec)};
 return Response.json(result);
 }catch(e){return Response.json({error:e instanceof Error?e.message:'Research failed. Your references remain saved.'},{status:400});}}
