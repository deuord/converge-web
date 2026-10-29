import { useEffect, useState } from 'react';
import { fetchHealth } from './api/client';
import { ChatStream } from './components/ChatStream';
import { Composer } from './components/Composer';
import { IconRail } from './components/IconRail';
import { ModelSelect } from './components/ModelSelect';
import { SessionPanel } from './components/SessionPanel';
import { TaskDrawer } from './components/TaskDrawer';
import { ThemeToggle, type Theme } from './components/ThemeToggle';
import { useChatStream } from './hooks/useChatStream';
import styles from './styles/app.module.css';

function getInitialTheme(): Theme {
  const stored = localStorage.getItem('converge-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [healthError, setHealthError] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { messages, sessionId, streaming, taskEvents, send, retry, newSession } = useChatStream();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('converge-theme', theme);
  }, [theme]);

  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal)
      .then((h) => {
        setModels(h.models);
        setHealthError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setHealthError(true);
      });
    return () => controller.abort();
  }, []);

  return (
    <div className={styles.app}>
      <IconRail onNewSession={newSession} />
      <SessionPanel sessionId={sessionId} onNewSession={newSession} />
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarTitle}>Converge</div>
          <div className={styles.topbarActions}>
            <ModelSelect models={models} value={model} onChange={setModel} />
            <ThemeToggle theme={theme} onChange={setTheme} />
          </div>
        </header>
        {healthError && (
          <div className={styles.banner}>
            后端不可达,请确认 Converge 服务已启动(localhost:8000)。界面仍可使用,发送消息会失败。
          </div>
        )}
        <ChatStream messages={messages} onRetry={retry} />
        <Composer onSend={(content) => send(content, model || undefined)} disabled={streaming} />
      </main>
      <TaskDrawer
        open={drawerOpen}
        events={taskEvents}
        onToggle={() => setDrawerOpen((v) => !v)}
      />
    </div>
  );
}
