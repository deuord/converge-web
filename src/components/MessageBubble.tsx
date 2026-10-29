import hljs from 'highlight.js/lib/common';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from '../hooks/useChatStream';
import styles from '../styles/app.module.css';

interface Props {
  message: ChatMessage;
  onRetry: () => void;
}

// 自定义 code 渲染:有 language-xxx 时用 highlight.js 高亮,否则原样内联代码
function Code({ className, children }: { className?: string; children?: ReactNode }) {
  const text = String(children ?? '');
  const lang = /language-(\w+)/.exec(className || '')?.[1];
  if (!lang || !hljs.getLanguage(lang)) {
    return <code className={className}>{children}</code>;
  }
  const html = hljs.highlight(text, { language: lang }).value;
  return <code className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function MessageBubble({ message, onRetry }: Props) {
  if (message.role === 'user') {
    return (
      <div className={styles.rowUser}>
        <div className={styles.bubbleUser}>{message.content}</div>
      </div>
    );
  }

  return (
    <div className={styles.msgAssistant}>
      <div className={styles.msgLabel}>Converge</div>
      <div className={styles.markdown}>
        {message.content ? (
          <ReactMarkdown components={{ code: Code }}>{message.content}</ReactMarkdown>
        ) : message.status === 'streaming' ? (
          <span className={styles.typing}>正在输入…</span>
        ) : null}
      </div>
      {message.status === 'error' && (
        <div className={styles.errorCard}>
          <span>{message.errorMessage || '出错了'}</span>
          <button className={styles.retryBtn} onClick={onRetry}>
            重发
          </button>
        </div>
      )}
    </div>
  );
}
