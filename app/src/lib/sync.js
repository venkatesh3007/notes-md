// Sync client — fetches files from server via HTTP
function getSettings() {
  try {
    const saved = localStorage.getItem('notes-md-settings');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return { serverUrl: 'http://139.59.57.222:3333', vaultId: 'positioning-research' };
}

export class SyncClient {
  constructor(vaultId) {
    this.vaultId = vaultId;
    this.onFilesUpdated = null;
    this.pollInterval = null;
  }

  getServerUrl() {
    return getSettings().serverUrl || 'http://139.59.57.222:3333';
  }

  async start() {
    await this.sync();
    this.pollInterval = setInterval(() => this.sync(), 30000);
  }

  async sync() {
    const serverUrl = this.getServerUrl();
    try {
      const res = await fetch(`${serverUrl}/vault/${this.vaultId}/files`, {
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      if (this.onFilesUpdated) {
        this.onFilesUpdated(data.files || []);
      }
      
      return data.files || [];
    } catch (err) {
      console.error('Sync failed:', err);
      throw err;
    }
  }

  async fetchFile(filePath) {
    const serverUrl = this.getServerUrl();
    try {
      const encodedPath = encodeURIComponent(filePath);
      const res = await fetch(`${serverUrl}/vault/${this.vaultId}/file?path=${encodedPath}`, {
        mode: 'cors'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('Fetch file failed:', err);
      throw err;
    }
  }

  async checkHealth() {
    const serverUrl = this.getServerUrl();
    try {
      const res = await fetch(`${serverUrl}/health`, { mode: 'cors' });
      return res.ok;
    } catch (err) {
      return false;
    }
  }

  stop() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}
