// IndexedDB for offline form queue
const DB_NAME = 'anmore-bike-db';
const DB_VERSION = 1;
const FORM_STORE = 'form-queue';

interface QueuedForm {
  id: string;
  timestamp: number;
  data: any;
}

// Open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(FORM_STORE)) {
        db.createObjectStore(FORM_STORE, { keyPath: 'id' });
      }
    };
  });
}

// Add form to queue
export async function queueForm(data: any): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction([FORM_STORE], 'readwrite');
  const store = transaction.objectStore(FORM_STORE);
  
  const queuedForm: QueuedForm = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    data
  };
  
  store.add(queuedForm);
  
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Get all queued forms
export async function getQueuedForms(): Promise<QueuedForm[]> {
  const db = await openDB();
  const transaction = db.transaction([FORM_STORE], 'readonly');
  const store = transaction.objectStore(FORM_STORE);
  const request = store.getAll();
  
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Remove form from queue
export async function removeQueuedForm(id: string): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction([FORM_STORE], 'readwrite');
  const store = transaction.objectStore(FORM_STORE);
  
  store.delete(id);
  
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Check online status
export function isOnline(): boolean {
  return navigator.onLine;
}

// Register service worker
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      
      // Request background sync permission
      if ('sync' in registration) {
        await (registration as any).sync.register('sync-nostr-forms');
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

// Listen for sync messages
export function listenForSync(callback: () => void): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'SYNC_FORMS') {
        callback();
      }
    });
  }
}
