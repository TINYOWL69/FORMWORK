/** Node-only local adapter. Production uses Cloudflare D1/R2. */
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
const root=path.resolve('.local-data');mkdirSync(root,{recursive:true});
const db=new DatabaseSync(path.join(root,'formwork.sqlite'));
const journal=JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8'));
db.exec('CREATE TABLE IF NOT EXISTS local_migrations (name TEXT PRIMARY KEY)');
for(const entry of journal.entries){if(!db.prepare('SELECT name FROM local_migrations WHERE name=?').get(entry.tag)){db.exec('BEGIN');try{db.exec(readFileSync(`drizzle/${entry.tag}.sql`,'utf8'));db.prepare('INSERT INTO local_migrations(name) VALUES (?)').run(entry.tag);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}}}
class Statement{constructor(private sql:string,private values:any[]=[] ){}bind(...values:any[]){return new Statement(this.sql,values);}async all(){return {results:db.prepare(this.sql).all(...this.values)};}async first(){return db.prepare(this.sql).get(...this.values)||null;}async run(){const result=db.prepare(this.sql).run(...this.values);return {success:true,meta:{changes:Number(result.changes)}};}}
const bucketPath=(key:string)=>{if(!/^(references|models)\/[a-zA-Z0-9_-]+$/.test(key))throw Error('Invalid object key');return path.join(root,key.replace('/','_'));};
export const env:any={DB:{prepare:(sql:string)=>new Statement(sql)},BUCKET:{async put(key:string,bytes:ArrayBuffer,metadata:any){const p=bucketPath(key);writeFileSync(p,new Uint8Array(bytes));writeFileSync(`${p}.json`,JSON.stringify(metadata));},async get(key:string){const p=bucketPath(key);if(!existsSync(p))return null;return {body:new Uint8Array(readFileSync(p)),...JSON.parse(readFileSync(`${p}.json`,'utf8'))};}},RESEARCH_PROVIDER_URL:process.env.RESEARCH_PROVIDER_URL,RESEARCH_PROVIDER_KEY:process.env.RESEARCH_PROVIDER_KEY};
