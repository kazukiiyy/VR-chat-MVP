import { useEffect } from 'react';

interface AudioPlayerProps {
  audioBase64: string | null;
  onVolumeChange: (volume: number) => void;
}

export function AudioPlayer({ audioBase64, onVolumeChange }: AudioPlayerProps): null {
  useEffect(() => {
    if (!audioBase64) {
      onVolumeChange(0);
      return;
    }

    let cancelled = false;
    let animationFrame = 0;
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;

    const play = async (): Promise<void> => {
      try {
        const audioData = base64ToArrayBuffer(audioBase64);
        const audioBuffer = await audioContext.decodeAudioData(audioData);

        if (cancelled) {
          return;
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        source.start();

        const samples = new Uint8Array(analyser.fftSize);
        const tick = (): void => {
          analyser.getByteTimeDomainData(samples);
          const volume = calculateVolume(samples);
          onVolumeChange(volume);
          animationFrame = requestAnimationFrame(tick);
        };

        tick();
        source.onended = () => {
          cancelAnimationFrame(animationFrame);
          onVolumeChange(0);
          void audioContext.close();
        };
      } catch (error) {
        console.error('Failed to play audio', error);
        onVolumeChange(0);
        void audioContext.close();
      }
    };

    void play();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      onVolumeChange(0);
      if (audioContext.state !== 'closed') {
        void audioContext.close();
      }
    };
  }, [audioBase64, onVolumeChange]);

  return null;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function calculateVolume(samples: Uint8Array): number {
  let sumSquares = 0;
  for (const sample of samples) {
    const normalized = (sample - 128) / 128;
    sumSquares += normalized * normalized;
  }

  return Math.min(1, Math.sqrt(sumSquares / samples.length) * 2.5);
}
