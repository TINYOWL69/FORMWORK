/* Rhino runs off the UI thread in an isolated heap that is discarded per job. */
importScripts('/rhino/rhino3dm.js');
self.onmessage=async ({data:specs})=>{try{const rhino=await rhino3dm({locateFile:file=>`/rhino/${file}`});const {generateRhino}=await import('/rhino/engine.mjs');const result=generateRhino(rhino,specs);self.postMessage(result,[result.bytes.buffer]);}catch(error){self.postMessage({error:error.message||'Geometry generation failed.'});}};
