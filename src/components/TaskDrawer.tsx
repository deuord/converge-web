import type { TaskEvent } from '../api/types';
import styles from '../styles/app.module.css';
import { CloseIcon, TasksIcon } from './icons';

interface Props {
  open: boolean;
  events: TaskEvent[];
  onToggle: () => void;
}

function taskTitle(ev: TaskEvent): string {
  if (ev.type === 'tool_call') return ev.name;
  if (ev.type === 'confirm_request') return '命令确认';
  return '澄清提问';
}

function taskDetail(ev: TaskEvent): string {
  if (ev.type === 'tool_call') return ev.result || JSON.stringify(ev.args);
  if (ev.type === 'confirm_request') return ev.cmd;
  return ev.question;
}

export function TaskDrawer({ open, events, onToggle }: Props) {
  return (
    <aside className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}>
      <div className={styles.drawerStrip}>
        <button className={styles.iconBtn} title="任务面板" onClick={onToggle}>
          <TasksIcon />
        </button>
      </div>
      {open && (
        <div className={styles.drawerPanel}>
          <div className={styles.drawerHeader}>
            <span>任务</span>
            <button className={styles.iconBtn} title="收起" onClick={onToggle}>
              <CloseIcon />
            </button>
          </div>
          <div className={styles.drawerBody}>
            {events.length === 0 ? (
              <div className={styles.drawerEmpty}>
                工具调用、命令确认、澄清提问等任务事件会展示在这里。
              </div>
            ) : (
              events.map((ev, i) => (
                <div key={i} className={styles.taskCard}>
                  <div className={styles.taskTitle}>{taskTitle(ev)}</div>
                  <div className={styles.taskDetail}>{taskDetail(ev)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
