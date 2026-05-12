import { type CSSProperties, useEffect, useState } from 'react';

type TabName = 'llm' | 'tts' | 'youtube' | 'live2d';
type LlmProviderName = 'claude' | 'openai' | 'ollama';
type TtsProviderName = 'voicevox' | 'stylebertvits2' | 'elevenlabs';
type ModelEntry = { name: string; path: string };
type VoicevoxSpeakerStyle = { name: string; id: number };
type VoicevoxSpeaker = { name: string; styles: VoicevoxSpeakerStyle[] };

type YoutubeConfig = {
  stream_id: string;
  polling_interval_sec: number;
};

type LlmProviders = {
  claude: { model: string };
  openai: { model: string };
  ollama: { endpoint: string; model: string };
};

type TtsProviders = {
  voicevox: { endpoint: string };
  stylebertvits2: { endpoint: string };
  elevenlabs: { voice_id: string };
};

type TtsStyle = {
  speaker_id: number;
  speed: number;
  pitch: number;
  volume: number;
  intonation: number;
};

type AppConfig = {
  youtube: YoutubeConfig;
  llm: {
    active: LlmProviderName;
    system_prompt: string;
    response_schema: unknown;
    providers: LlmProviders;
  };
  tts: {
    active: TtsProviderName;
    providers: TtsProviders;
    styles: Record<string, TtsStyle>;
  };
  [key: string]: unknown;
};

type StyleRow = TtsStyle & { name: string };

const tabNames: TabName[] = ['llm', 'tts', 'youtube', 'live2d'];
const llmProviderNames: LlmProviderName[] = ['claude', 'openai', 'ollama'];
const ttsProviderNames: TtsProviderName[] = ['voicevox', 'stylebertvits2', 'elevenlabs'];

const tabLabels: Record<TabName, string> = {
  llm: 'LLM',
  tts: 'TTS',
  youtube: 'YouTube',
  live2d: 'Live2D',
};

const defaultAppConfig: AppConfig = {
  youtube: {
    stream_id: '',
    polling_interval_sec: 5,
  },
  llm: {
    active: 'claude',
    system_prompt: '',
    response_schema: {
      text: '視聴者への返答',
      emotion: 'happy | sad | angry | surprised | neutral',
      voice_style: 'normal | excited | whisper',
    },
    providers: {
      claude: { model: 'claude-opus-4-6' },
      openai: { model: 'gpt-4o' },
      ollama: { endpoint: 'http://localhost:11434', model: 'llama3' },
    },
  },
  tts: {
    active: 'voicevox',
    providers: {
      voicevox: { endpoint: 'http://localhost:50021' },
      stylebertvits2: { endpoint: 'http://localhost:5000' },
      elevenlabs: { voice_id: '21m00Tcm4TlvDq8ikWAM' },
    },
    styles: {
      normal: { speaker_id: 3, speed: 1, pitch: 0, volume: 1, intonation: 1 },
      excited: { speaker_id: 3, speed: 1.2, pitch: 0.1, volume: 1.1, intonation: 1.3 },
      whisper: { speaker_id: 3, speed: 0.9, pitch: -0.1, volume: 0.8, intonation: 0.7 },
    },
  },
};

const llmProviderLabels: Record<LlmProviderName, string> = {
  claude: 'Claude',
  openai: 'OpenAI',
  ollama: 'Ollama',
};

const ttsProviderLabels: Record<TtsProviderName, string> = {
  voicevox: 'VOICEVOX',
  stylebertvits2: 'Style-Bert-VITS2',
  elevenlabs: 'ElevenLabs',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const readNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

function extractVideoId(input: string): string {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return '';
  }

  const patterns = [
    /[?&]v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /\/live\/([^?]+)/,
  ];

  for (const pattern of patterns) {
    const match = trimmedInput.match(pattern);

    if (match) {
      return match[1];
    }
  }

  return trimmedInput;
}

const isLlmProviderName = (value: unknown): value is LlmProviderName =>
  value === 'claude' || value === 'openai' || value === 'ollama';

const isTtsProviderName = (value: unknown): value is TtsProviderName =>
  value === 'voicevox' || value === 'stylebertvits2' || value === 'elevenlabs';

