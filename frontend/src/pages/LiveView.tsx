import { type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { AudioPlayer } from '../components/AudioPlayer';
import { type AvatarConfig, Live2DCanvas } from '../components/Live2DCanvas';
import { CommentOverlay, type CommentItem } from '../components/CommentOverlay';
import { type ResponseMessage, VTuberWebSocket } from '../lib/websocket';

const DEFAULT_WS_URL = 'ws://localhost:8000/ws';
const BACKEND_BASE_URL = 'http://localhost:8000';
let commentIdCounter = 0;

const defaultAvatarConfig: AvatarConfig = {
  model_path: './models/your_model/model.model3.json',
  emotions: {
    neutral: { params: {} },
  },
  lipsync: {
    param: 'ParamMouthOpenY',
    gain: 1.2,
    smoothing: 0.8,
  },
};

type LiveViewProps = {
  uiVisible: boolean;
};

export function LiveView({ uiVisible }: LiveViewProps): JSX.Element {
  const ws = useMemo(() => new VTuberWebSocket(), []);
  const [connected, setConnected] = useState(false);
  const [emotion, setEmotion] = useState('neutral');
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [lipSyncValue, setLipSyncValue] = useState(0);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(defaultAvatarConfig);
  const [wallpaperDataUrl, setWallpaperDataUrl] = useState('');

  const loadWallpaper = useCallback(async (filePath: string): Promise<void> => {
    if (!window.electronAPI) return;
    try {
      const dataUrl = await window.electronAPI.readWallpaper(filePath);
      setWallpaperDataUrl(dataUrl);
    } catch (error) {
      console.error('Failed to load wallpaper', error);
    }
  }, []);

  useEffect(() => {
    const loadAvatarConfig = async (): Promise<void> => {
      if (!window.electronAPI) return;
      try {
        const content = await window.electronAPI.readConfig('avatar');
        const parsedAvatar = JSON.parse(content) as AvatarConfig & { wallpaper_path?: string };
        setAvatarConfig(parsedAvatar);
        await loadWallpaper(parsedAvatar.wallpaper_path ?? '');
      } catch (error) {
        console.error('Failed to load avatar config', error);
      }
    };
    void loadAvatarConfig();
  }, [loadWallpaper]);

  useEffect(() => {
    if (!window.electronAPI) return;

    const handleModelChange = async (): Promise<void> => {
      try {
        const content = await window.electronAPI!.readConfig('avatar');
        const parsedAvatar = JSON.parse(content) as AvatarConfig & { wallpaper_path?: string };
        setAvatarConfig(parsedAvatar);
        await loadWallpaper(parsedAvatar.wallpaper_path ?? '');
      } catch (error) {
        console.error('Failed to reload avatar config', error);
      }
    };

    window.electronAPI.onModelChange(() => { void handleModelChange(); });
    window.electronAPI.onWallpaperChange((filePath) => { void loadWallpaper(filePath); });

    return () => {
      window.electronAPI?.offModelChange();
      window.electronAPI?.offWallpaperChange();
    };
  }, [loadWallpaper]);

  useEffect(() => {
    const handleMessage = (message: ResponseMessage): void => {
      setEmotion(message.emotion || 'neutral');
      setAudioBase64(message.audio || null);
      setComments((current) =>
        [
          ...current,
          { id: ++commentIdCounter, ...message.comment, reply: message.reply },
        ].slice(-5),
      );
    };

    ws.onMessage(handleMessage);
    ws.onConnectionChange(setConnected);
    ws.connect(DEFAULT_WS_URL);

    return () => {
      ws.offMessage(handleMessage);
      ws.offConnectionChange(setConnected);
      ws.disconnect();
    };
  }, [ws]);

  const postControl = async (path: '/start' | '/stop'): Promise<void> => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}${path}`, { method: 'POST' });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Failed to call ${path}`, error);
    }
  };

  const handleVolumeChange = useCallback((volume: number): void => {
    setLipSyncValue(volume);
  }, []);

  const rootStyle: CSSProperties = {
    ...styles.root,
    background: wallpaperDataUrl
      ? undefined
      : 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
    backgroundImage: wallpaperDataUrl ? `url('${wallpaperDataUrl}')` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  return (
    <section style={rootStyle}>
      <Live2DCanvas emotion={emotion} lipSyncValue={lipSyncValue} avatarConfig={avatarConfig} />
      <CommentOverlay comments={comments} />
      <AudioPlayer audioBase64={audioBase64} onVolumeChange={handleVolumeChange} />
      <div
        style={{
          ...styles.controls,
          opacity: uiVisible ? 1 : 0,
          pointerEvents: uiVisible ? 'auto' : 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={connected ? styles.connected : styles.disconnected} />
        <button type="button" style={styles.button} onClick={() => void postControl('/start')}>
          ▶
        </button>
        <button type="button" style={styles.button} onClick={() => void postControl('/stop')}>
          ■
        </button>
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #0d1117 100%)',
  },
  controls: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 8,
    background: 'rgba(0, 0, 0, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'opacity 300ms ease',
  },
  connected: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#7ee787',
  },
  disconnected: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#ff7b72',
  },
  button: {
    width: 26,
    height: 24,
    padding: 0,
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.14)',
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#f5f7fa',
    cursor: 'pointer',
    fontSize: 12,
    lineHeight: '22px',
  },
};
