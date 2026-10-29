import styles from '../styles/app.module.css';

interface Props {
  sessionId: string | null;
  onNewSession: () => void;
}

export function SessionPanel({ sessionId, onNewSession }: Props) {
  return (
    <aside className={styles.sessionPanel}>
      <div className={styles.panelTitle}>会话</div>
      <button className={styles.newChatBtn} onClick={onNewSession}>
        + 新会话
      </button>
      <div className={styles.sessionInfo}>
        <div className={styles.panelHint}>当前会话</div>
        {sessionId ? (
          <div className={styles.sessionId} title={sessionId}>
            {sessionId}
          </div>
        ) : (
          <div className={styles.panelHint}>尚未创建</div>
        )}
      </div>
      <div className={styles.panelHint}>会话列表将在后端 v1.2 上线后接入</div>
    </aside>
  );
}
