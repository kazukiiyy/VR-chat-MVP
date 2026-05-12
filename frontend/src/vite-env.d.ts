/// <reference types="vite/client" />

interface ElectronAPI {
  readConfig(name: string): Promise<string>;
  writeConfig(name: string, content: string): Promise<void>;
}

interface Window {
  electronAPI?: ElectronAPI;
}
