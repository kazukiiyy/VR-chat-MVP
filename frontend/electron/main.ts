import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = path.resolve(__dirname, '../..');
const allowedConfigNames = new Set(['app', 'avatar']);

function getConfigPath(name: string): string {
  if (!allowedConfigNames.has(name)) {
    throw new Error(`Unsupported config name: ${name}`);
  }

  return path.resolve(ROOT_DIR, 'config', `${name}.json`);
}

async function listModels(): Promise<{ name: string; path: string }[]> {
  const modelsDir = path.resolve(ROOT_DIR, 'models');

  try {
    const entries = await fs.readdir(modelsDir, { withFileTypes: true });
    const models = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const modelDir = path.resolve(modelsDir, entry.name);
          const files = await fs.readdir(modelDir);
          const modelFile = files.find((file) => file.endsWith('.model3.json'));

          if (!modelFile) {
            return null;
          }

          return {
            name: entry.name,
            path: `./models/${entry.name}/${modelFile}`,
          };
        }),
    );

    return models.filter((model): model is { name: string; path: string } => model !== null);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }

    throw error;
  }
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

ipcMain.handle('model:list', async (): Promise<{ name: string; path: string }[]> => {
  return listModels();
});

ipcMain.handle('model:import', async (): Promise<{ name: string; path: string } | null> => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'Live2D Model', extensions: ['model3.json'] }],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const modelFilePath = result.filePaths[0];
  const sourceDir = path.dirname(modelFilePath);
  const dirname = path.basename(sourceDir);
  const modelsDir = path.resolve(ROOT_DIR, 'models');
  const targetDir = path.resolve(modelsDir, dirname);

  await fs.mkdir(modelsDir, { recursive: true });
  await fs.cp(sourceDir, targetDir, { recursive: true });

  return {
    name: dirname,
    path: `./models/${dirname}/${path.basename(modelFilePath)}`,
  };
});

ipcMain.handle('model:select', async (event, modelPath: string): Promise<void> => {
  const filePath = getConfigPath('avatar');
  const content = await fs.readFile(filePath, 'utf-8');
  const avatarConfig = JSON.parse(content) as Record<string, unknown>;
  avatarConfig.model_path = modelPath;
  await fs.writeFile(filePath, `${JSON.stringify(avatarConfig, null, 2)}\n`, 'utf-8');
  event.sender.send('model:changed', modelPath);
});

ipcMain.handle('wallpaper:read', async (_event, filePath: string): Promise<string> => {
  if (!filePath) return '';
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase().slice(1);
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  return `data:image/${mime};base64,${buffer.toString('base64')}`;
});

ipcMain.handle('wallpaper:select', async (event): Promise<string | null> => {
  const result = await dialog.showOpenDialog({
    filters: [{ name: 'Image', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
    properties: ['openFile'],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const filePath = result.filePaths[0];
  const avatarConfigPath = getConfigPath('avatar');
  const content = await fs.readFile(avatarConfigPath, 'utf-8');
  const avatarConfig = JSON.parse(content) as Record<string, unknown>;
  avatarConfig.wallpaper_path = filePath;
  await fs.writeFile(avatarConfigPath, `${JSON.stringify(avatarConfig, null, 2)}\n`, 'utf-8');
  event.sender.send('wallpaper:changed', filePath);

  return filePath;
});

ipcMain.handle('wallpaper:clear', async (event): Promise<void> => {
  const avatarConfigPath = getConfigPath('avatar');
  const content = await fs.readFile(avatarConfigPath, 'utf-8');
  const avatarConfig = JSON.parse(content) as Record<string, unknown>;
  avatarConfig.wallpaper_path = '';
  await fs.writeFile(avatarConfigPath, `${JSON.stringify(avatarConfig, null, 2)}\n`, 'utf-8');
  event.sender.send('wallpaper:changed', '');
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
