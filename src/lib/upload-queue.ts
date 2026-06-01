/**
 * IndexedDB-backed queue for photo uploads that happen offline or while
 * the network momentarily fails. The /m capture path enqueues here, and
 * flushQueue() is called on app mount and whenever the browser fires an
 * `online` event.
 */

interface PendingUploadRow {
  id?: number;
  file: Blob;
  filename: string;
  name: string;
  project_id: string | null;
  enqueued_at: number;
  retry_count: number;
}

export interface PendingUpload extends PendingUploadRow {
  id: number;
}

const DB_NAME = 'photodoc-offline';
const DB_VERSION = 1;
const STORE = 'pending_uploads';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueUpload(file: File, name: string, project_id: string | null): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add({
        file,
        filename: file.name,
        name,
        project_id,
        enqueued_at: Date.now(),
        retry_count: 0,
      } satisfies PendingUploadRow);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function getPending(): Promise<PendingUpload[]> {
  const db = await openDb();
  try {
    return await new Promise<PendingUpload[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as PendingUpload[]);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

async function removePending(id: number): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function bumpRetry(id: number): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const row = getReq.result as PendingUpload | undefined;
        if (row) {
          row.retry_count = (row.retry_count ?? 0) + 1;
          store.put(row);
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

let flushing = false;

/**
 * Attempts to upload everything queued. Safe to call repeatedly; a
 * concurrent flush is skipped via a module-local lock. Returns counts
 * so the UI can show a toast / refresh on success.
 */
export async function flushQueue(): Promise<{ uploaded: number; failed: number; remaining: number }> {
  if (flushing) return { uploaded: 0, failed: 0, remaining: (await getPending()).length };
  flushing = true;
  let uploaded = 0;
  let failed = 0;
  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { uploaded: 0, failed: 0, remaining: (await getPending()).length };
    }
    const items = await getPending();
    for (const item of items) {
      try {
        const fd = new FormData();
        fd.append('file', item.file, item.filename);
        if (item.project_id) fd.append('projectId', item.project_id);
        if (item.name) fd.append('photoName', item.name);
        const res = await fetch('/api/m/upload', { method: 'POST', body: fd });
        if (res.ok) {
          await removePending(item.id);
          uploaded += 1;
        } else {
          await bumpRetry(item.id);
          failed += 1;
        }
      } catch {
        await bumpRetry(item.id);
        failed += 1;
      }
    }
    const remaining = (await getPending()).length;
    return { uploaded, failed, remaining };
  } finally {
    flushing = false;
  }
}
