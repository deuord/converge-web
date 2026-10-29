import { useCallback, useEffect, useRef, useState } from 'react';
import { streamChat } from '../api/client';
import type { ServerEvent, TaskEvent } from '../api/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** assistant 专用:streaming 流式中 / done 完成 / error 出错(保留已收内容) */
  status: 'streaming' | 'done' | 'error';
  errorMessage?: string;
}

export function useChatStream() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [taskEvents, setTaskEvents] = useState<TaskEvent[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const idRef = useRef(0);
  const lastReqRef = useRef<{ content: string; model?: string } | null>(null);

  const nextId = () => `m${++idRef.current}`;

  const startStream = useCallback(
    async (content: string, model?: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      const assistantId = nextId();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', status: 'streaming' },
      ]);

      const patch = (fn: (m: ChatMessage) => ChatMessage) =>
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)));

      const onEvent = (ev: ServerEvent) => {
        switch (ev.type) {
          case 'session':
            setSessionId(ev.session_id);
            break;
          case 'chunk':
            patch((m) => ({ ...m, content: m.content + ev.content }));
            break;
          case 'done':
            patch((m) => ({ ...m, status: 'done' }));
            break;
          case 'error':
            patch((m) => ({ ...m, status: 'error', errorMessage: ev.message }));
            // 404 = session 不存在/已删除:回退为新会话
            if (ev.code === 404) setSessionId(null);
            break;
          case 'tool_call':
          case 'confirm_request':
          case 'ask_user':
            setTaskEvents((prev) => [...prev, ev]);
            break;
        }
      };

      try {
        await streamChat(
          { content, session_id: sessionId ?? undefined, model },
          onEvent,
          controller.signal,
        );
        // 流正常结束但没收到 done:也置为完成
        patch((m) => (m.status === 'streaming' ? { ...m, status: 'done' } : m));
      } catch (err) {
        // 主动中断(新会话/卸载)不更新;网络错误保留半截内容
        if (!controller.signal.aborted) {
          const message = err instanceof Error ? err.message : String(err);
          patch((m) => ({ ...m, status: 'error', errorMessage: `网络错误: ${message}` }));
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [sessionId],
  );

  const send = useCallback(
    (content: string, model?: string) => {
      const text = content.trim();
      if (!text || streaming) return;
      lastReqRef.current = { content: text, model };
      setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: text, status: 'done' }]);
      void startStream(text, model);
    },
    [streaming, startStream],
  );

  /** 重发上一条:丢掉出错的 assistant 消息,用同样的请求重新流式 */
  const retry = useCallback(() => {
    const lastReq = lastReqRef.current;
    if (!lastReq || streaming) return;
    setMessages((prev) => {
      const next = [...prev];
      while (next.length > 0 && next[next.length - 1].status === 'error') {
        next.pop();
      }
      return next;
    });
    void startStream(lastReq.content, lastReq.model);
  }, [streaming, startStream]);

  const newSession = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(null);
    setTaskEvents([]);
    setStreaming(false);
  }, []);

  // 组件卸载时中断进行中的流
  useEffect(() => () => abortRef.current?.abort(), []);

  return { messages, sessionId, streaming, taskEvents, send, retry, newSession };
}
