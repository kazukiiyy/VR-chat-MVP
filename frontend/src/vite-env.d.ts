/// <reference types="vite/client" />

interface ElectronAPI {
  readConfig(name: string): Promise<string>;
  writeConfig(name: string, content: string): Promise<void>;
  listModels(): Promise<{ name: string; path: string }[]>;
  importModel(): Promise<{ name: string; path: string } | null>;
  selectModel(modelPath: string): Promise<void>;
  readWallpaper(filePath: string): Promise<string>;
  selectWallpaper(): Promise<string | null>;
  clearWallpaper(): Promise<void>;
  onModelChange(callback: (modelPath: string) => void): void;
  offModelChange(): void;
  onWallpaperChange(callback: (path: string) => void): void;
  offWallpaperChange(): void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