const normalizeAppConfig = (rawConfig: unknown): AppConfig => {
  const raw = isRecord(rawConfig) ? rawConfig : {};
  const youtube = isRecord(raw.youtube) ? raw.youtube : {};
  const llm = isRecord(raw.llm) ? raw.llm : {};
  const llmProviders = isRecord(llm.providers) ? llm.providers : {};
  const tts = isRecord(raw.tts) ? raw.tts : {};
  const ttsProviders = isRecord(tts.providers) ? tts.providers : {};
  const styles = isRecord(tts.styles) ? tts.styles : {};

  const claude = isRecord(llmProviders.claude) ? llmProviders.claude : {};
  const openai = isRecord(llmProviders.openai) ? llmProviders.openai : {};
  const ollama = isRecord(llmProviders.ollama) ? llmProviders.ollama : {};
  const voicevox = isRecord(ttsProviders.voicevox) ? ttsProviders.voicevox : {};
  const stylebertvits2 = isRecord(ttsProviders.stylebertvits2) ? ttsProviders.stylebertvits2 : {};
  const elevenlabs = isRecord(ttsProviders.elevenlabs) ? ttsProviders.elevenlabs : {};

  const normalizedStyles = Object.entries(styles).reduce<Record<string, TtsStyle>>((result, [name, value]) => {
    if (!isRecord(value)) {
      return result;
    }

    result[name] = {
      speaker_id: readNumber(value.speaker_id, defaultAppConfig.tts.styles.normal.speaker_id),
      speed: readNumber(value.speed, defaultAppConfig.tts.styles.normal.speed),
      pitch: readNumber(value.pitch, defaultAppConfig.tts.styles.normal.pitch),
      volume: readNumber(value.volume, defaultAppConfig.tts.styles.normal.volume),
      intonation: readNumber(value.intonation, defaultAppConfig.tts.styles.normal.intonation),
    };
    return result;
  }, {});

  return {
    ...raw,
    youtube: {
      stream_id: readString(youtube.stream_id, defaultAppConfig.youtube.stream_id),
      polling_interval_sec: readNumber(
        youtube.polling_interval_sec,
        defaultAppConfig.youtube.polling_interval_sec,
      ),
    },
    llm: {
      active: isLlmProviderName(llm.active) ? llm.active : defaultAppConfig.llm.active,
      system_prompt: readString(llm.system_prompt, defaultAppConfig.llm.system_prompt),
      response_schema:
        llm.response_schema === undefined ? defaultAppConfig.llm.response_schema : llm.response_schema,
      providers: {
        claude: {
          model: readString(claude.model, defaultAppConfig.llm.providers.claude.model),
        },
        openai: {
          model: readString(openai.model, defaultAppConfig.llm.providers.openai.model),
        },
        ollama: {
          endpoint: readString(ollama.endpoint, defaultAppConfig.llm.providers.ollama.endpoint),
          model: readString(ollama.model, defaultAppConfig.llm.providers.ollama.model),
        },
      },
    },
    tts: {
      active: isTtsProviderName(tts.active) ? tts.active : defaultAppConfig.tts.active,
      providers: {
        voicevox: {
          endpoint: readString(voicevox.endpoint, defaultAppConfig.tts.providers.voicevox.endpoint),
        },
        stylebertvits2: {
          endpoint: readString(
            stylebertvits2.endpoint,
            defaultAppConfig.tts.providers.stylebertvits2.endpoint,
          ),
        },
        elevenlabs: {
          voice_id: readString(elevenlabs.voice_id, defaultAppConfig.tts.providers.elevenlabs.voice_id),
        },
      },
      styles: Object.keys(normalizedStyles).length > 0 ? normalizedStyles : defaultAppConfig.tts.styles,
    },
  };
};

const stylesToRows = (styles: Record<string, TtsStyle>): StyleRow[] =>
  Object.entries(styles).map(([name, style]) => ({ name, ...style }));

const rowsToStyles = (rows: StyleRow[]): Record<string, TtsStyle> =>
  rows.reduce<Record<string, TtsStyle>>((result, row) => {
    const name = row.name.trim();

    if (!name) {
      return result;
    }

    result[name] = {
      speaker_id: row.speaker_id,
      speed: row.speed,
      pitch: row.pitch,
      volume: row.volume,
      intonation: row.intonation,
    };
    return result;
  }, {});

const getStyleValidationError = (rows: StyleRow[]): string => {
  const names = new Set<string>();

  for (const row of rows) {
    const name = row.name.trim();

    if (!name) {
      return 'Style name is required.';
    }

    if (names.has(name)) {
      return `Style "${name}" is duplicated.`;
    }

    if (
      !Number.isFinite(row.speaker_id) ||
      !Number.isFinite(row.speed) ||
      !Number.isFinite(row.pitch) ||
      !Number.isFinite(row.volume) ||
      !Number.isFinite(row.intonation)
    ) {
      return `Style "${name}" has an invalid number.`;
    }

    names.add(name);
  }

  return '';
};

const findCharacterName = (speakerId: number, speakers: VoicevoxSpeaker[]): string => {
  for (const speaker of speakers) {
    if (speaker.styles.some((style) => style.id === speakerId)) {
      return speaker.name;
    }
  }

  return speakers[0]?.name ?? '';
};

