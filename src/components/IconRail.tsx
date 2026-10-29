import styles from '../styles/app.module.css';
import { LogoIcon, PlusIcon } from './icons';

interface Props {
  onNewSession: () => void;
}

export function IconRail({ onNewSession }: Props) {
  return (
    <nav className={styles.iconRail}>
      <div className={styles.logo}>
        <LogoIcon />
      </div>
      <button className={styles.iconBtn} title="新会话" onClick={onNewSession}>
        <PlusIcon />
      </button>
    </nav>
  );
}
