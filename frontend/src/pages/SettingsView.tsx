import { type CSSProperties, useEffect, useState } from 'react';

type ConfigName = 'app' | 'avatar';

const configNames: ConfigName[] = ['app', 'avatar'];

export function SettingsView(): JSX.Element {
  const [activeName, setActiveName] = useState<ConfigName>('app');
  const [contents, setContents] = useState<Record<ConfigName, string>>({ app: '', avatar: '' });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadConfigs = async (): Promise<void> => {
      setLoading(true);
      setError('');
      setMessage('');

      if (!window.electronAPI) {
        setError('Electron IPC is unavailable. Run this screen inside Electron.');
        setLoading(false);
        return;
      }

      try {
        const [appConfig, avatarConfig] = await Promise.all([
          window.electronAPI.readConfig('app'),
          window.electronAPI.readConfig('avatar'),
        ]);
        setContents({ app: appConfig, avatar: avatarConfig });
      } catch (readError) {
        console.error('Failed to read config', readError);
        setError('Failed to read config files.');
      } finally {
        setLoading(false);
      }
    };

    void loadConfigs();
  }, []);

  const save = async (): Promise<void> => {
    setError('');
    setMessage('');

    if (!window.electronAPI) {
      setError('Electron IPC is unavailable. Run this screen inside Electron.');
      return;
    }

    try {
      const parsed = JSON.parse(contents[activeName]);
      const formatted = `${JSON.stringify(parsed, null, 2)}\n`;
      await window.electronAPI.writeConfig(activeName, formatted);
      setContents((current) => ({ ...current, [activeName]: formatted }));
      setMessage(`${activeName}.json saved.`);
    } catch (saveError) {
      console.error('Failed to save config', saveError);
      setError(saveError instanceof SyntaxError ? saveError.message : 'Failed to write config file.');
    }
  };

  return (
    <section style={styles.root}>
      <div style={styles.tabs}>
        {configNames.map((name) => (
          <button
            key={name}
            type="button"
            style={activeName === name ? styles.activeTab : styles.tab}
            onClick={() => {
              setActiveName(name);
              setError('');
              setMessage('');
            }}
          >
            {name}.json
          </button>
        ))}
      </div>
      <textarea
        value={contents[activeName]}
        onChange={(event) =>
          setContents((current) => ({ ...current, [activeName]: event.target.value }))
        }
        disabled={loading}
        spellCheck={false}
        style={styles.editor}
      />
      <div style={styles.footer}>
        <button type="button" style={styles.saveButton} onClick={() => void save()} disabled={loading}>
          Save
        </button>
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
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderBottom: 'none',
    background: '#1a2029',
    color: '#cbd3df',
    cursor: 'pointer',
  },
  activeTab: {
    height: 38,
    padding: '0 16px',
    borderRadius: '6px 6px 0 0',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    borderBottom: 'none',
    background: '#222a36',
    color: '#ffffff',
    cursor: 'pointer',
  },
  editor: {
    width: '100%',
    height: '100%',
    resize: 'none',
    border: 'none',
    outline: 'none',
    padding: 18,
    background: '#101418',
    color: '#e7ebf2',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: 13,
    lineHeight: 1.55,
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
