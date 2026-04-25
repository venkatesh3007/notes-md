// Sync client — works in browser and Capacitor
function getSettings() {
  try {
    const saved = localStorage.getItem('notes-md-settings');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return { serverUrl: 'https://backup-beta-draw-giants.trycloudflare.com', vaultId: 'positioning-research' };
}

// Detect Capacitor environment
const isCapacitor = typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();

async function httpGet(url, headers = {}) {
  if (isCapacitor) {
    // Native HTTP bypasses CORS
    const { CapacitorHttp } = await import('@capacitor/core');
    const res = await CapacitorHttp.get({ url, headers });
    return {
      ok: res.status >= 200 && res.status < 300,
      status: res.status,
      json: async () => typeof res.data === 'string' ? JSON.parse(res.data) : res.data
    };
  }
  // Browser fetch
  const res = await fetch(url, { mode: 'cors', headers });
  return res;
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
    const res = await httpGet(`${serverUrl}/vault/${this.vaultId}/files`, {
      'Accept': 'application/json'
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (this.onFilesUpdated) this.onFilesUpdated(data.files || []);
    return data.files || [];
  }

  async fetchFile(filePath) {
    const serverUrl = this.getServerUrl();
    const res = await httpGet(
      `${serverUrl}/vault/${this.vaultId}/file?path=${encodeURIComponent(filePath)}`,
      { 'Accept': 'application/json' }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  async checkHealth() {
    const serverUrl = this.getServerUrl();
    try {
      const res = await httpGet(`${serverUrl}/health`);
      return res.ok;
    } catch (err) {
      return false;
    }
  }

  stop() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }
}
