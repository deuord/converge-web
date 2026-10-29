import { useRef, useState, type KeyboardEvent } from 'react';
import styles from '../styles/app.module.css';
import { SendIcon } from './icons';

interface Props {
  onSend: (content: string) => void;
  disabled: boolean;
}

export function Composer({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const content = value.trim();
    if (!content || disabled) return;
    onSend(content);
    setValue('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送;Shift+Enter 换行;中文输入法组合中不触发
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className={styles.composer}>
      <div className={styles.composerInner}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          rows={2}
          placeholder="输入消息,Enter 发送,Shift+Enter 换行"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button className={styles.sendBtn} title="发送" disabled={disabled} onClick={submit}>
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
