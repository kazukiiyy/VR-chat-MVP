import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

type PipelineStatusPayload = {
  running?: boolean;
};

export function LiveView({ uiVisible }: LiveViewProps): JSX.Element {
  const ws = useMemo(() => new VTuberWebSocket(), []);
  const [connected, setConnected] = useState(false);
  const [pipelineRunning, setPipelineRunning] = useState<boolean | null>(null);
  const [pipelineStatusStale, setPipelineStatusStale] = useState(false);
  const [emotion, setEmotion] = useState('neutral');
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [lipSyncValue, setLipSyncValue] = useState(0);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(defaultAvatarConfig);
  const [wallpaperDataUrl, setWallpaperDataUrl] = useState('');
  const [controlToast, setControlToast] = useState<{ text: string; tone: 'ok' | 'err' } | null>(null);
  const toastClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const applyPipelineStatus = useCallback((payload: PipelineStatusPayload): void => {
    if (typeof payload.running === 'boolean') {
      setPipelineRunning(payload.running);
      setPipelineStatusStale(false);
    }
  }, []);

  const fetchPipelineStatus = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/status`);
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const data = (await response.json()) as PipelineStatusPayload;
      applyPipelineStatus(data);
    } catch (error) {
      console.error('Failed to fetch pipeline status', error);
      setPipelineStatusStale(true);
    }
  }, [applyPipelineStatus]);

  useEffect(() => {
    void fetchPipelineStatus();
    const intervalId = window.setInterval(() => {
      void fetchPipelineStatus();
    }, 2000);
    return () => window.clearInterval(intervalId);
  }, [fetchPipelineStatus]);

  useEffect(() => {
    return () => {
      if (toastClearRef.current) clearTimeout(toastClearRef.current);
    };
  }, []);

  const showControlToast = useCallback((message: string, tone: 'ok' | 'err' = 'ok'): void => {
    if (toastClearRef.current) clearTimeout(toastClearRef.current);
    setControlToast({ text: message, tone });
    toastClearRef.current = setTimeout(() => {
      setControlToast(null);
      toastClearRef.current = null;
    }, 3500);
  }, []);

  const postControl = async (path: '/start' | '/stop'): Promise<void> => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}${path}`, { method: 'POST' });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const data = (await response.json()) as PipelineStatusPayload;
      applyPipelineStatus(data);
      showControlToast(path === '/start' ? 'ライブを開始しました' : 'ライブを停止しました');
    } catch (error) {
      console.error(`Failed to call ${path}`, error);
      showControlToast(
        path === '/start' ? 'ライブ開始に失敗しました（バックエンドを確認してください）' : '停止に失敗しました',
        'err',
      );
      void fetchPipelineStatus();
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
      {controlToast ? (
        <div
          style={{
            ...styles.controlToast,
            ...(controlToast.tone === 'err' ? styles.controlToastErr : styles.controlToastOk),
          }}
          role="status"
          aria-live="polite"
        >
          {controlToast.text}
        </div>
      ) : null}
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
        <div
          style={connected ? styles.connected : styles.disconnected}
          title={connected ? 'バックエンド WebSocket 接続済み' : 'WebSocket 未接続'}
          aria-label={connected ? 'バックエンド接続済み' : 'バックエンド未接続'}
        />
        <div
          style={{
            ...styles.liveStatusBadge,
            ...(pipelineStatusStale
              ? styles.liveStatusUnknown
              : pipelineRunning === true
                ? styles.liveStatusOn
                : pipelineRunning === false
                  ? styles.liveStatusOff
                  : styles.liveStatusPending),
          }}
          title={
            pipelineStatusStale
              ? 'パイプライン状態を取得できません（バックエンドが起動しているか確認してください）'
              : pipelineRunning === true
                ? 'コメント処理パイプラインは稼働中です'
                : pipelineRunning === false
                  ? 'パイプラインは停止中です（▶ で開始）'
                  : '状態を取得しています…'
          }
          aria-live="polite"
        >
          {pipelineStatusStale
            ? 'ライブ: ?'
            : pipelineRunning === true
              ? 'ライブ: 稼働中'
              : pipelineRunning === false
                ? 'ライブ: 停止'
                : 'ライブ: …'}
        </div>
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
  controlToast: {
    position: 'fixed',
    left: '50%',
    bottom: 72,
    transform: 'translateX(-50%)',
    zIndex: 300,
    maxWidth: 'min(420px, calc(100vw - 32px))',
    padding: '10px 16px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    color: '#f5f7fa',
    background: 'rgba(22, 27, 34, 0.92)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
    pointerEvents: 'none',
    textAlign: 'center',
  },
  controlToastOk: {
    border: '1px solid rgba(126, 231, 135, 0.35)',
  },
  controlToastErr: {
    border: '1px solid rgba(255, 123, 114, 0.45)',
  },
  controls: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 8px',
    borderRadius: 8,
    background: 'rgba(0, 0, 0, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    transition: 'opacity 300ms ease',
  },
  liveStatusBadge: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.02em',
    padding: '3px 8px',
    borderRadius: 999,
    whiteSpace: 'nowrap',
    border: '1px solid transparent',
  },
  liveStatusOn: {
    color: '#c8ffd4',
    background: 'rgba(46, 160, 67, 0.25)',
    borderColor: 'rgba(126, 231, 135, 0.45)',
  },
  liveStatusOff: {
    color: '#c9d1d9',
    background: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  liveStatusPending: {
    color: '#b1bac4',
    background: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  liveStatusUnknown: {
    color: '#ffdfb5',
    background: 'rgba(210, 153, 34, 0.22)',
    borderColor: 'rgba(255, 196, 112, 0.35)',
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
