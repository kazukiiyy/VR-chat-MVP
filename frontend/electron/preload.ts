import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  readConfig: (name: string): Promise<string> => ipcRenderer.invoke('config:read', name),
  writeConfig: (name: string, content: string): Promise<void> =>
    ipcRenderer.invoke('config:write', name, content),
});
