import { specificationSchema, verificationIssues } from './specification';

export const demoMode = process.env.NEXT_PUBLIC_FORMWORK_DEMO === '1';

async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('formwork-demo', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('products', { keyPath: 'id' });
      request.result.createObjectStore('files');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(Error('Browser storage unavailable. Allow site storage and retry.'));
  });
}

async function stored<T>(store: string, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const request = action(tx.objectStore(store));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error || Error('Could not save browser data.')); };
  });
}

export async function demoApi(path: string, body?: unknown): Promise<any> {
  if (path === '/api/products') {
    if (!body) return (await stored<any[]>('products', s => s.getAll())).sort((a,b) => b.updated_at-a.updated_at);
    const spec = specificationSchema.parse(body);
    await stored('products', s => s.put({...spec, status: 'Needs Review', updated_at: Date.now()}));
    return {id: spec.id, status: 'Needs Review'};
  }
  if (!(body instanceof FormData)) throw Error('Invalid upload.');
  const file = body.get('file');
  if (!(file instanceof File)) throw Error('Choose a file.');
  if (path === '/api/files') {
    if (file.size > 20*1024*1024 || !/\.(png|jpe?g|webp|pdf|csv|xlsx)$/i.test(file.name)) throw Error('Choose an image, PDF, CSV, or XLSX smaller than 20 MB.');
    const key = `references/${crypto.randomUUID()}`;
    await stored('files', s => s.put(file, key));
    return {key, name: file.name, type: file.type};
  }
  if (path === '/api/models') {
    const spec = specificationSchema.parse(JSON.parse(String(body.get('specification'))));
    const qa = JSON.parse(String(body.get('report')));
    if (verificationIssues(spec).length || !qa.passed || !qa.checks?.every((c:any) => c.passed)) throw Error('Model did not pass review and QA.');
    if (file.size > 10*1024*1024 || !(await file.slice(0,24).text()).startsWith('3D Geometry File Format')) throw Error('Invalid Rhino file.');
    const saved = await stored<any>('products', s => s.get(spec.id));
    if (!saved || JSON.stringify(specificationSchema.parse(saved)) !== JSON.stringify(spec)) throw Error('Specification changed. Save it and generate again.');
    const key = `models/${crypto.randomUUID()}`;
    await stored('files', s => s.put(file, key));
    await stored('products', s => s.put({...spec, model_key: key, qa, status:'Ready', updated_at:Date.now()}));
    return {key};
  }
  throw Error('Unknown demo operation.');
}

export async function downloadDemoFile(key: string) {
  const file = await stored<File | undefined>('files', s => s.get(key));
  if (!file) throw Error('Demo file missing. Generate or upload it again.');
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url; link.download = file.name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
