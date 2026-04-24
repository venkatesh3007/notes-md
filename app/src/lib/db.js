// IndexedDB wrapper for local vault storage

const DB_NAME = 'notes-md';
const DB_VERSION = 1;

class VaultDB {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Vaults store
        if (!db.objectStoreNames.contains('vaults')) {
          db.createObjectStore('vaults', { keyPath: 'id' });
        }
        
        // Files store
        if (!db.objectStoreNames.contains('files')) {
          const store = db.createObjectStore('files', { keyPath: 'id' });
          store.createIndex('vaultId', 'vaultId', { unique: false });
        }
      };
    });
  }

  async getVaults() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('vaults', 'readonly');
      const store = tx.objectStore('vaults');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveVault(vault) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('vaults', 'readwrite');
      const store = tx.objectStore('vaults');
      const request = store.put({ ...vault, id: vault.id || vault.name });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getFiles(vaultId) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const index = store.index('vaultId');
      const request = index.getAll(vaultId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveFile(vaultId, path, content, modified) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readwrite');
      const store = tx.objectStore('files');
      const request = store.put({
        id: `${vaultId}:${path}`,
        vaultId,
        path,
        content,
        modified,
        syncedAt: new Date().toISOString()
      });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getFile(vaultId, path) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('files', 'readonly');
      const store = tx.objectStore('files');
      const request = store.get(`${vaultId}:${path}`);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const db = new VaultDB();
