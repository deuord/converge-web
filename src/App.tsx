import { useCallback, useEffect, useState } from 'react';
import { fetchHealth } from './api/client';
import { ChatStream } from './components/ChatStream';
import { Composer } from './components/Composer';
import { PanelLeftIcon, PanelRightIcon } from './components/icons';
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

// 面板宽度可拖拽调整的范围;拖到 close 以下松手直接关闭面板
const PANEL_LIMITS = {
  left: { min: 160, max: 520, close: 120, default: 240 },
  right: { min: 260, max: 560, close: 200, default: 320 },
};

export default function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [models, setModels] = useState<string[]>([]);
  const [model, setModel] = useState('');
  const [healthError, setHealthError] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(PANEL_LIMITS.left.default);
  const [rightWidth, setRightWidth] = useState(PANEL_LIMITS.right.default);
  const {
    messages,
    sessionId,
    streaming,
    taskEvents,
    sessions,
    historyLoading,
    send,
    retry,
    newSession,
    selectSession,
    removeSession,
  } = useChatStream();

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

  /** 拖拽调宽(左右面板通用):按下手柄后监听全局 mousemove/mouseup;
   *  左侧面板越往右越宽,右侧面板越往左越宽;松手时宽度低于 close 阈值则直接关闭面板 */
  const startResize = useCallback(
    (side: 'left' | 'right') =>
      (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = side === 'left' ? leftWidth : rightWidth;
        const { min, max, close } = PANEL_LIMITS[side];
        let last = startWidth;
        const onMove = (ev: MouseEvent) => {
          const delta = side === 'left' ? ev.clientX - startX : startX - ev.clientX;
          last = startWidth + delta;
          const w = Math.min(max, Math.max(min, last));
          if (side === 'left') setLeftWidth(w);
          else setRightWidth(w);
        };
        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          if (last < close) {
            if (side === 'left') setLeftOpen(false);
            else setRightOpen(false);
          }
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      },
    [leftWidth, rightWidth],
  );

  // 顶栏标题:当前会话的 title,没聊过/还没会话兜底"新对话"
  const currentTitle =
    sessions.find((s) => s.session_id === sessionId)?.title ?? '新对话';

  return (
    <div className={styles.app}>
      {leftOpen && (
        <>
          <SessionPanel
            sessions={sessions}
            sessionId={sessionId}
            loading={historyLoading}
            width={leftWidth}
            onSelect={selectSession}
            onDelete={removeSession}
            onNewSession={newSession}
          />
          <div className={styles.resizer} onMouseDown={startResize('left')} />
        </>
      )}
      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              className={styles.iconBtn}
              title={leftOpen ? '收起会话栏' : '展开会话栏'}
              onClick={() => setLeftOpen((v) => !v)}
            >
              <PanelLeftIcon />
            </button>
            <span className={styles.topbarTitle}>{currentTitle}</span>
          </div>
          <div className={styles.topbarActions}>
            <ThemeToggle theme={theme} onChange={setTheme} />
            <button
              className={styles.iconBtn}
              title={rightOpen ? '收起任务面板' : '展开任务面板'}
              onClick={() => setRightOpen((v) => !v)}
            >
              <PanelRightIcon />
            </button>
          </div>
        </header>
        {healthError && (
          <div className={styles.banner}>
            后端不可达,请确认 Converge 服务已启动(localhost:8000)。界面仍可使用,发送消息会失败。
          </div>
        )}
        <ChatStream messages={messages} onRetry={retry} />
        <Composer
          onSend={(content) => send(content, model || undefined)}
          disabled={streaming}
          models={models}
          model={model}
          onModelChange={setModel}
        />
      </main>
      {rightOpen && <div className={styles.resizer} onMouseDown={startResize('right')} />}
      <TaskDrawer
        open={rightOpen}
        width={rightWidth}
        events={taskEvents}
        onToggle={() => setRightOpen((v) => !v)}
      />
    </div>
  );
}
