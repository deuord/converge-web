import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../hooks/useChatStream';
import styles from '../styles/app.module.css';
import { MessageBubble } from './MessageBubble';

interface Props {
  messages: ChatMessage[];
  onRetry: () => void;
}

export function ChatStream({ messages, onRetry }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // 新内容到达时滚到底部
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div className={styles.chatScroll} ref={scrollRef}>
      <div className={styles.chatInner}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <h2>Converge</h2>
            <p>输入一句话开始对话,回复会实时流式输出。</p>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onRetry={onRetry} />
        ))}
      </div>
    </div>
  );
}
