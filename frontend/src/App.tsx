import { type CSSProperties, useState } from 'react';
import { LiveView } from './pages/LiveView';
import { SettingsView } from './pages/SettingsView';

type Route = 'live' | 'settings';

export default function App(): JSX.Element {
  const [route, setRoute] = useState<Route>('live');

  return (
    <>
      <style>{globalStyles}</style>
      <div style={styles.root}>
        <header style={styles.header}>
          <div style={styles.title}>VTuber Live</div>
          <nav style={styles.nav}>
            <button
              type="button"
              style={route === 'live' ? styles.activeButton : styles.button}
              onClick={() => setRoute('live')}
            >
              Live
            </button>
            <button
              type="button"
              style={route === 'settings' ? styles.activeButton : styles.button}
              onClick={() => setRoute('settings')}
            >
              Settings
            </button>
          </nav>
        </header>
        <main style={styles.main}>{route === 'live' ? <LiveView /> : <SettingsView />}</main>
      </div>
    </>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    height: '100vh',
    display: 'grid',
    gridTemplateRows: '56px 1fr',
    background: '#0f1318',
    color: '#f5f7fa',
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 18px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    background: '#151a21',
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
  },
  nav: {
    display: 'flex',
    gap: 8,
  },
  button: {
    height: 34,
    padding: '0 14px',
    borderRadius: 6,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    background: '#202733',
    color: '#d9dee7',
    cursor: 'pointer',
  },
  activeButton: {
    height: 34,
    padding: '0 14px',
    borderRadius: 6,
    border: '1px solid #70a7ff',
    background: '#1d3b63',
    color: '#ffffff',
    cursor: 'pointer',
  },
  main: {
    minHeight: 0,
  },
};

const globalStyles = `
  * { box-sizing: border-box; }
  html, body, #root { margin: 0; width: 100%; height: 100%; }
  button, textarea { font: inherit; }
`;
