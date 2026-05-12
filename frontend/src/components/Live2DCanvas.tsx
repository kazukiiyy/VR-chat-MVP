import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';

export interface AvatarEmotionConfig {
  expression?: string;
  motion_group?: string;
  motion_index?: number;
  params?: Record<string, number>;
}

export interface AvatarConfig {
  model_path?: string;
  emotions?: Record<string, AvatarEmotionConfig>;
  lipsync?: {
    param?: string;
    gain?: number;
    smoothing?: number;
  };
  idle_motion?: {
    group?: string;
    index?: number;
    interval_sec?: number;
  };
}

interface Live2DCanvasProps {
  emotion: string;
  lipSyncValue: number;
  avatarConfig: AvatarConfig;
}

export function Live2DCanvas({ emotion, lipSyncValue, avatarConfig }: Live2DCanvasProps): JSX.Element {
  const smoothedRef = useRef(0);
  const [mouthHeight, setMouthHeight] = useState(24);

  const emotionParams = useMemo<Record<string, number>>(() => {
    return avatarConfig.emotions?.[emotion]?.params ?? {};
  }, [avatarConfig.emotions, emotion]);

  useEffect(() => {
    const smoothing = avatarConfig.lipsync?.smoothing ?? 0.8;
    const gain = avatarConfig.lipsync?.gain ?? 1;
    const nextValue = Math.min(1, Math.max(0, lipSyncValue * gain));
    smoothedRef.current = smoothedRef.current * smoothing + nextValue * (1 - smoothing);
    applyLive2DParameters(emotionParams, avatarConfig.lipsync?.param, smoothedRef.current);
    setMouthHeight(24 + smoothedRef.current * 72);
  }, [avatarConfig.lipsync, emotionParams, lipSyncValue]);

  const faceColor = emotionColor(emotion);

  return (
    <div style={styles.root}>
      <div style={{ ...styles.avatar, borderColor: faceColor }}>
        <div style={{ ...styles.face, background: faceColor }}>
          <div style={styles.eyes}>
            <span style={styles.eye} />
            <span style={styles.eye} />
          </div>
          <div style={{ ...styles.mouth, height: mouthHeight }} />
        </div>
        <div style={styles.emotion}>{emotion}</div>
      </div>
      <div style={styles.debug}>
        <span>model: {avatarConfig.model_path ?? 'mock'}</span>
        <span>
          {avatarConfig.lipsync?.param ?? 'ParamMouthOpenY'}: {smoothedRef.current.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function applyLive2DParameters(
  params: Record<string, number>,
  lipSyncParam: string | undefined,
  lipSyncValue: number,
): void {
  const nextParams = { ...params };
  if (lipSyncParam) {
    nextParams[lipSyncParam] = lipSyncValue;
  }

  // Integration point:
  // When the Cubism SDK and pixi-live2d-display runtime are available, create the
  // Live2D model here and call model.internalModel.coreModel.setParameterValueById
  // for each entry in nextParams.
  void nextParams;
}

function emotionColor(emotion: string): string {
  switch (emotion) {
    case 'happy':
      return '#f6c453';
    case 'sad':
      return '#5aa9e6';
    case 'angry':
      return '#ef6351';
    case 'surprised':
      return '#9bdb7b';
    default:
      return '#e7e9ee';
  }
}

const styles: Record<string, CSSProperties> = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
    background: '#101418',
  },
  avatar: {
    width: 'min(54vw, 520px)',
    aspectRatio: '1 / 1',
    border: '2px solid',
    borderRadius: 8,
    display: 'grid',
    placeItems: 'center',
    background: '#181e25',
  },
  face: {
    width: '62%',
    aspectRatio: '1 / 1',
    borderRadius: '50%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 48,
    boxShadow: '0 24px 80px rgba(0, 0, 0, 0.35)',
  },
  eyes: {
    display: 'flex',
    gap: 72,
  },
  eye: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#101418',
    display: 'block',
  },
  mouth: {
    width: 96,
    minHeight: 16,
    borderRadius: 48,
    background: '#101418',
    transition: 'height 80ms linear',
  },
  emotion: {
    position: 'absolute',
    bottom: 36,
    color: '#f5f7fa',
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: 0,
  },
  debug: {
    position: 'absolute',
    left: 24,
    bottom: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    color: '#9aa4b2',
    fontSize: 12,
  },
};
