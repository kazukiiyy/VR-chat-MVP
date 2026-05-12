import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  readConfig: (name: string): Promise<string> => ipcRenderer.invoke('config:read', name),
  writeConfig: (name: string, content: string): Promise<void> =>
    ipcRenderer.invoke('config:write', name, content),
  listModels: (): Promise<{ name: string; path: string }[]> => ipcRenderer.invoke('model:list'),
  importModel: (): Promise<{ name: string; path: string } | null> =>
    ipcRenderer.invoke('model:import'),
  selectModel: (modelPath: string): Promise<void> => ipcRenderer.invoke('model:select', modelPath),
  readWallpaper: (filePath: string): Promise<string> => ipcRenderer.invoke('wallpaper:read', filePath),
  selectWallpaper: (): Promise<string | null> => ipcRenderer.invoke('wallpaper:select'),
  clearWallpaper: (): Promise<void> => ipcRenderer.invoke('wallpaper:clear'),
  onModelChange: (callback: (modelPath: string) => void): void => {
    ipcRenderer.on('model:changed', (_event, modelPath: string) => callback(modelPath));
  },
  offModelChange: (): void => {
    ipcRenderer.removeAllListeners('model:changed');
  },
  onWallpaperChange: (callback: (path: string) => void): void => {
    ipcRenderer.on('wallpaper:changed', (_event, path: string) => callback(path));
  },
  offWallpaperChange: (): void => {
    ipcRenderer.removeAllListeners('wallpaper:changed');
  },
});
