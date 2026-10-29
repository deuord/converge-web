import styles from '../styles/app.module.css';
import { MoonIcon, SunIcon } from './icons';

export type Theme = 'dark' | 'light';

interface Props {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

export function ThemeToggle({ theme, onChange }: Props) {
  return (
    <button
      className={styles.iconBtn}
      title={theme === 'dark' ? '切换到亮色' : '切换到暗色'}
      onClick={() => onChange(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
