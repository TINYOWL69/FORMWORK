// Vite's optional Windows network-drive probe must not prevent startup when
// the host denies child-process pipes. This does not change path permissions.
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
const originalExec = childProcess.exec;
childProcess.exec = function(command, ...args) {
  try { return originalExec.call(this, command, ...args); }
  catch(error) {
    if(command !== 'net use' || error.code !== 'EPERM') throw error;
    const callback = args.at(-1);
    if(typeof callback === 'function') queueMicrotask(()=>callback(error, '', ''));
    return undefined;
  }
};
syncBuiltinESMExports();
