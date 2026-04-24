export function getLocalFile(vaultName, filePath) {
  const key = `vault:${vaultName}:file:${filePath}`;
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return null;
    }
  }
  return null;
}

export function setLocalFile(vaultName, filePath, content, modified) {
  const key = `vault:${vaultName}:file:${filePath}`;
  localStorage.setItem(key, JSON.stringify({ content, modified, local: true }));
}

export function getLocalFiles(vaultName) {
  const files = [];
  const prefix = `vault:${vaultName}:file:`;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) {
      const path = key.slice(prefix.length);
      const data = JSON.parse(localStorage.getItem(key));
      files.push({ path, ...data });
    }
  }
  return files;
}

export function clearLocalVault(vaultName) {
  const prefix = `vault:${vaultName}:file:`;
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  keys.forEach(k => localStorage.removeItem(k));
}
