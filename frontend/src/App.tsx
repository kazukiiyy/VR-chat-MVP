import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { LiveView } from './pages/LiveView';
import { SettingsView } from './pages/SettingsView';

type Route = 'live' | 'settings';

export default function App(): JSX.Element {
  const [route, setRoute] = useState<Route>('live');
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [uiVisible, setUiVisible] = useState(false);

  const handleActivity = useCallback(() => {
    setUiVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setUiVisible(false), 3000);
  }, []);

  /** Live 画面: クリックで表示/非表示をトグル（マウス移動は handleActivity のみ） */
  const handleLiveRootClick = useCallback(() => {
    setUiVisible((wasVisible) => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      if (wasVisible) {
        return false;
      }
      hideTimerRef.current = setTimeout(() => setUiVisible(false), 3000);
      return true;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const isLive = route === 'live';
  const rootStyle: CSSProperties = isLive
    ? {
        ...styles.root,
        ...styles.liveRoot,
        cursor: uiVisible ? 'default' : 'none',
      }
    : styles.root;
  const headerStyle: CSSProperties = isLive
    ? {
        ...styles.header,
        ...styles.liveHeader,
        display: uiVisible ? 'flex' : 'none',
      }
    : styles.header;
  const mainStyle: CSSProperties = isLive ? { ...styles.main, ...styles.liveMain } : styles.main;

  return (
    <>
      <style>{globalStyles}</style>
      <div
        style={rootStyle}
        onMouseMove={isLive ? handleActivity : undefined}
        onClick={isLive ? handleLiveRootClick : undefined}
      >
        <header
          style={headerStyle}
          onClick={isLive ? (e) => e.stopPropagation() : undefined}
        >
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
        <main style={mainStyle}>
          {isLive ? <LiveView uiVisible={uiVisible} /> : <SettingsView />}
        </main>
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
  liveRoot: {
    position: 'relative',
    display: 'block',
    height: '100vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 18px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    background: '#151a21',
  },
  liveHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 18px',
    height: 56,
    borderBottom: 'none',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
    transition: 'opacity 300ms ease',
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
  liveMain: {
    height: '100%',
  },
};

const globalStyles = `
  * { box-sizing: border-box; }
  html, body, #root { margin: 0; width: 100%; height: 100%; }
  button, textarea { font: inherit; }
`;