export function SettingsView(): JSX.Element {
  const [activeName, setActiveName] = useState<TabName>('llm');
  const [appConfig, setAppConfig] = useState<AppConfig>(defaultAppConfig);
  const [responseSchemaText, setResponseSchemaText] = useState(
    `${JSON.stringify(defaultAppConfig.llm.response_schema, null, 2)}\n`,
  );
  const [styleRows, setStyleRows] = useState<StyleRow[]>(stylesToRows(defaultAppConfig.tts.styles));
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [voicevoxSpeakers, setVoicevoxSpeakers] = useState<VoicevoxSpeaker[]>([]);
  const [activeModelPath, setActiveModelPath] = useState('');
  const [wallpaperPath, setWallpaperPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [previewingIndex, setPreviewingIndex] = useState<number | null>(null);

  const getActiveModelPath = async (): Promise<string> => {
    if (!window.electronAPI) {
      return '';
    }

    try {
      const avatarConfig = JSON.parse(await window.electronAPI.readConfig('avatar')) as { model_path?: unknown };
      return typeof avatarConfig.model_path === 'string' ? avatarConfig.model_path : '';
    } catch {
      return '';
    }
  };

  const loadModels = async (): Promise<void> => {
    if (!window.electronAPI) {
      setError('Electron IPC is unavailable. Run this screen inside Electron.');
      return;
    }

    try {
      const [modelEntries, selectedModelPath, avatarContent] = await Promise.all([
        window.electronAPI.listModels(),
        getActiveModelPath(),
        window.electronAPI.readConfig('avatar'),
      ]);
      const parsedAvatar = JSON.parse(avatarContent) as { wallpaper_path?: string };
      setModels(modelEntries);
      setActiveModelPath(selectedModelPath);
      setWallpaperPath(parsedAvatar.wallpaper_path ?? '');
    } catch (listError) {
      console.error('Failed to list Live2D models', listError);
      setError('Failed to list Live2D models.');
    }
  };

  const loadVoicevoxSpeakers = async (): Promise<void> => {
    try {
      const res = await fetch('http://localhost:8000/voicevox/speakers');

      if (res.ok) {
        setVoicevoxSpeakers((await res.json()) as VoicevoxSpeaker[]);
      } else {
        setVoicevoxSpeakers([]);
      }
    } catch {
      setVoicevoxSpeakers([]);
    }
  };

  useEffect(() => {
    const loadConfig = async (): Promise<void> => {
      setLoading(true);
      setError('');
      setMessage('');

      if (!window.electronAPI) {
        setError('Electron IPC is unavailable. Run this screen inside Electron.');
        setLoading(false);
        return;
      }

      try {
        const parsedConfig = normalizeAppConfig(JSON.parse(await window.electronAPI.readConfig('app')));
        setAppConfig(parsedConfig);
        setResponseSchemaText(`${JSON.stringify(parsedConfig.llm.response_schema, null, 2)}\n`);
        setStyleRows(stylesToRows(parsedConfig.tts.styles));
        void loadVoicevoxSpeakers();
        await loadModels();
      } catch (readError) {
        console.error('Failed to read app config', readError);
        setError('Failed to read app.json.');
      } finally {
        setLoading(false);
      }
    };

    void loadConfig();
  }, []);

  const saveAppConfig = async (): Promise<void> => {
    setError('');
    setMessage('');

    if (!window.electronAPI) {
      setError('Electron IPC is unavailable. Run this screen inside Electron.');
      return;
    }

    try {
      const styleValidationError = getStyleValidationError(styleRows);

      if (styleValidationError) {
        setError(styleValidationError);
        return;
      }

      const responseSchema = JSON.parse(responseSchemaText);
      const pollingIntervalSec = Number.isFinite(appConfig.youtube.polling_interval_sec)
        ? appConfig.youtube.polling_interval_sec
        : defaultAppConfig.youtube.polling_interval_sec;
      const nextConfig: AppConfig = {
        ...appConfig,
        youtube: {
          ...appConfig.youtube,
          stream_id: extractVideoId(appConfig.youtube.stream_id),
          polling_interval_sec: Math.max(1, pollingIntervalSec),
        },
        llm: {
          ...appConfig.llm,
          response_schema: responseSchema,
        },
        tts: {
          ...appConfig.tts,
          styles: rowsToStyles(styleRows),
        },
      };

      await window.electronAPI.writeConfig('app', `${JSON.stringify(nextConfig, null, 2)}\n`);
      setAppConfig(nextConfig);
      setResponseSchemaText(`${JSON.stringify(responseSchema, null, 2)}\n`);
      setStyleRows(stylesToRows(nextConfig.tts.styles));
      setMessage('app.json saved.');
    } catch (saveError) {
      console.error('Failed to save app config', saveError);
      setError(saveError instanceof SyntaxError ? saveError.message : 'Failed to write app.json.');
    }
  };

  const importModel = async (): Promise<void> => {
    setError('');
    setMessage('');

    if (!window.electronAPI) {
      setError('Electron IPC is unavailable. Run this screen inside Electron.');
      return;
    }

    try {
      const model = await window.electronAPI.importModel();

      if (!model) {
        return;
      }

      await loadModels();
      setMessage(`${model.name} imported.`);
    } catch (importError) {
      console.error('Failed to import Live2D model', importError);
      setError('Failed to import Live2D model.');
    }
  };

  const selectModel = async (modelPath: string): Promise<void> => {
    setError('');
    setMessage('');

    if (!window.electronAPI) {
      setError('Electron IPC is unavailable. Run this screen inside Electron.');
      return;
    }

    try {
      await window.electronAPI.selectModel(modelPath);
      setActiveModelPath(await getActiveModelPath());
      setMessage('Live2D model selected.');
    } catch (selectError) {
      console.error('Failed to select Live2D model', selectError);
      setError('Failed to select Live2D model.');
    }
  };

  const selectWallpaper = async (): Promise<void> => {
    setError('');
    setMessage('');

    if (!window.electronAPI) {
      setError('Electron IPC is unavailable. Run this screen inside Electron.');
      return;
    }

    try {
      const selectedPath = await window.electronAPI.selectWallpaper();

      if (!selectedPath) {
        return;
      }

      setWallpaperPath(selectedPath);
      setMessage('Wallpaper selected.');
    } catch (selectError) {
      console.error('Failed to select wallpaper', selectError);
      setError('Failed to select wallpaper.');
    }
  };

  const clearWallpaper = async (): Promise<void> => {
    setError('');
    setMessage('');

    if (!window.electronAPI) {
      setError('Electron IPC is unavailable. Run this screen inside Electron.');
      return;
    }

    try {
      await window.electronAPI.clearWallpaper();
      setWallpaperPath('');
      setMessage('Wallpaper cleared.');
    } catch (clearError) {
      console.error('Failed to clear wallpaper', clearError);
      setError('Failed to clear wallpaper.');
    }
  };

  const updateLlmProvider = <TName extends LlmProviderName>(
    name: TName,
    nextProvider: LlmProviders[TName],
  ): void => {
    setAppConfig((current) => ({
      ...current,
      llm: {
        ...current.llm,
        providers: {
          ...current.llm.providers,
          [name]: nextProvider,
        },
      },
    }));
  };

  const updateTtsProvider = <TName extends TtsProviderName>(
    name: TName,
    nextProvider: TtsProviders[TName],
  ): void => {
    setAppConfig((current) => ({
      ...current,
      tts: {
        ...current.tts,
        providers: {
          ...current.tts.providers,
          [name]: nextProvider,
        },
      },
    }));
  };

  const updateStyleRow = (index: number, nextRow: StyleRow): void => {
    setStyleRows((current) => current.map((row, rowIndex) => (rowIndex === index ? nextRow : row)));
  };

  const addStyle = (): void => {
    setError('');
    setMessage('');

    const inputName = window.prompt('追加するスタイル名を入力してください。', 'new_style');
    const styleName = inputName?.trim();

    if (!styleName) {
      return;
    }

    const existingNames = new Set(styleRows.map((row) => row.name));

    if (existingNames.has(styleName)) {
      setError(`Style "${styleName}" already exists.`);
      return;
    }

    setStyleRows((current) => [
      ...current,
      { name: styleName, speaker_id: 3, speed: 1, pitch: 0, volume: 1, intonation: 1 },
    ]);
  };

  const removeStyle = (index: number): void => {
    setStyleRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  const previewVoice = async (speakerId: number, index: number): Promise<void> => {
    const endpoint = appConfig.tts.providers.voicevox.endpoint;
    setPreviewingIndex(index);
    try {
      const testText = 'テスト音声です。よろしくお願いします。';
      const audioQueryRes = await fetch(
        `${endpoint}/audio_query?text=${encodeURIComponent(testText)}&speaker=${speakerId}`,
        { method: 'POST' },
      );
      if (!audioQueryRes.ok) return;
      const audioQuery = await audioQueryRes.json();
      const synthesisRes = await fetch(`${endpoint}/synthesis?speaker=${speakerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'audio/wav' },
        body: JSON.stringify(audioQuery),
      });
      if (!synthesisRes.ok) return;
      const blob = await synthesisRes.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      void audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
    } catch {
    } finally {
      setPreviewingIndex(null);
    }
  };

  const renderLlmProviderFields = (): JSX.Element => {
    const activeProvider = appConfig.llm.active;

    if (activeProvider === 'ollama') {
      const provider = appConfig.llm.providers.ollama;

      return (
        <div style={styles.fieldGrid}>
          <label style={styles.fieldLabel}>
            Endpoint
            <input
              type="text"
              value={provider.endpoint}
              onChange={(event) => updateLlmProvider('ollama', { ...provider, endpoint: event.target.value })}
              disabled={loading}
              style={styles.input}
            />
          </label>
          <label style={styles.fieldLabel}>
            Model
            <input
              type="text"
              value={provider.model}
              onChange={(event) => updateLlmProvider('ollama', { ...provider, model: event.target.value })}
              disabled={loading}
              style={styles.input}
            />
          </label>
        </div>
      );
    }

    const provider = appConfig.llm.providers[activeProvider];

    return (
      <div style={styles.fieldGrid}>
        <div style={styles.envNotice}>
          APIキーは .env ファイルで設定してください（CLAUDE_API_KEY / OPENAI_API_KEY）
        </div>
        <label style={styles.fieldLabel}>
          Model
          <input
            type="text"
            value={provider.model}
            onChange={(event) => updateLlmProvider(activeProvider, { ...provider, model: event.target.value })}
            disabled={loading}
            style={styles.input}
          />
        </label>
      </div>
    );
  };

  const renderTtsProviderFields = (): JSX.Element => {
    const activeProvider = appConfig.tts.active;

    if (activeProvider === 'elevenlabs') {
      const provider = appConfig.tts.providers.elevenlabs;

      return (
        <div style={styles.fieldGrid}>
          <div style={styles.envNotice}>APIキーは .env ファイルで設定してください（ELEVENLABS_API_KEY）</div>
          <label style={styles.fieldLabel}>
            Voice ID
            <input
              type="text"
              value={provider.voice_id}
              onChange={(event) => updateTtsProvider('elevenlabs', { ...provider, voice_id: event.target.value })}
              disabled={loading}
              style={styles.input}
            />
          </label>
        </div>
      );
    }

    const provider = appConfig.tts.providers[activeProvider];

    return (
      <div style={styles.fieldGrid}>
        <label style={styles.fieldLabel}>
          Endpoint
          <input
            type="text"
            value={provider.endpoint}
            onChange={(event) => updateTtsProvider(activeProvider, { ...provider, endpoint: event.target.value })}
            disabled={loading}
            style={styles.input}
          />
        </label>
      </div>
    );
  };

  const renderLlmPanel = (): JSX.Element => (
    <div style={styles.formPanel}>
      <div style={styles.providerTabs}>
        {llmProviderNames.map((name) => (
          <button
            key={name}
            type="button"
            style={appConfig.llm.active === name ? styles.activeProviderButton : styles.providerButton}
            onClick={() =>
              setAppConfig((current) => ({
                ...current,
                llm: { ...current.llm, active: name },
              }))
            }
            disabled={loading}
          >
            {llmProviderLabels[name]}
          </button>
        ))}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>{llmProviderLabels[appConfig.llm.active]} の設定</h2>
        {renderLlmProviderFields()}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>システムプロンプト</h2>
        <textarea
          value={appConfig.llm.system_prompt}
          onChange={(event) =>
            setAppConfig((current) => ({
              ...current,
              llm: { ...current.llm, system_prompt: event.target.value },
            }))
          }
          disabled={loading}
          spellCheck={false}
          style={styles.largeTextarea}
        />
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>レスポンススキーマ</h2>
        <textarea
          value={responseSchemaText}
          onChange={(event) => setResponseSchemaText(event.target.value)}
          disabled={loading}
          spellCheck={false}
          style={styles.schemaTextarea}
        />
      </div>
    </div>
  );

  const renderTtsPanel = (): JSX.Element => {
    const hasVoicevoxSpeakerSelect = appConfig.tts.active === 'voicevox' && voicevoxSpeakers.length > 0;

    return (
      <div style={styles.formPanel}>
        <div style={styles.providerTabs}>
          {ttsProviderNames.map((name) => (
            <button
              key={name}
              type="button"
              style={appConfig.tts.active === name ? styles.activeProviderButton : styles.providerButton}
              onClick={() =>
                setAppConfig((current) => ({
                  ...current,
                  tts: { ...current.tts, active: name },
                }))
              }
              disabled={loading}
            >
              {ttsProviderLabels[name]}
            </button>
          ))}
        </div>

        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>{ttsProviderLabels[appConfig.tts.active]} の設定</h2>
          {renderTtsProviderFields()}
        </div>

        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2 style={styles.sectionTitle}>音声スタイル</h2>
            <button type="button" style={styles.addButton} onClick={addStyle} disabled={loading}>
              + スタイルを追加
            </button>
          </div>
          <div style={styles.styleTable}>
            {styleRows.map((row, index) => {
              const characterName = findCharacterName(row.speaker_id, voicevoxSpeakers);
              const characterStyles =
                voicevoxSpeakers.find((speaker) => speaker.name === characterName)?.styles ?? [];
              const numberFields = (['speed', 'pitch', 'volume', 'intonation'] as const).map((fieldName) => (
                <label key={fieldName} style={styles.compactFieldLabel}>
                  {fieldName}
                  <input
                    type="number"
                    value={row[fieldName]}
                    step={0.1}
                    onChange={(event) =>
                      updateStyleRow(index, {
                        ...row,
                        [fieldName]: Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : 0,
                      })
                    }
                    disabled={loading}
                    style={styles.numberInput}
                  />
                </label>
              ));

              if (hasVoicevoxSpeakerSelect) {
                return (
                  <div
                    key={`${row.name}-${index}`}
                    style={{
                      ...styles.styleRow,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      gap: 8,
                    }}
                  >
                    <div style={styles.voicevoxStyleRowTop}>
                      <input
                        type="text"
                        value={row.name}
                        onChange={(event) => updateStyleRow(index, { ...row, name: event.target.value })}
                        disabled={loading}
                        style={{ ...styles.styleNameInput, flex: 1 }}
                        aria-label="Style name"
                      />
                      <button
                        type="button"
                        style={styles.previewButton}
                        onClick={() => void previewVoice(row.speaker_id, index)}
                        disabled={loading || previewingIndex === index}
                        aria-label={`${row.name} を試聴`}
                      >
                        {previewingIndex === index ? '…' : '🔊'}
                      </button>
                      <button
                        type="button"
                        style={styles.deleteButton}
                        onClick={() => removeStyle(index)}
                        disabled={loading}
                        aria-label={`${row.name} を削除`}
                      >
                        ×
                      </button>
                    </div>
                    <div style={styles.voicevoxStyleRowBottom}>
                      <div style={styles.characterField}>
                        <span style={styles.characterLabel}>キャラクター</span>
                        <span style={styles.characterName}>{characterName}</span>
                        <select
                          value={characterName}
                          onChange={(event) => {
                            const speaker = voicevoxSpeakers.find((speaker) => speaker.name === event.target.value);

                            if (speaker && speaker.styles.length > 0) {
                              updateStyleRow(index, { ...row, speaker_id: speaker.styles[0].id });
                            }
                          }}
                          disabled={loading}
                          style={styles.characterSelect}
                        >
                          {voicevoxSpeakers.map((speaker) => (
                            <option key={speaker.name} value={speaker.name}>
                              {speaker.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <label style={styles.compactFieldLabel}>
                        スタイル
                        <select
                          value={row.speaker_id}
                          onChange={(event) =>
                            updateStyleRow(index, { ...row, speaker_id: Number(event.target.value) })
                          }
                          disabled={loading}
                          style={styles.select}
                        >
                          {characterStyles.map((style) => (
                            <option key={style.id} value={style.id}>
                              {style.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      {numberFields}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={`${row.name}-${index}`}
                  style={{
                    ...styles.styleRow,
                    gridTemplateColumns: 'minmax(130px, 1.2fr) repeat(5, minmax(88px, 1fr)) 34px',
                  }}
                >
                  <input
                    type="text"
                    value={row.name}
                    onChange={(event) => updateStyleRow(index, { ...row, name: event.target.value })}
                    disabled={loading}
                    style={styles.styleNameInput}
                    aria-label="Style name"
                  />
                  <label style={styles.compactFieldLabel}>
                    speaker_id
                    <input
                      type="number"
                      value={row.speaker_id}
                      step={1}
                      onChange={(event) =>
                        updateStyleRow(index, {
                          ...row,
                          speaker_id: Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : 0,
                        })
                      }
                      disabled={loading}
                      style={styles.numberInput}
                    />
                  </label>
                  {numberFields}
                  <button
                    type="button"
                    style={styles.deleteButton}
                    onClick={() => removeStyle(index)}
                    disabled={loading}
                    aria-label={`${row.name} を削除`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderYoutubePanel = (): JSX.Element => (
    <div style={styles.formPanel}>
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>YouTube 設定</h2>
        <div style={styles.fieldGrid}>
          <label style={styles.fieldLabel}>
            Stream URL / Video ID
            <input
              type="text"
              value={appConfig.youtube.stream_id}
              placeholder="https://www.youtube.com/watch?v=xxxxxxxxxx"
              onChange={(event) =>
                setAppConfig((current) => ({
                  ...current,
                  youtube: { ...current.youtube, stream_id: event.target.value },
                }))
              }
              disabled={loading}
              style={styles.input}
            />
            <span style={styles.helpText}>URLまたは動画ID（例: dQw4w9WgXcQ）を入力</span>
          </label>
          <label style={styles.fieldLabel}>
            ポーリング間隔 (秒)
            <input
              type="number"
              min={1}
              step={1}
              value={appConfig.youtube.polling_interval_sec}
              onChange={(event) =>
                setAppConfig((current) => ({
                  ...current,
                  youtube: {
                    ...current.youtube,
                    polling_interval_sec: Number.isFinite(event.target.valueAsNumber)
                      ? event.target.valueAsNumber
                      : defaultAppConfig.youtube.polling_interval_sec,
                  },
                }))
              }
              disabled={loading}
              style={styles.input}
            />
          </label>
        </div>
        <div style={styles.envNotice}>YouTube API キーは .env の YOUTUBE_API_KEY で設定してください</div>
      </div>
    </div>
  );

  const renderLive2dPanel = (): JSX.Element => (
    <div style={styles.live2dPanel}>
      {!window.electronAPI ? (
        <div style={styles.emptyText}>Electron IPC is unavailable. Run this screen inside Electron.</div>
      ) : (
        <>
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>壁紙</h2>
            <div style={styles.live2dToolbar}>
              <button
                type="button"
                style={styles.importButton}
                onClick={() => void selectWallpaper()}
                disabled={loading}
              >
                壁紙を選択
              </button>
              {wallpaperPath ? (
                <button
                  type="button"
                  style={styles.selectButton}
                  onClick={() => void clearWallpaper()}
                  disabled={loading}
                >
                  クリア
                </button>
              ) : null}
            </div>
            {wallpaperPath ? <div style={styles.modelPath}>現在: {wallpaperPath}</div> : null}
          </div>
          <div style={styles.live2dToolbar}>
            <button type="button" style={styles.importButton} onClick={() => void importModel()} disabled={loading}>
              モデルをインポート
            </button>
          </div>
          <div style={styles.modelList}>
            {models.length === 0 ? (
              <div style={styles.emptyText}>No Live2D models found.</div>
            ) : (
              models.map((model) => {
                const isActive = model.path === activeModelPath;

                return (
                  <div key={model.path} style={isActive ? styles.activeModelRow : styles.modelRow}>
                    <div>
                      <div style={styles.modelName}>{model.name}</div>
                      <div style={styles.modelPath}>{model.path}</div>
                    </div>
                    <button
                      type="button"
                      style={isActive ? styles.selectedButton : styles.selectButton}
                      onClick={() => void selectModel(model.path)}
                      disabled={loading || isActive}
                    >
                      選択
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <section style={styles.root}>
      <div style={styles.tabs}>
        {tabNames.map((name) => (
          <button
            key={name}
            type="button"
            style={activeName === name ? styles.activeTab : styles.tab}
            onClick={() => {
              setActiveName(name);
              setError('');
              setMessage('');
              if (name === 'live2d') {
                void loadModels();
              }
              if (name === 'tts') {
                void loadVoicevoxSpeakers();
              }
            }}
          >
            {tabLabels[name]}
          </button>
        ))}
      </div>

      {activeName === 'llm' ? renderLlmPanel() : null}
      {activeName === 'tts' ? renderTtsPanel() : null}
      {activeName === 'youtube' ? renderYoutubePanel() : null}
      {activeName === 'live2d' ? renderLive2dPanel() : null}

      <div style={styles.footer}>
        {activeName === 'llm' || activeName === 'tts' || activeName === 'youtube' ? (
          <button type="button" style={styles.saveButton} onClick={() => void saveAppConfig()} disabled={loading}>
            Save
          </button>
        ) : null}
        {error ? <span style={styles.error}>{error}</span> : null}
        {message ? <span style={styles.message}>{message}</span> : null}
      </div>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    height: '100%',
    display: 'grid',
    gridTemplateRows: '48px 1fr 52px',
    background: '#101418',
  },
  tabs: {
    display: 'flex',
    alignItems: 'end',
    gap: 8,
    padding: '10px 16px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  tab: {
    height: 38,
    padding: '0 16px',
    borderRadius: '6px 6px 0 0',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
    borderBottom: 'none',
    background: '#1a2029',
    color: '#cbd3df',
    cursor: 'pointer',
  },
  activeTab: {
    height: 38,
    padding: '0 16px',
    borderRadius: '6px 6px 0 0',
    borderTop: '1px solid rgba(255, 255, 255, 0.16)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.16)',
    borderRight: '1px solid rgba(255, 255, 255, 0.16)',
    borderBottom: 'none',
    background: '#222a36',
    color: '#ffffff',
    cursor: 'pointer',
  },
  formPanel: {
    minHeight: 0,
    overflow: 'auto',
    padding: 18,
    background: '#101418',
    color: '#e7ebf2',
  },
  providerTabs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  providerButton: {
    height: 34,
    padding: '0 14px',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.14)',
    background: '#1a2029',
    color: '#cbd3df',
    cursor: 'pointer',
  },
  activeProviderButton: {
    height: 34,
    padding: '0 14px',
    borderRadius: 6,
    border: '1px solid #70a7ff',
    background: '#1d3b63',
    color: '#ffffff',
    cursor: 'pointer',
  },
  section: {
    maxWidth: 980,
    marginBottom: 24,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    margin: '0 0 10px',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 700,
  },
  fieldGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 12,
  },
  fieldLabel: {
    display: 'grid',
    gap: 6,
    color: '#95a1b2',
    fontSize: 12,
    fontWeight: 600,
  },
  compactFieldLabel: {
    display: 'grid',
    gap: 4,
    color: '#95a1b2',
    fontSize: 11,
    fontWeight: 600,
  },
  input: {
    height: 34,
    minWidth: 0,
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    outline: 'none',
    padding: '0 10px',
    background: '#151a21',
    color: '#e7ebf2',
    fontSize: 13,
  },
  largeTextarea: {
    width: '100%',
    minHeight: 150,
    resize: 'vertical',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    outline: 'none',
    padding: 12,
    background: '#151a21',
    color: '#e7ebf2',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 13,
    lineHeight: 1.55,
  },
  schemaTextarea: {
    width: '100%',
    minHeight: 170,
    resize: 'vertical',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    outline: 'none',
    padding: 12,
    background: '#151a21',
    color: '#e7ebf2',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 13,
    lineHeight: 1.55,
  },
  styleTable: {
    display: 'grid',
    gap: 8,
  },
  styleRow: {
    display: 'grid',
    gridTemplateColumns: 'minmax(130px, 1.2fr) repeat(5, minmax(88px, 1fr)) 34px',
    alignItems: 'end',
    gap: 8,
    padding: 10,
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: '#151a21',
  },
  styleNameInput: {
    height: 32,
    minWidth: 0,
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    outline: 'none',
    padding: '0 10px',
    background: '#101418',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 600,
  },
  numberInput: {
    height: 32,
    minWidth: 0,
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    outline: 'none',
    padding: '0 8px',
    background: '#101418',
    color: '#e7ebf2',
    fontSize: 13,
  },
  select: {
    height: 32,
    minWidth: 0,
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    outline: 'none',
    padding: '0 8px',
    background: '#101418',
    color: '#e7ebf2',
    fontSize: 13,
  },
  voicevoxStyleRowTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  voicevoxStyleRowBottom: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
  },
  characterField: {
    display: 'grid',
    gap: 4,
    minWidth: 100,
  },
  characterLabel: {
    color: '#95a1b2',
    fontSize: 12,
    fontWeight: 600,
  },
  characterName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 700,
  },
  characterSelect: {
    height: 28,
    minWidth: 100,
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    outline: 'none',
    padding: '0 8px',
    background: '#101418',
    color: '#95a1b2',
    fontSize: 11,
  },
  addButton: {
    height: 32,
    padding: '0 12px',
    borderRadius: 6,
    border: '1px solid rgba(112, 167, 255, 0.6)',
    background: '#1d3b63',
    color: '#ffffff',
    cursor: 'pointer',
  },
  previewButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.16)',
    background: '#222a36',
    color: '#e7ebf2',
    cursor: 'pointer',
    fontSize: 14,
    lineHeight: 1,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    border: '1px solid rgba(241, 154, 138, 0.45)',
    background: '#3a2023',
    color: '#f7b0a5',
    cursor: 'pointer',
    fontSize: 18,
    lineHeight: 1,
  },
  live2dPanel: {
    minHeight: 0,
    padding: 18,
    overflow: 'auto',
    background: '#101418',
    color: '#e7ebf2',
  },
  live2dToolbar: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 16,
  },
  importButton: {
    height: 34,
    padding: '0 16px',
    borderRadius: 6,
    border: '1px solid #70a7ff',
    background: '#1d3b63',
    color: '#ffffff',
    cursor: 'pointer',
  },
  modelList: {
    display: 'grid',
    gap: 8,
  },
  modelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '12px 14px',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: '#151a21',
  },
  activeModelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '12px 14px',
    borderRadius: 6,
    border: '1px solid #70a7ff',
    background: '#1b2a3b',
  },
  modelName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 600,
  },
  modelPath: {
    marginTop: 4,
    color: '#95a1b2',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 12,
  },
  selectButton: {
    height: 32,
    padding: '0 14px',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.16)',
    background: '#222a36',
    color: '#ffffff',
    cursor: 'pointer',
  },
  selectedButton: {
    height: 32,
    padding: '0 14px',
    borderRadius: 6,
    border: '1px solid rgba(112, 167, 255, 0.45)',
    background: '#26384e',
    color: '#b8d4ff',
    cursor: 'default',
  },
  emptyText: {
    color: '#95a1b2',
    fontSize: 13,
  },
  envNotice: {
    alignSelf: 'end',
    minHeight: 34,
    display: 'flex',
    alignItems: 'center',
    color: '#95a1b2',
    fontSize: 13,
  },
  helpText: {
    color: '#95a1b2',
    fontSize: 12,
    fontWeight: 400,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '0 16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    background: '#151a21',
  },
  saveButton: {
    height: 34,
    padding: '0 16px',
    borderRadius: 6,
    border: '1px solid #70a7ff',
    background: '#1d3b63',
    color: '#ffffff',
    cursor: 'pointer',
  },
  error: {
    color: '#f19a8a',
    fontSize: 13,
  },
  message: {
    color: '#9bdb7b',
    fontSize: 13,
  },
};
