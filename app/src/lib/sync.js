import { CapacitorHttp } from '@capacitor/core';

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
      const res = await CapacitorHttp.get({
        url: `${serverUrl}/vault/${this.vaultId}/files`,
        headers: { 'Accept': 'application/json' }
      });
      
      if (res.status < 200 || res.status >= 300) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
      
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
      const res = await CapacitorHttp.get({
        url: `${serverUrl}/vault/${this.vaultId}/file?path=${encodeURIComponent(filePath)}`,
        headers: { 'Accept': 'application/json' }
      });
      
      if (res.status < 200 || res.status >= 300) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      return typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
    } catch (err) {
      console.error('Fetch file failed:', err);
      throw err;
    }
  }

  async checkHealth() {
    const serverUrl = this.getServerUrl();
    try {
      const res = await CapacitorHttp.get({
        url: `${serverUrl}/health`,
        headers: { 'Accept': 'application/json' }
      });
      return res.status >= 200 && res.status < 300;
    } catch (err) {
      return false;
    }
  }

  stop() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}
