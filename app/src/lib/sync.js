// Sync client — fetches files from server via HTTP
const SYNC_URL = 'http://139.59.57.222:3333';

export class SyncClient {
  constructor(vaultId) {
    this.vaultId = vaultId;
    this.onFilesUpdated = null;
    this.pollInterval = null;
  }

  async start() {
    // Initial sync
    await this.sync();
    // Poll every 30s for updates
    this.pollInterval = setInterval(() => this.sync(), 30000);
  }

  async sync() {
    try {
      // Get file list from server
      const res = await fetch(`${SYNC_URL}/vault/${this.vaultId}/files`);
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
    try {
      const encodedPath = encodeURIComponent(filePath);
      const res = await fetch(`${SYNC_URL}/vault/${this.vaultId}/file?path=${encodedPath}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('Fetch file failed:', err);
      throw err;
    }
  }

  async checkHealth() {
    try {
      const res = await fetch(`${SYNC_URL}/health`);
      return res.ok;
    } catch (err) {
      return false;
    }
  }

  stop() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}
