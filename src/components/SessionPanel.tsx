import { useState } from 'react';
import styles from '../styles/app.module.css';
import type { SessionSummary } from '../api/types';
import { ChevronIcon, CloseIcon } from './icons';

interface Props {
  sessions: SessionSummary[];
  sessionId: string | null;
  loading: boolean;
  /** 面板宽度(px),由 App 的拖拽调宽逻辑控制;不传走 CSS 缺省 */
  width?: number;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewSession: () => void;
}

/** updated_at → "MM-DD HH:mm";列表排序按更新时间降序,这里只管展示 */
function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SessionPanel({ sessions, sessionId, loading, width, onSelect, onDelete, onNewSession }: Props) {
  const [recentOpen, setRecentOpen] = useState(true);
  const handleDelete = (s: SessionSummary) => {
    if (window.confirm(`确定删除会话「${s.title ?? '新对话'}」吗?`)) onDelete(s.session_id);
  };

  return (
    <aside className={styles.sessionPanel} style={width ? { width } : undefined}>
      <div className={styles.brandTitle}>Converge</div>
      <button className={styles.newTaskBtn} onClick={onNewSession}>
        + 新建任务
      </button>
      <button
        className={styles.groupHeader}
        onClick={() => setRecentOpen((v) => !v)}
        title={recentOpen ? '收起列表' : '展开列表'}
      >
        <span className={`${styles.groupChevron} ${recentOpen ? '' : styles.groupChevronCollapsed}`}>
          <ChevronIcon />
        </span>
        最近
      </button>
      {recentOpen && (
        <div className={styles.sessionList}>
          {loading ? (
            <div className={styles.panelHint}>加载中...</div>
          ) : sessions.length === 0 ? (
            <div className={styles.panelHint}>还没有会话,发条消息开始吧</div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.session_id}
                className={`${styles.sessionItem} ${s.session_id === sessionId ? styles.sessionItemActive : ''}`}
              >
                <button
                  className={styles.sessionItemMain}
                  onClick={() => onSelect(s.session_id)}
                  title={s.title ?? s.session_id}
                >
                  <span className={styles.sessionItemTitle}>{s.title ?? '新对话'}</span>
                  <span className={styles.sessionItemTime}>{formatTime(s.updated_at)}</span>
                </button>
                <button
                  className={styles.sessionDelete}
                  aria-label={`删除会话 ${s.title ?? s.session_id}`}
                  onClick={() => handleDelete(s)}
                >
                  <CloseIcon />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
}
