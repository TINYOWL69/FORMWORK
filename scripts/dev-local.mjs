process.env.FORMWORK_LOCAL_NODE='1';
await import('./portable-compat.mjs');
process.argv=[process.execPath,process.argv[1],'dev'];
await import('./run-framework.mjs');
