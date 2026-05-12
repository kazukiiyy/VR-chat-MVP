import { type CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { AudioPlayer } from '../components/AudioPlayer';
import { type AvatarConfig, Live2DCanvas } from '../components/Live2DCanvas';
import { CommentOverlay, type CommentItem } from '../components/CommentOverlay';
import { type ResponseMessage, VTuberWebSocket } from '../lib/websocket';

const DEFAULT_WS_URL = 'ws://localhost:8000/ws';
const BACKEND_BASE_URL = 'http://localhost:8000';

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

export function LiveView(): JSX.Element {
  const ws = useMemo(() => new VTuberWebSocket(), []);
  const [connected, setConnected] = useState(false);
  const [emotion, setEmotion] = useState('neutral');
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [lipSyncValue, setLipSyncValue] = useState(0);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(defaultAvatarConfig);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const loadAvatarConfig = async (): Promise<void> => {
      if (!window.electronAPI) {
        setStatusMessage('Electron IPC unavailable. Using mock avatar config.');
        return;
      }

      try {
        const content = await window.electronAPI.readConfig('avatar');
        setAvatarConfig(JSON.parse(content) as AvatarConfig);
      } catch (error) {
        console.error('Failed to load avatar config', error);
        setStatusMessage('Failed to load avatar.json. Using mock avatar config.');
      }
    };

    void loadAvatarConfig();
  }, []);

  useEffect(() => {
    const handleMessage = (message: ResponseMessage): void => {
      setEmotion(message.emotion || 'neutral');
      setAudioBase64(message.audio || null);
      setComments((current) =>
        [...current, { ...message.comment, reply: message.reply }].slice(-5),
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
    setStatusMessage('');
    try {
      const response = await fetch(`${BACKEND_BASE_URL}${path}`, { method: 'POST' });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      setStatusMessage(path === '/start' ? 'Started' : 'Stopped');
    } catch (error) {
      console.error(`Failed to call ${path}`, error);
      setStatusMessage(`Failed to call ${path}`);
    }
  };

  const handleVolumeChange = useCallback((volume: number): void => {
    setLipSyncValue(volume);
  }, []);

  return (
    <section style={styles.root}>
      <Live2DCanvas emotion={emotion} lipSyncValue={lipSyncValue} avatarConfig={avatarConfig} />
      <CommentOverlay comments={comments} />
      <AudioPlayer audioBase64={audioBase64} onVolumeChange={handleVolumeChange} />
      <div style={styles.controls}>
        <div style={connected ? styles.connected : styles.disconnected}>
          {connected ? '接続中' : '切断'}
        </div>
        <button type="button" style={styles.button} onClick={() => void postControl('/start')}>
          Start
        </button>
        <button type="button" style={styles.button} onClick={() => void postControl('/stop')}>
          Stop
        </button>
        {statusMessage ? <div style={styles.status}>{statusMessage}</div> : null}
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
  },
  controls: {
    position: 'absolute',
    top: 18,
    left: 18,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 8,
    background: 'rgba(16, 20, 24, 0.76)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  connected: {
    color: '#9bdb7b',
    fontSize: 13,
    fontWeight: 700,
    minWidth: 48,
  },
  disconnected: {
    color: '#f19a8a',
    fontSize: 13,
    fontWeight: 700,
    minWidth: 48,
  },
  button: {
    height: 32,
    padding: '0 12px',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.14)',
    background: '#202733',
    color: '#f5f7fa',
    cursor: 'pointer',
  },
  status: {
    color: '#b9c2cf',
    fontSize: 12,
  },
};
