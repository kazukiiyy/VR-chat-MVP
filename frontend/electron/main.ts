import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

const allowedConfigNames = new Set(['app', 'avatar']);

function getConfigPath(name: string): string {
  if (!allowedConfigNames.has(name)) {
    throw new Error(`Unsupported config name: ${name}`);
  }

  return path.resolve(__dirname, '../../config', `${name}.json`);
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#111418',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    void win.loadURL(devServerUrl);
    return;
  }

  void win.loadFile(path.resolve(__dirname, '../dist/index.html'));
}

ipcMain.handle('config:read', async (_event, name: string): Promise<string> => {
  const filePath = getConfigPath(name);
  return fs.readFile(filePath, 'utf-8');
});

ipcMain.handle('config:write', async (_event, name: string, content: string): Promise<void> => {
  const filePath = getConfigPath(name);
  await fs.writeFile(filePath, content, 'utf-8');
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
