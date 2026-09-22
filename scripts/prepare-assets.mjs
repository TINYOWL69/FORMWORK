import {mkdirSync,copyFileSync} from 'node:fs';
mkdirSync('public/rhino',{recursive:true});
for(const name of ['rhino3dm.js','rhino3dm.wasm'])copyFileSync(`node_modules/rhino3dm/${name}`,`public/rhino/${name}`);
copyFileSync('lib/geometry/engine.mjs','public/rhino/engine.mjs');
