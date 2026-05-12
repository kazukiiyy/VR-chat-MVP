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

  return (
    <div style={styles.root}>
      <div style={styles.avatar}>
        <div style={styles.face}>
          <div style={styles.eyes}>
            <span style={styles.eye} />
            <span style={styles.eye} />
          </div>
          <div style={{ ...styles.mouth, height: mouthHeight }} />
        </div>
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

const styles: Record<string, CSSProperties> = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'center',
    overflow: 'hidden',
    background: 'transparent',
  },
  avatar: {
    width: 'min(54vw, 520px)',
    aspectRatio: '1 / 1',
    borderRadius: 8,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: 'rgba(0, 0, 0, 0.15)',
    display: 'grid',
    placeItems: 'center',
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
    background: 'rgba(255, 255, 255, 0.12)',
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
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'block',
  },
  mouth: {
    width: 96,
    minHeight: 16,
    borderRadius: 48,
    background: 'rgba(0, 0, 0, 0.5)',
    transition: 'height 80ms linear',
  },
};
